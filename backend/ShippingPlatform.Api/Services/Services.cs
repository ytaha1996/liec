using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Azure.Storage.Blobs;
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
            claims: [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Email, user.Email), new Claim(ClaimTypes.Role, "AdminUser")],
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public interface IBlobStorageService { Task<(string blobKey, string publicUrl)> UploadAsync(string container, string fileName, Stream stream, string contentType, string? forcedBlobKey = null, CancellationToken ct = default); }
public class BlobStorageService(IConfiguration cfg) : IBlobStorageService
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
            return (blobKey, $"https://public.local/{blobKey}");

        var service = new BlobServiceClient(conn);
        var c = service.GetBlobContainerClient(container);
        await c.CreateIfNotExistsAsync(cancellationToken: ct);
        await c.SetAccessPolicyAsync(Azure.Storage.Blobs.Models.PublicAccessType.Blob, cancellationToken: ct);
        var blob = c.GetBlobClient(blobKey);
        await blob.UploadAsync(stream, new Azure.Storage.Blobs.Models.BlobHttpHeaders { ContentType = contentType }, cancellationToken: ct);
        return (blobKey, blob.Uri.ToString());
    }
}

public interface IRefCodeService { Task<string> GenerateAsync(int originWarehouseId); }
public class RefCodeService(AppDbContext db) : IRefCodeService
{
    public async Task<string> GenerateAsync(int originWarehouseId)
    {
        var origin = await db.Warehouses.FirstAsync(x => x.Id == originWarehouseId);
        var year = DateTime.UtcNow.Year;
        var yy = year % 100;
        var seq = await db.ShipmentSequences.FirstOrDefaultAsync(x => x.Year == year && x.OriginWarehouseCode == origin.Code);
        if (seq is null) { seq = new ShipmentSequence { OriginWarehouseCode = origin.Code, Year = year, LastNumber = 0 }; db.ShipmentSequences.Add(seq); }
        seq.LastNumber++;
        await db.SaveChangesAsync();
        return $"{origin.Code}-{yy:D2}{seq.LastNumber:D2}";
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
            using var paint = new SkiaSharp.SKPaint
            {
                Color = SkiaSharp.SKColors.White.WithAlpha(210),
                TextSize = Math.Max(bitmap.Height * 0.04f, 18),
                IsAntialias = true,
                Typeface = SkiaSharp.SKTypeface.Default,
            };
            using var shadow = paint.Clone();
            shadow.Color = SkiaSharp.SKColors.Black.WithAlpha(180);
            canvas.DrawText(text, 12, paint.TextSize + 8, shadow);
            canvas.DrawText(text, 10, paint.TextSize + 6, paint);
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
        if (package.Status >= PackageStatus.Shipped || package.HasPricingOverride) return;

        var active = await db.PricingConfigs.FirstOrDefaultAsync(x => x.Status == PricingConfigStatus.Active)
            ?? new PricingConfig { DefaultRatePerKg = 1, DefaultRatePerCbm = 1, Currency = "EUR" };

        decimal rateKg = active.DefaultRatePerKg;
        decimal rateCbm = active.DefaultRatePerCbm;

        package.AppliedRatePerKg = rateKg;
        package.AppliedRatePerCbm = rateCbm;
        package.Currency = active.Currency;
        package.ChargeAmount = Math.Max(package.WeightKg * rateKg, package.Cbm * rateCbm);
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
        return ps.Where(x => !x.Media.Any(m => m.Stage == stage) || (stage == MediaStage.Arrival && !finalized(x)))
            .Select(x => new MissingGateItem(x.Id, x.Customer.Name, stage)).ToList();
    }
}

public interface IWhatsAppSender { Task<(bool ok, string? err)> SendAsync(string phone, string text, IEnumerable<string>? mediaUrls = null); }
public class StubWhatsAppSender : IWhatsAppSender { public Task<(bool ok, string? err)> SendAsync(string phone, string text, IEnumerable<string>? mediaUrls = null) => Task.FromResult<(bool, string?)>((true, null)); }

public interface IExportService { Task<string> GenerateGroupHelperAsync(string format, CancellationToken ct = default); }
public class ExportService(AppDbContext db, IBlobStorageService blob, IConfiguration cfg) : IExportService
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
}


public record ShipmentTrackingSnapshot(string Code, string? Name, string? Origin, string? Destination, DateTime? EstimatedArrivalAt, string? Status);

public interface IShipmentTrackingLookupService
{
    Task<ShipmentTrackingSnapshot?> LookupAsync(string code, CancellationToken ct = default);
}

public class ShipmentTrackingLookupService(HttpClient http) : IShipmentTrackingLookupService
{
    public async Task<ShipmentTrackingSnapshot?> LookupAsync(string code, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        try
        {
            var res = await http.GetAsync($"https://api.maerskline.com/track/{Uri.EscapeDataString(code)}", ct);
            // Public free APIs are inconsistent; fail-open and return unknown when unavailable.
            if (!res.IsSuccessStatusCode) return new ShipmentTrackingSnapshot(code, null, null, null, null, "Unknown");
            return new ShipmentTrackingSnapshot(code, null, null, null, null, "Unknown");
        }
        catch
        {
            return new ShipmentTrackingSnapshot(code, null, null, null, null, "Unknown");
        }
    }
}
