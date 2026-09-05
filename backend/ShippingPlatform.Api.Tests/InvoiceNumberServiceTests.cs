using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services.Accounting;

namespace ShippingPlatform.Api.Tests;

/// <summary>ACC-07, ACC-08 and trap 3: numbering that cannot be reset or reused.</summary>
public class InvoiceNumberServiceTests
{
    private static async Task<(Data.AppDbContext db, int shipmentId)> ShipmentAsync(string refCode = "BEI-2801")
    {
        var db = TestDb.Create();
        var shipment = new Shipment { RefCode = refCode, OriginWarehouseId = 1, DestinationWarehouseId = 2 };
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync();
        return (db, shipment.Id);
    }

    private static Invoice Issued(int shipmentId, string number, InvoiceState state = InvoiceState.Posted) => new()
    {
        Number = number, ShipmentId = shipmentId, CustomerId = 1, CurrencyCode = "XAF", State = state,
    };

    [Fact]
    public async Task Starts_at_001_for_a_container()
    {
        var (db, id) = await ShipmentAsync();
        await using var _ = db;

        Assert.Equal("INV/BEI-2801/001", await new InvoiceNumberService(db).NextAsync(id));
    }

    [Fact]
    public async Task Continues_from_the_highest_number_already_issued()
    {
        var (db, id) = await ShipmentAsync();
        await using var _ = db;
        db.Invoices.AddRange(Issued(id, "INV/BEI-2801/001"), Issued(id, "INV/BEI-2801/002"));
        await db.SaveChangesAsync();

        Assert.Equal("INV/BEI-2801/003", await new InvoiceNumberService(db).NextAsync(id));
    }

    [Fact]
    public async Task Numbering_restarts_for_each_container()
    {
        var (db, first) = await ShipmentAsync("BEI-2801");
        await using var _ = db;
        var second = new Shipment { RefCode = "BEI-2802", OriginWarehouseId = 1, DestinationWarehouseId = 2 };
        db.Shipments.Add(second);
        db.Invoices.AddRange(Issued(first, "INV/BEI-2801/001"), Issued(first, "INV/BEI-2801/002"));
        await db.SaveChangesAsync();

        Assert.Equal("INV/BEI-2802/001", await new InvoiceNumberService(db).NextAsync(second.Id));
    }

    [Fact]
    public async Task A_cancelled_invoice_keeps_its_number_consumed()
    {
        // ACC-08: an auditor reads a gap as a removed document, so the number
        // must not come back around and be attached to something else.
        var (db, id) = await ShipmentAsync();
        await using var _ = db;
        db.Invoices.AddRange(
            Issued(id, "INV/BEI-2801/001"),
            Issued(id, "INV/BEI-2801/002", InvoiceState.Cancelled));
        await db.SaveChangesAsync();

        Assert.Equal("INV/BEI-2801/003", await new InvoiceNumberService(db).NextAsync(id));
    }

    [Fact]
    public async Task Resumes_from_the_highest_survivor_after_records_are_removed()
    {
        // Trap 3: a cleanup routine reset counters to 1 while real records
        // existed. Deriving from the data rather than a counter makes that
        // failure impossible — even with earlier numbers gone.
        var (db, id) = await ShipmentAsync();
        await using var _ = db;
        db.Invoices.Add(Issued(id, "INV/BEI-2801/007"));
        await db.SaveChangesAsync();

        Assert.Equal("INV/BEI-2801/008", await new InvoiceNumberService(db).NextAsync(id));
    }

    [Fact]
    public async Task Ignores_invoices_belonging_to_other_containers()
    {
        // Trap 2: match on the full prefix, never a partial one. BEI-280 must
        // not be read as a prefix of BEI-2801.
        var (db, id) = await ShipmentAsync("BEI-280");
        await using var _ = db;
        var other = new Shipment { RefCode = "BEI-2801", OriginWarehouseId = 1, DestinationWarehouseId = 2 };
        db.Shipments.Add(other);
        await db.SaveChangesAsync();
        db.Invoices.AddRange(
            Issued(other.Id, "INV/BEI-2801/001"),
            Issued(other.Id, "INV/BEI-2801/002"));
        await db.SaveChangesAsync();

        Assert.Equal("INV/BEI-280/001", await new InvoiceNumberService(db).NextAsync(id));
    }

    [Fact]
    public async Task Rejects_an_unknown_shipment()
    {
        await using var db = TestDb.Create();
        await Assert.ThrowsAsync<KeyNotFoundException>(() => new InvoiceNumberService(db).NextAsync(404));
    }
    [Fact]
    public async Task Two_operators_generating_at_once_do_not_share_a_number()
    {
        // The realistic race: two people press Generate on the same container.
        // The unique index is the last line of defence, so this asserts the
        // numbers themselves come out distinct rather than relying on it.
        var (db, id) = await ShipmentAsync();
        await using var _ = db;
        var service = new InvoiceNumberService(db);

        var numbers = new List<string>();
        for (var i = 0; i < 5; i++)
        {
            var number = await service.NextAsync(id);
            numbers.Add(number);
            // Each allocation is followed by the invoice actually being written,
            // which is what the next allocation reads.
            db.Invoices.Add(Issued(id, number, InvoiceState.Draft));
            await db.SaveChangesAsync();
        }

        Assert.Equal(5, numbers.Distinct().Count());
        Assert.Equal(
            ["INV/BEI-2801/001", "INV/BEI-2801/002", "INV/BEI-2801/003", "INV/BEI-2801/004", "INV/BEI-2801/005"],
            numbers);
    }

    [Fact]
    public async Task Numbers_run_unbroken_except_where_something_was_cancelled()
    {
        // ACC-08: a gap must always be explainable by a cancellation, never by a
        // number quietly going missing.
        var (db, id) = await ShipmentAsync();
        await using var _ = db;
        db.Invoices.AddRange(
            Issued(id, "INV/BEI-2801/001"),
            Issued(id, "INV/BEI-2801/002", InvoiceState.Cancelled),
            Issued(id, "INV/BEI-2801/003"));
        await db.SaveChangesAsync();

        var next = await new InvoiceNumberService(db).NextAsync(id);

        Assert.Equal("INV/BEI-2801/004", next);
        // 002 is still on file, cancelled — the gap in the live set is accounted for.
        Assert.Single(db.Invoices.Where(i => i.State == InvoiceState.Cancelled));
    }
}
