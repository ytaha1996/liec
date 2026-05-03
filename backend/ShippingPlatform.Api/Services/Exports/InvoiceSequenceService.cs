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
