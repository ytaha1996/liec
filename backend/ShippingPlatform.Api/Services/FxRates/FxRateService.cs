using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services.FxRates;

public interface IFxRateService
{
    Task<string> GetBaseCodeAsync();
    Task<decimal> GetRateToBaseAsync(string currencyCode);
    Task<IReadOnlyList<Models.Currency>> ListActiveAsync();
}

public class FxRateService(AppDbContext db) : IFxRateService
{
    private readonly Dictionary<string, decimal> _cache = new(StringComparer.OrdinalIgnoreCase);
    private string? _baseCode;

    public async Task<string> GetBaseCodeAsync()
    {
        if (_baseCode is not null) return _baseCode;
        var b = await db.Currencies.FirstOrDefaultAsync(x => x.IsBase)
                ?? throw new InvalidOperationException("No base currency configured.");
        _baseCode = b.Code;
        return _baseCode;
    }

    public async Task<IReadOnlyList<Models.Currency>> ListActiveAsync() =>
        await db.Currencies.Where(x => x.IsActive).OrderBy(x => x.Code).ToListAsync();

    public async Task<decimal> GetRateToBaseAsync(string currencyCode)
    {
        if (_cache.TryGetValue(currencyCode, out var cached)) return cached;

        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var rate = await ResolveAsync(currencyCode, visited);
        _cache[currencyCode] = rate;
        return rate;
    }

    private async Task<decimal> ResolveAsync(string code, HashSet<string> visited)
    {
        if (!visited.Add(code))
            throw new InvalidOperationException($"Currency anchor cycle detected at '{code}'.");

        var c = await db.Currencies.FirstOrDefaultAsync(x => x.Code == code)
                ?? throw new InvalidOperationException($"Currency '{code}' not found.");
        if (c.IsBase) return 1m;
        if (c.AnchorCurrencyCode is null || c.Rate is null)
            throw new InvalidOperationException($"Non-base currency '{code}' must have AnchorCurrencyCode and Rate.");

        var anchorRate = await ResolveAsync(c.AnchorCurrencyCode, visited);
        return c.Rate.Value * anchorRate;
    }
}
