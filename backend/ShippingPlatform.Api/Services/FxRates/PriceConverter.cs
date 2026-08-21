namespace ShippingPlatform.Api.Services.FxRates;

public interface IPriceConverter
{
    /// <summary>
    /// Convert <paramref name="amount"/> from <paramref name="fromCcy"/> into
    /// <paramref name="toCcy"/> using the chained rates in the Currencies table.
    /// Returns the input amount unchanged when from/to match (case-insensitive)
    /// or when amount is zero.
    /// </summary>
    Task<decimal> ConvertAsync(decimal amount, string fromCcy, string toCcy);
}

public class PriceConverter(IFxRateService fx) : IPriceConverter
{
    public async Task<decimal> ConvertAsync(decimal amount, string fromCcy, string toCcy)
    {
        if (amount == 0m) return 0m;
        if (string.IsNullOrWhiteSpace(fromCcy) || string.IsNullOrWhiteSpace(toCcy)) return amount;
        if (string.Equals(fromCcy, toCcy, StringComparison.OrdinalIgnoreCase)) return amount;

        var fromRate = await fx.GetRateToBaseAsync(fromCcy);   // from → base
        var toRate   = await fx.GetRateToBaseAsync(toCcy);     // to   → base
        if (toRate == 0m) return amount;
        return amount * (fromRate / toRate);
    }
}
