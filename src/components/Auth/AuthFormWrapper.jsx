import { Box, Typography } from '@mui/material';

export const AuthFormWrapper = ({ title, children }) => (
  <Box sx={{
    maxWidth: 400,
    mx: 'auto',
    mt: 8,
    p: 3,
    border: '1px solid #ddd',
    borderRadius: 2
  }}>
    <Typography variant="h4" gutterBottom align="center">
      {title}
    </Typography>
    {children}
  </Box>
);