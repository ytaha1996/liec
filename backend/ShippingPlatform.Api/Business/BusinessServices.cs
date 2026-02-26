using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Business;

public interface IAuthBusiness
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
}

public class AuthBusiness(AppDbContext db, ITokenService tokens) : IAuthBusiness
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await db.AdminUsers.FirstOrDefaultAsync(x => x.Email == request.Email && x.IsActive);
        if (user is null) return null;
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash)) return null;
        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return new LoginResponse(tokens.Create(user), user.Email);
    }
}

public interface IMasterDataBusiness
{
    Task<List<WarehouseDto>> ListWarehousesAsync();
    Task<WarehouseDto?> GetWarehouseAsync(int id);
    Task<WarehouseDto> CreateWarehouseAsync(UpsertWarehouseRequest req);
    Task<WarehouseDto?> UpdateWarehouseAsync(int id, UpsertWarehouseRequest req);

    Task<List<GoodTypeDto>> ListGoodTypesAsync();
    Task<GoodTypeDto?> GetGoodTypeAsync(int id);
    Task<GoodTypeDto> CreateGoodTypeAsync(UpsertGoodTypeRequest req);
    Task<GoodTypeDto?> UpdateGoodTypeAsync(int id, UpsertGoodTypeRequest req);

    Task<List<SupplierDto>> ListSuppliersAsync();
    Task<SupplierDto?> GetSupplierAsync(int id);
    Task<SupplierDto> CreateSupplierAsync(UpsertSupplierRequest req);
    Task<SupplierDto?> UpdateSupplierAsync(int id, UpsertSupplierRequest req);

    Task<List<PricingConfigDto>> ListPricingConfigsAsync();
    Task<PricingConfigDto?> GetPricingConfigAsync(int id);
    Task<PricingConfigDto> CreatePricingConfigAsync(UpsertPricingConfigRequest req);
    Task<PricingConfigDto?> UpdatePricingConfigAsync(int id, UpsertPricingConfigRequest req);
    Task<PricingConfigDto?> ActivatePricingConfigAsync(int id);
    Task<PricingConfigDto?> RetirePricingConfigAsync(int id);
}

public class MasterDataBusiness(AppDbContext db) : IMasterDataBusiness
{
    public async Task<List<WarehouseDto>> ListWarehousesAsync() => (await db.Warehouses.ToListAsync()).Select(x => x.ToDto()).ToList();
    public async Task<WarehouseDto?> GetWarehouseAsync(int id) => (await db.Warehouses.FindAsync(id))?.ToDto();
    public async Task<WarehouseDto> CreateWarehouseAsync(UpsertWarehouseRequest req)
    {
        var e = new Warehouse { Code = req.Code, Name = req.Name, City = req.City, Country = req.Country, MaxWeightKg = req.MaxWeightKg, MaxVolumeM3 = req.MaxVolumeM3, IsActive = req.IsActive };
        db.Warehouses.Add(e); await db.SaveChangesAsync(); return e.ToDto();
    }
    public async Task<WarehouseDto?> UpdateWarehouseAsync(int id, UpsertWarehouseRequest req)
    {
        var e = await db.Warehouses.FindAsync(id); if (e is null) return null;
        e.Code = req.Code; e.Name = req.Name; e.City = req.City; e.Country = req.Country; e.MaxWeightKg = req.MaxWeightKg; e.MaxVolumeM3 = req.MaxVolumeM3; e.IsActive = req.IsActive;
        await db.SaveChangesAsync(); return e.ToDto();
    }

    public async Task<List<GoodTypeDto>> ListGoodTypesAsync() => (await db.GoodTypes.ToListAsync()).Select(x => x.ToDto()).ToList();
    public async Task<GoodTypeDto?> GetGoodTypeAsync(int id) => (await db.GoodTypes.FindAsync(id))?.ToDto();
    public async Task<GoodTypeDto> CreateGoodTypeAsync(UpsertGoodTypeRequest req)
    {
        var e = new GoodType { NameEn = req.NameEn, NameAr = req.NameAr, RatePerKg = req.RatePerKg, RatePerM3 = req.RatePerM3, IsActive = req.IsActive };
        db.GoodTypes.Add(e); await db.SaveChangesAsync(); return e.ToDto();
    }
    public async Task<GoodTypeDto?> UpdateGoodTypeAsync(int id, UpsertGoodTypeRequest req)
    {
        var e = await db.GoodTypes.FindAsync(id); if (e is null) return null;
        e.NameEn = req.NameEn; e.NameAr = req.NameAr; e.RatePerKg = req.RatePerKg; e.RatePerM3 = req.RatePerM3; e.IsActive = req.IsActive;
        await db.SaveChangesAsync(); return e.ToDto();
    }

    public async Task<List<SupplierDto>> ListSuppliersAsync() => (await db.Suppliers.ToListAsync()).Select(x => x.ToDto()).ToList();
    public async Task<SupplierDto?> GetSupplierAsync(int id) => (await db.Suppliers.FindAsync(id))?.ToDto();
    public async Task<SupplierDto> CreateSupplierAsync(UpsertSupplierRequest req)
    {
        var e = new Supplier { Name = req.Name, Email = req.Email, IsActive = req.IsActive };
        db.Suppliers.Add(e); await db.SaveChangesAsync(); return e.ToDto();
    }
    public async Task<SupplierDto?> UpdateSupplierAsync(int id, UpsertSupplierRequest req)
    {
        var e = await db.Suppliers.FindAsync(id); if (e is null) return null;
        e.Name = req.Name; e.Email = req.Email; e.IsActive = req.IsActive;
        await db.SaveChangesAsync(); return e.ToDto();
    }

    public async Task<List<PricingConfigDto>> ListPricingConfigsAsync() => (await db.PricingConfigs.ToListAsync()).Select(x => x.ToDto()).ToList();
    public async Task<PricingConfigDto?> GetPricingConfigAsync(int id) => (await db.PricingConfigs.FindAsync(id))?.ToDto();
    public async Task<PricingConfigDto> CreatePricingConfigAsync(UpsertPricingConfigRequest req)
    {
        var e = new PricingConfig { Name = req.Name, Currency = req.Currency, EffectiveFrom = req.EffectiveFrom, EffectiveTo = req.EffectiveTo, DefaultRatePerKg = req.DefaultRatePerKg, DefaultRatePerM3 = req.DefaultRatePerM3, Status = req.Status };
        db.PricingConfigs.Add(e); await db.SaveChangesAsync(); return e.ToDto();
    }
    public async Task<PricingConfigDto?> UpdatePricingConfigAsync(int id, UpsertPricingConfigRequest req)
    {
        var e = await db.PricingConfigs.FindAsync(id); if (e is null) return null;
        e.Name = req.Name; e.Currency = req.Currency; e.EffectiveFrom = req.EffectiveFrom; e.EffectiveTo = req.EffectiveTo; e.DefaultRatePerKg = req.DefaultRatePerKg; e.DefaultRatePerM3 = req.DefaultRatePerM3; e.Status = req.Status;
        await db.SaveChangesAsync(); return e.ToDto();
    }
    public async Task<PricingConfigDto?> ActivatePricingConfigAsync(int id)
    {
        var e = await db.PricingConfigs.FindAsync(id); if (e is null) return null;
        foreach (var p in db.PricingConfigs.Where(x => x.Status == PricingConfigStatus.Active)) p.Status = PricingConfigStatus.Retired;
        e.Status = PricingConfigStatus.Active; await db.SaveChangesAsync(); return e.ToDto();
    }
    public async Task<PricingConfigDto?> RetirePricingConfigAsync(int id)
    {
        var e = await db.PricingConfigs.FindAsync(id); if (e is null) return null;
        e.Status = PricingConfigStatus.Retired; await db.SaveChangesAsync(); return e.ToDto();
    }
}

public interface ICustomerBusiness
{
    Task<List<CustomerDto>> ListAsync(string? q);
    Task<CustomerDto?> GetAsync(int id);
    Task<CustomerDto> CreateAsync(CreateCustomerRequest req);
    Task<CustomerDto?> UpdateAsync(int id, UpdateCustomerRequest req);
    Task<WhatsAppConsentDto?> PatchConsentAsync(int id, WhatsAppConsentDto consent);
}

public class CustomerBusiness(AppDbContext db) : ICustomerBusiness
{
    public async Task<List<CustomerDto>> ListAsync(string? q)
    {
        var query = db.Customers.Include(x => x.WhatsAppConsent).AsQueryable();
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(x => x.Name.Contains(q) || x.PrimaryPhone.Contains(q));
        return (await query.OrderBy(x => x.Name).ToListAsync()).Select(x => x.ToDto()).ToList();
    }

    public async Task<CustomerDto?> GetAsync(int id) => (await db.Customers.Include(x => x.WhatsAppConsent).FirstOrDefaultAsync(x => x.Id == id))?.ToDto();

    public async Task<CustomerDto> CreateAsync(CreateCustomerRequest req)
    {
        var entity = new Customer { Name = req.Name, PrimaryPhone = req.PrimaryPhone, Email = req.Email, IsActive = req.IsActive };
        db.Customers.Add(entity);
        await db.SaveChangesAsync();
        db.WhatsAppConsents.Add(new WhatsAppConsent { CustomerId = entity.Id, OptInStatusUpdates = true, OptInDeparturePhotos = true, OptInArrivalPhotos = true });
        await db.SaveChangesAsync();
        await db.Entry(entity).Reference(x => x.WhatsAppConsent).LoadAsync();
        return entity.ToDto();
    }

    public async Task<CustomerDto?> UpdateAsync(int id, UpdateCustomerRequest req)
    {
        var e = await db.Customers.Include(x => x.WhatsAppConsent).FirstOrDefaultAsync(x => x.Id == id);
        if (e is null) return null;
        e.Name = req.Name; e.PrimaryPhone = req.PrimaryPhone; e.Email = req.Email; e.IsActive = req.IsActive;
        await db.SaveChangesAsync();
        return e.ToDto();
    }

    public async Task<WhatsAppConsentDto?> PatchConsentAsync(int id, WhatsAppConsentDto consent)
    {
        var c = await db.Customers.Include(x => x.WhatsAppConsent).FirstOrDefaultAsync(x => x.Id == id);
        if (c is null) return null;
        if (c.WhatsAppConsent is null) c.WhatsAppConsent = new WhatsAppConsent { CustomerId = id };
        c.WhatsAppConsent.OptInStatusUpdates = consent.OptInStatusUpdates;
        c.WhatsAppConsent.OptInDeparturePhotos = consent.OptInDeparturePhotos;
        c.WhatsAppConsent.OptInArrivalPhotos = consent.OptInArrivalPhotos;
        c.WhatsAppConsent.OptedOutAt = consent.OptedOutAt;
        await db.SaveChangesAsync();
        return new WhatsAppConsentDto(c.WhatsAppConsent.OptInStatusUpdates, c.WhatsAppConsent.OptInDeparturePhotos, c.WhatsAppConsent.OptInArrivalPhotos, c.WhatsAppConsent.OptedOutAt);
    }
}
