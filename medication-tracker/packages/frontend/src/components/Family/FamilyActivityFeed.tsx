import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  MedicationOutlined as MedicationIcon,
  PersonAdd as PersonAddIcon,
  Settings as SettingsIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { liabilityProtection } from '../../utils/liabilityProtection';

interface ActivityItem {
  id: string;
  type: 'MEDICATION' | 'MEMBER' | 'PERMISSION' | 'EMERGENCY';
  action: string;
  userId: string;
  userName: string;
  timestamp: string;
  details: any;
}

export default function FamilyActivityFeed() {
  const { activities, loading, error, markAsRead } = useActivityFeed();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, activity: ActivityItem) => {
    setAnchorEl(event.currentTarget);
    setSelectedActivity(activity);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedActivity(null);
  };

  const handleMarkAsRead = async () => {
    if (selectedActivity) {
      await markAsRead(selectedActivity.id);
      handleMenuClose();
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'MEDICATION':
        return <MedicationIcon />;
      case 'MEMBER':
        return <PersonAddIcon />;
      case 'PERMISSION':
        return <SettingsIcon />;
      default:
        return <SettingsIcon />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'MEDICATION':
        return 'primary';
      case 'MEMBER':
        return 'success';
      case 'PERMISSION':
        return 'warning';
      case 'EMERGENCY':
        return 'error';
      default:
        return 'default';
    }
  };

  useEffect(() => {
    // Log activity view for liability protection
    liabilityProtection.logCriticalAction(
      'ACTIVITY_FEED_VIEW',
      'current-user',
      { timestamp: new Date().toISOString() }
    );
  }, []);

  if (loading) {
    return <Typography>Loading activity feed...</Typography>;
  }

  if (error) {
    return <Typography color="error">Error loading activity feed</Typography>;
  }

  return (
    <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Family Activity
        </Typography>
      </Box>

      <List>
        {activities.map((activity) => (
          <ListItem
            key={activity.id}
            alignItems="flex-start"
            sx={{
              mb: 1,
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: `${getActivityColor(activity.type)}.light` }}>
                {getActivityIcon(activity.type)}
              </Avatar>
            </ListItemAvatar>
            
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography component="span" variant="subtitle1">
                    {activity.userName}
                  </Typography>
                  <Chip
                    label={activity.action}
                    size="small"
                    color={getActivityColor(activity.type)}
                    variant="outlined"
                  />
                </Box>
              }
              secondary={
                <React.Fragment>
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.primary"
                  >
                    {activity.details.description}
                  </Typography>
                  <Typography
                    component="div"
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </Typography>
                </React.Fragment>
              }
            />

            <Tooltip title="Options">
              <IconButton
                edge="end"
                onClick={(e) => handleMenuOpen(e, activity)}
                size="small"
              >
                <MoreVertIcon />
              </IconButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMarkAsRead}>Mark as read</MenuItem>
        <MenuItem onClick={() => {
          if (selectedActivity) {
            liabilityProtection.logCriticalAction(
              'ACTIVITY_DETAILS_VIEW',
              'current-user',
              { activityId: selectedActivity.id }
            );
          }
          handleMenuClose();
        }}>
          View details
        </MenuItem>
      </Menu>
    </Paper>
  );
}
