import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import InventoryErrorBoundary from '../ErrorBoundary/InventoryErrorBoundary';
import InventoryLoadingState from './Inventory/InventoryLoadingState';
import { inventoryService } from '../../services/inventoryService';
import { monitoring } from '../../utils/monitoring';
import { performanceMonitoring } from '../../utils/performanceMonitoring';
import { useAccessibility } from '../../hooks/useAccessibility';
import { useNotification } from '../../hooks/useNotification';

interface Props {
  medicationId: string;
  onSupplyUpdate?: (newSupply: number) => void;
}

const InventoryTracker: React.FC<Props> = ({ medicationId, onSupplyUpdate }) => {
  const [refillDialogOpen, setRefillDialogOpen] = React.useState(false);
  const [refillAmount, setRefillAmount] = React.useState('');
  const queryClient = useQueryClient();
  const { settings } = useAccessibility();
  const { showNotification } = useNotification();

  // Query for inventory data
  const inventoryQuery = useQuery({
    queryKey: ['inventory', medicationId],
    queryFn: () => inventoryService.getInventory(medicationId),
    onError: (error) => {
      monitoring.captureError(error, {
        component: 'InventoryTracker',
        action: 'fetchInventory',
        metadata: { medicationId },
      });
    },
  });

  // Mutation for updating inventory
  const updateInventoryMutation = useMutation({
    mutationFn: inventoryService.updateInventory,
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory', medicationId]);
      performanceMonitoring.recordMetric({
        name: 'inventory_update',
        value: 1,
        unit: 'count',
      });
    },
    onError: (error) => {
      monitoring.captureError(error, {
        component: 'InventoryTracker',
        action: 'updateInventory',
        metadata: { medicationId },
      });
      showNotification('Error updating inventory', 'error');
    },
  });

  // Handle supply updates
  const handleSupplyChange = async (change: number) => {
    if (!inventoryQuery.data) return;

    const newSupply = inventoryQuery.data.currentSupply + change;
    if (newSupply < 0) {
      showNotification('Supply cannot be negative', 'warning');
      return;
    }

    updateInventoryMutation.mutate({
      medicationId,
      supply: newSupply,
      timestamp: new Date().toISOString(),
    });

    onSupplyUpdate?.(newSupply);
  };

  // Handle refill dialog
  const handleRefill = () => {
    const amount = parseInt(refillAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showNotification('Please enter a valid amount', 'warning');
      return;
    }

    handleSupplyChange(amount);
    setRefillDialogOpen(false);
    setRefillAmount('');
  };

  if (inventoryQuery.isLoading) {
    return <InventoryLoadingState loadingId={`inventory_${medicationId}`} />;
  }

  const { data: inventory } = inventoryQuery;
  if (!inventory) return null;

  const supplyPercentage = (inventory.currentSupply / inventory.maxSupply) * 100;
  const isLowSupply = supplyPercentage <= 20;

  return (
    <InventoryErrorBoundary>
      <Paper sx={{ p: 3, mb: 3 }}>
        {/* Supply Level */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Current Supply
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: isLowSupply ? 'error.light' : 'success.light',
                color: 'white',
              }}
            >
              <Typography variant="h4">
                {Math.round(supplyPercentage)}%
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography>
                {inventory.currentSupply} of {inventory.maxSupply} units remaining
              </Typography>
              <LinearProgress
                variant="determinate"
                value={supplyPercentage}
                color={isLowSupply ? 'error' : 'success'}
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>

          {isLowSupply && (
            <Alert
              severity="warning"
              icon={<WarningIcon />}
              sx={{ mt: 2 }}
            >
              Low supply alert! Consider refilling soon.
            </Alert>
          )}
        </Box>

        {/* Supply Management */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Tooltip title="Decrease supply">
            <IconButton
              onClick={() => handleSupplyChange(-1)}
              disabled={inventory.currentSupply <= 0}
              color="primary"
            >
              <RemoveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Increase supply">
            <IconButton
              onClick={() => handleSupplyChange(1)}
              disabled={inventory.currentSupply >= inventory.maxSupply}
              color="primary"
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<InventoryIcon />}
            onClick={() => setRefillDialogOpen(true)}
          >
            Refill
          </Button>
        </Box>
      </Paper>

      {/* Refill History */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Refill History</Typography>
          <Tooltip title="Refresh history">
            <IconButton onClick={() => inventoryQuery.refetch()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        {inventory.refillHistory.map((refill) => (
          <Box
            key={refill.id}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography>
              {format(new Date(refill.timestamp), 'MMM dd, yyyy')}
            </Typography>
            <Typography>+{refill.amount} units</Typography>
          </Box>
        ))}
      </Paper>

      {/* Refill Dialog */}
      <Dialog open={refillDialogOpen} onClose={() => setRefillDialogOpen(false)}>
        <DialogTitle>Refill Medication</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Refill Amount"
            type="number"
            fullWidth
            value={refillAmount}
            onChange={(e) => setRefillAmount(e.target.value)}
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefillDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRefill} variant="contained">
            Confirm Refill
          </Button>
        </DialogActions>
      </Dialog>
    </InventoryErrorBoundary>
  );
};

export default InventoryTracker;
