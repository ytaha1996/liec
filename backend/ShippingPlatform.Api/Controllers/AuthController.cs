using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthBusiness auth) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var res = await auth.LoginAsync(request);
        return res is null ? Unauthorized() : Ok(res);
    }
}
