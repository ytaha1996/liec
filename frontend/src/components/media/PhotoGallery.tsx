import { Box, Typography } from '@mui/material';

export const PhotoGallery = ({ media }: { media: any[] }) => {
  const byStage = media.reduce((a, m) => {
    (a[m.stage] ?? (a[m.stage] = [])).push(m);
    return a;
  }, {} as Record<string, any[]>);

  return (
    <Box>
      {Object.entries(byStage).map(([stage, items]) => (
        <Box key={stage} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>{stage}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(items as any[]).map((m: any) => (
              <img key={m.id} src={m.publicUrl} width={140} alt={stage} style={{ borderRadius: 4 }} />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
