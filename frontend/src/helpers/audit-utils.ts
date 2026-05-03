import {
  PKG_STATUS_LABELS,
  SHIPMENT_STATUS_LABELS,
  SUPPLY_ORDER_STATUS_LABELS,
  PRICING_CONFIG_STATUS_LABELS,
} from '../constants/statusLabels';

export interface AuditLog {
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface AuditEntry {
  title: string;
  detail: string;
}

const ALL_STATUS_LABELS: Record<string, string> = {
  ...SHIPMENT_STATUS_LABELS,
  ...PKG_STATUS_LABELS,
  ...SUPPLY_ORDER_STATUS_LABELS,
  ...PRICING_CONFIG_STATUS_LABELS,
};

const humanize = (s: string | null | undefined): string => {
  if (!s) return '';
  return ALL_STATUS_LABELS[s] ?? s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
};

const parseMediaPayload = (raw: string): string => {
  const stageMatch = raw.match(/stage=(\w+)/);
  const keyMatch = raw.match(/key=(.+?)(?:\s|$)/);
  const stage = stageMatch?.[1];
  const key = keyMatch?.[1];
  const filename = key ? key.split('/').pop() : null;
  if (stage && filename) return `Stage: ${stage} · ${filename}`;
  if (stage) return `Stage: ${stage}`;
  return raw;
};

export const formatAuditEntry = (log: AuditLog): AuditEntry => {
  const { action, oldValue, newValue } = log;

  if (action.startsWith('Status →')) {
    return {
      title: 'Status changed',
      detail: oldValue && newValue
        ? `${humanize(oldValue)} → ${humanize(newValue)}`
        : humanize(newValue),
    };
  }

  switch (action) {
    case 'LoginSuccess':
      return { title: 'Sign-in success', detail: '' };
    case 'LoginFailed':
      return { title: 'Sign-in failed', detail: newValue ?? '' };
    case 'LoginLocked':
      return { title: 'Account locked after failed sign-ins', detail: '' };
    case 'Create':
      return { title: 'Created', detail: newValue ?? '' };
    case 'Update':
      return {
        title: 'Updated',
        detail: oldValue && newValue ? `${oldValue} → ${newValue}` : (newValue ?? oldValue ?? ''),
      };
    case 'Delete':
      return { title: 'Deleted', detail: oldValue ?? '' };
    case 'Activate':
      return { title: 'Activated', detail: '' };
    case 'Retire':
      return { title: 'Retired', detail: '' };
    case 'MediaUpload':
      return { title: 'Photo uploaded', detail: parseMediaPayload(newValue ?? '') };
    case 'FxOverride':
      return {
        title: 'FX rate override',
        detail: oldValue && newValue ? `${oldValue} → ${newValue}` : (newValue ?? ''),
      };
    default:
      return {
        title: humanize(action),
        detail: oldValue && newValue ? `${oldValue} → ${newValue}` : (newValue ?? oldValue ?? ''),
      };
  }
};
