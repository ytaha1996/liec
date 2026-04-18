using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthBusiness auth) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var res = await auth.LoginAsync(request);
        return res is null ? Unauthorized() : Ok(res);
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
