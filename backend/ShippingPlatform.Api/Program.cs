using System.Text;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;
using ShippingPlatform.Api.Business;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
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
    builder.Services.AddDbContext<AppDbContext>(o => o.UseMySql(conn, ServerVersion.AutoDetect(conn)));
else
    builder.Services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase("shipping"));

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
builder.Services.AddScoped<IWhatsAppSender, StubWhatsAppSender>();
builder.Services.AddScoped<IExportService, ExportService>();
builder.Services.AddScoped<ITransitionRuleService, TransitionRuleService>();
builder.Services.AddScoped<IAuthBusiness, AuthBusiness>();
builder.Services.AddScoped<IMasterDataBusiness, MasterDataBusiness>();
builder.Services.AddScoped<ICustomerBusiness, CustomerBusiness>();
builder.Services.AddScoped<IShipmentBusiness, ShipmentBusiness>();
builder.Services.AddScoped<IPackageBusiness, PackageBusiness>();
builder.Services.AddScoped<ISupplyOrderBusiness, SupplyOrderBusiness>();
builder.Services.AddScoped<IWhatsAppBusiness, WhatsAppBusiness>();
builder.Services.AddScoped<IExportBusiness, ExportBusiness>();

var app = builder.Build();
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

app.UseCors();
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
        db.AdminUsers.Add(new AdminUser { Email = email, PasswordHash = BCrypt.Net.BCrypt.HashPassword(pwd), IsActive = true });
    db.SaveChanges();

    // ── Warehouses ──────────────────────────────────────────────────────────
    if (!db.Warehouses.Any())
    {
        db.Warehouses.AddRange(
            new Warehouse { Code = "BEI", Name = "Beirut Warehouse",  City = "Beirut",    Country = "Lebanon",   MaxWeightKg = 50000, MaxVolumeM3 = 500, IsActive = true },
            new Warehouse { Code = "GAB", Name = "Gabon Warehouse",   City = "Libreville", Country = "Gabon",    MaxWeightKg = 30000, MaxVolumeM3 = 300, IsActive = true },
            new Warehouse { Code = "CHN", Name = "China Warehouse",   City = "Shanghai",  Country = "China",     MaxWeightKg = 80000, MaxVolumeM3 = 800, IsActive = true },
            new Warehouse { Code = "DXB", Name = "Dubai Warehouse",   City = "Dubai",     Country = "UAE",       MaxWeightKg = 60000, MaxVolumeM3 = 600, IsActive = true }
        );
        db.SaveChanges();
    }

    // ── Good Types ──────────────────────────────────────────────────────────
    if (!db.GoodTypes.Any())
    {
        db.GoodTypes.AddRange(
            new GoodType { NameEn = "Electronics",        NameAr = "إلكترونيات",        RatePerKg = 8.00m,  RatePerM3 = 25.00m, IsActive = true },
            new GoodType { NameEn = "Clothing",           NameAr = "ملابس",              RatePerKg = 4.00m,  RatePerM3 = 12.00m, IsActive = true },
            new GoodType { NameEn = "Food Items",         NameAr = "مواد غذائية",        RatePerKg = 3.50m,  RatePerM3 = 10.00m, IsActive = true },
            new GoodType { NameEn = "Documents",          NameAr = "وثائق",              RatePerKg = 6.00m,  RatePerM3 = 20.00m, IsActive = true },
            new GoodType { NameEn = "Furniture",          NameAr = "أثاث",               RatePerKg = 2.50m,  RatePerM3 = 8.00m,  IsActive = true },
            new GoodType { NameEn = "Cosmetics",          NameAr = "مستحضرات تجميل",    RatePerKg = 5.00m,  RatePerM3 = 15.00m, IsActive = true },
            new GoodType { NameEn = "Tools & Equipment",  NameAr = "أدوات ومعدات",       RatePerKg = 4.50m,  RatePerM3 = 13.00m, IsActive = true },
            new GoodType { NameEn = "Medical Supplies",   NameAr = "مستلزمات طبية",      RatePerKg = 7.00m,  RatePerM3 = 22.00m, IsActive = true },
            new GoodType { NameEn = "Books & Stationery", NameAr = "كتب وقرطاسية",       RatePerKg = 3.00m,  RatePerM3 = 9.00m,  IsActive = true },
            new GoodType { NameEn = "Toys & Games",       NameAr = "ألعاب",              RatePerKg = 4.00m,  RatePerM3 = 11.00m, IsActive = true },
            new GoodType { NameEn = "Jewelry & Watches",  NameAr = "مجوهرات وساعات",     RatePerKg = 12.00m, RatePerM3 = 40.00m, IsActive = true },
            new GoodType { NameEn = "Automotive Parts",   NameAr = "قطع غيار سيارات",    RatePerKg = 5.50m,  RatePerM3 = 16.00m, IsActive = true }
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
            DefaultRatePerM3 = 15.00m,
            Status           = PricingConfigStatus.Active,
        });
        db.SaveChanges();
    }

    // ── Customers ───────────────────────────────────────────────────────────
    if (!db.Customers.Any())
    {
        var customerSeeds = new[]
        {
            ("Ahmad Khalil",      "+96170111001", "ahmad.khalil@gmail.com"),
            ("Fatima Hassan",     "+96171222002", (string?)null),
            ("Mohamed Saad",      "+96176333003", "m.saad@outlook.com"),
            ("Layla Mansour",     "+96170444004", "layla.m@gmail.com"),
            ("Omar Farhat",       "+96171555005", (string?)null),
            ("Nadia Khoury",      "+96176666006", "nadia.k@gmail.com"),
            ("Karim Jaber",       "+96170777007", (string?)null),
            ("Rania Nassar",      "+96171888008", "rania.nassar@email.com"),
            ("Hassan Diab",       "+96176999009", (string?)null),
            ("Sara Aziz",         "+96170100010", "sara.aziz@gmail.com"),
            ("Walid Frem",        "+96171211011", "walid.frem@company.com"),
            ("Mona Rizk",         "+96176322012", (string?)null),
            ("Tarek Gemayel",     "+96170433013", "tarek.g@email.com"),
            ("Hiba Sleiman",      "+96171544014", (string?)null),
            ("Ziad Abi Nader",    "+96176655015", "ziad.an@gmail.com"),
            ("Dina Haddad",       "+96170766016", "dina.haddad@email.com"),
            ("Fadi Mrad",         "+96171877017", (string?)null),
            ("Rana Karam",        "+96176988018", "rana.karam@gmail.com"),
            ("Joseph Azar",       "+96170199019", (string?)null),
            ("Maya Chahine",      "+96171200020", "maya.chahine@gmail.com"),
        };

        for (int i = 0; i < customerSeeds.Length; i++)
        {
            var (name, phone, mail) = customerSeeds[i];
            var c = new Customer
            {
                Name        = name,
                PrimaryPhone = phone,
                Email       = mail,
                IsActive    = true,
            };
            db.Customers.Add(c);
            db.SaveChanges();
            db.WhatsAppConsents.Add(new WhatsAppConsent
            {
                CustomerId          = c.Id,
                OptInStatusUpdates  = true,
                OptInDeparturePhotos = true,
                OptInArrivalPhotos  = true,
            });
            db.SaveChanges();
        }
    }
}

app.Run();
