using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services.Accounting;

public record InvoiceGenerationResult(int Created, List<int> InvoiceIds, int PackagesBilled, int PackagesSkipped);

public interface IInvoiceGenerationService
{
    Task<InvoiceGenerationResult> GenerateForShipmentAsync(int shipmentId, int? adminUserId, CancellationToken ct = default);
}

/// <summary>
/// ACC-03: a container carries many customers, so invoicing groups that
/// customer packages onto one invoice with a line per package.
///
/// ACC-04: generation always produces drafts. Nothing here touches the ledger —
/// Finance reviews, then posts.
///
/// ACC-05: the operator will press the button twice. Only packages with no
/// invoice line are picked up, so a second press produces nothing; a package
/// added after invoicing produces a second invoice rather than duplicating or
/// overwriting the first.
/// </summary>
public class InvoiceGenerationService(
    AppDbContext db,
    IInvoiceNumberService numbers,
    IAuditService audit) : IInvoiceGenerationService
{
    public async Task<InvoiceGenerationResult> GenerateForShipmentAsync(
        int shipmentId, int? adminUserId, CancellationToken ct = default)
    {
        var shipment = await db.Shipments.FirstOrDefaultAsync(x => x.Id == shipmentId, ct)
            ?? throw new KeyNotFoundException($"Shipment {shipmentId} not found.");

        // Cancelled cargo was never carried and is never billed. Already-billed
        // packages are the ones that make a repeat press harmless.
        var billable = await db.Packages
            .Include(p => p.Customer)
            .Where(p => p.ShipmentId == shipmentId
                        && p.Status != PackageStatus.Cancelled
                        && p.InvoiceLineId == null)
            .OrderBy(p => p.Id)
            .ToListAsync(ct);

        var skipped = await db.Packages.CountAsync(
            p => p.ShipmentId == shipmentId && p.InvoiceLineId != null, ct);

        if (billable.Count == 0)
            return new InvoiceGenerationResult(0, [], 0, skipped);

        var created = new List<int>();
        var billed = 0;

        foreach (var group in billable.GroupBy(p => p.CustomerId).OrderBy(g => g.Key))
        {
            var packages = group.ToList();
            var currency = packages[0].Currency;

            var invoice = new Invoice
            {
                Number = await numbers.NextAsync(shipmentId, ct),
                ShipmentId = shipmentId,
                CustomerId = group.Key,
                CurrencyCode = currency,
                State = InvoiceState.Draft,
                Type = InvoiceType.Invoice,
                InvoiceDate = DateTime.UtcNow,
                AccountingDate = DateTime.UtcNow,
                CreatedByAdminUserId = adminUserId,
            };
            db.Invoices.Add(invoice);
            await db.SaveChangesAsync(ct);

            foreach (var p in packages)
            {
                // Net is what the customer owes for this package: freight, less
                // any discount, plus any fee — the same figure the BOL shows.
                var net = p.ChargeAmount + p.FeeAmount - p.DiscountAmount;
                var line = new InvoiceLine
                {
                    InvoiceId = invoice.Id,
                    PackageId = p.Id,
                    Label = BuildLabel(p),
                    Amount = new Money(net, currency),
                    TaxAmount = 0m,
                };
                db.InvoiceLines.Add(line);
                await db.SaveChangesAsync(ct);

                p.InvoiceLineId = line.Id;
                billed++;
            }

            // ACC-16: totals are stored separately. Tax resolves to zero until
            // Finance decides the treatment; the fields are already here.
            invoice.UntaxedTotal = packages.Sum(p => p.ChargeAmount + p.FeeAmount - p.DiscountAmount);
            invoice.TaxTotal = 0m;
            invoice.GrandTotal = invoice.UntaxedTotal + invoice.TaxTotal;

            await db.SaveChangesAsync(ct);
            created.Add(invoice.Id);

            await audit.LogAsync("Invoice", invoice.Id, "Create", null,
                $"{invoice.Number} draft for customer {group.Key}, {packages.Count} package(s), {invoice.GrandTotal} {currency}",
                adminUserId);
        }

        return new InvoiceGenerationResult(created.Count, created, billed, skipped);
    }

    /// <summary>
    /// ACC-06: the line shows its own arithmetic, so a customer querying a
    /// charge can check it without calling the office.
    /// </summary>
    private static string BuildLabel(Package p)
    {
        var basis = PriceBasisHelper.Label(p.PriceBasis);
        return $"Freight — package #{p.Id} ({basis}, {p.Cbm:0.###} CBM / {p.WeightKg:0.###} kg)";
    }
}
