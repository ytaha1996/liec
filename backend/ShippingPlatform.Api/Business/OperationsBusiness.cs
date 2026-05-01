using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Business;

public interface IShipmentBusiness
{
    Task<object> ListAsync(ShipmentStatus? status, string? q = null, DateTime? dateFrom = null, DateTime? dateTo = null, int? page = null, int pageSize = 25);
    Task<ShipmentDto?> GetAsync(int id);
    Task<(ShipmentDto? dto, string? error)> CreateAsync(CreateShipmentRequest input);
    Task<(ShipmentDto? dto, object? error)> SetStatusAsync(int id, ShipmentStatus status);
    Task<(ShipmentDto? dto, object? error)> UpdateAsync(int id, UpdateShipmentRequest req);
    Task<(ShipmentDto? dto, GateFailure? gate, object? error)> DepartAsync(int id);
    Task<(ShipmentDto? dto, GateFailure? gate, object? error)> CloseAsync(int id);
    Task<(ShipmentDto? dto, object? error)> SyncTrackingAsync(int id, string code, CancellationToken ct = default);
    Task<List<object>> MediaAsync(int id);
    Task<object> PreviewReadyToDepartAsync(int id);
}

public class ShipmentBusiness(AppDbContext db, IRefCodeService refs, IPhotoComplianceService gates, ITransitionRuleService transitions, IShipmentTrackingLookupService tracking, ICapacityService capacity, IAuditService audit, ShippingPlatform.Api.Services.FxRates.IShipmentSnapshotService fxSnapshot) : IShipmentBusiness
{
    public async Task<object> ListAsync(ShipmentStatus? status, string? q = null, DateTime? dateFrom = null, DateTime? dateTo = null, int? page = null, int pageSize = 25)
    {
        var query = db.Shipments.AsQueryable();
        if (status.HasValue) query = query.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(x => x.RefCode.Contains(q) || (x.TiiuCode != null && x.TiiuCode.Contains(q)));
        if (dateFrom.HasValue) query = query.Where(x => x.PlannedDepartureDate >= dateFrom.Value);
        if (dateTo.HasValue) query = query.Where(x => x.PlannedDepartureDate <= dateTo.Value);
        var ordered = query.OrderByDescending(x => x.CreatedAt);
        if (page.HasValue)
        {
            var total = await ordered.CountAsync();
            var items = (await ordered.Skip((page.Value - 1) * pageSize).Take(pageSize).ToListAsync()).Select(x => x.ToDto()).ToList();
            return new PagedResult<ShipmentDto>(items, total, page.Value, pageSize);
        }
        return (await ordered.ToListAsync()).Select(x => x.ToDto()).ToList();
    }

    public async Task<ShipmentDto?> GetAsync(int id) => (await db.Shipments.FirstOrDefaultAsync(x => x.Id == id))?.ToDto();

    public async Task<(ShipmentDto? dto, string? error)> CreateAsync(CreateShipmentRequest input)
    {
        if (input.OriginWarehouseId == input.DestinationWarehouseId) return (null, "Origin and destination warehouse must be different.");
        var origin = await db.Warehouses.FirstOrDefaultAsync(x => x.Id == input.OriginWarehouseId);
        if (origin is null) return (null, "Origin warehouse not found.");
        if (!string.IsNullOrWhiteSpace(input.TiiuCode))
        {
            var normalized = input.TiiuCode.Trim().ToUpperInvariant();
            if (!Regex.IsMatch(normalized, @"^[A-Z]{3,4}\d{4,7}$"))
                return (null, "TIIU code must be 3-4 letters followed by 4-7 digits (e.g., MSCU1234567).");
        }
        // Capacity caps must not exceed the origin warehouse's caps. 0 = unbounded shipment, skips check.
        if (origin.MaxWeightKg > 0 && input.MaxWeightKg > 0 && input.MaxWeightKg > origin.MaxWeightKg)
            return (null, $"Shipment MaxWeightKg ({input.MaxWeightKg}) exceeds origin warehouse capacity ({origin.MaxWeightKg}).");
        if (origin.MaxCbm > 0 && input.MaxCbm > 0 && input.MaxCbm > origin.MaxCbm)
            return (null, $"Shipment MaxCbm ({input.MaxCbm}) exceeds origin warehouse capacity ({origin.MaxCbm}).");

        var shipment = new Shipment
        {
            OriginWarehouseId = input.OriginWarehouseId,
            DestinationWarehouseId = input.DestinationWarehouseId,
            PlannedDepartureDate = input.PlannedDepartureDate,
            PlannedArrivalDate = input.PlannedArrivalDate,
            MaxWeightKg = input.MaxWeightKg,
            MaxCbm = input.MaxCbm,
            Status = ShipmentStatus.Draft,
            RefCode = await refs.GenerateAsync(input.OriginWarehouseId),
            TiiuCode = string.IsNullOrWhiteSpace(input.TiiuCode) ? null : input.TiiuCode!.Trim().ToUpperInvariant(),
        };
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync();
        return (shipment.ToDto(), null);
    }


    public async Task<(ShipmentDto? dto, object? error)> UpdateAsync(int id, UpdateShipmentRequest req)
    {
        var s = await db.Shipments.FindAsync(id);
        if (s is null) return (null, null);
        if (s.Status >= ShipmentStatus.Departed)
            return (null, new { code = "SHIPMENT_LOCKED", message = "Shipment can only be edited while Draft or Scheduled." });

        if (req.TiiuCode is not null)
        {
            var normalized = req.TiiuCode.Trim().ToUpperInvariant();
            if (normalized.Length > 0 && !Regex.IsMatch(normalized, @"^[A-Z]{3,4}\d{4,7}$"))
                return (null, new { code = "VALIDATION_ERROR", message = "TIIU code must be 3-4 letters followed by 4-7 digits (e.g., MSCU1234567)." });
            s.TiiuCode = normalized.Length == 0 ? null : normalized;
        }

        var departure = req.PlannedDepartureDate ?? s.PlannedDepartureDate;
        var arrival = req.PlannedArrivalDate ?? s.PlannedArrivalDate;
        if (arrival < departure)
            return (null, new { code = "VALIDATION_ERROR", message = "Planned arrival must be on or after planned departure." });

        if (req.PlannedDepartureDate.HasValue) s.PlannedDepartureDate = req.PlannedDepartureDate.Value;
        if (req.PlannedArrivalDate.HasValue) s.PlannedArrivalDate = req.PlannedArrivalDate.Value;

        // Capacity caps must not exceed the origin warehouse's caps. 0 = unbounded shipment.
        if (req.MaxWeightKg.HasValue || req.MaxCbm.HasValue)
        {
            var origin = await db.Warehouses.FirstOrDefaultAsync(x => x.Id == s.OriginWarehouseId);
            if (origin is not null)
            {
                if (req.MaxWeightKg.HasValue)
                {
                    if (req.MaxWeightKg.Value < 0)
                        return (null, new { code = "VALIDATION_ERROR", message = "MaxWeightKg cannot be negative." });
                    if (origin.MaxWeightKg > 0 && req.MaxWeightKg.Value > 0 && req.MaxWeightKg.Value > origin.MaxWeightKg)
                        return (null, new { code = "EXCEEDS_WAREHOUSE_CAPACITY", message = $"Shipment MaxWeightKg ({req.MaxWeightKg}) exceeds origin warehouse capacity ({origin.MaxWeightKg})." });
                    s.MaxWeightKg = req.MaxWeightKg.Value;
                }
                if (req.MaxCbm.HasValue)
                {
                    if (req.MaxCbm.Value < 0)
                        return (null, new { code = "VALIDATION_ERROR", message = "MaxCbm cannot be negative." });
                    if (origin.MaxCbm > 0 && req.MaxCbm.Value > 0 && req.MaxCbm.Value > origin.MaxCbm)
                        return (null, new { code = "EXCEEDS_WAREHOUSE_CAPACITY", message = $"Shipment MaxCbm ({req.MaxCbm}) exceeds origin warehouse capacity ({origin.MaxCbm})." });
                    s.MaxCbm = req.MaxCbm.Value;
                }
            }
        }

        await db.SaveChangesAsync();
        return (s.ToDto(), null);
    }
    public async Task<(ShipmentDto? dto, object? error)> SetStatusAsync(int id, ShipmentStatus status)
    {
        var s = await db.Shipments.FindAsync(id);
        if (s is null) return (null, null);
        if (status == ShipmentStatus.Scheduled && string.IsNullOrWhiteSpace(s.TiiuCode)) return (null, new { code = "VALIDATION_ERROR", message = "TIIU code is required before scheduling shipment." });
        if (!transitions.CanMove(s.Status, status)) return (null, new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {s.Status} to {status}." });

        var oldStatus = s.Status;

        if (status == ShipmentStatus.ReadyToDepart)
        {
            var hasReadyPkg = await db.Packages.AnyAsync(p =>
                p.ShipmentId == id && p.Status >= PackageStatus.ReadyToShip && p.Status != PackageStatus.Cancelled);
            if (!hasReadyPkg)
                return (null, new { code = "NO_READY_PACKAGES", message = "At least one package must be ReadyToShip before marking shipment as Ready To Depart." });
        }

        s.Status = status;

        // When cancelling a shipment, cancel all non-shipped packages and recalculate capacity
        if (status == ShipmentStatus.Cancelled)
        {
            var pkgs = await db.Packages
                .Where(p => p.ShipmentId == id && p.Status < PackageStatus.Shipped && p.Status != PackageStatus.Cancelled)
                .ToListAsync();
            foreach (var p in pkgs) p.Status = PackageStatus.Cancelled;
            await db.SaveChangesAsync();
            await capacity.RecalculateAsync(id);
            await audit.LogAsync("Shipment", id, $"Status → {status}", oldStatus.ToString(), status.ToString());
            return (s.ToDto(), null);
        }

        // Reassign unloaded packages (Draft/Received/Packed) to another Draft shipment on the same route
        if (status == ShipmentStatus.ReadyToDepart)
        {
            var unloaded = await db.Packages
                .Where(p => p.ShipmentId == id && p.Status <= PackageStatus.Packed && p.Status != PackageStatus.Cancelled)
                .ToListAsync();

            if (unloaded.Count > 0)
            {
                var target = await db.Shipments
                    .Where(x => x.Id != id
                        && x.OriginWarehouseId == s.OriginWarehouseId
                        && x.DestinationWarehouseId == s.DestinationWarehouseId
                        && x.Status == ShipmentStatus.Draft)
                    .OrderBy(x => x.CreatedAt)
                    .FirstOrDefaultAsync();

                if (target is null)
                {
                    target = new Shipment
                    {
                        OriginWarehouseId = s.OriginWarehouseId,
                        DestinationWarehouseId = s.DestinationWarehouseId,
                        PlannedDepartureDate = DateTime.UtcNow.AddDays(30),
                        PlannedArrivalDate = DateTime.UtcNow.AddDays(60),
                        Status = ShipmentStatus.Draft,
                        RefCode = await refs.GenerateAsync(s.OriginWarehouseId),
                    };
                    db.Shipments.Add(target);
                    await db.SaveChangesAsync();
                }

                foreach (var p in unloaded)
                    p.ShipmentId = target.Id;

                await db.SaveChangesAsync();
                await capacity.RecalculateAsync(id);
                await capacity.RecalculateAsync(target.Id);
                await audit.LogAsync("Shipment", id, $"Status → {status}", oldStatus.ToString(), status.ToString());
                return (s.ToDto(), null);
            }
        }

        await db.SaveChangesAsync();
        await audit.LogAsync("Shipment", id, $"Status → {status}", oldStatus.ToString(), status.ToString());
        if (status == ShipmentStatus.Arrived)
            await TryCaptureFxAsync(id, ShipmentSnapshotEvent.Arrived);
        return (s.ToDto(), null);
    }

    private async Task TryCaptureFxAsync(int shipmentId, ShipmentSnapshotEvent ev)
    {
        try { await fxSnapshot.CaptureAsync(shipmentId, ev); }
        catch { /* best-effort: snapshot capture must not roll back the lifecycle transition */ }
    }

    public async Task<(ShipmentDto? dto, GateFailure? gate, object? error)> DepartAsync(int id)
    {
        var missing = await gates.MissingForShipmentDepartureAsync(id);
        if (missing.Count > 0) return (null, new GateFailure("PHOTO_GATE_FAILED", "Shipment cannot be set to Departed until all packages have departure photos.", missing), null);
        var s = await db.Shipments.FindAsync(id);
        if (s is null) return (null, null, null);
        if (string.IsNullOrWhiteSpace(s.TiiuCode)) return (null, null, new { code = "VALIDATION_ERROR", message = "TIIU code is required before scheduling/departing." });
        if (!transitions.CanMove(s.Status, ShipmentStatus.Departed)) return (null, null, new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {s.Status} to Departed." });
        var oldStatus = s.Status;
        s.Status = ShipmentStatus.Departed; s.ActualDepartureAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await audit.LogAsync("Shipment", id, $"Status → {ShipmentStatus.Departed}", oldStatus.ToString(), ShipmentStatus.Departed.ToString());
        await TryCaptureFxAsync(id, ShipmentSnapshotEvent.Departed);
        return (s.ToDto(), null, null);
    }

    public async Task<(ShipmentDto? dto, GateFailure? gate, object? error)> CloseAsync(int id)
    {
        var missing = await gates.MissingForShipmentCloseAsync(id);
        if (missing.Count > 0) return (null, new GateFailure("PHOTO_GATE_FAILED", "Shipment cannot be set to Closed until all packages have arrival photos and are finalized.", missing), null);
        var s = await db.Shipments.FindAsync(id);
        if (s is null) return (null, null, null);
        if (!transitions.CanMove(s.Status, ShipmentStatus.Closed)) return (null, null, new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {s.Status} to Closed." });
        var oldStatus = s.Status;
        s.Status = ShipmentStatus.Closed; await db.SaveChangesAsync();
        await audit.LogAsync("Shipment", id, $"Status → {ShipmentStatus.Closed}", oldStatus.ToString(), ShipmentStatus.Closed.ToString());
        return (s.ToDto(), null, null);
    }

    public async Task<(ShipmentDto? dto, object? error)> SyncTrackingAsync(int id, string code, CancellationToken ct = default)
    {
        var s = await db.Shipments.FindAsync(id);
        if (s is null) return (null, null);
        if (s.Status is ShipmentStatus.Draft or ShipmentStatus.Cancelled)
            return (null, new { code = "INVALID_STATUS", message = "Tracking can be synced only for Scheduled/ReadyToDepart/Departed shipments." });
        var snap = await tracking.LookupAsync(code, ct);
        if (snap is null) return (null, new { code = "TRACKING_NOT_FOUND", message = "Tracking details were not found." });
        s.ExternalTrackingCode = snap.Code;
        s.ExternalCarrierName = snap.Name;
        s.ExternalOrigin = snap.Origin;
        s.ExternalDestination = snap.Destination;
        s.ExternalEstimatedArrivalAt = snap.EstimatedArrivalAt;
        s.ExternalStatus = snap.Status;
        s.ExternalLastSyncedAt = DateTime.UtcNow;
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

    public async Task<object> PreviewReadyToDepartAsync(int id)
    {
        var packages = await db.Packages
            .Where(p => p.ShipmentId == id && p.Status != PackageStatus.Cancelled)
            .Include(p => p.Customer)
            .ToListAsync();

        var departing = packages
            .Where(p => p.Status >= PackageStatus.ReadyToShip)
            .Select(p => new { p.Id, customerName = p.Customer.Name, status = p.Status.ToString() })
            .ToList();

        var reassigning = packages
            .Where(p => p.Status <= PackageStatus.Packed)
            .Select(p => new { p.Id, customerName = p.Customer.Name, status = p.Status.ToString() })
            .ToList();

        return new
        {
            departingPackages = departing,
            reassigningPackages = reassigning,
            canProceed = departing.Count > 0,
            message = departing.Count == 0 ? "No packages are ready to ship." : (string?)null,
        };
    }
}

public interface IPackageBusiness
{
    Task<(PackageDto? dto, object? error)> CreateAsync(int shipmentId, CreatePackageRequest input);
    Task<(PackageDto? dto, object? error)> AutoAssignAsync(AutoAssignPackageRequest input);
    Task<(PackageDto? dto, object? error)> UpdatePackageAsync(int id, UpdatePackageRequest req);
    Task<object> ListAsync(string? q = null, int? customerId = null, int? shipmentId = null, PackageStatus? status = null, int? page = null, int pageSize = 25);
    Task<object?> GetAsync(int id);
    Task<(PackageDto? dto, object? error, GateFailure? gate)> ChangeStatusAsync(int id, PackageStatus status, bool checkDepartureGate = false, bool checkArrivalGate = false);
    Task<(PackageItemDto? dto, object? error)> AddItemAsync(int id, UpsertPackageItemRequest item);
    Task<(List<PackageItemDto>? dtos, object? error)> AddItemsBulkAsync(int id, List<UpsertPackageItemRequest> items);
    Task<(PackageItemDto? dto, object? error)> UpdateItemAsync(int id, int itemId, UpsertPackageItemRequest input);
    Task<object?> DeleteItemAsync(int id, int itemId);
    Task<object?> UploadMediaAsync(int id, MediaUploadRequest req);
    Task<List<object>> ListMediaAsync(int id);
    Task<object?> DeleteMediaAsync(int packageId, int mediaId);
    Task<(PackageDto? dto, object? error)> ApplyPricingOverrideAsync(int id, ApplyPricingOverrideRequest req, int adminUserId);
    Task<List<PricingOverrideDto>> GetPricingOverridesAsync(int id);
    Task<(int transitioned, object? error)> BulkTransitionAsync(int shipmentId, BulkTransitionRequest request);
}

public class PackageBusiness(AppDbContext db, IPricingService pricing, IPhotoComplianceService gates, IBlobStorageService blob, IConfiguration cfg, ITransitionRuleService transitions, ICapacityService capacity, IImageWatermarkService watermark, IRefCodeService refs, IAuditService audit) : IPackageBusiness
{
    public async Task<(PackageDto? dto, object? error)> CreateAsync(int shipmentId, CreatePackageRequest input)
    {
        // Validate customer exists and is active
        var customer = await db.Customers.FindAsync(input.CustomerId);
        if (customer is null) return (null, new { code = "VALIDATION_ERROR", message = "Customer not found." });
        if (!customer.IsActive) return (null, new { code = "VALIDATION_ERROR", message = "Customer is inactive." });

        // ProcuredForCustomer requires supply order info
        if (input.ProvisionMethod == ProvisionMethod.ProcuredForCustomer && input.SupplyOrder is null && input.SupplyOrderId is null)
            return (null, new { code = "VALIDATION_ERROR", message = "A supply order is required for procured packages." });

        var package = new Package
        {
            ShipmentId = shipmentId,
            CustomerId = input.CustomerId,
            ProvisionMethod = input.ProvisionMethod,
            SupplyOrderId = input.SupplyOrderId,
            WeightKg = input.WeightKg ?? 0,
            Cbm = input.Cbm ?? 0,
            Note = input.Note,
            Status = PackageStatus.Draft,
        };

        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            if (package.WeightKg > 0 || package.Cbm > 0)
            {
                var shipment = await db.Shipments.Include(s => s.Packages).FirstOrDefaultAsync(s => s.Id == shipmentId);
                if (shipment is not null)
                {
                    var currentWeight = shipment.Packages.Where(x => x.Status != PackageStatus.Cancelled).Sum(x => x.WeightKg);
                    var currentCbm = shipment.Packages.Where(x => x.Status != PackageStatus.Cancelled).Sum(x => x.Cbm);
                    if (shipment.MaxWeightKg > 0 && currentWeight + package.WeightKg > shipment.MaxWeightKg)
                        return (null, new { code = "CAPACITY_EXCEEDED", message = "Package weight exceeds shipment capacity." });
                    if (shipment.MaxCbm > 0 && currentCbm + package.Cbm > shipment.MaxCbm)
                        return (null, new { code = "CAPACITY_EXCEEDED", message = "Package CBM exceeds shipment capacity." });
                }
            }

            db.Packages.Add(package);
            await db.SaveChangesAsync();

            if (input.Items is { Count: > 0 })
            {
                foreach (var item in input.Items)
                    db.PackageItems.Add(new PackageItem { PackageId = package.Id, GoodTypeId = item.GoodTypeId, Quantity = item.Quantity, Note = item.Note });
                await db.SaveChangesAsync();
            }

            if (package.WeightKg > 0 || package.Cbm > 0)
            {
                await pricing.RecalculateAsync(package);
                await db.SaveChangesAsync();
                await capacity.RecalculateAsync(shipmentId);
            }

            // Auto-create supply order for ProcuredForCustomer packages
            if (input.SupplyOrder is not null)
            {
                var so = new SupplyOrder
                {
                    CustomerId = input.CustomerId,
                    SupplierId = input.SupplyOrder.SupplierId,
                    PackageId = package.Id,
                    Name = input.SupplyOrder.Name,
                    PurchasePrice = input.SupplyOrder.PurchasePrice,
                    Details = input.SupplyOrder.Details,
                    Status = SupplyOrderStatus.Draft,
                };
                db.SupplyOrders.Add(so);
                await db.SaveChangesAsync();
                package.SupplyOrderId = so.Id;
                await db.SaveChangesAsync();
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        return (package.ToDto(), null);
    }

    public async Task<(PackageDto? dto, object? error)> AutoAssignAsync(AutoAssignPackageRequest input)
    {
        if (input.OriginWarehouseId == input.DestinationWarehouseId)
            return (null, new { code = "VALIDATION_ERROR", message = "Origin and destination warehouse must be different." });

        // Find oldest Draft or Scheduled shipment matching the warehouse pair
        var shipment = await db.Shipments
            .Where(s => s.OriginWarehouseId == input.OriginWarehouseId
                     && s.DestinationWarehouseId == input.DestinationWarehouseId
                     && (s.Status == ShipmentStatus.Draft || s.Status == ShipmentStatus.Scheduled))
            .OrderBy(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        // If none exists, auto-create a Draft shipment for that route
        if (shipment is null)
        {
            var originExists = await db.Warehouses.AnyAsync(w => w.Id == input.OriginWarehouseId);
            var destExists   = await db.Warehouses.AnyAsync(w => w.Id == input.DestinationWarehouseId);
            if (!originExists) return (null, new { code = "VALIDATION_ERROR", message = "Origin warehouse not found." });
            if (!destExists)   return (null, new { code = "VALIDATION_ERROR", message = "Destination warehouse not found." });

            shipment = new Shipment
            {
                OriginWarehouseId      = input.OriginWarehouseId,
                DestinationWarehouseId = input.DestinationWarehouseId,
                PlannedDepartureDate   = DateTime.UtcNow.AddDays(30),
                PlannedArrivalDate     = DateTime.UtcNow.AddDays(60),
                Status                 = ShipmentStatus.Draft,
                RefCode                = await refs.GenerateAsync(input.OriginWarehouseId),
            };
            db.Shipments.Add(shipment);
            await db.SaveChangesAsync();
        }

        var pkg = new CreatePackageRequest(input.CustomerId, input.ProvisionMethod, input.SupplyOrderId, SupplyOrder: input.SupplyOrder);
        var (dto, err) = await CreateAsync(shipment.Id, pkg);
        return err is not null ? (null, err) : (dto, null);
    }

    public async Task<object> ListAsync(string? q = null, int? customerId = null, int? shipmentId = null, PackageStatus? status = null, int? page = null, int pageSize = 25)
    {
        var query = db.Packages.Include(x => x.Customer).Include(x => x.Shipment).AsQueryable();
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(x => x.Customer.Name.Contains(q) || x.Id.ToString() == q);
        if (customerId.HasValue) query = query.Where(x => x.CustomerId == customerId);
        if (shipmentId.HasValue) query = query.Where(x => x.ShipmentId == shipmentId);
        if (status.HasValue) query = query.Where(x => x.Status == status);
        var ordered = query.OrderByDescending(x => x.CreatedAt);

        object MapPkg(Package x) => new
        {
            x.Id, x.ShipmentId, ShipmentRefCode = x.Shipment.RefCode, x.CustomerId, CustomerName = x.Customer.Name,
            x.ProvisionMethod, x.Status, x.WeightKg, x.Cbm, x.Currency, x.AppliedRatePerKg, x.AppliedRatePerCbm,
            x.ChargeAmount, x.HasDeparturePhotos, x.HasArrivalPhotos, x.HasPricingOverride, x.SupplyOrderId, x.Note, x.CreatedAt,
        };

        if (page.HasValue)
        {
            var total = await ordered.CountAsync();
            var items = (await ordered.Skip((page.Value - 1) * pageSize).Take(pageSize).ToListAsync()).Select(MapPkg).ToList();
            return new { items, total, page = page.Value, pageSize };
        }
        return (await ordered.ToListAsync()).Select(MapPkg).ToList();
    }

    public async Task<object?> GetAsync(int id)
    {
        var p = await db.Packages
            .Include(x => x.Items).ThenInclude(i => i.GoodType)
            .Include(x => x.Media)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return null;
        return new { package = p.ToDto(), items = p.Items.Select(i => i.ToDto()), media = p.Media.Select(m => new { m.Id, m.Stage, m.PublicUrl, m.BlobKey, m.CapturedAt, m.OperatorName, m.Notes }) };
    }

    public Task<(PackageDto? dto, object? error, GateFailure? gate)> ChangeStatusAsync(int id, PackageStatus status, bool checkDepartureGate = false, bool checkArrivalGate = false)
        => ChangeStatusInternalAsync(id, status, checkDepartureGate, checkArrivalGate, deferCapacity: false);

    private async Task<(PackageDto? dto, object? error, GateFailure? gate)> ChangeStatusInternalAsync(int id, PackageStatus status, bool checkDepartureGate, bool checkArrivalGate, bool deferCapacity)
    {
        var p = await db.Packages
            .Include(x => x.Customer)
            .Include(x => x.Media)
            .Include(x => x.Items)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return (null, null, null);

        // Shipment-gated transitions: package transitions must respect parent shipment status
        if (status != PackageStatus.Cancelled)
        {
            var shipment = await db.Shipments.FindAsync(p.ShipmentId);
            if (status == PackageStatus.ReadyToShip && shipment!.Status < ShipmentStatus.Scheduled)
                return (null, new { code = "SHIPMENT_NOT_READY", message = "Shipment must be at least Scheduled." }, null);
            if (status == PackageStatus.Shipped && shipment!.Status < ShipmentStatus.Departed)
                return (null, new { code = "SHIPMENT_NOT_DEPARTED", message = "Shipment must be Departed before shipping packages." }, null);
            if (status >= PackageStatus.ArrivedAtDestination && shipment!.Status < ShipmentStatus.Arrived)
                return (null, new { code = "SHIPMENT_NOT_ARRIVED", message = "Shipment must have Arrived before this transition." }, null);
        }

        if (checkDepartureGate && !p.Media.Any(m => m.Stage == MediaStage.Departure))
            return (null, null, new GateFailure("PHOTO_GATE_FAILED", "Package cannot be shipped before departure photos are uploaded.", [new MissingGateItem(p.Id, p.Customer.Name, MediaStage.Departure)]));

        if (checkArrivalGate)
        {
            var missing = await gates.MissingForPackageHandoutAsync(id);
            if (missing.Count > 0) return (null, null, new GateFailure("PHOTO_GATE_FAILED", "Package cannot be handed out before arrival photos are uploaded.", missing));
        }

        if (!transitions.CanMove(p.Status, status)) return (null, new { code = "INVALID_STATUS_TRANSITION", message = $"Cannot move from {p.Status} to {status}." }, null);

        if (status == PackageStatus.Packed)
        {
            if (p.WeightKg <= 0 || p.Cbm <= 0)
                return (null, new { code = "VALIDATION_ERROR", message = "Weight and CBM must both be greater than 0 before packing." }, null);
            if (p.Items.Count == 0)
                return (null, new { code = "VALIDATION_ERROR", message = "Package must have at least one item before packing." }, null);
        }

        var oldStatus = p.Status;
        p.Status = status;
        if (status == PackageStatus.Packed) await pricing.RecalculateAsync(p);
        await db.SaveChangesAsync();

        // Recalculate shipment capacity when a package is cancelled. Skip for bulk callers
        // (deferCapacity=true) — they batch the recalc once at the end.
        if (status == PackageStatus.Cancelled)
        {
            if (!deferCapacity) await capacity.RecalculateAsync(p.ShipmentId);
            // Cancel cascade: unlink supply order
            var linkedSo = await db.SupplyOrders.FirstOrDefaultAsync(x => x.PackageId == id);
            if (linkedSo is not null) { linkedSo.PackageId = null; await db.SaveChangesAsync(); }
        }

        await audit.LogAsync("Package", id, $"Status → {status}", oldStatus.ToString(), status.ToString());
        return (p.ToDto(), null, null);
    }

    public async Task<(PackageDto? dto, object? error)> UpdatePackageAsync(int id, UpdatePackageRequest req)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return (null, null);
        if (p.Status >= PackageStatus.Shipped) return (null, new { code = "PACKAGE_LOCKED", message = "Package is shipped and immutable." });

        bool weightChanged = false;
        if (req.WeightKg.HasValue) { if (req.WeightKg.Value <= 0) return (null, new { code = "VALIDATION_ERROR", message = "Weight must be greater than 0." }); p.WeightKg = req.WeightKg.Value; weightChanged = true; }
        if (req.Cbm.HasValue) { if (req.Cbm.Value <= 0) return (null, new { code = "VALIDATION_ERROR", message = "CBM must be greater than 0." }); p.Cbm = req.Cbm.Value; weightChanged = true; }
        if (req.Note is not null) p.Note = req.Note;

        if (weightChanged)
        {
            var shipment = await db.Shipments.Include(s => s.Packages).FirstOrDefaultAsync(s => s.Id == p.ShipmentId);
            if (shipment is not null)
            {
                var otherWeight = shipment.Packages.Where(x => x.Id != p.Id && x.Status != PackageStatus.Cancelled).Sum(x => x.WeightKg);
                var otherCbm = shipment.Packages.Where(x => x.Id != p.Id && x.Status != PackageStatus.Cancelled).Sum(x => x.Cbm);
                if (shipment.MaxWeightKg > 0 && otherWeight + p.WeightKg > shipment.MaxWeightKg)
                    return (null, new { code = "CAPACITY_EXCEEDED", message = "Update exceeds container weight capacity." });
                if (shipment.MaxCbm > 0 && otherCbm + p.Cbm > shipment.MaxCbm)
                    return (null, new { code = "CAPACITY_EXCEEDED", message = "Update exceeds container CBM capacity." });
            }
            await pricing.RecalculateAsync(p);
            await db.SaveChangesAsync();
            await capacity.RecalculateAsync(p.ShipmentId);
        }
        else
        {
            await db.SaveChangesAsync();
        }
        return (p.ToDto(), null);
    }

    public async Task<(PackageItemDto? dto, object? error)> AddItemAsync(int id, UpsertPackageItemRequest item)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return (null, null);
        if (p.Status >= PackageStatus.ReadyToShip) return (null, new { code = "PACKAGE_LOCKED", message = "Items cannot be modified once the package is ReadyToShip or beyond." });

        var entity = new PackageItem
        {
            PackageId = id,
            GoodTypeId = item.GoodTypeId,
            Quantity = item.Quantity,
            Unit = item.Unit,
            // UnitPrice is nullable end-to-end; null means "not specified". Display layers
            // (e.g., the commercial invoice) handle null with a documented fallback.
            UnitPrice = item.UnitPrice,
            Note = item.Note,
        };
        db.PackageItems.Add(entity);
        await db.SaveChangesAsync();
        await db.Entry(entity).Reference(x => x.GoodType).LoadAsync();
        return (entity.ToDto(), null);
    }

    public async Task<(List<PackageItemDto>? dtos, object? error)> AddItemsBulkAsync(int id, List<UpsertPackageItemRequest> items)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return (null, null);
        if (p.Status >= PackageStatus.ReadyToShip) return (null, new { code = "PACKAGE_LOCKED", message = "Items cannot be modified once the package is ReadyToShip or beyond." });
        if (items.Count == 0) return (new List<PackageItemDto>(), null);

        var entities = items.Select(item => new PackageItem
        {
            PackageId = id,
            GoodTypeId = item.GoodTypeId,
            Quantity = item.Quantity,
            Unit = item.Unit,
            UnitPrice = item.UnitPrice,
            Note = item.Note,
        }).ToList();
        db.PackageItems.AddRange(entities);
        await db.SaveChangesAsync();
        foreach (var e in entities) await db.Entry(e).Reference(x => x.GoodType).LoadAsync();
        return (entities.Select(e => e.ToDto()).ToList(), null);
    }

    public async Task<(PackageItemDto? dto, object? error)> UpdateItemAsync(int id, int itemId, UpsertPackageItemRequest input)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return (null, null);
        if (p.Status >= PackageStatus.ReadyToShip) return (null, new { code = "PACKAGE_LOCKED", message = "Items cannot be modified once the package is ReadyToShip or beyond." });
        var i = await db.PackageItems.FirstOrDefaultAsync(x => x.PackageId == id && x.Id == itemId);
        if (i is null) return (null, null);

        i.GoodTypeId = input.GoodTypeId;
        i.Quantity = input.Quantity;
        i.Unit = input.Unit;
        if (input.UnitPrice.HasValue) i.UnitPrice = input.UnitPrice.Value;
        i.Note = input.Note;
        await db.SaveChangesAsync();
        await db.Entry(i).Reference(x => x.GoodType).LoadAsync();
        return (i.ToDto(), null);
    }

    public async Task<object?> DeleteItemAsync(int id, int itemId)
    {
        var p = await db.Packages.FindAsync(id); if (p is null) return null;
        if (p.Status >= PackageStatus.ReadyToShip) return new { code = "PACKAGE_LOCKED", message = "Items cannot be modified once the package is ReadyToShip or beyond." };
        var i = await db.PackageItems.FirstOrDefaultAsync(x => x.PackageId == id && x.Id == itemId); if (i is null) return null;
        db.PackageItems.Remove(i);
        await db.SaveChangesAsync();
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
        var media = new Media { PackageId = id, Stage = req.Stage, BlobKey = key, PublicUrl = url, CapturedAt = req.CapturedAt, OperatorName = req.OperatorName, Notes = req.Notes, RecordedByAdminUserId = req.AdminUserId };
        db.Media.Add(media); await db.SaveChangesAsync();
        p.HasDeparturePhotos = await db.Media.AnyAsync(x => x.PackageId == id && x.Stage == MediaStage.Departure);
        p.HasArrivalPhotos = await db.Media.AnyAsync(x => x.PackageId == id && x.Stage == MediaStage.Arrival);
        await db.SaveChangesAsync();
        await audit.LogAsync("Package", id, "MediaUpload", null, $"stage={media.Stage} key={media.BlobKey}", req.AdminUserId);
        return new { media.Id, media.Stage, media.PublicUrl, media.BlobKey, media.CapturedAt, media.OperatorName, media.Notes };
    }

    public async Task<List<object>> ListMediaAsync(int id)
        => await db.Media.Where(x => x.PackageId == id).Select(m => (object)new { m.Id, m.Stage, m.PublicUrl, m.BlobKey, m.CapturedAt, m.OperatorName, m.Notes }).ToListAsync();

    public async Task<object?> DeleteMediaAsync(int packageId, int mediaId)
    {
        var p = await db.Packages.FindAsync(packageId);
        if (p is null) return null;
        if (p.Status >= PackageStatus.Shipped) return new { code = "PACKAGE_LOCKED", message = "Package is shipped and immutable." };
        var m = await db.Media.FirstOrDefaultAsync(x => x.Id == mediaId && x.PackageId == packageId);
        if (m is null) return null;
        await blob.DeleteAsync(cfg["AzureBlob:MediaContainer"] ?? "media", m.BlobKey);
        db.Media.Remove(m);
        await db.SaveChangesAsync();
        p.HasDeparturePhotos = await db.Media.AnyAsync(x => x.PackageId == packageId && x.Stage == MediaStage.Departure);
        p.HasArrivalPhotos = await db.Media.AnyAsync(x => x.PackageId == packageId && x.Stage == MediaStage.Arrival);
        await db.SaveChangesAsync();
        return new { ok = true };
    }

    public async Task<(PackageDto? dto, object? error)> ApplyPricingOverrideAsync(int id, ApplyPricingOverrideRequest req, int adminUserId)
    {
        var p = await db.Packages.FindAsync(id);
        if (p is null) return (null, null);
        if (p.Status >= PackageStatus.Shipped) return (null, new { code = "PACKAGE_LOCKED", message = "Cannot override pricing on a shipped package." });
        if (string.IsNullOrWhiteSpace(req.Reason)) return (null, new { code = "VALIDATION_ERROR", message = "Reason is required." });
        if (req.OverrideType != PricingOverrideType.TotalCharge && req.NewValue <= 0)
            return (null, new { code = "VALIDATION_ERROR", message = "Rate must be greater than 0." });
        if (req.OverrideType == PricingOverrideType.TotalCharge && req.NewValue < 0)
            return (null, new { code = "VALIDATION_ERROR", message = "Total charge cannot be negative." });

        var originalValue = req.OverrideType switch
        {
            PricingOverrideType.RatePerKg => p.AppliedRatePerKg,
            PricingOverrideType.RatePerCbm => p.AppliedRatePerCbm,
            _ => p.ChargeAmount
        };

        switch (req.OverrideType)
        {
            case PricingOverrideType.RatePerKg:
                p.AppliedRatePerKg = req.NewValue;
                p.ChargeAmount = Math.Max(p.WeightKg * req.NewValue, p.Cbm * p.AppliedRatePerCbm);
                break;
            case PricingOverrideType.RatePerCbm:
                p.AppliedRatePerCbm = req.NewValue;
                p.ChargeAmount = Math.Max(p.WeightKg * p.AppliedRatePerKg, p.Cbm * req.NewValue);
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

    public async Task<(int transitioned, object? error)> BulkTransitionAsync(int shipmentId, BulkTransitionRequest request)
    {
        var targetStatus = request.Action.ToLowerInvariant() switch
        {
            "receive" => PackageStatus.Received,
            "pack" => PackageStatus.Packed,
            "ready-to-ship" => PackageStatus.ReadyToShip,
            "cancel" => PackageStatus.Cancelled,
            "arrive-destination" => PackageStatus.ArrivedAtDestination,
            "ready-for-handout" => PackageStatus.ReadyForHandout,
            _ => throw new ArgumentException($"Unknown bulk action: {request.Action}")
        };

        var shipment = await db.Shipments.FindAsync(shipmentId);
        if (shipment is null) return (0, new { code = "NOT_FOUND", message = "Shipment not found." });

        var packages = await db.Packages.Where(p => request.PackageIds.Contains(p.Id)).ToListAsync();

        // Validation pass — check every package before executing any transitions
        var errors = new List<BulkTransitionError>();
        foreach (var pkgId in request.PackageIds)
        {
            var p = packages.FirstOrDefault(x => x.Id == pkgId);
            if (p is null) { errors.Add(new BulkTransitionError(pkgId, "Package not found.")); continue; }
            if (p.ShipmentId != shipmentId) { errors.Add(new BulkTransitionError(pkgId, "Package does not belong to this shipment.")); continue; }
            if (!transitions.CanMove(p.Status, targetStatus)) { errors.Add(new BulkTransitionError(pkgId, $"Cannot move from {p.Status} to {targetStatus}.")); continue; }

            if (targetStatus != PackageStatus.Cancelled)
            {
                if (targetStatus == PackageStatus.ReadyToShip && shipment.Status < ShipmentStatus.Scheduled)
                    { errors.Add(new BulkTransitionError(pkgId, "Shipment must be at least Scheduled.")); continue; }
                if (targetStatus >= PackageStatus.ArrivedAtDestination && shipment.Status < ShipmentStatus.Arrived)
                    { errors.Add(new BulkTransitionError(pkgId, "Shipment must have Arrived.")); continue; }
            }
        }

        if (errors.Count > 0)
            return (0, new { code = "BULK_VALIDATION_FAILED", message = $"{errors.Count} package(s) cannot be transitioned.", errors });

        // All validated — execute transitions, deferring capacity recalc to the end.
        foreach (var pkgId in request.PackageIds)
        {
            var (dto, err, gate) = await ChangeStatusInternalAsync(pkgId, targetStatus, false, false, deferCapacity: true);
            if (dto is null)
            {
                var msg = gate?.Message ?? err?.GetType().GetProperty("message")?.GetValue(err)?.ToString() ?? "Transition failed.";
                return (0, new { code = "TRANSITION_FAILED", message = $"Package #{pkgId}: {msg}" });
            }
        }

        // One capacity recalc for the whole batch (was previously running per-package on Cancel).
        if (targetStatus == PackageStatus.Cancelled)
            await capacity.RecalculateAsync(shipmentId);

        return (request.PackageIds.Length, null);
    }
}

public interface ISupplyOrderBusiness
{
    Task<List<SupplyOrderDto>> ListAsync(string? q = null, SupplyOrderStatus? status = null, int? customerId = null);
    Task<SupplyOrderDto?> GetAsync(int id);
    Task<SupplyOrderDto> CreateAsync(UpsertSupplyOrderRequest req);
    Task<SupplyOrderDto?> UpdateAsync(int id, UpsertSupplyOrderRequest req);
    Task<(SupplyOrderDto? dto, object? error)> TransitionAsync(int id, SupplyOrderTransitionRequest req);
}

public class SupplyOrderBusiness(AppDbContext db, ITransitionRuleService transitions) : ISupplyOrderBusiness
{
    public async Task<List<SupplyOrderDto>> ListAsync(string? q = null, SupplyOrderStatus? status = null, int? customerId = null)
    {
        var query = db.SupplyOrders.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(x => x.Name.Contains(q));
        if (status.HasValue) query = query.Where(x => x.Status == status);
        if (customerId.HasValue) query = query.Where(x => x.CustomerId == customerId);
        return (await query.OrderByDescending(x => x.Id).ToListAsync()).Select(x => x.ToDto()).ToList();
    }
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

        // Validate PackedIntoPackage requires a linked package
        if (req.Status == SupplyOrderStatus.PackedIntoPackage && e.PackageId is null)
            return (null, new { code = "VALIDATION_ERROR", message = "A package must be linked before marking as packed." });

        e.Status = req.Status; e.CancelReason = req.Status == SupplyOrderStatus.Cancelled ? req.CancelReason : null;
        await db.SaveChangesAsync();

        // Auto-receive the linked package when SO arrives at warehouse
        if (req.Status == SupplyOrderStatus.DeliveredToWarehouse && e.PackageId is not null)
        {
            var pkg = await db.Packages.FindAsync(e.PackageId);
            if (pkg is not null && pkg.Status == PackageStatus.Draft)
            {
                pkg.Status = PackageStatus.Received;
                await db.SaveChangesAsync();
            }
        }

        // Cancel cascade: clear package link
        if (req.Status == SupplyOrderStatus.Cancelled && e.PackageId is not null)
        {
            var pkg = await db.Packages.FindAsync(e.PackageId);
            if (pkg is not null) { pkg.SupplyOrderId = null; await db.SaveChangesAsync(); }
        }

        return (e.ToDto(), null);
    }
}
