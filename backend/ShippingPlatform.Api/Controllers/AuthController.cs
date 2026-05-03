using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthBusiness auth, IAuditService audit) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var (outcome, response, lockedUntil) = await auth.LoginAsync(request);
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        switch (outcome)
        {
            case LoginOutcome.Success:
                // Audit successful login. AdminUserId comes back via the auth service path.
                await audit.LogAsync("AdminUser", 0, "LoginSuccess", null, $"{request.Email} from {ip}");
                return Ok(response);
            case LoginOutcome.Locked:
                await audit.LogAsync("AdminUser", 0, "LoginLocked", null, $"{request.Email} from {ip}");
                return StatusCode(423, new { code = "ACCOUNT_LOCKED", message = "Account is temporarily locked due to too many failed login attempts.", lockedUntil });
            default:
                await audit.LogAsync("AdminUser", 0, "LoginFailed", null, $"{request.Email} from {ip}");
                return Unauthorized();
        }
    }
}

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin,Manager")]
public class UsersController(IUserBusiness business) : ControllerBase
{
    private int CallerId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    [HttpGet]
    public async Task<IActionResult> List() => Ok(await business.ListAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id) => (await business.GetAsync(id)) is { } u ? Ok(u) : NotFound();

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest req)
    {
        var (dto, err) = await business.CreateAsync(req);
        if (err is not null) return Conflict(err);
        return Created($"/api/users/{dto!.Id}", dto);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateUserRequest req)
    {
        var (dto, err) = await business.UpdateAsync(id, req, CallerId);
        if (dto is null && err is null) return NotFound();
        return err is null ? Ok(dto) : Conflict(err);
    }
}
