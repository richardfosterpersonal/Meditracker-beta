import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { AffiliateService } from '../../../services/affiliate';
import { AffiliateProgram, AffiliateType, CommissionType } from '../../../models/affiliate';

const affiliateService = new AffiliateService();

interface ProgramFormData {
  name: string;
  type: AffiliateType;
  description: string;
  commissionTiers: {
    minAmount: number;
    maxAmount: number | null;
    rate: number;
    type: CommissionType;
  }[];
  minimumPayout: number;
  payoutSchedule: 'weekly' | 'monthly' | 'quarterly';
  cookieDuration: number;
  active: boolean;
}

export const AffiliatePrograms: React.FC = () => {
  const [programs, setPrograms] = useState<AffiliateProgram[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramFormData | null>(null);
  const [formData, setFormData] = useState<ProgramFormData>({
    name: '',
    type: AffiliateType.PARTNER,
    description: '',
    commissionTiers: [
      {
        minAmount: 0,
        maxAmount: null,
        rate: 10,
        type: CommissionType.PERCENTAGE,
      },
    ],
    minimumPayout: 100,
    payoutSchedule: 'monthly',
    cookieDuration: 30,
    active: true,
  });

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      const response = await affiliateService.getAffiliatePrograms();
      setPrograms(response);
    } catch (error) {
      console.error('Failed to load affiliate programs:', error);
    }
  };

  const handleOpenDialog = (program?: AffiliateProgram) => {
    if (program) {
      setEditingProgram(program);
      setFormData(program);
    } else {
      setEditingProgram(null);
      setFormData({
        name: '',
        type: AffiliateType.PARTNER,
        description: '',
        commissionTiers: [
          {
            minAmount: 0,
            maxAmount: null,
            rate: 10,
            type: CommissionType.PERCENTAGE,
          },
        ],
        minimumPayout: 100,
        payoutSchedule: 'monthly',
        cookieDuration: 30,
        active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProgram(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingProgram) {
        await affiliateService.updateAffiliateProgram(editingProgram.id, formData);
      } else {
        await affiliateService.createAffiliateProgram(formData);
      }
      handleCloseDialog();
      loadPrograms();
    } catch (error) {
      console.error('Failed to save affiliate program:', error);
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    if (window.confirm('Are you sure you want to delete this program?')) {
      try {
        await affiliateService.deleteAffiliateProgram(programId);
        loadPrograms();
      } catch (error) {
        console.error('Failed to delete affiliate program:', error);
      }
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Affiliate Programs</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create Program
        </Button>
      </Box>

      <Grid container spacing={3}>
        {programs.map((program) => (
          <Grid item xs={12} md={6} key={program.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">{program.name}</Typography>
                  <Box>
                    <Tooltip title="Edit Program">
                      <IconButton onClick={() => handleOpenDialog(program)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Program">
                      <IconButton onClick={() => handleDeleteProgram(program.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  {program.type}
                </Typography>
                <Typography variant="body2" paragraph>
                  {program.description}
                </Typography>
                <Typography variant="subtitle2">Commission Tiers:</Typography>
                {program.commissionTiers.map((tier, index) => (
                  <Typography key={index} variant="body2">
                    {tier.minAmount} - {tier.maxAmount || '∞'}: {tier.rate}
                    {tier.type === CommissionType.PERCENTAGE ? '%' : '$'}
                  </Typography>
                ))}
                <Box mt={2}>
                  <Typography variant="body2">
                    Minimum Payout: ${program.minimumPayout}
                  </Typography>
                  <Typography variant="body2">
                    Payout Schedule: {program.payoutSchedule}
                  </Typography>
                  <Typography variant="body2">
                    Cookie Duration: {program.cookieDuration} days
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProgram ? 'Edit Program' : 'Create New Program'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Program Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </Grid>
            {/* Add more form fields for commission tiers, payout settings, etc. */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingProgram ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
