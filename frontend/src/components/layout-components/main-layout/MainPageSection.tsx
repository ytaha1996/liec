import React from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CustomDropdown, { ICustomDropdownOption } from "../../CustomDropdown";
import { BRAND_TEAL } from '../../../constants/statusColors';
import { SECTION_GAP, SECTION_PAD } from '../../../theme/tokens';

interface IMainPageSectionProps {
  title: string;
  actionsTitle?: string;
  actions?: ICustomDropdownOption[];
  children?: React.ReactNode;
}

const MainPageSection: React.FC<IMainPageSectionProps> = ({
  title,
  actionsTitle = "Actions",
  actions = [],
  children,
}) => {
  return (
    <Box sx={{ width: '100%', mb: SECTION_GAP }}>
      <Paper sx={{ width: '100%' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          gap={{ xs: 1, sm: 0 }}
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderBottom: '1px solid rgba(224, 224, 224, 1)',
            backgroundColor: BRAND_TEAL,
            color: '#fff',
            borderRadius: '10px 10px 0 0',
          }}
        >
          <Typography
            variant="h6"
            id="pageTitle"
            component="div"
            sx={{ color: 'white', fontWeight: 700, fontSize: { xs: 16, sm: 18 } }}
          >
            {title}
          </Typography>

          {actions && actions.length > 0 ? (
            <CustomDropdown title={actionsTitle} options={actions} />
          ) : null}
        </Stack>

        <Box sx={{ p: SECTION_PAD }}>{children}</Box>
      </Paper>
    </Box>
  );
};

export default MainPageSection;
