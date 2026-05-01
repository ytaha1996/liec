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
        var seq = await db.InvoiceSequences.FirstOrDefaultAsync(x => x.Year == year);
        if (seq is null)
        {
            seq = new InvoiceSequence { Year = year, LastNumber = 0 };
            db.InvoiceSequences.Add(seq);
        }
        seq.LastNumber++;
        await db.SaveChangesAsync();
        return seq.LastNumber;
    }
}
