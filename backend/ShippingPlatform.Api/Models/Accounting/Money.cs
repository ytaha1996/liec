using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

/// <summary>
/// ACC-14: an amount always travels with its currency. Storing a bare decimal
/// is how declared values recorded in one currency end up printed under another
/// heading — the mistake that presented about 10,600 USD of goods to customs as
/// 6.3 million. Every accounting amount uses this type so the rule is enforced
/// by the model rather than by discipline.
/// </summary>
public class Money
{
    public decimal Amount { get; set; }
    [MaxLength(3)] public string CurrencyCode { get; set; } = string.Empty;

    public Money() { }

    public Money(decimal amount, string currencyCode)
    {
        Amount = amount;
        CurrencyCode = (currencyCode ?? string.Empty).ToUpperInvariant();
    }

    public static Money Zero(string currencyCode) => new(0m, currencyCode);

    /// <summary>Addition is only meaningful within one currency; mixing them is a bug, not a conversion.</summary>
    public Money Plus(Money other)
    {
        EnsureSameCurrency(other);
        return new Money(Amount + other.Amount, CurrencyCode);
    }

    public Money Minus(Money other)
    {
        EnsureSameCurrency(other);
        return new Money(Amount - other.Amount, CurrencyCode);
    }

    private void EnsureSameCurrency(Money other)
    {
        if (!string.Equals(CurrencyCode, other.CurrencyCode, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException(
                $"Cannot combine {CurrencyCode} with {other.CurrencyCode}. Convert explicitly using a stated rate.");
    }

    public override string ToString() => $"{Amount} {CurrencyCode}";
}
