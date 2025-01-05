import React from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Drawer,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Medication as MedicationIcon,
    People as PeopleIcon,
    Person as PersonIcon,
    AdminPanelSettings as AdminIcon,
    Logout as LogoutIcon,
    Menu as MenuIcon,
    History as HistoryIcon,
    Notifications as NotificationsIcon,
    Assessment as AssessmentIcon,
    SupervisedUserCircle as CarerIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface MenuItem {
    text: string;
    icon: JSX.Element;
    path: string;
    roles?: string[];
}

const Navigation: React.FC = () => {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems: MenuItem[] = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
        { text: 'Medications', icon: <MedicationIcon />, path: '/medications' },
        { text: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
        { text: 'Family Members', icon: <PeopleIcon />, path: '/family-members' },
        { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
        { text: 'Medication History', icon: <HistoryIcon />, path: '/history' },
        { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
    ];

    // Add carer-specific menu items
    if (user?.role === 'carer') {
        menuItems.push(
            { text: 'My Patients', icon: <CarerIcon />, path: '/patients' },
            { text: 'Schedule', icon: <AssessmentIcon />, path: '/carer-schedule' }
        );
    }

    // Add admin-specific menu items
    if (user?.role === 'admin') {
        menuItems.push(
            { text: 'Admin Dashboard', icon: <AdminIcon />, path: '/admin' },
            { text: 'User Management', icon: <PeopleIcon />, path: '/admin/users' },
            { text: 'System Settings', icon: <AdminIcon />, path: '/admin/settings' }
        );
    }

    const drawer = (
        <div>
            <List>
                {menuItems.map((item) => (
                    <ListItem
                        button
                        key={item.text}
                        component={RouterLink}
                        to={item.path}
                        selected={location.pathname === item.path}
                        sx={{
                            '&.Mui-selected': {
                                backgroundColor: 'primary.light',
                                '&:hover': {
                                    backgroundColor: 'primary.light',
                                },
                            },
                        }}
                        onClick={() => isMobile && handleDrawerToggle()}
                    >
                        <ListItemIcon
                            sx={{
                                color: location.pathname === item.path ? 'primary.main' : 'inherit',
                            }}
                        >
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText
                            primary={item.text}
                            sx={{
                                color: location.pathname === item.path ? 'primary.main' : 'inherit',
                            }}
                        />
                    </ListItem>
                ))}
                <Divider sx={{ my: 2 }} />
                <ListItem button onClick={handleLogout}>
                    <ListItemIcon>
                        <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText primary="Logout" />
                </ListItem>
            </List>
        </div>
    );

    return (
        <Drawer
            variant={isMobile ? 'temporary' : 'permanent'}
            open={isMobile ? mobileOpen : true}
            onClose={handleDrawerToggle}
            ModalProps={{
                keepMounted: true, // Better open performance on mobile
            }}
            sx={{
                '& .MuiDrawer-paper': {
                    width: 240,
                    boxSizing: 'border-box',
                    backgroundColor: 'background.paper',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                },
            }}
        >
            {drawer}
        </Drawer>
    );
};

export default Navigation;
