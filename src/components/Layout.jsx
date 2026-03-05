// src/components/Layout.jsx
import React from 'react';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import { List, ListItemButton, ListItemText, Box, useTheme, AppBar, Toolbar, Typography, Button, IconButton, Drawer } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

const AdapterLink = React.forwardRef((props, ref) => (
    <RouterLink ref={ref} {...props} style={{ textDecoration: 'none' }} />
));

const SidebarContent = ({ onClose }) => {
    const location = useLocation();

    return (
        <Box sx={{ width: drawerWidth, bgcolor: 'background.paper' }}>
            <List>
                {[
                    { text: "Dashboard", path: "/dashboard" },
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
                        onClick={onClose}
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
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const appBarHeight = theme.mixins.toolbar.height || 64;

    return (
        <>
            {/* Top Navbar */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                        Inventory Management
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
                            {user?.name}
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
                height: `calc(100vh - ${appBarHeight}px)`,
                mt: `${appBarHeight}px`,
            }}>
                {/* Responsive Sidebar */}
                <Box
                    component="nav"
                    sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                >
                    {/* Mobile Drawer */}
                    <Drawer
                        variant="temporary"
                        open={mobileOpen}
                        onClose={handleDrawerToggle}
                        ModalProps={{ keepMounted: true }}
                        sx={{
                            display: { xs: 'block', sm: 'none' },
                            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                        }}
                    >
                        <Toolbar /> {/* Spacer */}
                        <SidebarContent onClose={handleDrawerToggle} />
                    </Drawer>

                    {/* Desktop Drawer */}
                    <Drawer
                        variant="permanent"
                        sx={{
                            display: { xs: 'none', sm: 'block' },
                            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                        }}
                        open
                    >
                        <Toolbar /> {/* Spacer */}
                        <SidebarContent />
                    </Drawer>
                </Box>

                {/* Content Area */}
                <Box sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    p: { xs: 1, sm: 2 },
                    height: '100%',
                    width: { sm: `calc(100% - ${drawerWidth}px)` }
                }}>
                    <Outlet />
                </Box>
            </Box>
        </>
    );
};

export default Layout;