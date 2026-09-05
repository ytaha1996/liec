using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Dtos;

/// <summary>ACC-14: amounts leave the API with their currency attached.</summary>
public record MoneyDto(decimal Amount, string Currency);

public record InvoiceSummaryDto(
    int Id, string Number, int ShipmentId, int CustomerId, string CustomerName,
    string State, string Type, string Currency,
    DateTime InvoiceDate, decimal UntaxedTotal, decimal TaxTotal, decimal GrandTotal, int LineCount);

public record InvoiceLineDto(int Id, int? PackageId, string Label, MoneyDto Amount, MoneyDto Tax);

public record InvoiceDetailDto(
    InvoiceSummaryDto Invoice, string ShipmentRef, string CustomerPhone, List<InvoiceLineDto> Lines);

public static class InvoiceMap
{
    public static MoneyDto ToDto(this Money m) => new(m.Amount, m.CurrencyCode);

    public static InvoiceSummaryDto Summary(Invoice i) => new(
        i.Id, i.Number, i.ShipmentId, i.CustomerId, i.Customer?.Name ?? $"#{i.CustomerId}",
        i.State.ToString(), i.Type.ToString(), i.CurrencyCode,
        i.InvoiceDate, i.UntaxedTotal, i.TaxTotal, i.GrandTotal, i.Lines.Count);

    public static InvoiceDetailDto Detail(Invoice i) => new(
        Summary(i),
        i.Shipment?.RefCode ?? $"#{i.ShipmentId}",
        i.Customer?.PrimaryPhone ?? string.Empty,
        [.. i.Lines.OrderBy(l => l.Id).Select(l => new InvoiceLineDto(
            l.Id, l.PackageId, l.Label, l.Amount.ToDto(), new MoneyDto(l.TaxAmount, l.Amount.CurrencyCode)))]);
}

// ── Requests ────────────────────────────────────────────────────────────────
public record CancelInvoiceRequest(string Reason);
public record CreditNoteRequest(decimal? Amount, string Reason);
public record RecordPaymentRequest(
    int CustomerId,
    decimal Amount,
    string CurrencyCode,
    PaymentMethod Method,
    string? Reference,
    DateTime? PaymentDate,
    List<ShippingPlatform.Api.Services.Accounting.AllocationRequest>? Allocations);
public record AccountingSettingsRequest(
    int? ReceivableAccountId, int? RevenueAccountId, int? TaxAccountId,
    int? BankAccountId, int? RoundingAccountId);

/// <summary>ACC-02: accounts are maintained by Finance, not shipped as constants.</summary>
public record AccountRequest(
    string Code, string NameEn, string? NameFr, string? NameAr,
    AccountType Type, string? ParentCode, bool IsPostable, bool IsActive);
