import React from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Drawer,
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
import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Medications', icon: <MedicationIcon />, path: '/medications' },
    { text: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
    { text: 'Family Members', icon: <PeopleIcon />, path: '/family-members' },
    { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
    { text: 'Medication History', icon: <HistoryIcon />, path: '/history' },
    { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
  ];

  // Add carer-specific menu items
  if (user?.is_carer) {
    menuItems.push(
      { text: 'Carer Dashboard', icon: <CarerIcon />, path: '/carer-dashboard' }
    );
  } else {
    menuItems.push(
      { text: 'Manage Carers', icon: <CarerIcon />, path: '/carer-management' }
    );
  }

  // Add admin dashboard link for admin users
  if (user?.is_admin) {
    menuItems.push({
      text: 'Admin Dashboard',
      icon: <AdminIcon />,
      path: '/admin',
    });
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
            selected={location.pathname === item.path || (item.path === '/' && location.pathname === '/dashboard')}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        <ListItem button onClick={handleLogout}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </div>
  );

  return drawer;
};

export default Navigation;
