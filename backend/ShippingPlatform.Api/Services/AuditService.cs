using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services;

public interface IAuditService
{
    Task LogAsync(string entityType, int entityId, string action, string? oldValue = null, string? newValue = null, int? adminUserId = null);
    Task<List<AuditLog>> GetLogsAsync(string entityType, int entityId);
}

public class AuditService(AppDbContext db) : IAuditService
{
    public async Task LogAsync(string entityType, int entityId, string action, string? oldValue = null, string? newValue = null, int? adminUserId = null)
    {
        db.AuditLogs.Add(new AuditLog
        {
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            OldValue = oldValue,
            NewValue = newValue,
            AdminUserId = adminUserId,
        });
        await db.SaveChangesAsync();
    }

    public async Task<List<AuditLog>> GetLogsAsync(string entityType, int entityId) =>
        await db.AuditLogs
            .Where(x => x.EntityType == entityType && x.EntityId == entityId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
}
