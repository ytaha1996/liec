namespace ShippingPlatform.Api.Models;

// Append-only: numeric values are stable. Never reorder or delete entries.

/// <summary>ACC-04: generation always produces a draft; posting is deliberate.</summary>
public enum InvoiceState { Draft = 0, Posted = 1, Cancelled = 2 }

/// <summary>ACC-19: a credit note is an invoice that reverses another.</summary>
public enum InvoiceType { Invoice = 0, CreditNote = 1 }

/// <summary>
/// ACC-16: how freight is treated for tax. The applicable one is a setting —
/// Finance has not yet decided between exempt, zero-rated and standard-rated.
/// </summary>
public enum TaxTreatment { None = 0, Exempt = 1, ZeroRated = 2, Standard = 3 }
