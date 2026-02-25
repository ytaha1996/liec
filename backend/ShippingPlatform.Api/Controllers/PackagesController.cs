using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
public class PackagesController(AppDbContext db, IPricingService pricing, IPhotoComplianceService gates, IBlobStorageService blob, IConfiguration cfg, ITransitionRuleService transitions) : ControllerBase
{
    [HttpPost("api/shipments/{shipmentId:int}/packages")]
    public async Task<IActionResult> Create(int shipmentId, CreatePackageRequest input)
    {
        var package = new Package
        {
            ShipmentId = shipmentId,
            CustomerId = input.CustomerId,
            ProvisionMethod = input.ProvisionMethod,
            SupplyOrderId = input.SupplyOrderId,
            Status = PackageStatus.Draft
        };
        db.Packages.Add(package);
        await db.SaveChangesAsync();
        return Created($"/api/packages/{package.Id}", package.ToDto());
    }

    [HttpGet("api/packages")]
    public async Task<IActionResult> List() => Ok((await db.Packages.Include(x => x.Items).ToListAsync()).Select(x => x.ToDto()));

    [HttpGet("api/packages/{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var p = await db.Packages.Include(x => x.Items).Include(x => x.Media).FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();
        return Ok(new
        {
            package = p.ToDto(),
            items = p.Items.Select(i => i.ToDto()),
            media = p.Media.Select(m => new { m.Id, m.Stage, m.PublicUrl, m.BlobKey, m.CapturedAt, m.OperatorName, m.Notes })
        });
    }

    [HttpPost("api/packages/{id:int}/receive")] public Task<IActionResult> Receive(int id) => SetStatus(id, PackageStatus.Received);

    [HttpPost("api/packages/{id:int}/pack")]
    public async Task<IActionResult> Pack(int id)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return NotFound();
        if (!transitions.CanMove(p.Status, PackageStatus.Packed)) return Conflict(new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {p.Status} to Packed." });
        p.Status = PackageStatus.Packed;
        await pricing.RecalculateAsync(p);
        await db.SaveChangesAsync();
        return Ok(p.ToDto());
    }

    [HttpPost("api/packages/{id:int}/ready-to-ship")] public Task<IActionResult> Ready(int id) => SetStatus(id, PackageStatus.ReadyToShip);

    [HttpPost("api/packages/{id:int}/ship")]
    public async Task<IActionResult> Ship(int id)
    {
        var p = await db.Packages.Include(x => x.Customer).Include(x => x.Media).FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();
        if (!p.Media.Any(m => m.Stage == MediaStage.Departure))
            return Conflict(new GateFailure("PHOTO_GATE_FAILED", "Package cannot be shipped before departure photos are uploaded.", [new MissingGateItem(p.Id, p.Customer.CustomerRef, MediaStage.Departure)]));
        if (!transitions.CanMove(p.Status, PackageStatus.Shipped)) return Conflict(new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {p.Status} to Shipped." });
        p.Status = PackageStatus.Shipped;
        await db.SaveChangesAsync();
        return Ok(p.ToDto());
    }

    [HttpPost("api/packages/{id:int}/arrive-destination")] public Task<IActionResult> ArriveDestination(int id) => SetStatus(id, PackageStatus.ArrivedAtDestination);
    [HttpPost("api/packages/{id:int}/ready-for-handout")] public Task<IActionResult> ReadyForHandout(int id) => SetStatus(id, PackageStatus.ReadyForHandout);

    [HttpPost("api/packages/{id:int}/handout")]
    public async Task<IActionResult> Handout(int id)
    {
        var missing = await gates.MissingForPackageHandoutAsync(id);
        if (missing.Count > 0) return Conflict(new GateFailure("PHOTO_GATE_FAILED", "Package cannot be handed out before arrival photos are uploaded.", missing));
        return await SetStatus(id, PackageStatus.HandedOut);
    }

    [HttpPost("api/packages/{id:int}/items")]
    public async Task<IActionResult> AddItem(int id, UpsertPackageItemRequest item)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return NotFound();
        if (p.Status >= PackageStatus.Shipped) return Conflict(new { code = "PACKAGE_LOCKED", message = "Package is shipped and immutable." });
        var entity = new PackageItem { PackageId = id, GoodId = item.GoodId, Quantity = item.Quantity, WeightKg = item.WeightKg, VolumeM3 = item.VolumeM3 };
        db.PackageItems.Add(entity);
        await db.SaveChangesAsync();
        await pricing.RecalculateAsync(p);
        await db.SaveChangesAsync();
        return Ok(entity.ToDto());
    }

    [HttpPut("api/packages/{id:int}/items/{itemId:int}")]
    public async Task<IActionResult> UpdateItem(int id, int itemId, UpsertPackageItemRequest input)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return NotFound();
        if (p.Status >= PackageStatus.Shipped) return Conflict(new { code = "PACKAGE_LOCKED", message = "Package is shipped and immutable." });
        var i = await db.PackageItems.FirstOrDefaultAsync(x => x.PackageId == id && x.Id == itemId);
        if (i is null) return NotFound();
        i.GoodId = input.GoodId; i.Quantity = input.Quantity; i.WeightKg = input.WeightKg; i.VolumeM3 = input.VolumeM3;
        await db.SaveChangesAsync();
        await pricing.RecalculateAsync(p);
        await db.SaveChangesAsync();
        return Ok(i.ToDto());
    }

    [HttpDelete("api/packages/{id:int}/items/{itemId:int}")]
    public async Task<IActionResult> DeleteItem(int id, int itemId)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return NotFound();
        if (p.Status >= PackageStatus.Shipped) return Conflict(new { code = "PACKAGE_LOCKED", message = "Package is shipped and immutable." });
        var i = await db.PackageItems.FirstOrDefaultAsync(x => x.PackageId == id && x.Id == itemId);
        if (i is null) return NotFound();
        db.PackageItems.Remove(i);
        await db.SaveChangesAsync();
        await pricing.RecalculateAsync(p);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("api/packages/{id:int}/media")]
    public async Task<IActionResult> UploadMedia(int id, [FromForm] MediaUploadRequest req)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return NotFound();
        if (req.File is null || req.File.Length == 0) return BadRequest(new { code = "VALIDATION_ERROR", message = "File required." });

        await using var s = req.File.OpenReadStream();
        var ext = Path.GetExtension(req.File.FileName);
        var forced = $"media/packages/{id}/{req.Stage.ToString().ToLowerInvariant()}/{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid()}{ext}";
        var (key, url) = await blob.UploadAsync(cfg["AzureBlob:MediaContainer"] ?? "media", req.File.FileName, s, req.File.ContentType, forced);
        var media = new Media
        {
            PackageId = id,
            Stage = req.Stage,
            BlobKey = key,
            PublicUrl = url,
            CapturedAt = req.CapturedAt,
            OperatorName = req.OperatorName,
            Notes = req.Notes,
            RecordedByAdminUserId = 1
        };
        db.Media.Add(media);
        await db.SaveChangesAsync();

        p.HasDeparturePhotos = await db.Media.AnyAsync(x => x.PackageId == id && x.Stage == MediaStage.Departure);
        p.HasArrivalPhotos = await db.Media.AnyAsync(x => x.PackageId == id && x.Stage == MediaStage.Arrival);
        await db.SaveChangesAsync();
        return Ok(new { media.Id, media.Stage, media.PublicUrl, media.BlobKey, media.CapturedAt, media.OperatorName, media.Notes });
    }

    [HttpGet("api/packages/{id:int}/media")]
    public async Task<IActionResult> ListMedia(int id) => Ok(await db.Media.Where(x => x.PackageId == id).Select(m => new { m.Id, m.Stage, m.PublicUrl, m.BlobKey, m.CapturedAt, m.OperatorName, m.Notes }).ToListAsync());

    private async Task<IActionResult> SetStatus(int id, PackageStatus status)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return NotFound();
        if (!transitions.CanMove(p.Status, status)) return Conflict(new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {p.Status} to {status}." });
        p.Status = status;
        await db.SaveChangesAsync();
        return Ok(p.ToDto());
    }
}

public class MediaUploadRequest
{
    public MediaStage Stage { get; set; }
    public DateTime? CapturedAt { get; set; }
    public string? OperatorName { get; set; }
    public string? Notes { get; set; }
    public IFormFile? File { get; set; }
}
