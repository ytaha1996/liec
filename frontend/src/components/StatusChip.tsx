import { Chip, ChipProps } from '@mui/material';

type ChipStyle = { color: string; backgroundColor: string };

interface Props {
  value: string | null | undefined;
  labels?: Record<string, string>;
  colors?: Record<string, ChipStyle>;
  size?: ChipProps['size'];
}

const StatusChip = ({ value, labels, colors, size = 'small' }: Props) => {
  if (!value) return null;
  const label = labels?.[value] ?? humanize(value);
  const sx = colors?.[value] ?? { color: '#333', backgroundColor: '#e0e0e0' };
  return <Chip size={size} label={label} sx={{ ...sx, fontWeight: 500 }} />;
};

const humanize = (s: string) =>
  s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');

export default StatusChip;
