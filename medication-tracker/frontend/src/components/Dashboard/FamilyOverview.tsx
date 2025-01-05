import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Medication as MedicationIcon,
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { familyMemberService } from '../../services/familyMemberService';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  avatar?: string;
  medicationCount: number;
  pendingReminders: number;
  hasWarnings: boolean;
}

export const FamilyOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth() || { user: null };
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize WebSocket connection
  const { lastMessage } = useWebSocket(`/api/v1/ws/family/${user?.id}`);

  const fetchFamilyData = async () => {
    try {
      const members = await familyMemberService.getAllFamilyMembers();
      const enhancedMembers = await Promise.all(
        members.map(async (member: any) => {
          const medications = await familyMemberService.getFamilyMemberMedications(member.id);
          return {
            id: member.id,
            name: member.name,
            relationship: member.relationship,
            avatar: member.avatar,
            medicationCount: medications.length,
            pendingReminders: medications.filter((med: any) => med.hasReminders).length,
            hasWarnings: medications.some((med: any) => med.hasWarnings),
          };
        })
      );
      setFamilyMembers(enhancedMembers);
      setError(null);
    } catch (err) {
      console.error('Error fetching family data:', err);
      setError('Failed to load family overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyData();
  }, []);

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (['FAMILY_UPDATE', 'MEDICATION_UPDATE'].includes(data.type)) {
          fetchFamilyData();
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    }
  }, [lastMessage]);

  const handleAddFamilyMember = () => {
    navigate('/family/add');
  };

  const handleMemberClick = (memberId: string) => {
    navigate(`/family/${memberId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Family Overview</Typography>
          <Tooltip title="Add Family Member">
            <IconButton onClick={handleAddFamilyMember} size="small">
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Grid container spacing={2}>
          {familyMembers.map((member) => (
            <Grid item xs={12} sm={6} md={4} key={member.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => handleMemberClick(member.id)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Avatar src={member.avatar} alt={member.name}>
                      {member.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1">
                        {member.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {member.relationship}
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip
                      size="small"
                      icon={<MedicationIcon />}
                      label={`${member.medicationCount} meds`}
                      color="primary"
                    />
                    {member.pendingReminders > 0 && (
                      <Chip
                        size="small"
                        icon={<NotificationsIcon />}
                        label={`${member.pendingReminders} reminders`}
                        color="info"
                      />
                    )}
                    {member.hasWarnings && (
                      <Chip
                        size="small"
                        icon={<WarningIcon />}
                        label="Warnings"
                        color="error"
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};
