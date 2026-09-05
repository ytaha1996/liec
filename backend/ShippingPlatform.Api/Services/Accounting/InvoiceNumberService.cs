using System.Data;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;

namespace ShippingPlatform.Api.Services.Accounting;

public interface IInvoiceNumberService
{
    Task<string> NextAsync(int shipmentId, CancellationToken ct = default);
}

/// <summary>
/// ACC-07: invoice numbers read INV/{container}/NNN and restart per container.
///
/// The next number is derived from the highest number already carrying that
/// prefix, not from a stored counter. That is deliberate: a counter can be reset
/// by a cleanup routine while real records still exist, which is exactly how a
/// previous system came to be one collision away from issuing a duplicate
/// document. With no counter there is nothing to reset.
///
/// It also means a cancelled invoice keeps its number consumed (ACC-08) — the
/// gap stays visible for an auditor to ask about, which is the point.
/// </summary>
public class InvoiceNumberService(AppDbContext db) : IInvoiceNumberService
{
    public static string Prefix(string containerRef) => $"INV/{containerRef}/";

    public async Task<string> NextAsync(int shipmentId, CancellationToken ct = default)
    {
        var shipment = await db.Shipments.FirstOrDefaultAsync(x => x.Id == shipmentId, ct)
            ?? throw new KeyNotFoundException($"Shipment {shipmentId} not found.");
        var prefix = Prefix(shipment.RefCode);

        // Serializable with one retry, matching RefCodeService: two operators
        // invoicing the same container at once must not collide.
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var useTx = db.Database.IsRelational();
            await using var tx = useTx
                ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
                : null;
            try
            {
                var existing = await db.Invoices
                    .Where(x => x.Number.StartsWith(prefix))
                    .Select(x => x.Number)
                    .ToListAsync(ct);

                var highest = existing
                    .Select(n => int.TryParse(n[prefix.Length..], out var v) ? v : 0)
                    .DefaultIfEmpty(0)
                    .Max();

                var number = $"{prefix}{highest + 1:D3}";
                if (tx is not null) await tx.CommitAsync(ct);
                return number;
            }
            catch (DbUpdateException) when (attempt == 0)
            {
                if (tx is not null) await tx.RollbackAsync(ct);
            }
        }

        throw new InvalidOperationException($"Failed to allocate an invoice number for {shipment.RefCode} after retry.");
    }
}
