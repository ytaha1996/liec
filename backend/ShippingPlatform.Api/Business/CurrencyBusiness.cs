using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Business;

public interface ICurrencyBusiness
{
    Task<List<CurrencyDto>> ListAsync();
    Task<CurrencyDto?> GetAsync(string code);
    Task<(CurrencyDto? dto, object? error)> CreateAsync(UpsertCurrencyRequest req);
    Task<(CurrencyDto? dto, object? error)> UpdateAsync(string code, UpsertCurrencyRequest req);
    Task<object?> DeleteAsync(string code);
}

public class CurrencyBusiness(AppDbContext db) : ICurrencyBusiness
{
    public async Task<List<CurrencyDto>> ListAsync() =>
        (await db.Currencies.OrderBy(x => x.Code).ToListAsync()).Select(x => x.ToDto()).ToList();

    public async Task<CurrencyDto?> GetAsync(string code) =>
        (await db.Currencies.FirstOrDefaultAsync(x => x.Code == code))?.ToDto();

    public async Task<(CurrencyDto? dto, object? error)> CreateAsync(UpsertCurrencyRequest req)
    {
        var code = req.Code.ToUpperInvariant();
        if (await db.Currencies.AnyAsync(x => x.Code == code))
            return (null, new { code = "DUPLICATE", message = $"Currency '{code}' already exists." });

        if (req.IsBase && await db.Currencies.AnyAsync(x => x.IsBase))
            return (null, new { code = "BASE_EXISTS", message = "Another base currency is already configured. Demote it first." });

        if (!req.IsBase)
        {
            var anchor = req.AnchorCurrencyCode?.ToUpperInvariant();
            if (anchor is null || !await db.Currencies.AnyAsync(x => x.Code == anchor))
                return (null, new { code = "ANCHOR_NOT_FOUND", message = $"Anchor currency '{anchor}' does not exist." });
        }

        var entity = new Currency
        {
            Code = code,
            Name = req.Name,
            Symbol = req.Symbol,
            IsBase = req.IsBase,
            AnchorCurrencyCode = req.IsBase ? null : req.AnchorCurrencyCode?.ToUpperInvariant(),
            Rate = req.IsBase ? null : req.Rate,
            IsActive = req.IsActive,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Currencies.Add(entity);
        await db.SaveChangesAsync();
        return (entity.ToDto(), null);
    }

    public async Task<(CurrencyDto? dto, object? error)> UpdateAsync(string code, UpsertCurrencyRequest req)
    {
        var c = await db.Currencies.FirstOrDefaultAsync(x => x.Code == code);
        if (c is null) return (null, null);

        if (req.IsBase != c.IsBase && req.IsBase && await db.Currencies.AnyAsync(x => x.IsBase && x.Code != code))
            return (null, new { code = "BASE_EXISTS", message = "Another base currency is already configured. Demote it first." });
        if (!req.IsBase && c.IsBase)
            return (null, new { code = "DEMOTE_BASE", message = "Cannot demote the base currency. Promote another currency to base first." });

        if (!req.IsBase)
        {
            var anchor = req.AnchorCurrencyCode?.ToUpperInvariant();
            if (anchor is null || !await db.Currencies.AnyAsync(x => x.Code == anchor))
                return (null, new { code = "ANCHOR_NOT_FOUND", message = $"Anchor currency '{anchor}' does not exist." });
            if (string.Equals(anchor, c.Code, StringComparison.OrdinalIgnoreCase))
                return (null, new { code = "SELF_ANCHOR", message = "Currency cannot anchor to itself." });
        }

        c.Name = req.Name;
        c.Symbol = req.Symbol;
        c.IsBase = req.IsBase;
        c.AnchorCurrencyCode = req.IsBase ? null : req.AnchorCurrencyCode?.ToUpperInvariant();
        c.Rate = req.IsBase ? null : req.Rate;
        c.IsActive = req.IsActive;
        c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return (c.ToDto(), null);
    }

    public async Task<object?> DeleteAsync(string code)
    {
        var c = await db.Currencies.FirstOrDefaultAsync(x => x.Code == code);
        if (c is null) return null;
        if (c.IsBase) return new { code = "DELETE_BASE", message = "Cannot delete the base currency." };
        if (await db.Currencies.AnyAsync(x => x.AnchorCurrencyCode == code))
            return new { code = "ANCHOR_REFERENCED", message = $"Currency '{code}' is referenced as an anchor by another currency." };
        db.Currencies.Remove(c);
        await db.SaveChangesAsync();
        return new { ok = true };
    }
}
