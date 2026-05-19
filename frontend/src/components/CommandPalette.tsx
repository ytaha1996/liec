import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Dialog,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getJson } from '../api/client';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  group: string;
  label: string;
  path: string;
}

const CommandPalette = ({ open, onClose }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [shipments, packages, customers] = await Promise.allSettled([
        getJson<any[]>(`/api/shipments?q=${encodeURIComponent(q)}`),
        getJson<any[]>(`/api/packages?q=${encodeURIComponent(q)}`),
        getJson<any[]>(`/api/customers?q=${encodeURIComponent(q)}`),
      ]);

      const items: SearchResult[] = [];

      if (shipments.status === 'fulfilled') {
        (shipments.value ?? []).slice(0, 5).forEach((s: any) => {
          items.push({
            group: 'Shipments',
            label: `Shipment: ${s.refCode ?? '#' + s.id}`,
            path: `/ops/shipments/${s.id}`,
          });
        });
      }

      if (packages.status === 'fulfilled') {
        (packages.value ?? []).slice(0, 5).forEach((p: any) => {
          items.push({
            group: 'Packages',
            label: `Package #${p.id}${p.customerName ? ' - ' + p.customerName : ''}`,
            path: `/ops/packages/${p.id}`,
          });
        });
      }

      if (customers.status === 'fulfilled') {
        (customers.value ?? []).slice(0, 5).forEach((c: any) => {
          items.push({
            group: 'Customers',
            label: `Customer: ${c.name}`,
            path: `/ops/customers/${c.id}`,
          });
        });
      }

      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      return;
    }
  }, [open]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          position: 'fixed',
          top: '15%',
          m: 0,
          borderRadius: 2,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Search shipments, packages, customers..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: loading ? (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ) : (
              <InputAdornment position="end">
                <Typography variant="caption" color="text.secondary" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0.5, px: 0.5, fontSize: '0.7rem' }}>
                  ESC
                </Typography>
              </InputAdornment>
            ),
          }}
          variant="outlined"
          size="small"
        />
      </Box>

      {results.length > 0 && (
        <List dense sx={{ maxHeight: 400, overflow: 'auto', pt: 0 }}>
          {Object.entries(grouped).map(([group, items]) => (
            <Box key={group}>
              <ListSubheader sx={{ lineHeight: '32px', fontWeight: 700, backgroundColor: 'background.paper' }}>
                {group}
              </ListSubheader>
              {items.map((item, idx) => (
                <ListItemButton key={idx} onClick={() => handleSelect(item.path)}>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
            </Box>
          ))}
        </List>
      )}

      {query.length >= 2 && !loading && results.length === 0 && (
        <Box sx={{ px: 2, pb: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No results found.
          </Typography>
        </Box>
      )}
    </Dialog>
  );
};

export default CommandPalette;
