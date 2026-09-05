using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services.Accounting;

public interface IInvoicePostingService
{
    Task<Invoice> PostAsync(int invoiceId, int? adminUserId, CancellationToken ct = default);
    Task<Invoice> CancelAsync(int invoiceId, string reason, int? adminUserId, CancellationToken ct = default);
    Task<Invoice> CreditNoteAsync(int invoiceId, decimal? amount, string reason, int? adminUserId, CancellationToken ct = default);
}

/// <summary>
/// Turns a reviewed draft into books (ACC-09), and provides the only correct way
/// to undo one afterwards (ACC-11, ACC-19).
///
/// Freight is a service, so revenue credits the services account and never a
/// merchandise-sales account. Which account that is comes from settings, so a
/// wrong mapping is corrected in one place rather than hunted through code.
/// </summary>
public class InvoicePostingService(
    AppDbContext db,
    IPostingService posting,
    IInvoiceNumberService numbers,
    IAuditService audit) : IInvoicePostingService
{
    public async Task<Invoice> PostAsync(int invoiceId, int? adminUserId, CancellationToken ct = default)
    {
        var invoice = await Load(invoiceId, ct);

        if (invoice.State == InvoiceState.Posted)
            throw new InvalidOperationException($"{invoice.Number} is already posted.");
        if (invoice.State == InvoiceState.Cancelled)
            throw new InvalidOperationException($"{invoice.Number} is cancelled and cannot be posted.");
        if (invoice.Lines.Count == 0)
            throw new InvalidOperationException($"{invoice.Number} has no lines to post.");

        // A genuinely free carriage — the real BOL has several — still produces
        // a document the customer receives, but there is nothing to move in the
        // accounts. Posting it marks it as reviewed and stops there rather than
        // writing a meaningless zero entry.
        if (invoice.GrandTotal == 0m)
        {
            invoice.State = InvoiceState.Posted;
            invoice.PostedAt = DateTime.UtcNow;
            invoice.PostedByAdminUserId = adminUserId;
            await db.SaveChangesAsync(ct);
            await audit.LogAsync("Invoice", invoice.Id, "Post", InvoiceState.Draft.ToString(),
                $"Posted with no ledger entry: {invoice.Number} is for zero.", adminUserId);
            return invoice;
        }

        var settings = await SettingsAsync(ct);
        var receivable = settings.ReceivableAccountId
            ?? throw new InvalidOperationException("No receivable account is configured. Set it in Accounting Settings.");
        var revenue = settings.RevenueAccountId
            ?? throw new InvalidOperationException("No revenue account is configured. Set it in Accounting Settings.");

        // Debit what the customer owes us, credit what we earned. A credit note
        // is the same entry the other way round.
        var isCredit = invoice.Type == InvoiceType.CreditNote;
        var lines = new List<PostingLine>
        {
            isCredit
                ? new PostingLine(receivable, 0m, invoice.GrandTotal, $"{invoice.Number} — {invoice.Customer.Name}", invoice.CustomerId)
                : new PostingLine(receivable, invoice.GrandTotal, 0m, $"{invoice.Number} — {invoice.Customer.Name}", invoice.CustomerId),
            isCredit
                ? new PostingLine(revenue, invoice.UntaxedTotal, 0m, $"Freight — {invoice.Shipment.RefCode}")
                : new PostingLine(revenue, 0m, invoice.UntaxedTotal, $"Freight — {invoice.Shipment.RefCode}"),
        };

        // ACC-16: tax posts to its own account, never folded into revenue.
        if (invoice.TaxTotal != 0m)
        {
            var taxAccount = settings.TaxAccountId
                ?? throw new InvalidOperationException("This invoice carries tax but no tax account is configured.");
            lines.Add(isCredit
                ? new PostingLine(taxAccount, invoice.TaxTotal, 0m, $"Tax — {invoice.Number}")
                : new PostingLine(taxAccount, 0m, invoice.TaxTotal, $"Tax — {invoice.Number}"));
        }

        var entry = await posting.PostAsync(
            JournalType.Sales, invoice.AccountingDate, invoice.Number,
            nameof(Invoice), invoice.Id, invoice.CurrencyCode, lines, adminUserId, ct);

        invoice.JournalEntryId = entry.Id;
        invoice.State = InvoiceState.Posted;
        invoice.PostedAt = DateTime.UtcNow;
        invoice.PostedByAdminUserId = adminUserId;
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("Invoice", invoice.Id, "Post", InvoiceState.Draft.ToString(),
            $"Posted as {entry.Number}, {invoice.GrandTotal} {invoice.CurrencyCode}", adminUserId);
        return invoice;
    }

    /// <summary>
    /// ACC-08 and ACC-11: cancelling replaces deletion. The number stays consumed
    /// so the gap is explainable, and a posted document is never cancelled — it
    /// is reversed by a credit note instead.
    /// </summary>
    public async Task<Invoice> CancelAsync(int invoiceId, string reason, int? adminUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new InvalidOperationException("Cancelling an invoice needs a reason.");

        var invoice = await Load(invoiceId, ct);
        if (invoice.State == InvoiceState.Posted)
            throw new InvalidOperationException(
                $"{invoice.Number} is posted and cannot be cancelled. Raise a credit note against it instead.");
        if (invoice.State == InvoiceState.Cancelled) return invoice;

        invoice.State = InvoiceState.Cancelled;
        invoice.CancelReason = reason;

        // The packages become billable again — the work was never invoiced.
        var packageIds = invoice.Lines.Where(l => l.PackageId.HasValue).Select(l => l.PackageId!.Value).ToList();
        var packages = await db.Packages.Where(p => packageIds.Contains(p.Id)).ToListAsync(ct);
        foreach (var p in packages) p.InvoiceLineId = null;

        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Invoice", invoice.Id, "Cancel", InvoiceState.Draft.ToString(), reason, adminUserId);
        return invoice;
    }

    /// <summary>
    /// ACC-19: the only correct way to undo something already posted. Takes its
    /// own number, references the original, and reduces the receivable.
    /// </summary>
    public async Task<Invoice> CreditNoteAsync(int invoiceId, decimal? amount, string reason, int? adminUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new InvalidOperationException("A credit note needs a reason.");

        var original = await Load(invoiceId, ct);
        if (original.State != InvoiceState.Posted)
            throw new InvalidOperationException("Only a posted invoice can be credited. Cancel a draft instead.");
        if (original.Type == InvoiceType.CreditNote)
            throw new InvalidOperationException("A credit note cannot itself be credited.");

        var value = amount ?? original.GrandTotal;
        if (value <= 0m) throw new InvalidOperationException("A credit note must be for a positive amount.");
        if (value > original.GrandTotal)
            throw new InvalidOperationException(
                $"A credit note cannot exceed the invoice: {original.Number} is {original.GrandTotal} {original.CurrencyCode}.");

        // The credit has to carry the same net/tax split as what it reverses.
        // Putting the whole gross into UntaxedTotal still *balances* — the entry
        // would post without complaint — but it over-reverses revenue by the tax
        // and leaves the tax account never cleared. Taking the ratio from the
        // original keeps a partial credit honest too; untaxed is the remainder,
        // so the two always sum back to the amount credited.
        var tax = original.TaxTotal == 0m
            ? 0m
            : decimal.Round(value * original.TaxTotal / original.GrandTotal, 2, MidpointRounding.AwayFromZero);
        var untaxed = value - tax;

        var note = new Invoice
        {
            Number = await numbers.NextAsync(original.ShipmentId, ct),
            ShipmentId = original.ShipmentId,
            CustomerId = original.CustomerId,
            CurrencyCode = original.CurrencyCode,
            Type = InvoiceType.CreditNote,
            State = InvoiceState.Draft,
            ReversesInvoiceId = original.Id,
            InvoiceDate = DateTime.UtcNow,
            AccountingDate = DateTime.UtcNow,
            UntaxedTotal = untaxed,
            TaxTotal = tax,
            GrandTotal = value,
            CreatedByAdminUserId = adminUserId,
        };
        db.Invoices.Add(note);
        await db.SaveChangesAsync(ct);

        db.InvoiceLines.Add(new InvoiceLine
        {
            InvoiceId = note.Id,
            Label = value == original.GrandTotal
                ? $"Credit note reversing {original.Number} — {reason}"
                : $"Partial credit against {original.Number} — {reason}",
            Amount = new Money(untaxed, original.CurrencyCode),
            TaxAmount = tax,
        });
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("Invoice", note.Id, "CreditNote", original.Number,
            $"{note.Number} credits {value} {note.CurrencyCode}: {reason}", adminUserId);
        return note;
    }

    private async Task<Invoice> Load(int id, CancellationToken ct) =>
        await db.Invoices
            .Include(i => i.Lines)
            .Include(i => i.Customer)
            .Include(i => i.Shipment)
            .FirstOrDefaultAsync(i => i.Id == id, ct)
        ?? throw new KeyNotFoundException($"Invoice {id} not found.");

    private async Task<AccountingSettings> SettingsAsync(CancellationToken ct) =>
        await db.AccountingSettings.FirstOrDefaultAsync(ct)
        ?? throw new InvalidOperationException("Accounting has not been set up. Configure the chart of accounts first.");
}
