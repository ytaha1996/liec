using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

/// <summary>
/// ACC-09/ACC-10: an invoice is not a row with a total, it is a balanced
/// journal entry carrying a date, a period and a journal. Reports are built by
/// filtering on those three.
/// </summary>
public class JournalEntry
{
    public int Id { get; set; }
    [MaxLength(40)] public string Number { get; set; } = string.Empty;

    public int JournalId { get; set; }
    public Journal Journal { get; set; } = null!;

    /// <summary>The date the entry belongs to, which is not always today.</summary>
    public DateTime AccountingDate { get; set; }
    public int PeriodId { get; set; }
    public AccountingPeriod Period { get; set; } = null!;

    [MaxLength(200)] public string Reference { get; set; } = string.Empty;

    /// <summary>What produced this entry — an invoice, a payment, a credit note.</summary>
    [MaxLength(40)] public string SourceType { get; set; } = string.Empty;
    public int SourceId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int? CreatedByAdminUserId { get; set; }

    public List<JournalEntryLine> Lines { get; private set; } = [];

    public decimal TotalDebit => Lines.Sum(l => l.Debit);
    public decimal TotalCredit => Lines.Sum(l => l.Credit);
    public bool IsBalanced => TotalDebit == TotalCredit;
}

public class JournalEntryLine
{
    public int Id { get; set; }
    public int JournalEntryId { get; set; }
    public JournalEntry JournalEntry { get; set; } = null!;

    public int AccountId { get; set; }
    public Account Account { get; set; } = null!;

    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    [MaxLength(3)] public string CurrencyCode { get; set; } = string.Empty;

    [MaxLength(300)] public string Label { get; set; } = string.Empty;

    /// <summary>Set on receivable lines so a customer statement can be built.</summary>
    public int? CustomerId { get; set; }
}
