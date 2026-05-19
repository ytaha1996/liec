using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Azure.Storage.Blobs;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using System.Text;

namespace ShippingPlatform.Api.Services;

public interface ITokenService { string Create(AdminUser user); }
public class TokenService(IConfiguration cfg) : ITokenService
{
    public string Create(AdminUser user)
    {
        var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Auth:Secret"] ?? "dev-secret-super-long"));
        var creds = new Microsoft.IdentityModel.Tokens.SigningCredentials(key, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Email, user.Email), new Claim(ClaimTypes.Role, user.Role.ToString())],
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public interface IBlobStorageService
{
    Task<(string blobKey, string publicUrl)> UploadAsync(string container, string fileName, Stream stream, string contentType, string? forcedBlobKey = null, CancellationToken ct = default);
    Task DeleteAsync(string container, string blobKey, CancellationToken ct = default);
}
public class BlobStorageService(IConfiguration cfg, ILogger<BlobStorageService> logger) : IBlobStorageService
{
    public async Task<(string blobKey, string publicUrl)> UploadAsync(string container, string fileName, Stream stream, string contentType, string? forcedBlobKey = null, CancellationToken ct = default)
    {
        var conn = cfg["AzureBlob:ConnectionString"];
        var ext = Path.GetExtension(fileName);
        var defaultFolder = container == (cfg["AzureBlob:ExportsContainer"] ?? "exports")
            ? $"exports/reports/{DateTime.UtcNow:yyyy/MM}"
            : $"media/packages/0/other/{DateTime.UtcNow:yyyy/MM}";
        var blobKey = forcedBlobKey ?? $"{defaultFolder}/{Guid.NewGuid()}{ext}";

        if (string.IsNullOrWhiteSpace(conn))
        {
            logger.LogWarning("AzureBlob:ConnectionString is not configured. Returning placeholder URL for blob key: {BlobKey}", blobKey);
            return (blobKey, $"https://public.local/{blobKey}");
        }

        var service = new BlobServiceClient(conn);
        var c = service.GetBlobContainerClient(container);
        await c.CreateIfNotExistsAsync(cancellationToken: ct);
        await c.SetAccessPolicyAsync(Azure.Storage.Blobs.Models.PublicAccessType.Blob, cancellationToken: ct);
        var blob = c.GetBlobClient(blobKey);
        // Force browser download for export-type files (CSV/VCF/XLSX) by setting
        // Content-Disposition: attachment. Without this, browsers render CSV/VCF
        // inline as text. Media (images) keep the default inline disposition.
        var isExport = container == (cfg["AzureBlob:ExportsContainer"] ?? "exports");
        var headers = new Azure.Storage.Blobs.Models.BlobHttpHeaders
        {
            ContentType = contentType,
            ContentDisposition = isExport ? $"attachment; filename=\"{fileName}\"" : null,
        };
        await blob.UploadAsync(stream, headers, cancellationToken: ct);
        return (blobKey, blob.Uri.ToString());
    }

    public async Task DeleteAsync(string container, string blobKey, CancellationToken ct = default)
    {
        var conn = cfg["AzureBlob:ConnectionString"];
        if (string.IsNullOrWhiteSpace(conn)) return;
        var service = new BlobServiceClient(conn);
        var c = service.GetBlobContainerClient(container);
        var blob = c.GetBlobClient(blobKey);
        await blob.DeleteIfExistsAsync(cancellationToken: ct);
    }
}

public interface IRefCodeService { Task<string> GenerateAsync(int originWarehouseId); }
public class RefCodeService(AppDbContext db) : IRefCodeService
{
    public async Task<string> GenerateAsync(int originWarehouseId)
    {
        var origin = await db.Warehouses.FirstAsync(x => x.Id == originWarehouseId);
        var year = DateTime.UtcNow.Year;
        // Two-digit year. Note: int.ToString("yy") treats "yy" as a numeric custom format
        // and emits the literal string "yy" — only date types know that specifier.
        var yy = (year % 100).ToString("D2");

        // Serializable transaction with one retry on unique-index conflict — protects against
        // concurrent GenerateAsync calls clobbering LastNumber for the same warehouse+year.
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var useTx = db.Database.IsRelational();
            await using var tx = useTx
                ? await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable)
                : null;
            try
            {
                var seq = await db.ShipmentSequences.FirstOrDefaultAsync(x => x.Year == year && x.OriginWarehouseCode == origin.Code);
                if (seq is null) { seq = new ShipmentSequence { OriginWarehouseCode = origin.Code, Year = year, LastNumber = 0 }; db.ShipmentSequences.Add(seq); }
                seq.LastNumber++;
                await db.SaveChangesAsync();
                if (tx is not null) await tx.CommitAsync();
                return $"{origin.Code}-{yy}{seq.LastNumber:D2}";
            }
            catch (DbUpdateException) when (attempt == 0)
            {
                if (tx is not null) await tx.RollbackAsync();
                foreach (var entry in db.ChangeTracker.Entries<ShipmentSequence>().ToList())
                    entry.State = EntityState.Detached;
            }
        }
        throw new InvalidOperationException($"Failed to allocate next ref-code for {origin.Code}/{year} after retry.");
    }
}

public interface ICapacityService { Task RecalculateAsync(int shipmentId); }
public class CapacityService(AppDbContext db, IConfiguration cfg) : ICapacityService
{
    public async Task RecalculateAsync(int shipmentId)
    {
        var shipment = await db.Shipments.Include(x => x.Packages).FirstOrDefaultAsync(x => x.Id == shipmentId);
        if (shipment is null) return;
        var active = shipment.Packages.Where(p => p.Status != PackageStatus.Cancelled).ToList();
        shipment.TotalWeightKg = active.Sum(p => p.WeightKg);
        shipment.TotalCbm = active.Sum(p => p.Cbm);

        var threshold = cfg.GetValue<decimal>("CapacityThresholdPct", 80) / 100m;
        bool overThreshold =
            (shipment.MaxWeightKg > 0 && shipment.TotalWeightKg / shipment.MaxWeightKg >= threshold) ||
            (shipment.MaxCbm > 0 && shipment.TotalCbm / shipment.MaxCbm >= threshold);

        // Capacity percentage can be shown in UI; no automatic status switching in proposal lifecycle.

        await db.SaveChangesAsync();
    }
}

public interface IImageWatermarkService { Stream Apply(Stream input, string text, string contentType); }
public class ImageWatermarkService : IImageWatermarkService
{
    public Stream Apply(Stream input, string text, string contentType)
    {
        // Watermark is a best-effort enhancement; if SkiaSharp is unavailable, return raw stream
        try
        {
            if (!contentType.StartsWith("image/")) return input;
            var ms = new MemoryStream();
            input.CopyTo(ms); ms.Position = 0;
            using var bitmap = SkiaSharp.SKBitmap.Decode(ms);
            if (bitmap is null) { ms.Position = 0; return ms; }
            using var canvas = new SkiaSharp.SKCanvas(bitmap);
            var fontSize = Math.Min(Math.Min(bitmap.Width, bitmap.Height) * 0.06f, 96f);
            using var paint = new SkiaSharp.SKPaint
            {
                Color = SkiaSharp.SKColors.White.WithAlpha(220),
                TextSize = Math.Max(fontSize, 24f),
                IsAntialias = true,
                Typeface = SkiaSharp.SKTypeface.Default,
            };
            using var shadow = paint.Clone();
            shadow.Color = SkiaSharp.SKColors.Black.WithAlpha(200);
            var textWidth = paint.MeasureText(text);
            var x = (bitmap.Width - textWidth) / 2f;
            var y = (bitmap.Height + paint.TextSize) / 2f;
            canvas.DrawText(text, x + 2, y + 2, shadow);
            canvas.DrawText(text, x, y, paint);
            var encoded = bitmap.Encode(SkiaSharp.SKEncodedImageFormat.Jpeg, 90);
            var result = new MemoryStream();
            encoded.AsStream().CopyTo(result);
            result.Position = 0;
            return result;
        }
        catch
        {
            if (input.CanSeek) input.Position = 0;
            return input;
        }
    }
}

public interface IPricingService { Task RecalculateAsync(Package package); }
public class PricingService(AppDbContext db) : IPricingService
{
    public async Task RecalculateAsync(Package package)
    {
        // Allow recalcs while the package is in transit (Shipped). Lock only
        // once it has Arrived at destination — at that point the price is
        // committed for customs/billing and edits go through an override.
        if (package.Status >= PackageStatus.ArrivedAtDestination || package.HasPricingOverride) return;

        var now = DateTime.UtcNow;
        var active = await db.PricingConfigs.FirstOrDefaultAsync(x =>
                x.Status == PricingConfigStatus.Active && x.EffectiveFrom <= now && (x.EffectiveTo == null || x.EffectiveTo >= now))
            ?? await db.PricingConfigs.FirstOrDefaultAsync(x => x.Status == PricingConfigStatus.Active)
            ?? new PricingConfig { DefaultRatePerKg = 1, DefaultRatePerCbm = 1, Currency = "EUR" };

        decimal rateKg = active.DefaultRatePerKg;
        decimal rateCbm = active.DefaultRatePerCbm;

        package.AppliedRatePerKg = rateKg;
        package.AppliedRatePerCbm = rateCbm;
        package.Currency = active.Currency;
        // Weight-first pricing: weight is the canonical billing basis. CBM is
        // the fallback only when no weight has been entered (dimensional-weight
        // cases not yet supported).
        var calculated = package.WeightKg > 0
            ? package.WeightKg * rateKg
            : package.Cbm * rateCbm;
        package.ChargeAmount = active.MinimumCharge > 0 ? Math.Max(calculated, active.MinimumCharge) : calculated;
    }
}

public interface IPhotoComplianceService
{
    Task<List<MissingGateItem>> MissingForShipmentDepartureAsync(int shipmentId);
    Task<List<MissingGateItem>> MissingForShipmentCloseAsync(int shipmentId);
    Task<List<MissingGateItem>> MissingForPackageHandoutAsync(int packageId);
}
public class PhotoComplianceService(AppDbContext db) : IPhotoComplianceService
{
    public async Task<List<MissingGateItem>> MissingForShipmentDepartureAsync(int shipmentId) => await MissingByStage(shipmentId, MediaStage.Departure, p => true);
    public async Task<List<MissingGateItem>> MissingForShipmentCloseAsync(int shipmentId) => await MissingByStage(shipmentId, MediaStage.Arrival, p => p.Status == PackageStatus.HandedOut || p.Status == PackageStatus.Cancelled);
    public async Task<List<MissingGateItem>> MissingForPackageHandoutAsync(int packageId)
    {
        var p = await db.Packages.Include(x => x.Customer).Include(x => x.Media).FirstAsync(x => x.Id == packageId);
        return p.Media.Any(m => m.Stage == MediaStage.Arrival) ? [] : [new MissingGateItem(p.Id, p.Customer.Name, MediaStage.Arrival)];
    }

    private async Task<List<MissingGateItem>> MissingByStage(int shipmentId, MediaStage stage, Func<Package, bool> finalized)
    {
        var ps = await db.Packages.Include(x => x.Customer).Include(x => x.Media).Where(x => x.ShipmentId == shipmentId).ToListAsync();
        // Cancelled/Draft packages never need photos for any gate. Cancelled is final and
        // doesn't depart/arrive; Draft packages should already have been reassigned by
        // ReadyToDepart and shouldn't block.
        return ps
            .Where(p => p.Status != PackageStatus.Cancelled && p.Status != PackageStatus.Draft)
            .Where(x => !x.Media.Any(m => m.Stage == stage) || (stage == MediaStage.Arrival && !finalized(x)))
            .Select(x => new MissingGateItem(x.Id, x.Customer.Name, stage)).ToList();
    }
}

public interface IWhatsAppSender { Task<(bool ok, string? err)> SendAsync(string phone, string text, IEnumerable<string>? mediaUrls = null); }
public class StubWhatsAppSender : IWhatsAppSender { public Task<(bool ok, string? err)> SendAsync(string phone, string text, IEnumerable<string>? mediaUrls = null) => Task.FromResult<(bool, string?)>((true, null)); }

public class TwilioWhatsAppSender : IWhatsAppSender
{
    private readonly string _from;
    private readonly ILogger<TwilioWhatsAppSender> _logger;

    public TwilioWhatsAppSender(IConfiguration cfg, ILogger<TwilioWhatsAppSender> logger)
    {
        _logger = logger;
        _from = cfg["Twilio:WhatsAppFrom"]!;
        Twilio.TwilioClient.Init(cfg["Twilio:AccountSid"], cfg["Twilio:AuthToken"]);
    }

    public async Task<(bool ok, string? err)> SendAsync(string phone, string text, IEnumerable<string>? mediaUrls = null)
    {
        if (string.IsNullOrWhiteSpace(phone) || !System.Text.RegularExpressions.Regex.IsMatch(phone, @"^\+\d{8,15}$"))
            return (false, $"Invalid phone number: {phone}");

        try
        {
            var urls = mediaUrls?.ToList() ?? [];
            var firstBatch = urls.Take(10).Select(u => new Uri(u)).ToList();

            var options = new Twilio.Rest.Api.V2010.Account.CreateMessageOptions(
                new Twilio.Types.PhoneNumber($"whatsapp:{phone}"))
            {
                From = new Twilio.Types.PhoneNumber($"whatsapp:{_from}"),
                Body = text,
            };

            if (firstBatch.Count > 0)
                options.MediaUrl = firstBatch;

            var msg = await Twilio.Rest.Api.V2010.Account.MessageResource.CreateAsync(options);

            if (msg.ErrorCode != null)
            {
                var errMsg = $"Twilio error {msg.ErrorCode}: {msg.ErrorMessage}";
                _logger.LogWarning(errMsg);
                return (false, errMsg);
            }

            _logger.LogInformation("WhatsApp sent to {Phone}, SID: {Sid}", phone, msg.Sid);

            // Send remaining media in chunks of 10 if more than 10 photos
            for (var i = 10; i < urls.Count; i += 10)
            {
                var chunk = urls.Skip(i).Take(10).Select(u => new Uri(u)).ToList();
                var chunkOpts = new Twilio.Rest.Api.V2010.Account.CreateMessageOptions(
                    new Twilio.Types.PhoneNumber($"whatsapp:{phone}"))
                {
                    From = new Twilio.Types.PhoneNumber($"whatsapp:{_from}"),
                    MediaUrl = chunk,
                };
                await Twilio.Rest.Api.V2010.Account.MessageResource.CreateAsync(chunkOpts);
            }

            return (true, null);
        }
        catch (Twilio.Exceptions.ApiException ex)
        {
            var errMsg = $"Twilio API exception: {ex.Message}";
            _logger.LogError(ex, errMsg);
            return (false, errMsg);
        }
        catch (Exception ex)
        {
            var errMsg = $"WhatsApp send failed: {ex.Message}";
            _logger.LogError(ex, errMsg);
            return (false, errMsg);
        }
    }
}

public interface IExportService
{
    Task<string> GenerateGroupHelperAsync(string format, CancellationToken ct = default);
    Task<string> GenerateShipmentBolReportAsync(int shipmentId, CancellationToken ct = default);
    Task<string> GenerateShipmentCustomerInvoicesExcelAsync(int shipmentId, CancellationToken ct = default);
    Task<string> GenerateShipmentCommercialDocumentsAsync(int shipmentId, CancellationToken ct = default);
    Task<string> GenerateCustomersExcelAsync(CancellationToken ct = default);
}

public class ExportService(
    AppDbContext db,
    IBlobStorageService blob,
    IConfiguration cfg,
    ShippingPlatform.Api.Services.Exports.IInvoiceSequenceService invoiceSeq,
    ShippingPlatform.Api.Services.Exports.InvoiceTemplateConstants invoiceTpl,
    ShippingPlatform.Api.Services.FxRates.IShipmentSnapshotService fxSnap) : IExportService
{
    public async Task<string> GenerateGroupHelperAsync(string format, CancellationToken ct = default)
    {
        var customers = await db.Customers.Include(x => x.WhatsAppConsent)
            .Where(x => x.IsActive && x.WhatsAppConsent != null && (x.WhatsAppConsent.OptInStatusUpdates || x.WhatsAppConsent.OptInArrivalPhotos || x.WhatsAppConsent.OptInDeparturePhotos))
            .ToListAsync(ct);

        var text = format.ToLower() == "vcf"
            ? string.Join("\n", customers.Select(c => $"BEGIN:VCARD\nVERSION:3.0\nFN:{c.Name}\nTEL:{c.PrimaryPhone}\nEND:VCARD"))
            : "name,phone\n" + string.Join("\n", customers.Select(c => $"\"{c.Name}\",\"{c.PrimaryPhone}\""));

        await using var ms = new MemoryStream(Encoding.UTF8.GetBytes(text));
        var ext = format.ToLower() == "vcf" ? "vcf" : "csv";
        var key = $"exports/reports/{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid()}." + ext;
        var container = cfg["AzureBlob:ExportsContainer"] ?? "exports";
        var (_, url) = await blob.UploadAsync(container, $"group-helper.{ext}", ms, "text/plain", key, ct);
        return url;
    }

    public async Task<string> GenerateCustomersExcelAsync(CancellationToken ct = default)
    {
        var customers = await db.Customers.Include(x => x.WhatsAppConsent)
            .OrderBy(x => x.Name)
            .ToListAsync(ct);

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Customers");

        var headers = new[] { "Id", "Name", "Primary Phone", "Email", "Company", "Tax Id", "Billing Address", "Active", "Opt-In Status Updates", "Opt-In Departure Photos", "Opt-In Arrival Photos" };
        for (var c = 0; c < headers.Length; c++) ws.Cell(1, c + 1).Value = headers[c];
        StyleColumnHeaders(ws.Range(1, 1, 1, headers.Length));

        var row = 2;
        foreach (var c in customers)
        {
            ws.Cell(row, 1).Value = c.Id;
            ws.Cell(row, 2).Value = c.Name;
            ws.Cell(row, 3).Value = c.PrimaryPhone;
            ws.Cell(row, 4).Value = c.Email ?? string.Empty;
            ws.Cell(row, 5).Value = c.CompanyName ?? string.Empty;
            ws.Cell(row, 6).Value = c.TaxId ?? string.Empty;
            ws.Cell(row, 7).Value = c.BillingAddress ?? string.Empty;
            ws.Cell(row, 8).Value = c.IsActive ? "Yes" : "No";
            ws.Cell(row, 9).Value = c.WhatsAppConsent?.OptInStatusUpdates == true ? "Yes" : "No";
            ws.Cell(row, 10).Value = c.WhatsAppConsent?.OptInDeparturePhotos == true ? "Yes" : "No";
            ws.Cell(row, 11).Value = c.WhatsAppConsent?.OptInArrivalPhotos == true ? "Yes" : "No";
            StyleDataRow(ws.Range(row, 1, row, headers.Length), row);
            row++;
        }

        ws.Column(1).Width = 6;  ws.Column(2).Width = 28; ws.Column(3).Width = 16;
        ws.Column(4).Width = 28; ws.Column(5).Width = 24; ws.Column(6).Width = 14;
        ws.Column(7).Width = 36; ws.Column(8).Width = 8;
        ws.Column(9).Width = 14; ws.Column(10).Width = 14; ws.Column(11).Width = 14;
        ws.SheetView.FreezeRows(1);

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        ms.Position = 0;
        var fileName = $"Customers - {DateTime.UtcNow:yyyy-MM-dd}.xlsx";
        var key = $"exports/reports/{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid()}.xlsx";
        var container = cfg["AzureBlob:ExportsContainer"] ?? "exports";
        var (_, url) = await blob.UploadAsync(container, fileName, ms, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", key, ct);
        return url;
    }

    // ── Shared styling constants ──
    // Navy/blue palette unifies BOL + Customer Invoice with the Commercial
    // Invoice + Packing List look (which use the same colors defined in
    // CommercialDocumentBuilder).
    private static readonly XLColor TableHeaderFill = XLColor.FromHtml("#3D6FA3");
    private static readonly XLColor TableHeaderText = XLColor.FromHtml("#FFFFFF");
    private static readonly XLColor RowAltFill      = XLColor.FromHtml("#E8F0F8");
    private static readonly XLColor BorderNavy      = XLColor.FromHtml("#1F3A5F");
    private static readonly XLColor FooterTotalFill = XLColor.FromHtml("#D6E3F0");
    private static readonly XLColor DateLabelText   = XLColor.FromHtml("#1F3A5F");

    public async Task<string> GenerateShipmentBolReportAsync(int shipmentId, CancellationToken ct = default)
    {
        var shipment = await LoadShipmentExportData(shipmentId, ct);
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("BOL Report");

        // Pricing currency context — all packages on the shipment share the same
        // PricingConfig.Currency at calc time, so a single header label is enough.
        var currencyCode = shipment.Packages
            .Where(p => p.Status != PackageStatus.Cancelled)
            .Select(p => p.Currency)
            .FirstOrDefault() ?? "USD";
        var currencyEntity = await db.Currencies.FirstOrDefaultAsync(c => c.Code == currencyCode, ct);
        var currencySymbol = currencyEntity?.Symbol ?? currencyCode;
        // XAF (FCFA) doesn't use decimals in practice; everything else gets two.
        var amountFormat = string.Equals(currencyCode, "XAF", StringComparison.OrdinalIgnoreCase) ? "#,##0" : "#,##0.00";

        // ── Title row ──
        ws.Range("A1:I1").Merge().SetValue("BILL OF LADING");
        StyleTitle(ws.Range("A1:I1"), 16);

        // ── Metadata rows ──
        ws.Cell("A3").Value = "Container:"; ws.Cell("B3").Value = shipment.RefCode;
        ws.Cell("C3").Value = "TIIU:"; ws.Cell("D3").Value = shipment.TiiuCode ?? "—";
        ws.Cell("F3").Value = "BL No:"; ws.Cell("G3").Value = shipment.RefCode;
        ws.Cell("H3").Value = "Currency:"; ws.Cell("I3").Value = $"{currencyCode} ({currencySymbol})";
        StyleMetaRow(ws.Range("A3:I3"));
        ws.Cell("A3").Style.Font.Bold = true; ws.Cell("C3").Style.Font.Bold = true; ws.Cell("F3").Style.Font.Bold = true; ws.Cell("H3").Style.Font.Bold = true;

        ws.Cell("A4").Value = "Origin:"; ws.Cell("B4").Value = $"{shipment.OriginWarehouse.Name} ({shipment.OriginWarehouse.Code})";
        ws.Cell("C4").Value = "Destination:"; ws.Cell("D4").Value = $"{shipment.DestinationWarehouse.Name} ({shipment.DestinationWarehouse.Code})";
        StyleMetaRow(ws.Range("A4:I4"));
        ws.Cell("A4").Style.Font.Bold = true; ws.Cell("C4").Style.Font.Bold = true;

        ws.Cell("A5").Value = "Departure EXW:"; ws.Cell("B5").Value = shipment.PlannedDepartureDate.ToString("dd MMM yyyy");
        ws.Cell("C5").Value = "Departure POL:"; ws.Cell("D5").Value = shipment.PlannedDepartureDate.ToString("dd MMM yyyy");
        ws.Cell("F5").Value = "Arrival POD:"; ws.Cell("G5").Value = shipment.PlannedArrivalDate.ToString("dd MMM yyyy");
        StyleMetaRow(ws.Range("A5:I5"));
        ws.Cell("A5").Style.Font.Bold = true; ws.Cell("C5").Style.Font.Bold = true; ws.Cell("F5").Style.Font.Bold = true;

        ws.Cell("I6").SetValue($"Generated: {DateTime.UtcNow:dd MMM yyyy HH:mm} UTC");
        ws.Cell("I6").Style.Font.Italic = true;
        ws.Cell("I6").Style.Font.FontColor = XLColor.Gray;
        ws.Cell("I6").Style.Font.FontSize = 9;
        ws.Cell("I6").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

        // ── Column Headers ──
        var headers = new[] { "#", "Customer", "CBM", "Weight (Tons)", "Rate", "Freight", "Fees", "Total", "Notes" };
        for (var c = 0; c < headers.Length; c++)
            ws.Cell(8, c + 1).Value = headers[c];
        StyleColumnHeaders(ws.Range(8, 1, 8, 9));

        // ── Data ──
        var grouped = shipment.Packages
            .Where(p => p.Status != PackageStatus.Cancelled)
            .GroupBy(p => p.Customer)
            .Select((g, i) => new
            {
                No = i + 1,
                CustomerName = g.Key.Name,
                Cbm = g.Sum(x => x.Cbm),
                WeightTons = g.Sum(x => x.WeightKg) / 1000m,
                Rate = g.Average(x => x.WeightKg * x.AppliedRatePerKg >= x.Cbm * x.AppliedRatePerCbm ? x.AppliedRatePerKg : x.AppliedRatePerCbm),
                Freight = g.Sum(x => x.ChargeAmount),
                Fees = 0m,
            })
            .ToList();

        var row = 9;
        foreach (var g in grouped)
        {
            ws.Cell(row, 1).Value = g.No;
            ws.Cell(row, 2).Value = g.CustomerName;
            ws.Cell(row, 3).Value = g.Cbm; ws.Cell(row, 3).Style.NumberFormat.Format = "#,##0.000";
            ws.Cell(row, 4).Value = g.WeightTons; ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0.000";
            ws.Cell(row, 5).Value = g.Rate; ws.Cell(row, 5).Style.NumberFormat.Format = amountFormat;
            ws.Cell(row, 6).Value = g.Freight; ws.Cell(row, 6).Style.NumberFormat.Format = amountFormat;
            ws.Cell(row, 7).Value = g.Fees; ws.Cell(row, 7).Style.NumberFormat.Format = amountFormat;
            ws.Cell(row, 8).Value = g.Freight + g.Fees; ws.Cell(row, 8).Style.NumberFormat.Format = amountFormat; ws.Cell(row, 8).Style.Font.Bold = true;
            ws.Cell(row, 9).Value = "";
            StyleDataRow(ws.Range(row, 1, row, 9), row);
            row++;
        }

        // ── Totals row ──
        ws.Cell(row, 2).Value = "TOTAL"; ws.Cell(row, 2).Style.Font.Bold = true;
        ws.Cell(row, 3).Value = grouped.Sum(x => x.Cbm); ws.Cell(row, 3).Style.NumberFormat.Format = "#,##0.000";
        ws.Cell(row, 4).Value = grouped.Sum(x => x.WeightTons); ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0.000";
        ws.Cell(row, 6).Value = grouped.Sum(x => x.Freight); ws.Cell(row, 6).Style.NumberFormat.Format = amountFormat;
        ws.Cell(row, 7).Value = grouped.Sum(x => x.Fees); ws.Cell(row, 7).Style.NumberFormat.Format = amountFormat;
        ws.Cell(row, 8).Value = grouped.Sum(x => x.Freight + x.Fees); ws.Cell(row, 8).Style.NumberFormat.Format = amountFormat;
        var totalsRange = ws.Range(row, 1, row, 9);
        totalsRange.Style.Font.Bold = true;
        totalsRange.Style.Border.TopBorder = XLBorderStyleValues.Double;

        // ── Column widths + layout ──
        ws.Column(1).Width = 5; ws.Column(2).Width = 30; ws.Column(3).Width = 12;
        ws.Column(4).Width = 14; ws.Column(5).Width = 12; ws.Column(6).Width = 14;
        ws.Column(7).Width = 12; ws.Column(8).Width = 14; ws.Column(9).Width = 20;
        ws.SheetView.FreezeRows(8);
        ws.PageSetup.PageOrientation = XLPageOrientation.Landscape;
        ws.PageSetup.FitToPages(1, 0);
        ApplyOuterBorder(ws);

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        ms.Position = 0;
        var fileName = $"BOL Report - {shipment.RefCode}.xlsx";
        var key = $"exports/reports/{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid()}.xlsx";
        var container = cfg["AzureBlob:ExportsContainer"] ?? "exports";
        var (_, url) = await blob.UploadAsync(container, fileName, ms, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", key, ct);
        return url;
    }

    public async Task<string> GenerateShipmentCustomerInvoicesExcelAsync(int shipmentId, CancellationToken ct = default)
    {
        var shipment = await LoadShipmentExportData(shipmentId, ct);
        using var workbook = new XLWorkbook();

        var grouped = shipment.Packages
            .Where(p => p.Status != PackageStatus.Cancelled)
            .GroupBy(p => p.Customer)
            .OrderBy(g => g.Key.Name)
            .ToList();

        if (grouped.Count == 0)
            throw new InvalidOperationException("Shipment has no active packages to export.");

        // Resolve the symbol from the Currencies table so the invoice
        // header reads e.g. "Freight: 12,500 FCFA" instead of just "XAF".
        var currencyCode = grouped[0].FirstOrDefault()?.Currency ?? "USD";
        var currencyEntity = await db.Currencies.FirstOrDefaultAsync(c => c.Code == currencyCode, ct);
        var currencySymbol = currencyEntity?.Symbol ?? currencyCode;

        for (var i = 0; i < grouped.Count; i++)
        {
            var g = grouped[i];
            var name = SafeSheetName($"{i + 1}-{g.Key.Name}", i + 1);
            var ws = workbook.Worksheets.Add(name);
            FillCustomerInvoiceSheet(ws, shipment, g, currencySymbol);
        }

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        ms.Position = 0;
        var fileName = $"Customer Invoices - {shipment.RefCode}.xlsx";
        var key = $"exports/reports/{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid()}.xlsx";
        var container = cfg["AzureBlob:ExportsContainer"] ?? "exports";
        var (_, url) = await blob.UploadAsync(container, fileName, ms, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", key, ct);
        return url;
    }

    private static string SafeSheetName(string input, int index)
    {
        var invalid = new[] { ':', '\\', '/', '?', '*', '[', ']' };
        var clean = new string(input.Select(c => invalid.Contains(c) ? '-' : c).ToArray()).Trim();
        if (string.IsNullOrWhiteSpace(clean)) clean = $"Customer {index}";
        return clean.Length <= 31 ? clean : clean[..31];
    }

    private static void FillCustomerInvoiceSheet(IXLWorksheet ws, Shipment shipment, IGrouping<Customer, Package> group, string currencySymbol)
    {
        var customer = group.Key;
        var totalCbm = group.Sum(x => x.Cbm);
        var totalWeight = group.Sum(x => x.WeightKg);
        var totalFreight = group.Sum(x => x.ChargeAmount);

        // ── Title ──
        ws.Range("A1:D1").Merge().SetValue("CUSTOMER INVOICE");
        StyleTitle(ws.Range("A1:D1"), 14);

        // ── Metadata ──
        ws.Cell("A3").Value = $"Client: {customer.Name.ToUpperInvariant()}";
        ws.Cell("C3").Value = $"Code: {customer.Id}";
        StyleMetaRow(ws.Range("A3:D3"));
        ws.Cell("A3").Style.Font.Bold = true; ws.Cell("C3").Style.Font.Bold = true;

        ws.Cell("A4").Value = $"Phone: {customer.PrimaryPhone}";
        ws.Cell("C4").Value = $"Shipment: {shipment.RefCode}";
        StyleMetaRow(ws.Range("A4:D4"));

        ws.Cell("A5").Value = $"CBM: {Math.Round(totalCbm, 3)} m\u00B3";
        ws.Cell("B5").Value = $"Weight: {totalWeight / 1000m:N3} t";
        ws.Cell("C5").Value = totalFreight <= 0 ? "FOR FREE" : $"Freight: {Math.Round(totalFreight, 0):N0} {currencySymbol}";
        StyleMetaRow(ws.Range("A5:D5"));
        ws.Cell("A5").Style.Font.Bold = true; ws.Cell("B5").Style.Font.Bold = true; ws.Cell("C5").Style.Font.Bold = true;

        // ── Column Headers ──
        ws.Cell(7, 1).Value = "Item"; ws.Cell(7, 2).Value = "Qty"; ws.Cell(7, 3).Value = "Unit"; ws.Cell(7, 4).Value = "Notes";
        StyleColumnHeaders(ws.Range(7, 1, 7, 4));

        // ── Data ──
        var row = 8;
        var lines = group.SelectMany(p => p.Items.Select(i => new { Item = i, PackageNote = p.Note })).ToList();
        if (lines.Count == 0)
        {
            ws.Cell(row, 1).Value = "N/A";
            ws.Cell(row, 2).Value = 1;
            ws.Cell(row, 3).Value = UnitLabels.En[Unit.Box];
            ws.Cell(row, 4).Value = "No items recorded";
            StyleDataRow(ws.Range(row, 1, row, 4), row);
        }
        else
        {
            foreach (var line in lines)
            {
                ws.Cell(row, 1).Value = ShippingPlatform.Api.Services.Exports.CommercialDocumentBuilder.FormatItemName(line.Item.GoodType, line.Item.GoodTypeId);
                ws.Cell(row, 1).Style.Alignment.WrapText = true;
                ws.Cell(row, 2).Value = line.Item.Quantity;
                ws.Cell(row, 3).Value = UnitLabels.En.TryGetValue(line.Item.Unit, out var label) ? label : line.Item.Unit.ToString();
                ws.Cell(row, 4).Value = string.IsNullOrWhiteSpace(line.Item.Note) ? (line.PackageNote ?? string.Empty) : line.Item.Note;
                StyleDataRow(ws.Range(row, 1, row, 4), row);
                row++;
            }
        }

        // ── Column widths + layout ──
        ws.Column(1).Width = 30; ws.Column(2).Width = 10; ws.Column(3).Width = 10; ws.Column(4).Width = 40;
        ws.Column(2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        ws.Column(3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        ws.Column(4).Style.Alignment.WrapText = true;
        ws.SheetView.FreezeRows(7);
        ws.PageSetup.PageOrientation = XLPageOrientation.Portrait;
        ws.PageSetup.FitToPages(1, 0);
        ApplyOuterBorder(ws);
    }

    // ── Shared styling helpers ──
    private static void StyleTitle(IXLRange range, int fontSize)
    {
        range.Style.Font.Bold = true;
        range.Style.Font.FontSize = fontSize;
        range.Style.Font.FontColor = TableHeaderText;
        range.Style.Fill.BackgroundColor = TableHeaderFill;
        range.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        range.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        range.Worksheet.Row(range.FirstRow().RowNumber()).Height = fontSize * 2.2;
    }

    private static void StyleMetaRow(IXLRange range)
    {
        range.Style.Font.FontSize = 10;
        range.Style.Font.FontColor = DateLabelText;
    }

    private static void StyleColumnHeaders(IXLRange range)
    {
        range.Style.Font.Bold = true;
        range.Style.Font.FontColor = TableHeaderText;
        range.Style.Fill.BackgroundColor = TableHeaderFill;
        range.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        range.Style.Border.TopBorder = XLBorderStyleValues.Medium;
        range.Style.Border.BottomBorder = XLBorderStyleValues.Medium;
        range.Style.Border.TopBorderColor = BorderNavy;
        range.Style.Border.BottomBorderColor = BorderNavy;
    }

    private static void StyleDataRow(IXLRange range, int rowIndex)
    {
        if (rowIndex % 2 == 0) range.Style.Fill.BackgroundColor = RowAltFill;
        range.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        range.Style.Border.InsideBorderColor = BorderNavy;
        range.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        range.Style.Border.OutsideBorderColor = BorderNavy;
    }

    // Applies a thick navy outer border to the used range — gives BOL + Customer
    // Invoice the same framed look as Commercial Invoice + Packing List.
    private static void ApplyOuterBorder(IXLWorksheet ws)
    {
        var used = ws.RangeUsed();
        if (used is null) return;
        used.Style.Border.OutsideBorder = XLBorderStyleValues.Thick;
        used.Style.Border.OutsideBorderColor = BorderNavy;
    }

    // Footer/total rows: light-blue fill + navy text + thick navy top border.
    private static void StyleFooterRow(IXLRange range)
    {
        range.Style.Font.Bold = true;
        range.Style.Font.FontColor = DateLabelText;
        range.Style.Fill.BackgroundColor = FooterTotalFill;
        range.Style.Border.TopBorder = XLBorderStyleValues.Medium;
        range.Style.Border.TopBorderColor = BorderNavy;
    }

    public async Task<string> GenerateShipmentCommercialDocumentsAsync(int shipmentId, CancellationToken ct = default)
    {
        var shipment = await LoadShipmentExportData(shipmentId, ct);

        if (shipment.InvoiceNumber is null)
        {
            var year = DateTime.UtcNow.Year;
            var seq = await invoiceSeq.NextAsync(year);
            shipment.InvoiceNumber = seq;
            shipment.InvoiceYear = year;
            await db.SaveChangesAsync(ct);
        }

        // Resolve FX rates from the Currencies table via the snapshot service:
        // prefer Manual override → Departed snapshot → live FxRateService rate.
        // The commercial-invoice template hand-codes USD/EUR/XAF positions; the
        // numeric values flow in dynamically here, so changing the seeded
        // Currencies.Rate column ripples through every regenerated invoice.
        var eurSnap = await fxSnap.ResolveForInvoiceAsync(shipmentId, "EUR");
        var xafSnap = await fxSnap.ResolveForInvoiceAsync(shipmentId, "XAF");
        var eurRate = eurSnap?.RateToBase ?? 1m;
        var xafRate = xafSnap?.RateToBase ?? 0m;
        var rates = new ShippingPlatform.Api.Services.Exports.InvoiceFxRates(
            EurPerBase: eurRate,
            F8DisplayRate: eurRate,
            CountryPerEur: eurRate > 0 && xafRate > 0 ? eurRate / xafRate : 0m);

        using var workbook = new XLWorkbook();
        ShippingPlatform.Api.Services.Exports.CommercialDocumentBuilder.Fill(
            workbook, shipment, shipment.InvoiceNumber!.Value, shipment.InvoiceYear!.Value, invoiceTpl, rates);

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        ms.Position = 0;
        var destCountry = ShippingPlatform.Api.Services.Exports.CountryCodeHelper.FromWarehouseCountry(shipment.DestinationWarehouse?.Country);
        var fileName = $"Commercial Invoice ({destCountry}) - {shipment.RefCode}.xlsx";
        var key = $"exports/reports/{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid()}.xlsx";
        var container = cfg["AzureBlob:ExportsContainer"] ?? "exports";
        var (_, url) = await blob.UploadAsync(container, fileName, ms, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", key, ct);
        return url;
    }

    private async Task<Shipment> LoadShipmentExportData(int shipmentId, CancellationToken ct)
    {
        var shipment = await db.Shipments
            .Include(s => s.OriginWarehouse)
            .Include(s => s.DestinationWarehouse)
            .Include(s => s.Packages)
                .ThenInclude(p => p.Customer)
            .Include(s => s.Packages)
                .ThenInclude(p => p.Items)
                    .ThenInclude(i => i.GoodType)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == shipmentId, ct);

        if (shipment is null)
            throw new KeyNotFoundException("Shipment not found.");

        return shipment;
    }
}
