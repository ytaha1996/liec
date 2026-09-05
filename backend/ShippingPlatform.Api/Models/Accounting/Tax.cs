using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

/// <summary>
/// ACC-16: the tax model exists now even though the rate is undecided, because
/// retrofitting tax onto posted invoices is painful and nullable fields are
/// cheap. Records ship; which one applies is a setting Finance controls.
/// </summary>
public class Tax
{
    public int Id { get; set; }
    [MaxLength(20)] public string Code { get; set; } = string.Empty;
    [MaxLength(120)] public string Name { get; set; } = string.Empty;

    /// <summary>Percentage, e.g. 11 means 11%. Zero for exempt and zero-rated.</summary>
    public decimal Rate { get; set; }

    public TaxTreatment Treatment { get; set; } = TaxTreatment.None;

    /// <summary>Tax posts to its own account rather than being folded into revenue.</summary>
    public int? AccountId { get; set; }

    public bool IsActive { get; set; } = true;
}
