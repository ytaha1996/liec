using System.Data;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services.Exports;

public interface IInvoiceSequenceService
{
    Task<int> NextAsync(int year);
}

public class InvoiceSequenceService(AppDbContext db) : IInvoiceSequenceService
{
    public async Task<int> NextAsync(int year)
    {
        // Serializable transaction with one retry on unique-index conflict — protects against
        // concurrent NextAsync calls on the same year clobbering LastNumber.
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var useTx = db.Database.IsRelational();
            await using var tx = useTx
                ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable)
                : null;
            try
            {
                var seq = await db.InvoiceSequences.FirstOrDefaultAsync(x => x.Year == year);
                if (seq is null)
                {
                    seq = new InvoiceSequence { Year = year, LastNumber = 0 };
                    db.InvoiceSequences.Add(seq);
                }

                // Trap 3: a cleanup routine once reset a counter to 1 while real
                // records still existed, leaving the next document one step from
                // colliding with an issued one. Never trust the counter alone —
                // take the highest number actually in use for the year.
                var highestIssued = await db.Shipments
                    .Where(x => x.InvoiceYear == year && x.InvoiceNumber != null)
                    .MaxAsync(x => (int?)x.InvoiceNumber) ?? 0;
                if (highestIssued > seq.LastNumber) seq.LastNumber = highestIssued;

                seq.LastNumber++;
                await db.SaveChangesAsync();
                if (tx is not null) await tx.CommitAsync();
                return seq.LastNumber;
            }
            catch (DbUpdateException) when (attempt == 0)
            {
                if (tx is not null) await tx.RollbackAsync();
                // Reload the entity from a fresh tracker on retry.
                foreach (var entry in db.ChangeTracker.Entries<InvoiceSequence>().ToList())
                    entry.State = EntityState.Detached;
            }
        }
        throw new InvalidOperationException($"Failed to allocate next invoice sequence for year {year} after retry.");
    }
}
