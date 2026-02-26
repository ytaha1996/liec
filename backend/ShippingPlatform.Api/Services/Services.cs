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
        var wh = await db.Warehouses.FindAsync(originWarehouseId) ?? throw new InvalidOperationException("Origin warehouse not found");
        var yy = DateTime.UtcNow.Year % 100;
        var seq = await db.ShipmentSequences.FirstOrDefaultAsync(x => x.OriginWarehouseCode == wh.Code && x.Year == DateTime.UtcNow.Year);
        if (seq is null) { seq = new ShipmentSequence { OriginWarehouseCode = wh.Code, Year = DateTime.UtcNow.Year, LastNumber = 0 }; db.ShipmentSequences.Add(seq); }
        seq.LastNumber++;
        await db.SaveChangesAsync();
        return $"{wh.Code}-{yy:00}{seq.LastNumber:00}";
    }
}

public interface IPricingService { Task RecalculateAsync(Package package); }
public class PricingService(AppDbContext db) : IPricingService
{
    public async Task RecalculateAsync(Package package)
    {
        if (package.Status >= PackageStatus.Shipped) return;
        await db.Entry(package).Collection(x => x.Items).LoadAsync();
        var goodIds = package.Items.Select(x => x.GoodId).Distinct().ToList();
        var goods = await db.Goods.Include(x => x.GoodType).Where(x => goodIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id);
        var active = await db.PricingConfigs.FirstOrDefaultAsync(x => x.Status == PricingConfigStatus.Active) ?? new PricingConfig { DefaultRatePerKg = 1, DefaultRatePerM3 = 1, Currency = "EUR" };

        package.TotalWeightKg = package.Items.Sum(x => x.WeightKg * x.Quantity);
        package.TotalVolumeM3 = package.Items.Sum(x => x.VolumeM3 * x.Quantity);

        decimal rateKg = package.PricingRateOverridePerKg > 0 ? package.PricingRateOverridePerKg : active.DefaultRatePerKg;
        decimal rateM3 = package.PricingRateOverridePerM3 > 0 ? package.PricingRateOverridePerM3 : active.DefaultRatePerM3;
        foreach (var i in package.Items)
        {
            var g = goods[i.GoodId];
            var itemRateKg = package.PricingRateOverridePerKg > 0 ? package.PricingRateOverridePerKg : (g.RatePerKgOverride ?? g.GoodType.RatePerKg ?? active.DefaultRatePerKg);
            var itemRateM3 = package.PricingRateOverridePerM3 > 0 ? package.PricingRateOverridePerM3 : (g.RatePerM3Override ?? g.GoodType.RatePerM3 ?? active.DefaultRatePerM3);
            i.LineCharge = Math.Max(i.WeightKg * i.Quantity * itemRateKg, i.VolumeM3 * i.Quantity * itemRateM3);
            rateKg = itemRateKg;
            rateM3 = itemRateM3;
        }

        package.AppliedRatePerKg = rateKg;
        package.AppliedRatePerM3 = rateM3;
        package.Currency = active.Currency;
        package.SubtotalAmount = Math.Max(package.TotalWeightKg * rateKg, package.TotalVolumeM3 * rateM3);
        var discountFactor = Math.Max(0m, 1m - (package.CustomerDiscountPercent / 100m));
        package.ChargeAmount = Math.Round((package.SubtotalAmount * discountFactor) + package.AdditionalFeesAmount, 2);
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
