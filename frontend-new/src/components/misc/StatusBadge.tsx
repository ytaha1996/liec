import { Badge } from '@/components/ui/badge';
import type { ChipColors } from '@/constants/statusColors';

interface StatusBadgeProps {
  value: string | null | undefined;
  labels?: Record<string, string>;
  colors?: Record<string, ChipColors>;
  size?: 'sm' | 'md';
}

export function StatusBadge({ value, labels, colors, size = 'md' }: StatusBadgeProps) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const palette = colors?.[value];
  const label = labels?.[value] ?? value;
  return (
    <Badge
      className={size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'font-normal'}
      style={{
        color: palette?.color ?? undefined,
        backgroundColor: palette?.backgroundColor ?? undefined,
      }}
    >
      {label}
    </Badge>
  );
}
