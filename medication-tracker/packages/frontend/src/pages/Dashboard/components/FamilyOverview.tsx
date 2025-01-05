import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  Medication as MedicationIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { FamilyMember } from '../../../store/services/familyApi';

interface FamilyOverviewProps {
  familyMembers: FamilyMember[];
}

const FamilyOverview: React.FC<FamilyOverviewProps> = ({ familyMembers }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.success.main,
    ];
    return colors[index % colors.length];
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Family Members
      </Typography>
      <List>
        {familyMembers.map((member, index) => (
          <ListItem
            key={member.id}
            sx={{
              borderRadius: 1,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemAvatar>
              <Avatar
                sx={{
                  bgcolor: getAvatarColor(index),
                }}
              >
                {getInitials(member.firstName, member.lastName)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={`${member.firstName} ${member.lastName}`}
              secondary={member.relationship}
            />
            <ListItemSecondaryAction>
              <Tooltip title="View Medications">
                <IconButton
                  edge="end"
                  onClick={() => navigate(`/medications?familyMember=${member.id}`)}
                  sx={{ mr: 1 }}
                >
                  <MedicationIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit Member">
                <IconButton
                  edge="end"
                  onClick={() => navigate(`/family/edit/${member.id}`)}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
      {familyMembers.length === 0 && (
        <Typography
          variant="body2"
          color="textSecondary"
          align="center"
          sx={{ mt: 2 }}
        >
          No family members added yet
        </Typography>
      )}
    </Box>
  );
};

export default FamilyOverview;
