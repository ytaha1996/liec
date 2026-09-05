using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<WhatsAppConsent> WhatsAppConsents => Set<WhatsAppConsent>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<PricingConfig> PricingConfigs => Set<PricingConfig>();
    public DbSet<GoodType> GoodTypes => Set<GoodType>();
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<ShipmentSequence> ShipmentSequences => Set<ShipmentSequence>();
    public DbSet<InvoiceSequence> InvoiceSequences => Set<InvoiceSequence>();
    public DbSet<Currency> Currencies => Set<Currency>();
    public DbSet<ShipmentRateSnapshot> ShipmentRateSnapshots => Set<ShipmentRateSnapshot>();
    public DbSet<Package> Packages => Set<Package>();
    public DbSet<PackageItem> PackageItems => Set<PackageItem>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<SupplyOrder> SupplyOrders => Set<SupplyOrder>();
    public DbSet<Media> Media => Set<Media>();
    public DbSet<PackageDocument> PackageDocuments => Set<PackageDocument>();
    public DbSet<WhatsAppCampaign> WhatsAppCampaigns => Set<WhatsAppCampaign>();
    public DbSet<WhatsAppDeliveryLog> WhatsAppDeliveryLogs => Set<WhatsAppDeliveryLog>();
    public DbSet<PackagePricingOverride> PricingOverrides => Set<PackagePricingOverride>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // ── Accounting ──
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();
    public DbSet<Tax> Taxes => Set<Tax>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<AccountingSettings> AccountingSettings => Set<AccountingSettings>();
    public DbSet<Journal> Journals => Set<Journal>();
    public DbSet<AccountingPeriod> AccountingPeriods => Set<AccountingPeriod>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalEntryLine> JournalEntryLines => Set<JournalEntryLine>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<PaymentAllocation> PaymentAllocations => Set<PaymentAllocation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>().HasOne(x => x.WhatsAppConsent).WithOne(x => x.Customer).HasForeignKey<WhatsAppConsent>(x => x.CustomerId);
        modelBuilder.Entity<Warehouse>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Shipment>().HasIndex(x => x.RefCode).IsUnique();
        modelBuilder.Entity<SupplyOrder>().HasIndex(x => x.PackageId).IsUnique();
        modelBuilder.Entity<ShipmentSequence>().HasIndex(x => new { x.OriginWarehouseCode, x.Year }).IsUnique();
        modelBuilder.Entity<InvoiceSequence>().HasIndex(x => x.Year).IsUnique();
        modelBuilder.Entity<Currency>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Currency>().Property(x => x.Rate).HasPrecision(18, 8);
        modelBuilder.Entity<ShipmentRateSnapshot>().HasIndex(x => new { x.ShipmentId, x.Event, x.CurrencyCode }).IsUnique();
        modelBuilder.Entity<ShipmentRateSnapshot>().Property(x => x.RateToBase).HasPrecision(18, 8);
        modelBuilder.Entity<ShipmentRateSnapshot>()
            .HasOne(x => x.Shipment).WithMany()
            .HasForeignKey(x => x.ShipmentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Performance indexes on foreign keys used in frequent queries
        modelBuilder.Entity<Package>().HasIndex(x => x.ShipmentId);
        modelBuilder.Entity<Package>().HasIndex(x => x.CustomerId);
        modelBuilder.Entity<PackageItem>().HasIndex(x => x.PackageId);
        modelBuilder.Entity<PackageItem>().Property(x => x.Unit).HasDefaultValue(Unit.Box).IsRequired();
        modelBuilder.Entity<PackageItem>().Property(x => x.UnitPrice).HasPrecision(18, 2);
        modelBuilder.Entity<Media>().HasIndex(x => x.PackageId);
        modelBuilder.Entity<WhatsAppDeliveryLog>().HasIndex(x => x.CampaignId);
        modelBuilder.Entity<PackagePricingOverride>().HasIndex(x => x.PackageId);
        modelBuilder.Entity<AuditLog>().HasIndex(x => new { x.EntityType, x.EntityId });

        // ── Decimal precision (Task 6.1) ──
        modelBuilder.Entity<Package>().Property(x => x.WeightKg).HasPrecision(10, 3);
        modelBuilder.Entity<Package>().Property(x => x.Cbm).HasPrecision(10, 3);
        modelBuilder.Entity<Package>().Property(x => x.AppliedRatePerKg).HasPrecision(12, 4);
        modelBuilder.Entity<Package>().Property(x => x.AppliedRatePerCbm).HasPrecision(12, 4);
        modelBuilder.Entity<Package>().Property(x => x.ChargeAmount).HasPrecision(18, 2);
        modelBuilder.Entity<Shipment>().Property(x => x.MaxWeightKg).HasPrecision(10, 3);
        modelBuilder.Entity<Shipment>().Property(x => x.MaxCbm).HasPrecision(10, 3);
        modelBuilder.Entity<Shipment>().Property(x => x.TotalWeightKg).HasPrecision(10, 3);
        modelBuilder.Entity<Shipment>().Property(x => x.TotalCbm).HasPrecision(10, 3);
        modelBuilder.Entity<Warehouse>().Property(x => x.MaxWeightKg).HasPrecision(10, 3);
        modelBuilder.Entity<Warehouse>().Property(x => x.MaxCbm).HasPrecision(10, 3);
        modelBuilder.Entity<PricingConfig>().Property(x => x.DefaultRatePerKg).HasPrecision(12, 4);
        modelBuilder.Entity<PricingConfig>().Property(x => x.DefaultRatePerCbm).HasPrecision(12, 4);
        modelBuilder.Entity<PricingConfig>().Property(x => x.MinimumCharge).HasPrecision(12, 4);
        modelBuilder.Entity<PackagePricingOverride>().Property(x => x.OriginalValue).HasPrecision(18, 2);
        modelBuilder.Entity<PackagePricingOverride>().Property(x => x.NewValue).HasPrecision(18, 2);
        modelBuilder.Entity<SupplyOrder>().Property(x => x.PurchasePrice).HasPrecision(18, 2);

        // ── Performance indexes (Task 6.3) ──
        modelBuilder.Entity<AdminUser>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<Customer>().HasIndex(x => x.Email);
        modelBuilder.Entity<Customer>().HasIndex(x => x.PrimaryPhone).IsUnique();
        modelBuilder.Entity<Package>().HasIndex(x => x.Status);
        modelBuilder.Entity<Package>().HasIndex(x => x.SupplyOrderId);
        modelBuilder.Entity<Shipment>().HasIndex(x => x.Status);
        modelBuilder.Entity<Shipment>().HasIndex(x => x.PlannedDepartureDate);
        modelBuilder.Entity<WhatsAppDeliveryLog>().HasIndex(x => x.CustomerId);
        modelBuilder.Entity<WhatsAppDeliveryLog>().HasIndex(x => x.Result);
        modelBuilder.Entity<AuditLog>().HasIndex(x => x.AdminUserId);
        modelBuilder.Entity<AuditLog>().HasIndex(x => x.CreatedAt);

        // ── Accounting ──
        // ACC-07/08: one number per invoice, ever. The unique index is the last
        // line of defence behind the numbering service.
        modelBuilder.Entity<Invoice>().HasIndex(x => x.Number).IsUnique();
        modelBuilder.Entity<Invoice>().HasIndex(x => new { x.ShipmentId, x.CustomerId });
        modelBuilder.Entity<Invoice>().Property(x => x.UntaxedTotal).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>().Property(x => x.TaxTotal).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>().Property(x => x.GrandTotal).HasPrecision(18, 2);

        // An invoiced container or customer cannot be deleted out from under
        // the books, and a credit note keeps pointing at what it reverses.
        modelBuilder.Entity<Invoice>()
            .HasOne(x => x.Shipment).WithMany()
            .HasForeignKey(x => x.ShipmentId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Invoice>()
            .HasOne(x => x.Customer).WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Invoice>()
            .HasOne(x => x.ReversesInvoice).WithMany()
            .HasForeignKey(x => x.ReversesInvoiceId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InvoiceLine>().HasIndex(x => x.InvoiceId);
        modelBuilder.Entity<InvoiceLine>()
            .HasOne(x => x.Invoice).WithMany(i => i.Lines)
            .HasForeignKey(x => x.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);
        // A billed package stays billed: it cannot be deleted while a line
        // references it (trap 4).
        modelBuilder.Entity<InvoiceLine>()
            .HasOne(x => x.Package).WithMany()
            .HasForeignKey(x => x.PackageId)
            .OnDelete(DeleteBehavior.Restrict);

        // ACC-14: amounts are stored with their currency, never bare.
        modelBuilder.Entity<InvoiceLine>().OwnsOne(x => x.Amount, m =>
        {
            m.Property(p => p.Amount).HasColumnName("Amount").HasPrecision(18, 2);
            m.Property(p => p.CurrencyCode).HasColumnName("AmountCurrency").HasMaxLength(3);
        });
        modelBuilder.Entity<PackageItem>().OwnsOne(x => x.DeclaredValue, m =>
        {
            m.Property(p => p.Amount).HasColumnName("DeclaredValueAmount").HasPrecision(18, 2);
            m.Property(p => p.CurrencyCode).HasColumnName("DeclaredValueCurrency").HasMaxLength(3);
        });

        modelBuilder.Entity<Tax>().HasIndex(x => x.Code).IsUnique();

        // ── Ledger ──
        // Full-code uniqueness: two charts were once judged aligned by comparing
        // prefixes when they shared almost no actual account numbers (trap 2).
        modelBuilder.Entity<Account>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Journal>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<AccountingPeriod>().HasIndex(x => new { x.Year, x.Month }).IsUnique();
        modelBuilder.Entity<JournalEntry>().HasIndex(x => x.Number).IsUnique();
        modelBuilder.Entity<JournalEntry>().HasIndex(x => x.AccountingDate);
        modelBuilder.Entity<JournalEntry>()
            .HasOne(x => x.Journal).WithMany().HasForeignKey(x => x.JournalId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<JournalEntry>()
            .HasOne(x => x.Period).WithMany().HasForeignKey(x => x.PeriodId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<JournalEntryLine>().HasIndex(x => x.JournalEntryId);
        modelBuilder.Entity<JournalEntryLine>().HasIndex(x => x.AccountId);
        modelBuilder.Entity<JournalEntryLine>().Property(x => x.Debit).HasPrecision(18, 2);
        modelBuilder.Entity<JournalEntryLine>().Property(x => x.Credit).HasPrecision(18, 2);
        modelBuilder.Entity<JournalEntryLine>()
            .HasOne(x => x.JournalEntry).WithMany(e => e.Lines).HasForeignKey(x => x.JournalEntryId)
            .OnDelete(DeleteBehavior.Cascade);
        // A posted account cannot be deleted from under the books.
        modelBuilder.Entity<JournalEntryLine>()
            .HasOne(x => x.Account).WithMany().HasForeignKey(x => x.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        // ── Payments ──
        modelBuilder.Entity<Payment>().HasIndex(x => x.Number).IsUnique();
        modelBuilder.Entity<Payment>().HasIndex(x => x.CustomerId);
        modelBuilder.Entity<Payment>().OwnsOne(x => x.Amount, m =>
        {
            m.Property(p => p.Amount).HasColumnName("Amount").HasPrecision(18, 2);
            m.Property(p => p.CurrencyCode).HasColumnName("AmountCurrency").HasMaxLength(3);
        });
        modelBuilder.Entity<Payment>()
            .HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PaymentAllocation>().Property(x => x.Amount).HasPrecision(18, 2);
        modelBuilder.Entity<PaymentAllocation>().HasIndex(x => new { x.PaymentId, x.InvoiceId }).IsUnique();
        modelBuilder.Entity<PaymentAllocation>()
            .HasOne(x => x.Payment).WithMany(p => p.Allocations).HasForeignKey(x => x.PaymentId)
            .OnDelete(DeleteBehavior.Cascade);
        // An allocated invoice stays allocated — it cannot vanish from the books.
        modelBuilder.Entity<PaymentAllocation>()
            .HasOne(x => x.Invoice).WithMany().HasForeignKey(x => x.InvoiceId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Invoice>().HasOne<JournalEntry>().WithMany()
            .HasForeignKey(x => x.JournalEntryId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Tax>().Property(x => x.Rate).HasPrecision(9, 4);

        modelBuilder.Entity<Package>().HasIndex(x => x.InvoiceLineId);

        // ── Restrict cascade-delete on parents (Task 6.4) ──
        modelBuilder.Entity<Shipment>()
            .HasOne(x => x.OriginWarehouse).WithMany()
            .HasForeignKey(x => x.OriginWarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Shipment>()
            .HasOne(x => x.DestinationWarehouse).WithMany()
            .HasForeignKey(x => x.DestinationWarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Package>()
            .HasOne(x => x.Customer).WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Package>()
            .HasOne(x => x.Shipment).WithMany(s => s.Packages)
            .HasForeignKey(x => x.ShipmentId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<SupplyOrder>()
            .HasOne(x => x.Customer).WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<SupplyOrder>()
            .HasOne(x => x.Supplier).WithMany()
            .HasForeignKey(x => x.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        // Media → AdminUser (uploader). Restrict so deleted users don't blow away media history.
        modelBuilder.Entity<Media>()
            .HasOne(x => x.RecordedByAdminUser).WithMany()
            .HasForeignKey(x => x.RecordedByAdminUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PackageDocument>().HasIndex(x => x.PackageId);
        modelBuilder.Entity<PackageDocument>()
            .HasOne(x => x.Package).WithMany()
            .HasForeignKey(x => x.PackageId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PackageDocument>()
            .HasOne(x => x.UploadedByAdminUser).WithMany()
            .HasForeignKey(x => x.UploadedByAdminUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Package.Currency / PricingConfig.Currency → Currencies.Code (alternate key).
        // Currency rows can't be deleted while referenced — see CurrencyBusiness.DeleteAsync.
        modelBuilder.Entity<Currency>().HasAlternateKey(c => c.Code);
        modelBuilder.Entity<Package>()
            .HasOne(p => p.CurrencyEntity).WithMany()
            .HasForeignKey(p => p.Currency)
            .HasPrincipalKey(c => c.Code)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PricingConfig>()
            .HasOne(p => p.CurrencyEntity).WithMany()
            .HasForeignKey(p => p.Currency)
            .HasPrincipalKey(c => c.Code)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
