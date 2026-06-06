import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, Box } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link as RouterLink } from 'react-router-dom';

export interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  items: Crumb[];
}

const Breadcrumbs = ({ items }: Props) => (
  <Box sx={{ px: 3, pt: 2, pb: 1 }}>
    <MuiBreadcrumbs
      separator={<NavigateNextIcon fontSize="small" />}
      aria-label="breadcrumb"
      maxItems={3}
      itemsAfterCollapse={1}
      itemsBeforeCollapse={1}
    >
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        if (isLast || !c.href) {
          return (
            <Typography
              key={i}
              color="text.primary"
              variant="body2"
              sx={{ fontWeight: isLast ? 600 : 400 }}
            >
              {c.label}
            </Typography>
          );
        }
        return (
          <Link
            key={i}
            component={RouterLink}
            to={c.href}
            underline="hover"
            color="inherit"
            variant="body2"
          >
            {c.label}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  </Box>
);

export default Breadcrumbs;
