using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services.FxRates;

public interface IShipmentSnapshotService
{
    Task CaptureAsync(int shipmentId, ShipmentSnapshotEvent ev);
    Task UpsertManualAsync(int shipmentId, string currencyCode, decimal rateToBase);
    Task DeleteManualAsync(int shipmentId, string currencyCode);
    Task<IReadOnlyList<ShipmentRateSnapshot>> GetAsync(int shipmentId);
    Task<ShipmentRateSnapshot?> ResolveForInvoiceAsync(int shipmentId, string currencyCode);
}

public class ShipmentSnapshotService(AppDbContext db, IFxRateService fx) : IShipmentSnapshotService
{
    public async Task CaptureAsync(int shipmentId, ShipmentSnapshotEvent ev)
    {
        if (ev == ShipmentSnapshotEvent.Manual)
            throw new ArgumentException("Manual snapshots must be created via UpsertManualAsync.");

        var actives = await fx.ListActiveAsync();
        foreach (var c in actives)
        {
            var rate = await fx.GetRateToBaseAsync(c.Code);
            var existing = await db.ShipmentRateSnapshots
                .FirstOrDefaultAsync(x => x.ShipmentId == shipmentId && x.Event == ev && x.CurrencyCode == c.Code);
            if (existing is null)
            {
                db.ShipmentRateSnapshots.Add(new ShipmentRateSnapshot
                {
                    ShipmentId = shipmentId,
                    Event = ev,
                    CurrencyCode = c.Code,
                    RateToBase = rate,
                });
            }
            else
            {
                existing.RateToBase = rate;
                existing.CapturedAt = DateTime.UtcNow;
            }
        }
        await db.SaveChangesAsync();
    }

    public async Task UpsertManualAsync(int shipmentId, string currencyCode, decimal rateToBase)
    {
        var existing = await db.ShipmentRateSnapshots
            .FirstOrDefaultAsync(x => x.ShipmentId == shipmentId && x.Event == ShipmentSnapshotEvent.Manual && x.CurrencyCode == currencyCode);
        if (existing is null)
        {
            db.ShipmentRateSnapshots.Add(new ShipmentRateSnapshot
            {
                ShipmentId = shipmentId,
                Event = ShipmentSnapshotEvent.Manual,
                CurrencyCode = currencyCode,
                RateToBase = rateToBase,
            });
        }
        else
        {
            existing.RateToBase = rateToBase;
            existing.CapturedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
    }

    public async Task DeleteManualAsync(int shipmentId, string currencyCode)
    {
        var existing = await db.ShipmentRateSnapshots
            .FirstOrDefaultAsync(x => x.ShipmentId == shipmentId && x.Event == ShipmentSnapshotEvent.Manual && x.CurrencyCode == currencyCode);
        if (existing is not null)
        {
            db.ShipmentRateSnapshots.Remove(existing);
            await db.SaveChangesAsync();
        }
    }

    public async Task<IReadOnlyList<ShipmentRateSnapshot>> GetAsync(int shipmentId) =>
        await db.ShipmentRateSnapshots
            .Where(x => x.ShipmentId == shipmentId)
            .OrderBy(x => x.Event).ThenBy(x => x.CurrencyCode)
            .ToListAsync();

    public async Task<ShipmentRateSnapshot?> ResolveForInvoiceAsync(int shipmentId, string currencyCode)
    {
        // Priority: Manual → Departed → live (synthetic, not persisted)
        var manual = await db.ShipmentRateSnapshots
            .FirstOrDefaultAsync(x => x.ShipmentId == shipmentId && x.Event == ShipmentSnapshotEvent.Manual && x.CurrencyCode == currencyCode);
        if (manual is not null) return manual;

        var departed = await db.ShipmentRateSnapshots
            .FirstOrDefaultAsync(x => x.ShipmentId == shipmentId && x.Event == ShipmentSnapshotEvent.Departed && x.CurrencyCode == currencyCode);
        if (departed is not null) return departed;

        // Live fallback — synthetic snapshot, not persisted
        try
        {
            var liveRate = await fx.GetRateToBaseAsync(currencyCode);
            return new ShipmentRateSnapshot
            {
                ShipmentId = shipmentId,
                Event = ShipmentSnapshotEvent.Manual, // not actually persisted; flag is meaningless here
                CurrencyCode = currencyCode,
                RateToBase = liveRate,
                CapturedAt = DateTime.UtcNow,
            };
        }
        catch
        {
            return null;
        }
    }
}
