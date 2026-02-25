using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, ITokenService tokens) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var user = await db.AdminUsers.FirstOrDefaultAsync(x => x.Email == request.Email && x.IsActive);
        if (user is null) return Unauthorized();
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash)) return Unauthorized();

        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new LoginResponse(tokens.Create(user), user.Email));
    }
}
