using System.Data;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services.Accounting;

public record PostingLine(int AccountId, decimal Debit, decimal Credit, string Label, int? CustomerId = null);

public interface IPostingService
{
    Task<AccountingPeriod> PeriodForAsync(DateTime date, CancellationToken ct = default);
    Task<JournalEntry> PostAsync(JournalType journalType, DateTime accountingDate, string reference,
        string sourceType, int sourceId, string currencyCode, IReadOnlyList<PostingLine> lines,
        int? adminUserId, CancellationToken ct = default);
}

/// <summary>
/// ACC-09: writes balanced journal entries and refuses anything else.
///
/// An entry whose debits and credits differ is not "nearly right" — it is a
/// broken set of books, so it is rejected rather than patched. Nothing here
/// silently inserts a rounding line; if a rounding difference ever needs
/// absorbing, Finance configures a rounding account and it becomes an explicit,
/// visible line.
/// </summary>
public class PostingService(AppDbContext db, IAuditService audit) : IPostingService
{
    /// <summary>
    /// ACC-10: every entry belongs to a period. Periods are created on demand
    /// and open; closing one is a deliberate act (ACC-13).
    /// </summary>
    public async Task<AccountingPeriod> PeriodForAsync(DateTime date, CancellationToken ct = default)
    {
        var period = await db.AccountingPeriods
            .FirstOrDefaultAsync(p => p.Year == date.Year && p.Month == date.Month, ct);
        if (period is not null) return period;

        period = new AccountingPeriod { Year = date.Year, Month = date.Month, State = PeriodState.Open };
        db.AccountingPeriods.Add(period);
        await db.SaveChangesAsync(ct);
        return period;
    }

    public async Task<JournalEntry> PostAsync(
        JournalType journalType, DateTime accountingDate, string reference,
        string sourceType, int sourceId, string currencyCode, IReadOnlyList<PostingLine> lines,
        int? adminUserId, CancellationToken ct = default)
    {
        if (lines.Count == 0)
            throw new InvalidOperationException("An entry with no lines cannot be posted.");

        // ACC-09: balance is checked before anything is written, so a rejected
        // entry leaves no trace.
        var debit = lines.Sum(l => l.Debit);
        var credit = lines.Sum(l => l.Credit);
        if (debit != credit)
            throw new InvalidOperationException(
                $"Entry does not balance: debits {debit} against credits {credit} (difference {debit - credit}). " +
                "Nothing was posted.");
        if (debit == 0m)
            throw new InvalidOperationException("An entry of zero cannot be posted.");
        if (lines.Any(l => l.Debit < 0m || l.Credit < 0m))
            throw new InvalidOperationException("A line cannot carry a negative debit or credit; use the other side instead.");
        if (lines.Any(l => l.Debit > 0m && l.Credit > 0m))
            throw new InvalidOperationException("A line is either a debit or a credit, never both.");

        var period = await PeriodForAsync(accountingDate, ct);
        // ACC-13: a closed month is closed. Without this a late entry silently
        // changes a month already reported to the group.
        if (period.State == PeriodState.Closed)
            throw new InvalidOperationException(
                $"Period {period.Year}-{period.Month:D2} is closed. Reopen it, or date the entry into an open period.");

        var journal = await db.Journals.FirstOrDefaultAsync(j => j.Type == journalType && j.IsActive, ct)
            ?? throw new InvalidOperationException($"No active {journalType} journal is configured.");

        var entry = new JournalEntry
        {
            Number = await NextEntryNumberAsync(journal, accountingDate, ct),
            JournalId = journal.Id,
            AccountingDate = accountingDate,
            PeriodId = period.Id,
            Reference = reference,
            SourceType = sourceType,
            SourceId = sourceId,
            CreatedByAdminUserId = adminUserId,
        };
        db.JournalEntries.Add(entry);
        await db.SaveChangesAsync(ct);

        foreach (var l in lines)
        {
            db.JournalEntryLines.Add(new JournalEntryLine
            {
                JournalEntryId = entry.Id,
                AccountId = l.AccountId,
                Debit = l.Debit,
                Credit = l.Credit,
                CurrencyCode = currencyCode,
                Label = l.Label,
                CustomerId = l.CustomerId,
            });
        }
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("JournalEntry", entry.Id, "Post", null,
            $"{entry.Number} {reference}: {debit} {currencyCode} across {lines.Count} line(s)", adminUserId);

        return entry;
    }

    /// <summary>
    /// Derived from the highest number already issued for the journal and year,
    /// never a stored counter that a cleanup routine could reset (trap 3).
    /// </summary>
    private async Task<string> NextEntryNumberAsync(Journal journal, DateTime date, CancellationToken ct)
    {
        var prefix = $"{journal.Code}/{date:yyyy}/";
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var useTx = db.Database.IsRelational();
            await using var tx = useTx
                ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
                : null;
            try
            {
                var numbers = await db.JournalEntries
                    .Where(e => e.Number.StartsWith(prefix))
                    .Select(e => e.Number)
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
        throw new InvalidOperationException($"Failed to allocate a journal entry number for {journal.Code}.");
    }
}
