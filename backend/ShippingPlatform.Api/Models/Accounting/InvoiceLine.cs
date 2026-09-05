using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

/// <summary>
/// One package on an invoice. The label carries the arithmetic behind the
/// charge (ACC-06) so a customer can check it without calling the office.
/// </summary>
public class InvoiceLine
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    /// <summary>The package billed. Null on a credit note line that reverses a whole invoice.</summary>
    public int? PackageId { get; set; }
    public Package? Package { get; set; }

    [MaxLength(400)] public string Label { get; set; } = string.Empty;

    /// <summary>ACC-14: the amount and its currency travel together.</summary>
    public Money Amount { get; set; } = new();

    /// <summary>ACC-16: optional, and unset until Finance decides the treatment.</summary>
    public int? TaxId { get; set; }
    public Tax? Tax { get; set; }
    public decimal TaxAmount { get; set; }

    /// <summary>Which revenue account this line posts to, resolved from settings at creation (ACC-02).</summary>
    public int? AccountId { get; set; }
}
