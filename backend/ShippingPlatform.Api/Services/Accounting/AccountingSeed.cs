using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services.Accounting;

/// <summary>
/// Seeds the accounts LIEC actually posts to, from the Lebanese Dagher chart the
/// group uses, together with the journals and tax records the model needs.
///
/// Only the accounts in use are seeded — the full 422-account chart can be added
/// through the Chart of Accounts screen. Everything here is data (ACC-02): the
/// posting code names no account, it reads settings, so Finance can re-point
/// revenue without a code change.
///
/// Note 701 Facturations is deliberately absent from the settings: LIEC sells
/// transport, not merchandise. A previous build posted freight revenue to a
/// merchandise-sales account for weeks without erroring.
/// </summary>
public static class AccountingSeed
{
    private record Seed(string Code, string NameFr, string NameEn, string NameAr, AccountType Type, bool Postable = true);

    private static readonly Seed[] Accounts =
    [
        new("4111", "Clients ordinaires", "Ordinary Clients", "زبائن عاديون", AccountType.Receivable),
        new("713", "Prestations de services", "Services", "تقديم خدمات", AccountType.Revenue),
        new("40", "Fournisseurs", "Suppliers", "موردون", AccountType.Payable),
        new("512", "Banques", "Banks", "مصارف", AccountType.Asset),
        new("530", "Caisse", "Cash", "صندوق", AccountType.Asset),
        new("4457", "TVA collectée", "Tax collected", "ضريبة محصلة", AccountType.Liability),
        new("658", "Charges diverses de gestion", "Rounding and sundry", "أعباء متنوعة", AccountType.Expense),
        // Present so the chart reads correctly, but never wired into settings.
        new("701", "Facturations", "Invoices (goods)", "مبيعات بضائع", AccountType.Revenue),
    ];

    public static async Task EnsureAsync(AppDbContext db, CancellationToken ct = default)
    {
        foreach (var s in Accounts)
        {
            // Matched on the full code, never a prefix (trap 2).
            if (await db.Accounts.AnyAsync(a => a.Code == s.Code, ct)) continue;
            db.Accounts.Add(new Account
            {
                Code = s.Code,
                NameFr = s.NameFr,
                NameEn = s.NameEn,
                NameAr = s.NameAr,
                Type = s.Type,
                IsPostable = s.Postable,
            });
        }

        if (!await db.Journals.AnyAsync(ct))
        {
            db.Journals.AddRange(
                new Journal { Code = "SAL", Name = "Sales", Type = JournalType.Sales },
                new Journal { Code = "PUR", Name = "Purchases", Type = JournalType.Purchases },
                new Journal { Code = "BNK", Name = "Bank", Type = JournalType.Bank },
                new Journal { Code = "MSC", Name = "Miscellaneous", Type = JournalType.Miscellaneous });
        }

        // ACC-16: the treatments exist so the decision is a setting later, not a
        // migration. Nothing is applied — every invoice resolves to zero tax
        // until Finance rules on international freight out of Lebanon.
        if (!await db.Taxes.AnyAsync(ct))
        {
            db.Taxes.AddRange(
                new Tax { Code = "EXEMPT", Name = "Exempt", Rate = 0m, Treatment = TaxTreatment.Exempt },
                new Tax { Code = "ZERO", Name = "Zero-rated export", Rate = 0m, Treatment = TaxTreatment.ZeroRated },
                new Tax { Code = "STD", Name = "Standard-rated", Rate = 11m, Treatment = TaxTreatment.Standard, IsActive = false });
        }

        await db.SaveChangesAsync(ct);

        if (!await db.AccountingSettings.AnyAsync(ct))
        {
            var byCode = await db.Accounts.ToDictionaryAsync(a => a.Code, a => a.Id, ct);
            db.AccountingSettings.Add(new AccountingSettings
            {
                ReceivableAccountId = byCode.GetValueOrDefault("4111"),
                RevenueAccountId = byCode.GetValueOrDefault("713"),
                TaxAccountId = byCode.GetValueOrDefault("4457"),
                BankAccountId = byCode.GetValueOrDefault("512"),
                RoundingAccountId = byCode.GetValueOrDefault("658"),
            });
            await db.SaveChangesAsync(ct);
        }
    }
}
