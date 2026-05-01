using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services;

public static class SeedHelper
{
    public static void SeedCurrencies(AppDbContext db)
    {
        if (db.Currencies.Any()) return;

        db.Currencies.AddRange(
            new Currency { Code = "USD", Name = "US Dollar", Symbol = "$", IsBase = true, IsActive = true },
            new Currency { Code = "EUR", Name = "Euro", Symbol = "€", IsBase = false, AnchorCurrencyCode = "USD", Rate = 1.075m, IsActive = true },
            new Currency { Code = "XAF", Name = "Central African CFA Franc", Symbol = "FCFA", IsBase = false, AnchorCurrencyCode = "EUR", Rate = 0.001524m, IsActive = true });
        db.SaveChanges();
    }

    public static void SeedCustomers(AppDbContext db)
    {
        if (db.Customers.Any()) return;

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

        foreach (var (name, phone, mail) in customerSeeds)
        {
            var c = new Customer
            {
                Name = name,
                PrimaryPhone = phone,
                Email = mail,
                IsActive = true,
            };
            db.Customers.Add(c);
            db.SaveChanges();
            db.WhatsAppConsents.Add(new WhatsAppConsent
            {
                CustomerId = c.Id,
                OptInStatusUpdates = true,
                OptInDeparturePhotos = true,
                OptInArrivalPhotos = true,
            });
            db.SaveChanges();
        }
    }
}
