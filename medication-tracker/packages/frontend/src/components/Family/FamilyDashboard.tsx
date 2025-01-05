import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FamilyMemberList from './FamilyMemberList';
import InviteFamilyDialog from './InviteFamilyDialog';
import { useSubscription } from '../../hooks/useSubscription';
import { useFamilyMembers } from '../../hooks/useFamilyMembers';
import UpgradePrompt from '../Subscription/UpgradePrompt';

export default function FamilyDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [openInvite, setOpenInvite] = useState(false);
  const { subscription, loading: subLoading } = useSubscription();
  const { members, loading: membersLoading, refetch } = useFamilyMembers();

  const canAddMembers = subscription?.tier !== 'FREE' && 
    members?.length < (subscription?.maxFamilyMembers || 0);

  const handleInviteSuccess = () => {
    setOpenInvite(false);
    refetch();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" component="h1">
              Family Management
            </Typography>
            {canAddMembers && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenInvite(true)}
                sx={{ borderRadius: 2 }}
              >
                Add Family Member
              </Button>
            )}
          </Box>
        </Grid>

        {!subLoading && subscription?.tier === 'FREE' && (
          <Grid item xs={12}>
            <UpgradePrompt
              message="Upgrade to add family members and share medication management"
              recommendedTier="FAMILY"
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <Paper 
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <FamilyMemberList 
              members={members || []}
              loading={membersLoading}
              onMemberRemoved={refetch}
            />
          </Paper>
        </Grid>

        {subscription && (
          <InviteFamilyDialog
            open={openInvite}
            onClose={() => setOpenInvite(false)}
            onSuccess={handleInviteSuccess}
            subscription={subscription}
          />
        )}
      </Grid>
    </Box>
  );
}
