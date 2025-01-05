import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    Avatar,
    Menu,
    MenuItem,
    IconButton,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import auth from '../../../services/auth';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
}

interface NavbarProps {
    onMenuClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const isAuthenticated = auth.isAuthenticated();
    const user: User | null = isAuthenticated
        ? JSON.parse(localStorage.getItem('user') || 'null')
        : null;
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        auth.logout();
        handleClose();
        navigate('/login');
    };

    const handleProfile = () => {
        handleClose();
        navigate('/profile');
    };

    const handleSettings = () => {
        handleClose();
        navigate('/settings');
    };

    return (
        <AppBar
            position="fixed"
            sx={{
                zIndex: theme.zIndex.drawer + 1,
                backgroundColor: 'background.paper',
                color: 'text.primary',
                boxShadow: 1,
            }}
        >
            <Toolbar>
                {isMobile && isAuthenticated && (
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={onMenuClick}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}

                <Typography
                    variant="h6"
                    component="div"
                    sx={{
                        flexGrow: 1,
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        color: 'primary.main',
                    }}
                    onClick={() => navigate('/')}
                >
                    Medication Tracker
                </Typography>

                <Box>
                    {isAuthenticated ? (
                        <>
                            <Button
                                color="inherit"
                                onClick={handleMenu}
                                startIcon={
                                    <Avatar
                                        src={user?.avatar}
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            bgcolor: 'primary.main',
                                        }}
                                    >
                                        {user?.name?.[0]?.toUpperCase() || 'U'}
                                    </Avatar>
                                }
                            >
                                {user?.name || 'User'}
                            </Button>
                            <Menu
                                anchorEl={anchorEl}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'right',
                                }}
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                open={Boolean(anchorEl)}
                                onClose={handleClose}
                            >
                                <MenuItem onClick={handleProfile}>Profile</MenuItem>
                                <MenuItem onClick={handleSettings}>Settings</MenuItem>
                                <MenuItem onClick={handleLogout}>Logout</MenuItem>
                            </Menu>
                        </>
                    ) : (
                        <>
                            <Button color="inherit" onClick={() => navigate('/login')}>
                                Login
                            </Button>
                            <Button
                                color="primary"
                                variant="contained"
                                onClick={() => navigate('/register')}
                                sx={{ ml: 2 }}
                            >
                                Sign Up
                            </Button>
                        </>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
