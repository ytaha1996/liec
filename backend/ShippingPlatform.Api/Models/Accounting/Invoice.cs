using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

/// <summary>
/// A customer invoice for one container (ACC-03). Created as a draft and posted
/// deliberately (ACC-04); once posted it is frozen (ACC-11) and can only be
/// corrected by a credit note that references it (ACC-19).
/// </summary>
public class Invoice
{
    public int Id { get; set; }

    /// <summary>ACC-07: INV/{container}/NNN, assigned at creation and never renumbered.</summary>
    [MaxLength(40)] public string Number { get; set; } = string.Empty;

    public int ShipmentId { get; set; }
    public Shipment Shipment { get; set; } = null!;
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public InvoiceType Type { get; set; } = InvoiceType.Invoice;
    public InvoiceState State { get; set; } = InvoiceState.Draft;

    /// <summary>ACC-19: set on a credit note, pointing at the invoice it reverses.</summary>
    public int? ReversesInvoiceId { get; set; }
    public Invoice? ReversesInvoice { get; set; }

    [MaxLength(3)] public string CurrencyCode { get; set; } = string.Empty;

    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;

    /// <summary>ACC-10: the date the entry belongs to, which is not always today.</summary>
    public DateTime AccountingDate { get; set; } = DateTime.UtcNow;

    // ACC-16: stored separately so tax can be switched on later without
    // recomputing history. Today every invoice resolves to zero tax.
    public decimal UntaxedTotal { get; set; }
    public decimal TaxTotal { get; set; }
    public decimal GrandTotal { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int? CreatedByAdminUserId { get; set; }
    /// <summary>The balanced entry this invoice produced when posted (ACC-09).</summary>
    public int? JournalEntryId { get; set; }

    public DateTime? PostedAt { get; set; }
    public int? PostedByAdminUserId { get; set; }
    [MaxLength(500)] public string? CancelReason { get; set; }

    public List<InvoiceLine> Lines { get; private set; } = [];
}
