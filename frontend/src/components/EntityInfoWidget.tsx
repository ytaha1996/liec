import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Tooltip,
  Divider,
  LinearProgress,
  IconButton
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

export interface IEntityClassification {
  color: string;
  text: string;
  value: string;
}

export interface IEntityClassificationData {
  classifications?: Record<string, IEntityClassification>;
  value: string;
}

export interface IEntityInfoView {
  title: string;
  iconUrl?: string;
  classification?: IEntityClassificationData;
  progress?: number;
  fields: Record<string, string>;
}

export interface EntityInfoProps {
  view: IEntityInfoView;
  onToggle?: () => void;
}

const EntityInfo: React.FC<EntityInfoProps> = ({ view, onToggle }) => {
  const { title, iconUrl, classification, progress, fields } = view;
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    document.body.style.setProperty('--entity-info-width', isOpen ? '350px' : '0px');
    return () => {
      document.body.style.removeProperty('--entity-info-width');
    };
  }, [isOpen]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    if (onToggle) onToggle();
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '98px',
        left: 0,
        width: isOpen ? '350px' : '0px',
        height: '100%',
        backgroundColor: '#ffffff',
        padding: isOpen ? '20px' : '0px',
        transition: 'width 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Toggle Button */}
      <IconButton
        onClick={toggleSidebar}
        sx={{
          position: 'absolute',
          right: '-40px',
          top: '20px',
          backgroundColor: '#ffffff',
          borderRadius: '50%',
          boxShadow: 1,
          zIndex: 10,
        }}
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </IconButton>

      {isOpen && (
        // Outer Box: set direction rtl to move scrollbar to left.
        <Box
          sx={{
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            direction: 'rtl',
          }}
        >
          {/* Inner Box: reset direction to ltr so text appears normally */}
          <Box sx={{ direction: 'ltr', padding: '0 16px' }}>
            {/* Header Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Tooltip title={title}>
                  <Typography
                    variant="h6"
                    noWrap
                    sx={{
                      fontWeight: '700',
                      color: '#1b1b1bb3',
                      fontSize: '1.4rem',
                    }}
                  >
                    {title}
                  </Typography>
                </Tooltip>
              </Box>
              {iconUrl && (
                <Avatar
                  src={iconUrl}
                  alt={title}
                  sx={{
                    width: 60,
                    height: 60,
                    cursor: 'pointer',
                    border: '2px solid #25a8b3',
                  }}
                />
              )}
            </Box>

            <Divider sx={{ mb: 2, borderColor: '#ddd' }} />

            {/* Fields */}
            {Object.entries(fields).map(([label, value]) => (
              <Box
                key={label}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  padding: '2px 0',
                }}
              >
                <Typography variant="body2" sx={{ color: '#1b1b1bb3', fontWeight: '500' }}>
                  {label}:
                </Typography>
                <Typography variant="body2" sx={{ color: '#25a8b3', fontWeight: 'bold' }}>
                  {value}
                </Typography>
              </Box>
            ))}

            {/* Progress Bar */}
            {typeof progress === 'number' && (
              <Box sx={{ mt: 3 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': { backgroundColor: '#25a8b3' },
                  }}
                />
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', color: '#1b1b1bb3' }}>
                  {progress}%
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default EntityInfo;
