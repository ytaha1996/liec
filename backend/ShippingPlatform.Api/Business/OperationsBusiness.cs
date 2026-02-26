using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Business;

public interface IShipmentBusiness
{
    Task<List<ShipmentDto>> ListAsync(ShipmentStatus? status);
    Task<ShipmentDto?> GetAsync(int id);
    Task<(ShipmentDto? dto, string? error)> CreateAsync(CreateShipmentRequest input);
    Task<(ShipmentDto? dto, object? error)> SetStatusAsync(int id, ShipmentStatus status);
    Task<(ShipmentDto? dto, GateFailure? gate, object? error)> ShipAsync(int id);
    Task<(ShipmentDto? dto, GateFailure? gate, object? error)> CompleteAsync(int id);
    Task<(ShipmentDto? dto, object? error)> ArchiveAsync(int id);
    Task<List<object>> MediaAsync(int id);
}

public class ShipmentBusiness(AppDbContext db, IRefCodeService refs, IPhotoComplianceService gates, ITransitionRuleService transitions) : IShipmentBusiness
{
    public async Task<List<ShipmentDto>> ListAsync(ShipmentStatus? status)
    {
        var q = db.Shipments.AsQueryable();
        if (status.HasValue) q = q.Where(x => x.Status == status);
        return (await q.OrderByDescending(x => x.CreatedAt).ToListAsync()).Select(x => x.ToDto()).ToList();
    }

    public async Task<ShipmentDto?> GetAsync(int id) => (await db.Shipments.FirstOrDefaultAsync(x => x.Id == id))?.ToDto();

    public async Task<(ShipmentDto? dto, string? error)> CreateAsync(CreateShipmentRequest input)
    {
        if (input.OriginWarehouseId == input.DestinationWarehouseId) return (null, "Origin and destination warehouse must be different.");
        var originExists = await db.Warehouses.AnyAsync(x => x.Id == input.OriginWarehouseId);
        if (!originExists) return (null, "Origin warehouse not found.");
        var shipment = new Shipment
        {
            OriginWarehouseId = input.OriginWarehouseId,
            DestinationWarehouseId = input.DestinationWarehouseId,
            PlannedDepartureDate = input.PlannedDepartureDate,
            PlannedArrivalDate = input.PlannedArrivalDate,
            MaxWeightKg = input.MaxWeightKg,
            MaxVolumeM3 = input.MaxVolumeM3,
            Status = ShipmentStatus.Draft,
            RefCode = await refs.GenerateAsync()
        };
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync();
        return (shipment.ToDto(), null);
    }

    public async Task<(ShipmentDto? dto, object? error)> SetStatusAsync(int id, ShipmentStatus status)
    {
        var s = await db.Shipments.FindAsync(id);
        if (s is null) return (null, null);
        if (!transitions.CanMove(s.Status, status)) return (null, new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {s.Status} to {status}." });
        s.Status = status;
        await db.SaveChangesAsync();
        return (s.ToDto(), null);
    }

    public async Task<(ShipmentDto? dto, GateFailure? gate, object? error)> ShipAsync(int id)
    {
        var missing = await gates.MissingForShipmentDepartureAsync(id);
        if (missing.Count > 0) return (null, new GateFailure("PHOTO_GATE_FAILED", "Shipment cannot ship until all packages have departure photos.", missing), null);
        var s = await db.Shipments.FindAsync(id);
        if (s is null) return (null, null, null);
        if (!transitions.CanMove(s.Status, ShipmentStatus.Shipped)) return (null, null, new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {s.Status} to Shipped." });
        s.Status = ShipmentStatus.Shipped; s.ActualDepartureAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return (s.ToDto(), null, null);
    }

    public async Task<(ShipmentDto? dto, GateFailure? gate, object? error)> CompleteAsync(int id)
    {
        var missing = await gates.MissingForShipmentCloseAsync(id);
        if (missing.Count > 0) return (null, new GateFailure("PHOTO_GATE_FAILED", "Shipment cannot complete until all packages have arrival photos and are finalized.", missing), null);
        var s = await db.Shipments.FindAsync(id);
        if (s is null) return (null, null, null);
        if (!transitions.CanMove(s.Status, ShipmentStatus.Completed)) return (null, null, new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {s.Status} to Completed." });
        s.Status = ShipmentStatus.Completed; await db.SaveChangesAsync();
        return (s.ToDto(), null, null);
    }

    public async Task<(ShipmentDto? dto, object? error)> ArchiveAsync(int id)
    {
        var s = await db.Shipments.FindAsync(id);
        if (s is null) return (null, null);
        if (!transitions.CanMove(s.Status, ShipmentStatus.Closed)) return (null, new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {s.Status} to Closed." });
        s.Status = ShipmentStatus.Closed;
        await db.SaveChangesAsync();
        return (s.ToDto(), null);
    }

    public async Task<List<object>> MediaAsync(int id)
    {
        return await db.Packages
            .Where(x => x.ShipmentId == id)
            .Include(x => x.Media)
            .Select(x => (object)new { packageId = x.Id, customerId = x.CustomerId, media = x.Media.Select(m => new { m.Id, m.Stage, m.PublicUrl, m.CapturedAt }) })
            .ToListAsync();
    }
}

public interface IPackageBusiness
{
    Task<PackageDto> CreateAsync(int shipmentId, CreatePackageRequest input);
    Task<(PackageDto? dto, object? error)> AutoAssignAsync(CreatePackageRequest input);
    Task<List<PackageDto>> ListAsync();
    Task<object?> GetAsync(int id);
    Task<(PackageDto? dto, object? error, GateFailure? gate)> ChangeStatusAsync(int id, PackageStatus status, bool checkDepartureGate = false, bool checkArrivalGate = false);
    Task<(PackageItemDto? dto, object? error)> AddItemAsync(int id, UpsertPackageItemRequest item);
    Task<(PackageItemDto? dto, object? error)> UpdateItemAsync(int id, int itemId, UpsertPackageItemRequest input);
    Task<object?> DeleteItemAsync(int id, int itemId);
    Task<object?> UploadMediaAsync(int id, MediaUploadRequest req);
    Task<List<object>> ListMediaAsync(int id);
    Task<(PackageDto? dto, object? error)> ApplyPricingOverrideAsync(int id, ApplyPricingOverrideRequest req, int adminUserId);
    Task<List<PricingOverrideDto>> GetPricingOverridesAsync(int id);
}

public class PackageBusiness(AppDbContext db, IPricingService pricing, IPhotoComplianceService gates, IBlobStorageService blob, IConfiguration cfg, ITransitionRuleService transitions, ICapacityService capacity, IImageWatermarkService watermark) : IPackageBusiness
{
    public async Task<PackageDto> CreateAsync(int shipmentId, CreatePackageRequest input)
    {
        var package = new Package { ShipmentId = shipmentId, CustomerId = input.CustomerId, ProvisionMethod = input.ProvisionMethod, SupplyOrderId = input.SupplyOrderId, Status = PackageStatus.Draft };
        db.Packages.Add(package); await db.SaveChangesAsync(); return package.ToDto();
    }

    public async Task<(PackageDto? dto, object? error)> AutoAssignAsync(CreatePackageRequest input)
    {
        var shipment = await db.Shipments
            .Where(s => s.Status == ShipmentStatus.Pending || s.Status == ShipmentStatus.NearlyFull)
            .OrderBy(s => s.CreatedAt)
            .FirstOrDefaultAsync();
        if (shipment is null) return (null, new { code = "NO_PENDING_CONTAINER", message = "No Pending container available for auto-assignment." });
        var dto = await CreateAsync(shipment.Id, input);
        return (dto, null);
    }

    public async Task<List<PackageDto>> ListAsync() => (await db.Packages.ToListAsync()).Select(x => x.ToDto()).ToList();

    public async Task<object?> GetAsync(int id)
    {
        var p = await db.Packages.Include(x => x.Items).Include(x => x.Media).FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return null;
        return new { package = p.ToDto(), items = p.Items.Select(i => i.ToDto()), media = p.Media.Select(m => new { m.Id, m.Stage, m.PublicUrl, m.BlobKey, m.CapturedAt, m.OperatorName, m.Notes }) };
    }

    public async Task<(PackageDto? dto, object? error, GateFailure? gate)> ChangeStatusAsync(int id, PackageStatus status, bool checkDepartureGate = false, bool checkArrivalGate = false)
    {
        var p = await db.Packages.Include(x => x.Customer).Include(x => x.Media).FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return (null, null, null);

        if (checkDepartureGate && !p.Media.Any(m => m.Stage == MediaStage.Departure))
            return (null, null, new GateFailure("PHOTO_GATE_FAILED", "Package cannot be shipped before departure photos are uploaded.", [new MissingGateItem(p.Id, p.Customer.Name, MediaStage.Departure)]));

        if (checkArrivalGate)
        {
            var missing = await gates.MissingForPackageHandoutAsync(id);
            if (missing.Count > 0) return (null, null, new GateFailure("PHOTO_GATE_FAILED", "Package cannot be handed out before arrival photos are uploaded.", missing));
        }

        if (!transitions.CanMove(p.Status, status)) return (null, new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {p.Status} to {status}." }, null);

        p.Status = status;
        if (status == PackageStatus.Packed) await pricing.RecalculateAsync(p);
        await db.SaveChangesAsync();
        return (p.ToDto(), null, null);
    }

    public async Task<(PackageItemDto? dto, object? error)> AddItemAsync(int id, UpsertPackageItemRequest item)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return (null, null);
        if (p.Status >= PackageStatus.Shipped) return (null, new { code = "PACKAGE_LOCKED", message = "Package is shipped and immutable." });

        var shipment = await db.Shipments.FindAsync(p.ShipmentId);
        if (shipment is not null)
        {
            var newWeight = p.TotalWeightKg + item.WeightKg * item.Quantity;
            var newVolume = p.TotalVolumeM3 + item.VolumeM3 * item.Quantity;
            if (shipment.MaxWeightKg > 0 && newWeight > shipment.MaxWeightKg)
                return (null, new { code = "CAPACITY_EXCEEDED", message = "Adding this item exceeds container weight capacity." });
            if (shipment.MaxVolumeM3 > 0 && newVolume > shipment.MaxVolumeM3)
                return (null, new { code = "CAPACITY_EXCEEDED", message = "Adding this item exceeds container volume capacity." });
        }

        var entity = new PackageItem { PackageId = id, GoodId = item.GoodId, Quantity = item.Quantity, WeightKg = item.WeightKg, VolumeM3 = item.VolumeM3 };
        db.PackageItems.Add(entity);
        await db.SaveChangesAsync();
        await pricing.RecalculateAsync(p);
        await db.SaveChangesAsync();
        await capacity.RecalculateAsync(p.ShipmentId);
        return (entity.ToDto(), null);
    }

    public async Task<(PackageItemDto? dto, object? error)> UpdateItemAsync(int id, int itemId, UpsertPackageItemRequest input)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return (null, null);
        if (p.Status >= PackageStatus.Shipped) return (null, new { code = "PACKAGE_LOCKED", message = "Package is shipped and immutable." });
        var i = await db.PackageItems.FirstOrDefaultAsync(x => x.PackageId == id && x.Id == itemId);
        if (i is null) return (null, null);

        var shipment = await db.Shipments.FindAsync(p.ShipmentId);
        if (shipment is not null)
        {
            var newWeight = p.TotalWeightKg - i.WeightKg * i.Quantity + input.WeightKg * input.Quantity;
            var newVolume = p.TotalVolumeM3 - i.VolumeM3 * i.Quantity + input.VolumeM3 * input.Quantity;
            if (shipment.MaxWeightKg > 0 && newWeight > shipment.MaxWeightKg)
                return (null, new { code = "CAPACITY_EXCEEDED", message = "Updating this item exceeds container weight capacity." });
            if (shipment.MaxVolumeM3 > 0 && newVolume > shipment.MaxVolumeM3)
                return (null, new { code = "CAPACITY_EXCEEDED", message = "Updating this item exceeds container volume capacity." });
        }

        i.GoodId = input.GoodId; i.Quantity = input.Quantity; i.WeightKg = input.WeightKg; i.VolumeM3 = input.VolumeM3;
        await db.SaveChangesAsync();
        await pricing.RecalculateAsync(p);
        await db.SaveChangesAsync();
        await capacity.RecalculateAsync(p.ShipmentId);
        return (i.ToDto(), null);
    }

    public async Task<object?> DeleteItemAsync(int id, int itemId)
    {
        var p = await db.Packages.FindAsync(id); if (p is null) return null;
        if (p.Status >= PackageStatus.Shipped) return new { code = "PACKAGE_LOCKED", message = "Package is shipped and immutable." };
        var i = await db.PackageItems.FirstOrDefaultAsync(x => x.PackageId == id && x.Id == itemId); if (i is null) return null;
        db.PackageItems.Remove(i);
        await db.SaveChangesAsync();
        await pricing.RecalculateAsync(p);
        await db.SaveChangesAsync();
        await capacity.RecalculateAsync(p.ShipmentId);
        return new { ok = true };
    }

    public async Task<object?> UploadMediaAsync(int id, MediaUploadRequest req)
    {
        var p = await db.Packages.Include(x => x.Customer).FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return null;
        if (req.File is null || req.File.Length == 0) return new { code = "VALIDATION_ERROR", message = "File required." };

        await using var rawStream = req.File.OpenReadStream();
        var processedStream = watermark.Apply(rawStream, p.Customer.Name, req.File.ContentType);
        var ext = Path.GetExtension(req.File.FileName);
        var forced = $"media/packages/{id}/{req.Stage.ToString().ToLowerInvariant()}/{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid()}{ext}";
        var (key, url) = await blob.UploadAsync(cfg["AzureBlob:MediaContainer"] ?? "media", req.File.FileName, processedStream, req.File.ContentType, forced);
        var media = new Media { PackageId = id, Stage = req.Stage, BlobKey = key, PublicUrl = url, CapturedAt = req.CapturedAt, OperatorName = req.OperatorName, Notes = req.Notes, RecordedByAdminUserId = 1 };
        db.Media.Add(media); await db.SaveChangesAsync();
        p.HasDeparturePhotos = await db.Media.AnyAsync(x => x.PackageId == id && x.Stage == MediaStage.Departure);
        p.HasArrivalPhotos = await db.Media.AnyAsync(x => x.PackageId == id && x.Stage == MediaStage.Arrival);
        await db.SaveChangesAsync();
        return new { media.Id, media.Stage, media.PublicUrl, media.BlobKey, media.CapturedAt, media.OperatorName, media.Notes };
    }

    public async Task<List<object>> ListMediaAsync(int id)
        => await db.Media.Where(x => x.PackageId == id).Select(m => (object)new { m.Id, m.Stage, m.PublicUrl, m.BlobKey, m.CapturedAt, m.OperatorName, m.Notes }).ToListAsync();

    public async Task<(PackageDto? dto, object? error)> ApplyPricingOverrideAsync(int id, ApplyPricingOverrideRequest req, int adminUserId)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return (null, null);
        if (p.Status >= PackageStatus.Shipped) return (null, new { code = "PACKAGE_LOCKED", message = "Cannot override pricing on a shipped package." });
        if (string.IsNullOrWhiteSpace(req.Reason)) return (null, new { code = "VALIDATION_ERROR", message = "Reason is required." });

        var originalValue = req.OverrideType switch
        {
            PricingOverrideType.RatePerKg => p.AppliedRatePerKg,
            PricingOverrideType.RatePerM3 => p.AppliedRatePerM3,
            _ => p.ChargeAmount
        };

        switch (req.OverrideType)
        {
            case PricingOverrideType.RatePerKg:
                p.AppliedRatePerKg = req.NewValue;
                p.ChargeAmount = Math.Max(p.TotalWeightKg * req.NewValue, p.TotalVolumeM3 * p.AppliedRatePerM3);
                break;
            case PricingOverrideType.RatePerM3:
                p.AppliedRatePerM3 = req.NewValue;
                p.ChargeAmount = Math.Max(p.TotalWeightKg * p.AppliedRatePerKg, p.TotalVolumeM3 * req.NewValue);
                break;
            case PricingOverrideType.TotalCharge:
                p.ChargeAmount = req.NewValue;
                break;
        }

        p.HasPricingOverride = true;
        db.PricingOverrides.Add(new PackagePricingOverride
        {
            PackageId = id,
            OverrideType = req.OverrideType,
            OriginalValue = originalValue,
            NewValue = req.NewValue,
            Reason = req.Reason,
            AdminUserId = adminUserId
        });
        await db.SaveChangesAsync();
        return (p.ToDto(), null);
    }

    public async Task<List<PricingOverrideDto>> GetPricingOverridesAsync(int id)
        => await db.PricingOverrides.Where(x => x.PackageId == id).OrderByDescending(x => x.CreatedAt)
            .Select(x => new PricingOverrideDto(x.Id, x.OverrideType, x.OriginalValue, x.NewValue, x.Reason, x.CreatedAt))
            .ToListAsync();
}

public interface ISupplyOrderBusiness
{
    Task<List<SupplyOrderDto>> ListAsync();
    Task<SupplyOrderDto?> GetAsync(int id);
    Task<SupplyOrderDto> CreateAsync(UpsertSupplyOrderRequest req);
    Task<SupplyOrderDto?> UpdateAsync(int id, UpsertSupplyOrderRequest req);
    Task<(SupplyOrderDto? dto, object? error)> TransitionAsync(int id, SupplyOrderTransitionRequest req);
}

public class SupplyOrderBusiness(AppDbContext db, ITransitionRuleService transitions) : ISupplyOrderBusiness
{
    public async Task<List<SupplyOrderDto>> ListAsync() => (await db.SupplyOrders.ToListAsync()).Select(x => x.ToDto()).ToList();
    public async Task<SupplyOrderDto?> GetAsync(int id) => (await db.SupplyOrders.FindAsync(id))?.ToDto();
    public async Task<SupplyOrderDto> CreateAsync(UpsertSupplyOrderRequest req)
    {
        var e = new SupplyOrder { CustomerId = req.CustomerId, SupplierId = req.SupplierId, PackageId = req.PackageId, Name = req.Name, PurchasePrice = req.PurchasePrice, Details = req.Details, Status = SupplyOrderStatus.Draft };
        db.SupplyOrders.Add(e); await db.SaveChangesAsync(); return e.ToDto();
    }
    public async Task<SupplyOrderDto?> UpdateAsync(int id, UpsertSupplyOrderRequest req)
    {
        var e = await db.SupplyOrders.FindAsync(id); if (e is null) return null;
        e.CustomerId = req.CustomerId; e.SupplierId = req.SupplierId; e.PackageId = req.PackageId; e.Name = req.Name; e.PurchasePrice = req.PurchasePrice; e.Details = req.Details;
        await db.SaveChangesAsync(); return e.ToDto();
    }
    public async Task<(SupplyOrderDto? dto, object? error)> TransitionAsync(int id, SupplyOrderTransitionRequest req)
    {
        var e = await db.SupplyOrders.FindAsync(id); if (e is null) return (null, null);
        if (!transitions.CanMove(e.Status, req.Status, req.CancelReason, out var message)) return (null, new { code = "INVALID_STATUS_TRANSITION", message });
        e.Status = req.Status; e.CancelReason = req.Status == SupplyOrderStatus.Cancelled ? req.CancelReason : null;
        await db.SaveChangesAsync(); return (e.ToDto(), null);
    }
}
