using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class AdminUser
{
    public int Id { get; set; }
    [MaxLength(200)] public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public UserRole Role { get; set; } = UserRole.Admin;
    public DateTime? LastLoginAt { get; set; }
    public int FailedLoginCount { get; set; }
    public DateTime? LockedUntil { get; set; }
}
