using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services.Accounting;

namespace ShippingPlatform.Api.Controllers;

/// <summary>
/// Customer invoices. Generation produces drafts only (ACC-04); posting to the
/// ledger arrives with Stage 2 and is deliberately not exposed here yet.
/// </summary>
[ApiController]
[Route("api")]
[Authorize(Roles = "Admin,Manager,Accountant")]
public class InvoicesController(
    AppDbContext db,
    IInvoiceGenerationService generation,
    IPaymentService payments) : ControllerBase
{
    private int? AdminId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    /// <summary>ACC-03/05: safe to press twice — already-billed packages are skipped.</summary>
    [HttpPost("shipments/{shipmentId:int}/invoices/generate")]
    public async Task<IActionResult> Generate(int shipmentId, CancellationToken ct)
    {
        try
        {
            var result = await generation.GenerateForShipmentAsync(shipmentId, AdminId, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { code = "NOT_FOUND", message = $"Shipment {shipmentId} not found." });
        }
    }

    /// <summary>Every invoice, newest first — the Finance working list.</summary>
    [HttpGet("invoices")]
    public async Task<IActionResult> All(
        [FromQuery] string? state, [FromQuery] int? customerId, [FromQuery] int? shipmentId,
        CancellationToken ct)
    {
        var q = db.Invoices.AsQueryable();
        if (!string.IsNullOrWhiteSpace(state) && Enum.TryParse<InvoiceState>(state, true, out var parsed))
            q = q.Where(i => i.State == parsed);
        if (customerId is { } c) q = q.Where(i => i.CustomerId == c);
        if (shipmentId is { } sh) q = q.Where(i => i.ShipmentId == sh);

        // Materialised first, then mapped: InvoiceMap.Summary is ordinary C#,
        // and a relational provider cannot translate it inside a projection.
        var rows = await q
            .Include(i => i.Customer)
            .Include(i => i.Shipment)
            .Include(i => i.Lines)
            .OrderByDescending(i => i.Id)
            .ToListAsync(ct);

        return Ok(rows.Select(i => new
        {
            Summary = InvoiceMap.Summary(i),
            ShipmentRef = i.Shipment?.RefCode ?? $"#{i.ShipmentId}",
        }).Select(x => new
        {
            x.Summary.Id, x.Summary.Number, x.Summary.ShipmentId, x.Summary.CustomerId,
            x.Summary.CustomerName, x.Summary.State, x.Summary.Type, x.Summary.Currency,
            x.Summary.InvoiceDate, x.Summary.UntaxedTotal, x.Summary.TaxTotal,
            x.Summary.GrandTotal, x.Summary.LineCount, x.ShipmentRef,
        }));
    }

    [HttpGet("shipments/{shipmentId:int}/invoices")]
    public async Task<IActionResult> ForShipment(int shipmentId, CancellationToken ct)
        => Ok((await db.Invoices
                .Include(i => i.Customer)
                .Include(i => i.Lines)
                .Where(i => i.ShipmentId == shipmentId)
                .OrderBy(i => i.Number)
                .ToListAsync(ct))
            .Select(InvoiceMap.Summary));

    [HttpGet("invoices/{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken ct)
    {
        var invoice = await db.Invoices
            .Include(i => i.Lines)
            .Include(i => i.Customer)
            .Include(i => i.Shipment)
            .FirstOrDefaultAsync(i => i.Id == id, ct);

        if (invoice is null)
            return NotFound(new { code = "NOT_FOUND", message = $"Invoice {id} not found." });

        var detail = InvoiceMap.Detail(invoice);

        // ACC-18: what is still owed is derived here rather than stored, so the
        // page can never show a stale "paid" flag.
        var balance = await payments.BalanceOfAsync(id, ct);
        var allocations = await db.PaymentAllocations
            .Where(a => a.InvoiceId == id)
            .OrderBy(a => a.Id)
            .Select(a => new
            {
                a.Id,
                a.Amount,
                Number = a.Payment.Number,
                a.Payment.PaymentDate,
                Method = a.Payment.Method.ToString(),
                a.Payment.Reference,
            })
            .ToListAsync(ct);

        return Ok(new
        {
            detail.Invoice,
            detail.ShipmentRef,
            detail.CustomerPhone,
            detail.Lines,
            invoice.JournalEntryId,
            invoice.ReversesInvoiceId,
            invoice.CancelReason,
            invoice.PostedAt,
            Balance = balance,
            Payments = allocations,
        });
    }

    /// <summary>Credit notes issued against this invoice (ACC-19).</summary>
    [HttpGet("invoices/{id:int}/credit-notes")]
    public async Task<IActionResult> CreditNotes(int id, CancellationToken ct)
        => Ok((await db.Invoices
                .Include(i => i.Customer)
                .Include(i => i.Lines)
                .Where(i => i.ReversesInvoiceId == id)
                .OrderBy(i => i.Number)
                .ToListAsync(ct))
            .Select(InvoiceMap.Summary));
}
