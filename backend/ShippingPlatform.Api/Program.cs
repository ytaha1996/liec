using System.Text;
using System.Threading.RateLimiting;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;
using ShippingPlatform.Api.Services.Exports;
using ShippingPlatform.Api.Business;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddFluentValidationAutoValidation();

var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var conn = builder.Configuration["ConnectionStrings:MySql"]
          ?? builder.Configuration.GetConnectionString("MySql")
          ?? builder.Configuration.GetConnectionString("Default")
          ?? builder.Configuration["ConnectionStrings:Default"];
if (!string.IsNullOrWhiteSpace(conn))
    builder.Services.AddDbContext<AppDbContext>(o => o
        .UseMySql(conn, ServerVersion.AutoDetect(conn))
        .ConfigureWarnings(w => w.Throw(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.MultipleCollectionIncludeWarning)));
else
    builder.Services.AddDbContext<AppDbContext>(o => o
        .UseInMemoryDatabase("shipping")
        .ConfigureWarnings(w => w.Throw(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.MultipleCollectionIncludeWarning)));

var secret = builder.Configuration["Auth:Secret"] ?? "dev-secret-super-long";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IBlobStorageService, BlobStorageService>();
builder.Services.AddScoped<IRefCodeService, RefCodeService>();
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<IPhotoComplianceService, PhotoComplianceService>();
builder.Services.AddScoped<ICapacityService, CapacityService>();
builder.Services.AddScoped<IImageWatermarkService, ImageWatermarkService>();
if (!string.IsNullOrEmpty(builder.Configuration["Twilio:AccountSid"]))
    builder.Services.AddScoped<IWhatsAppSender, TwilioWhatsAppSender>();
else
    builder.Services.AddScoped<IWhatsAppSender, StubWhatsAppSender>();
builder.Services.AddScoped<IExportService, ExportService>();
builder.Services.AddScoped<IInvoiceSequenceService, InvoiceSequenceService>();
builder.Services.AddSingleton(sp => InvoiceTemplateConstants.FromConfig(sp.GetRequiredService<IConfiguration>()));
builder.Services.AddScoped<ShippingPlatform.Api.Services.FxRates.IFxRateService, ShippingPlatform.Api.Services.FxRates.FxRateService>();
builder.Services.AddScoped<ShippingPlatform.Api.Services.FxRates.IShipmentSnapshotService, ShippingPlatform.Api.Services.FxRates.ShipmentSnapshotService>();
builder.Services.AddScoped<ICurrencyBusiness, CurrencyBusiness>();
builder.Services.AddScoped<ITransitionRuleService, TransitionRuleService>();
builder.Services.AddScoped<IAuthBusiness, AuthBusiness>();
builder.Services.AddScoped<IMasterDataBusiness, MasterDataBusiness>();
builder.Services.AddScoped<ICustomerBusiness, CustomerBusiness>();
builder.Services.AddScoped<IShipmentBusiness, ShipmentBusiness>();
builder.Services.AddScoped<IPackageBusiness, PackageBusiness>();
builder.Services.AddScoped<ISupplyOrderBusiness, SupplyOrderBusiness>();
builder.Services.AddScoped<IWhatsAppBusiness, WhatsAppBusiness>();
builder.Services.AddScoped<IExportBusiness, ExportBusiness>();
builder.Services.AddScoped<IUserBusiness, UserBusiness>();
builder.Services.AddScoped<IAuditService, AuditService>();

builder.Services.AddRateLimiter(o =>
{
    o.AddFixedWindowLimiter("auth", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 10;
        opt.QueueLimit = 0;
    });
});

var app = builder.Build();
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers().RequireAuthorization();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // ── Admin user ──────────────────────────────────────────────────────────
    var email = app.Configuration["SeedAdmin:Email"] ?? Environment.GetEnvironmentVariable("ADMIN_EMAIL") ?? Environment.GetEnvironmentVariable("SEED_ADMIN_EMAIL") ?? "admin@local";
    var pwd = app.Configuration["SeedAdmin:Password"] ?? Environment.GetEnvironmentVariable("ADMIN_PASSWORD") ?? Environment.GetEnvironmentVariable("SEED_ADMIN_PASSWORD") ?? "Admin123!";
    if (!db.AdminUsers.Any(x => x.Email == email))
        db.AdminUsers.Add(new AdminUser { Email = email, PasswordHash = BCrypt.Net.BCrypt.HashPassword(pwd), IsActive = true, Role = UserRole.Admin });
    db.SaveChanges();

    // ── Warehouses ──────────────────────────────────────────────────────────
    if (!db.Warehouses.Any())
    {
        db.Warehouses.AddRange(
            new Warehouse { Code = "BEI", Name = "Beirut Warehouse",  City = "Beirut",    Country = "Lebanon",   MaxWeightKg = 50000, MaxCbm = 500, IsActive = true },
            new Warehouse { Code = "GAB", Name = "Gabon Warehouse",   City = "Libreville", Country = "Gabon",    MaxWeightKg = 30000, MaxCbm = 300, IsActive = true },
            new Warehouse { Code = "CHN", Name = "China Warehouse",   City = "Shanghai",  Country = "China",     MaxWeightKg = 80000, MaxCbm = 800, IsActive = true },
            new Warehouse { Code = "DXB", Name = "Dubai Warehouse",   City = "Dubai",     Country = "UAE",       MaxWeightKg = 60000, MaxCbm = 600, IsActive = true }
        );
        db.SaveChanges();
    }

    // ── Good Types ──────────────────────────────────────────────────────────
    if (!db.GoodTypes.Any())
    {
        db.GoodTypes.AddRange(
            new GoodType { NameEn = "Electronics",        NameAr = "إلكترونيات",        IsActive = true },
            new GoodType { NameEn = "Clothing",           NameAr = "ملابس",              IsActive = true },
            new GoodType { NameEn = "Food Items",         NameAr = "مواد غذائية",        IsActive = true },
            new GoodType { NameEn = "Documents",          NameAr = "وثائق",              IsActive = true },
            new GoodType { NameEn = "Furniture",          NameAr = "أثاث",               IsActive = true },
            new GoodType { NameEn = "Cosmetics",          NameAr = "مستحضرات تجميل",    IsActive = true },
            new GoodType { NameEn = "Tools & Equipment",  NameAr = "أدوات ومعدات",       IsActive = true },
            new GoodType { NameEn = "Medical Supplies",   NameAr = "مستلزمات طبية",      IsActive = true },
            new GoodType { NameEn = "Books & Stationery", NameAr = "كتب وقرطاسية",       IsActive = true },
            new GoodType { NameEn = "Toys & Games",       NameAr = "ألعاب",              IsActive = true },
            new GoodType { NameEn = "Jewelry & Watches",  NameAr = "مجوهرات وساعات",     IsActive = true },
            new GoodType { NameEn = "Automotive Parts",   NameAr = "قطع غيار سيارات",    IsActive = true }
        );
        db.SaveChanges();
    }

    // ── Default Pricing Config ───────────────────────────────────────────────
    if (!db.PricingConfigs.Any())
    {
        db.PricingConfigs.Add(new PricingConfig
        {
            Name             = "Standard Rate 2025",
            Currency         = "EUR",
            EffectiveFrom    = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            EffectiveTo      = null,
            DefaultRatePerKg = 5.00m,
            DefaultRatePerCbm = 15.00m,
            Status           = PricingConfigStatus.Active,
        });
        db.SaveChanges();
    }

    // ── Customers ───────────────────────────────────────────────────────────
    SeedHelper.SeedCustomers(db);

    // ── Currencies ──────────────────────────────────────────────────────────
    SeedHelper.SeedCurrencies(db);
}

app.Run();
