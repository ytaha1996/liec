using System.Data;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services.Accounting;

public record AllocationRequest(int InvoiceId, decimal Amount);

/// <summary>What an invoice still owes, derived from allocations rather than stored.</summary>
public record InvoiceBalance(int InvoiceId, string Number, decimal Total, decimal Paid, decimal Outstanding, string Status);

public record CustomerBalance(int CustomerId, string CustomerName, string Currency,
    decimal Invoiced, decimal Credited, decimal Paid, decimal Outstanding);

public record AgeingBucket(string Label, decimal Amount);

public interface IPaymentService
{
    Task<Payment> RecordAsync(int customerId, decimal amount, string currencyCode, PaymentMethod method,
        string? reference, DateTime? paymentDate, IReadOnlyList<AllocationRequest> allocations,
        int? adminUserId, CancellationToken ct = default);
    Task<InvoiceBalance> BalanceOfAsync(int invoiceId, CancellationToken ct = default);
    Task<List<CustomerBalance>> CustomerBalancesAsync(CancellationToken ct = default);
}

/// <summary>
/// ACC-18: a payment is its own entry — debit bank, credit receivable —
/// allocated to one or more invoices. Status is derived from allocation, never
/// stored as a flag: a customer settling two invoices with one transfer, or
/// paying half of one, has to work.
/// </summary>
public class PaymentService(AppDbContext db, IPostingService posting, IAuditService audit) : IPaymentService
{
    public async Task<Payment> RecordAsync(
        int customerId, decimal amount, string currencyCode, PaymentMethod method,
        string? reference, DateTime? paymentDate, IReadOnlyList<AllocationRequest> allocations,
        int? adminUserId, CancellationToken ct = default)
    {
        if (amount <= 0m) throw new InvalidOperationException("A payment must be for a positive amount.");

        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == customerId, ct)
            ?? throw new KeyNotFoundException($"Customer {customerId} not found.");

        var settings = await db.AccountingSettings.FirstOrDefaultAsync(ct)
            ?? throw new InvalidOperationException("Accounting has not been set up.");
        var bank = settings.BankAccountId
            ?? throw new InvalidOperationException("No bank account is configured. Set it in Accounting Settings.");
        var receivable = settings.ReceivableAccountId
            ?? throw new InvalidOperationException("No receivable account is configured.");

        // Allocations are checked in full before anything is written: a payment
        // that over-pays an invoice is a data-entry mistake, not something to
        // absorb silently.
        var requested = allocations.Sum(a => a.Amount);
        if (requested > amount)
            throw new InvalidOperationException(
                $"Allocations total {requested} but the payment is only {amount}. Reduce the allocation or raise the payment.");

        foreach (var a in allocations)
        {
            if (a.Amount <= 0m)
                throw new InvalidOperationException("An allocation must be for a positive amount.");

            var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.Id == a.InvoiceId, ct)
                ?? throw new KeyNotFoundException($"Invoice {a.InvoiceId} not found.");
            if (invoice.CustomerId != customerId)
                throw new InvalidOperationException($"{invoice.Number} belongs to another customer.");
            if (invoice.State != InvoiceState.Posted)
                throw new InvalidOperationException($"{invoice.Number} is not posted, so it cannot be paid yet.");

            var balance = await BalanceOfAsync(a.InvoiceId, ct);
            if (a.Amount > balance.Outstanding)
                throw new InvalidOperationException(
                    $"{invoice.Number} has {balance.Outstanding} {invoice.CurrencyCode} outstanding; cannot allocate {a.Amount}.");
        }

        var date = paymentDate ?? DateTime.UtcNow;
        var payment = new Payment
        {
            Number = await NextNumberAsync(date, ct),
            CustomerId = customerId,
            PaymentDate = date,
            AccountingDate = date,
            Amount = new Money(amount, currencyCode),
            Method = method,
            Reference = reference,
            CreatedByAdminUserId = adminUserId,
        };
        db.Payments.Add(payment);
        await db.SaveChangesAsync(ct);

        foreach (var a in allocations)
        {
            db.PaymentAllocations.Add(new PaymentAllocation
            {
                PaymentId = payment.Id,
                InvoiceId = a.InvoiceId,
                Amount = a.Amount,
            });
        }
        await db.SaveChangesAsync(ct);

        // Money in: the bank grows, the customer owes less.
        var entry = await posting.PostAsync(
            JournalType.Bank, date, payment.Number, nameof(Payment), payment.Id, currencyCode,
            [
                new PostingLine(bank, amount, 0m, $"{payment.Number} — {customer.Name}"),
                new PostingLine(receivable, 0m, amount, $"{payment.Number} — {customer.Name}", customerId),
            ],
            adminUserId, ct);

        payment.JournalEntryId = entry.Id;
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("Payment", payment.Id, "Record", null,
            $"{payment.Number}: {amount} {currencyCode} from {customer.Name}, {allocations.Count} allocation(s)", adminUserId);
        return payment;
    }

    /// <summary>
    /// ACC-18: unpaid / partially paid / paid is a conclusion drawn from the
    /// allocations, so it cannot drift out of step with the money.
    /// </summary>
    public async Task<InvoiceBalance> BalanceOfAsync(int invoiceId, CancellationToken ct = default)
    {
        var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId, ct)
            ?? throw new KeyNotFoundException($"Invoice {invoiceId} not found.");

        var paid = await db.PaymentAllocations
            .Where(a => a.InvoiceId == invoiceId)
            .SumAsync(a => (decimal?)a.Amount, ct) ?? 0m;

        // A credit note against this invoice reduces what is owed.
        var credited = await db.Invoices
            .Where(i => i.ReversesInvoiceId == invoiceId && i.State == InvoiceState.Posted)
            .SumAsync(i => (decimal?)i.GrandTotal, ct) ?? 0m;

        var outstanding = invoice.GrandTotal - paid - credited;
        var status = invoice.State != InvoiceState.Posted ? invoice.State.ToString()
            : outstanding <= 0m ? "Paid"
            : paid + credited > 0m ? "Partially paid"
            : "Unpaid";

        return new InvoiceBalance(invoice.Id, invoice.Number, invoice.GrandTotal, paid, outstanding, status);
    }

    /// <summary>ACC-17: what each customer was invoiced, paid, and still owes.</summary>
    public async Task<List<CustomerBalance>> CustomerBalancesAsync(CancellationToken ct = default)
    {
        var posted = await db.Invoices
            .Where(i => i.State == InvoiceState.Posted)
            .Select(i => new { i.CustomerId, i.Customer.Name, i.CurrencyCode, i.Type, i.GrandTotal })
            .ToListAsync(ct);

        var payments = (await db.Payments
                .Select(p => new { p.CustomerId, Amount = p.Amount.Amount })
                .ToListAsync(ct))
            .GroupBy(p => p.CustomerId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

        return posted
            .GroupBy(i => new { i.CustomerId, i.Name, i.CurrencyCode })
            .Select(g =>
            {
                var invoiced = g.Where(x => x.Type == InvoiceType.Invoice).Sum(x => x.GrandTotal);
                var credited = g.Where(x => x.Type == InvoiceType.CreditNote).Sum(x => x.GrandTotal);
                var paid = payments.TryGetValue(g.Key.CustomerId, out var p) ? p : 0m;
                return new CustomerBalance(g.Key.CustomerId, g.Key.Name, g.Key.CurrencyCode,
                    invoiced, credited, paid, invoiced - credited - paid);
            })
            .OrderByDescending(b => b.Outstanding)
            .ToList();
    }

    private async Task<string> NextNumberAsync(DateTime date, CancellationToken ct)
    {
        var prefix = $"PAY/{date:yyyy}/";
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var useTx = db.Database.IsRelational();
            await using var tx = useTx
                ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
                : null;
            try
            {
                var numbers = await db.Payments
                    .Where(p => p.Number.StartsWith(prefix))
                    .Select(p => p.Number)
                    .ToListAsync(ct);
                var highest = numbers
                    .Select(n => int.TryParse(n[prefix.Length..], out var v) ? v : 0)
                    .DefaultIfEmpty(0)
                    .Max();
                var next = $"{prefix}{highest + 1:D4}";
                if (tx is not null) await tx.CommitAsync(ct);
                return next;
            }
            catch (DbUpdateException) when (attempt == 0)
            {
                if (tx is not null) await tx.RollbackAsync(ct);
            }
        }
        throw new InvalidOperationException("Failed to allocate a payment number.");
    }
}
