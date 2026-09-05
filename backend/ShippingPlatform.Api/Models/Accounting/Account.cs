using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

/// <summary>Where a posting lands. Drives which side of the books an amount moves.</summary>
public enum AccountType { Receivable = 0, Payable = 1, Revenue = 2, Expense = 3, Asset = 4, Liability = 5, Equity = 6 }

public enum JournalType { Sales = 0, Purchases = 1, Bank = 2, Miscellaneous = 3 }

public enum PeriodState { Open = 0, Closed = 1 }

/// <summary>
/// ACC-02: the chart is data, not constants. Accounts are seeded from the
/// Lebanese Dagher chart the group uses and can be added to or re-pointed from
/// the Chart of Accounts screen — which account revenue posts to is a setting,
/// because Finance will change it.
///
/// Names are held in all three languages the chart is published in, so the
/// screen can show French to an accountant and English to everyone else.
/// </summary>
public class Account
{
    public int Id { get; set; }

    /// <summary>Full account code, e.g. 4111. Matched in full, never by prefix (trap 2).</summary>
    [MaxLength(20)] public string Code { get; set; } = string.Empty;

    [MaxLength(160)] public string NameEn { get; set; } = string.Empty;
    [MaxLength(160)] public string NameFr { get; set; } = string.Empty;
    [MaxLength(160)] public string NameAr { get; set; } = string.Empty;

    public AccountType Type { get; set; }

    /// <summary>Grouping only — a parent is a heading, not somewhere you post.</summary>
    [MaxLength(20)] public string? ParentCode { get; set; }

    public bool IsPostable { get; set; } = true;
    public bool IsActive { get; set; } = true;

    /// <summary>Shown beside every posted amount so a wrong mapping is visible (trap 1).</summary>
    public string Display => $"{Code} {NameEn}";
}

/// <summary>
/// ACC-02: which account each kind of posting uses. One row; editable by
/// Finance. Nothing in the posting code names an account directly.
/// </summary>
public class AccountingSettings
{
    public int Id { get; set; }
    public int? ReceivableAccountId { get; set; }
    public int? RevenueAccountId { get; set; }
    public int? TaxAccountId { get; set; }
    public int? BankAccountId { get; set; }
    public int? RoundingAccountId { get; set; }
}

public class Journal
{
    public int Id { get; set; }
    [MaxLength(20)] public string Code { get; set; } = string.Empty;
    [MaxLength(120)] public string Name { get; set; } = string.Empty;
    public JournalType Type { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// ACC-13: once a month is closed, entries dated into it are refused — without
/// this a late edit silently changes a month already reported.
/// </summary>
public class AccountingPeriod
{
    public int Id { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public PeriodState State { get; set; } = PeriodState.Open;
    public DateTime? ClosedAt { get; set; }
    public int? ClosedByAdminUserId { get; set; }
}
