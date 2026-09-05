using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public enum PaymentMethod { Cash = 0, BankTransfer = 1, Cheque = 2, Other = 3 }

/// <summary>
/// ACC-18: a payment is its own entry — debit bank, credit receivable —
/// allocated across one or more invoices. Payment is never a flag on the
/// invoice: that does not survive a customer paying two invoices with one
/// transfer, or paying half of one.
/// </summary>
public class Payment
{
    public int Id { get; set; }
    [MaxLength(40)] public string Number { get; set; } = string.Empty;

    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public DateTime AccountingDate { get; set; } = DateTime.UtcNow;

    /// <summary>ACC-14: the amount travels with its currency.</summary>
    public Money Amount { get; set; } = new();

    public PaymentMethod Method { get; set; } = PaymentMethod.Cash;
    [MaxLength(200)] public string? Reference { get; set; }

    public int? JournalEntryId { get; set; }
    public JournalEntry? JournalEntry { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int? CreatedByAdminUserId { get; set; }

    public List<PaymentAllocation> Allocations { get; private set; } = [];

    /// <summary>What has been put against invoices; the rest sits on account.</summary>
    public decimal Allocated => Allocations.Sum(a => a.Amount);
    public decimal Unallocated => Amount.Amount - Allocated;
}

public class PaymentAllocation
{
    public int Id { get; set; }
    public int PaymentId { get; set; }
    public Payment Payment { get; set; } = null!;
    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
