// src/components/Layout.jsx
import React from 'react';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import { List, ListItemButton, ListItemText, Box, useTheme, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const AdapterLink = React.forwardRef((props, ref) => (
    <RouterLink ref={ref} {...props} style={{ textDecoration: 'none' }} />
));

const Sidebar = () => {
    const location = useLocation(); // Get the current route

    return (
        <Box sx={{ width: 240, bgcolor: 'background.paper' }}>
            <List>
                {[
                    { text: "Dashboard", path: "/dashboard" },
                    { text: "Installation", path: "/installation" },
                    { text: "Users", path: "/users" },
                    { text: "Companies", path: "/companies" },
                    { text: "Products", path: "/products" },
                    { text: "Technicians", path: "/technicians" },
                    { text: "Inventory", path: "/inventory" },
                    { text: "Commission", path: "/commission" },
                    { text: "Order", path: "/order" },
                    { text: "Payments", path: "/payment" }
                ].map((item) => (
                    <ListItemButton 
                        key={item.path} 
                        component={AdapterLink} 
                        to={item.path} 
                        sx={{
                            color: 'text.primary',
                            backgroundColor: location.pathname === item.path ? 'action.selected' : 'inherit',
                            '&:hover': { backgroundColor: 'action.hover' }
                        }}
                    >
                        <ListItemText primary={item.text} />
                    </ListItemButton>
                ))}
            </List>
        </Box>
    );
};

const Layout = () => {
    const { user, logout } = useAuth();
    const theme = useTheme();
    const appBarHeight = theme.mixins.toolbar.height || 64; // Default to 64px [[1]][[3]]

    return (
        <>
            {/* Top Navbar */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Inventory Management
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ mr: 2 }}>
                            {user?.name} ({user?.role})
                        </Typography>
                        <Button color="inherit" onClick={logout} sx={{ textTransform: 'none' }}>
                            Logout
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Main Content Container */}
            <Box sx={{
    display: 'flex',
    height: `calc(100vh - ${appBarHeight}px)`, // Use theme value
    mt: `${appBarHeight}px`, // Offset for fixed navbar
}}>
    {/* Sidebar */}
    <Box sx={{ 
        width: 240, 
        borderRight: '1px solid', 
        borderColor: 'divider' // Uses Material UI theme divider color
    }}>
        <Sidebar />
    </Box>

    {/* Content Area */}
    <Box sx={{
        flexGrow: 1,
        overflow: 'auto',
        p: 2,
        height: '100%'
    }}>
        {/* <Toolbar /> Adds spacing equivalent to AppBar height */}
        <Outlet />
    </Box>
</Box>

        </>
    );
};

export default Layout;