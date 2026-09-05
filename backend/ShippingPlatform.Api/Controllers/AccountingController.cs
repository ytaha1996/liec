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
/// The books: posting, credit notes, payments, the chart and period locking.
/// Accountants and above only — this is where money becomes history.
/// </summary>
[ApiController]
[Route("api/accounting")]
[Authorize(Roles = "Admin,Manager,Accountant")]
public class AccountingController(
    AppDbContext db,
    IInvoicePostingService invoices,
    IPaymentService payments,
    IPostingService posting) : ControllerBase
{
    private int? AdminId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    // ── Invoices ─────────────────────────────────────────────────────────────

    [HttpPost("invoices/{id:int}/post")]
    public async Task<IActionResult> Post(int id, CancellationToken ct)
        => await Guarded(() => invoices.PostAsync(id, AdminId, ct), i => InvoiceMap.Summary(i));

    [HttpPost("invoices/{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id, [FromBody] CancelInvoiceRequest req, CancellationToken ct)
        => await Guarded(() => invoices.CancelAsync(id, req.Reason, AdminId, ct), i => InvoiceMap.Summary(i));

    [HttpPost("invoices/{id:int}/credit-note")]
    public async Task<IActionResult> CreditNote(int id, [FromBody] CreditNoteRequest req, CancellationToken ct)
        => await Guarded(() => invoices.CreditNoteAsync(id, req.Amount, req.Reason, AdminId, ct), i => InvoiceMap.Summary(i));

    [HttpGet("invoices/{id:int}/balance")]
    public async Task<IActionResult> Balance(int id, CancellationToken ct)
        => await Guarded(() => payments.BalanceOfAsync(id, ct), b => b);

    // ── Payments ─────────────────────────────────────────────────────────────

    [HttpPost("payments")]
    public async Task<IActionResult> RecordPayment([FromBody] RecordPaymentRequest req, CancellationToken ct)
        => await Guarded(
            () => payments.RecordAsync(req.CustomerId, req.Amount, req.CurrencyCode, req.Method, req.Reference,
                req.PaymentDate, req.Allocations ?? [], AdminId, ct),
            p => new { p.Id, p.Number, Amount = p.Amount.Amount, Currency = p.Amount.CurrencyCode, p.PaymentDate });

    [HttpGet("payments")]
    public async Task<IActionResult> Payments(CancellationToken ct)
        => Ok(await db.Payments
            .OrderByDescending(p => p.PaymentDate).ThenByDescending(p => p.Id)
            .Select(p => new
            {
                p.Id,
                p.Number,
                p.CustomerId,
                CustomerName = p.Customer.Name,
                Amount = p.Amount.Amount,
                Currency = p.Amount.CurrencyCode,
                Method = p.Method.ToString(),
                p.Reference,
                p.PaymentDate,
                p.JournalEntryId,
                Allocated = p.Allocations.Sum(a => (decimal?)a.Amount) ?? 0m,
            })
            .ToListAsync(ct));

    [HttpGet("customers/balances")]
    public async Task<IActionResult> Balances(CancellationToken ct)
        => Ok(await payments.CustomerBalancesAsync(ct));

    /// <summary>
    /// What this customer can still be paid against. Outstanding is derived per
    /// invoice (ACC-18), so the allocation form can never offer more than is owed.
    /// </summary>
    [HttpGet("customers/{customerId:int}/open-invoices")]
    public async Task<IActionResult> OpenInvoices(int customerId, CancellationToken ct)
    {
        var ids = await db.Invoices
            .Where(i => i.CustomerId == customerId
                        && i.State == InvoiceState.Posted
                        && i.Type == InvoiceType.Invoice)
            .OrderBy(i => i.Number)
            .Select(i => i.Id)
            .ToListAsync(ct);

        var open = new List<object>();
        foreach (var id in ids)
        {
            var b = await payments.BalanceOfAsync(id, ct);
            if (b.Outstanding > 0m) open.Add(b);
        }
        return Ok(open);
    }

    // ── The chart (ACC-02) ───────────────────────────────────────────────────

    [HttpGet("accounts")]
    public async Task<IActionResult> Accounts(CancellationToken ct)
        => Ok(await db.Accounts.OrderBy(a => a.Code)
            .Select(a => new { a.Id, a.Code, a.NameEn, a.NameFr, a.NameAr, Type = a.Type.ToString(), a.IsPostable, a.IsActive })
            .ToListAsync(ct));

    [Authorize(Roles = "Admin,Manager")]
    [HttpPost("accounts")]
    public async Task<IActionResult> CreateAccount([FromBody] AccountRequest req, CancellationToken ct)
    {
        // Trap 2: codes are matched in full. Two accounts whose codes merely
        // share a prefix are different accounts and must both be allowed.
        if (await db.Accounts.AnyAsync(a => a.Code == req.Code, ct))
            return BadRequest(new { code = "DUPLICATE", message = $"Account {req.Code} already exists." });

        var account = new Account();
        Apply(account, req);
        db.Accounts.Add(account);
        await db.SaveChangesAsync(ct);
        return Ok(new { account.Id, account.Code, account.NameEn, Type = account.Type.ToString() });
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpPut("accounts/{id:int}")]
    public async Task<IActionResult> UpdateAccount(int id, [FromBody] AccountRequest req, CancellationToken ct)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (account is null) return NotFound(new { code = "NOT_FOUND", message = $"Account {id} not found." });

        if (account.Code != req.Code && await db.Accounts.AnyAsync(a => a.Code == req.Code, ct))
            return BadRequest(new { code = "DUPLICATE", message = $"Account {req.Code} already exists." });

        Apply(account, req);
        await db.SaveChangesAsync(ct);
        return Ok(new { account.Id, account.Code, account.NameEn, Type = account.Type.ToString() });
    }

    private static void Apply(Account a, AccountRequest req)
    {
        a.Code = req.Code.Trim();
        a.NameEn = req.NameEn.Trim();
        a.NameFr = (req.NameFr ?? string.Empty).Trim();
        a.NameAr = (req.NameAr ?? string.Empty).Trim();
        a.Type = req.Type;
        a.ParentCode = string.IsNullOrWhiteSpace(req.ParentCode) ? null : req.ParentCode.Trim();
        a.IsPostable = req.IsPostable;
        a.IsActive = req.IsActive;
    }

    [HttpGet("settings")]
    public async Task<IActionResult> Settings(CancellationToken ct)
    {
        var s = await db.AccountingSettings.FirstOrDefaultAsync(ct);
        if (s is null) return Ok(new { configured = false });

        // Trap 1: the account behind each setting is named, not just referenced,
        // so a wrong mapping is visible on screen rather than only in the ledger.
        var accounts = await db.Accounts.ToDictionaryAsync(a => a.Id, a => a.Display, ct);
        string? Name(int? id) => id is { } v && accounts.TryGetValue(v, out var d) ? d : null;

        return Ok(new
        {
            configured = true,
            receivable = Name(s.ReceivableAccountId),
            revenue = Name(s.RevenueAccountId),
            tax = Name(s.TaxAccountId),
            bank = Name(s.BankAccountId),
            rounding = Name(s.RoundingAccountId),
        });
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] AccountingSettingsRequest req, CancellationToken ct)
    {
        var s = await db.AccountingSettings.FirstOrDefaultAsync(ct);
        if (s is null) { s = new AccountingSettings(); db.AccountingSettings.Add(s); }
        s.ReceivableAccountId = req.ReceivableAccountId ?? s.ReceivableAccountId;
        s.RevenueAccountId = req.RevenueAccountId ?? s.RevenueAccountId;
        s.TaxAccountId = req.TaxAccountId ?? s.TaxAccountId;
        s.BankAccountId = req.BankAccountId ?? s.BankAccountId;
        s.RoundingAccountId = req.RoundingAccountId ?? s.RoundingAccountId;
        await db.SaveChangesAsync(ct);
        return await Settings(ct);
    }

    // ── Periods (ACC-13) ─────────────────────────────────────────────────────

    [HttpGet("periods")]
    public async Task<IActionResult> Periods(CancellationToken ct)
        => Ok(await db.AccountingPeriods.OrderByDescending(p => p.Year).ThenByDescending(p => p.Month)
            .Select(p => new { p.Id, p.Year, p.Month, State = p.State.ToString(), p.ClosedAt })
            .ToListAsync(ct));

    [Authorize(Roles = "Admin,Manager")]
    [HttpPost("periods/{year:int}/{month:int}/close")]
    public async Task<IActionResult> ClosePeriod(int year, int month, CancellationToken ct)
    {
        var period = await posting.PeriodForAsync(new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc), ct);
        period.State = PeriodState.Closed;
        period.ClosedAt = DateTime.UtcNow;
        period.ClosedByAdminUserId = AdminId;
        await db.SaveChangesAsync(ct);
        return Ok(new { period.Year, period.Month, State = period.State.ToString() });
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpPost("periods/{year:int}/{month:int}/reopen")]
    public async Task<IActionResult> ReopenPeriod(int year, int month, CancellationToken ct)
    {
        var period = await posting.PeriodForAsync(new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc), ct);
        period.State = PeriodState.Open;
        period.ClosedAt = null;
        await db.SaveChangesAsync(ct);
        return Ok(new { period.Year, period.Month, State = period.State.ToString() });
    }

    // ── Journal entries ──────────────────────────────────────────────────────

    [HttpGet("entries/{id:int}")]
    public async Task<IActionResult> Entry(int id, CancellationToken ct)
    {
        var entry = await db.JournalEntries
            .Include(e => e.Lines).ThenInclude(l => l.Account)
            .Include(e => e.Journal)
            .FirstOrDefaultAsync(e => e.Id == id, ct);
        if (entry is null) return NotFound(new { code = "NOT_FOUND", message = $"Entry {id} not found." });

        return Ok(new
        {
            entry.Id, entry.Number, entry.Reference, entry.AccountingDate,
            Journal = entry.Journal.Name,
            entry.TotalDebit, entry.TotalCredit, entry.IsBalanced,
            Lines = entry.Lines.Select(l => new
            {
                l.Id, Account = l.Account.Display, l.Debit, l.Credit, l.CurrencyCode, l.Label,
            }),
        });
    }

    /// <summary>
    /// Business rules here throw rather than return an error tuple, so the
    /// refusal reaches the operator as the sentence the service wrote.
    /// </summary>
    private async Task<IActionResult> Guarded<T>(Func<Task<T>> action, Func<T, object> project)
    {
        try
        {
            return Ok(project(await action()));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { code = "NOT_FOUND", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { code = "ACCOUNTING_RULE", message = ex.Message });
        }
    }
}
