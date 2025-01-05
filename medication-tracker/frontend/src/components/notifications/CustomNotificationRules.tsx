import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';

interface NotificationRule {
  id: string;
  name: string;
  condition: {
    type: 'time' | 'supply' | 'compliance' | 'refill';
    value: any;
  };
  actions: {
    channels: string[];
    message?: string;
    priority: 'low' | 'medium' | 'high';
  };
  schedule?: {
    days: string[];
    timeRanges: { start: string; end: string }[];
  };
  enabled: boolean;
}

export const CustomNotificationRules: React.FC = () => {
  const theme = useTheme();
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<NotificationRule | null>(null);
  const [formData, setFormData] = useState<Partial<NotificationRule>>({
    name: '',
    condition: {
      type: 'time',
      value: null,
    },
    actions: {
      channels: ['app'],
      priority: 'medium',
    },
    enabled: true,
  });

  useEffect(() => {
    // Load saved rules
    const loadRules = async () => {
      try {
        const response = await fetch('/api/notification-rules');
        const data = await response.json();
        setRules(data);
      } catch (error) {
        console.error('Error loading notification rules:', error);
      }
    };
    loadRules();
  }, []);

  const handleOpenDialog = (rule?: NotificationRule) => {
    if (rule) {
      setSelectedRule(rule);
      setFormData(rule);
    } else {
      setSelectedRule(null);
      setFormData({
        name: '',
        condition: {
          type: 'time',
          value: null,
        },
        actions: {
          channels: ['app'],
          priority: 'medium',
        },
        enabled: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRule(null);
    setFormData({
      name: '',
      condition: {
        type: 'time',
        value: null,
      },
      actions: {
        channels: ['app'],
        priority: 'medium',
      },
      enabled: true,
    });
  };

  const handleSaveRule = async () => {
    try {
      const ruleData = {
        ...formData,
        id: selectedRule?.id || Date.now().toString(),
      };

      const response = await fetch('/api/notification-rules', {
        method: selectedRule ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      });

      if (response.ok) {
        const savedRule = await response.json();
        setRules(prev =>
          selectedRule
            ? prev.map(r => (r.id === selectedRule.id ? savedRule : r))
            : [...prev, savedRule]
        );
        handleCloseDialog();
      }
    } catch (error) {
      console.error('Error saving notification rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await fetch(`/api/notification-rules/${ruleId}`, {
        method: 'DELETE',
      });
      setRules(prev => prev.filter(r => r.id !== ruleId));
    } catch (error) {
      console.error('Error deleting notification rule:', error);
    }
  };

  const handleToggleRule = async (rule: NotificationRule) => {
    try {
      const updatedRule = { ...rule, enabled: !rule.enabled };
      await fetch(`/api/notification-rules/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRule),
      });
      setRules(prev =>
        prev.map(r => (r.id === rule.id ? updatedRule : r))
      );
    } catch (error) {
      console.error('Error toggling notification rule:', error);
    }
  };

  const getConditionDisplay = (rule: NotificationRule) => {
    switch (rule.condition.type) {
      case 'time':
        return `At ${format(new Date(rule.condition.value), 'h:mm a')}`;
      case 'supply':
        return `Supply below ${rule.condition.value}%`;
      case 'compliance':
        return `Compliance below ${rule.condition.value}%`;
      case 'refill':
        return `${rule.condition.value} days before refill needed`;
      default:
        return 'Unknown condition';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Custom Notification Rules</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Rule
        </Button>
      </Box>

      {rules.length === 0 ? (
        <Alert severity="info">
          No custom notification rules set up yet. Create one to get started!
        </Alert>
      ) : (
        <List>
          {rules.map(rule => (
            <ListItem
              key={rule.id}
              sx={{
                mb: 2,
                bgcolor: 'background.paper',
                borderRadius: 1,
                boxShadow: 1,
              }}
            >
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle1">{rule.name}</Typography>
                    <Chip
                      size="small"
                      label={rule.actions.priority}
                      color={
                        rule.actions.priority === 'high'
                          ? 'error'
                          : rule.actions.priority === 'medium'
                          ? 'warning'
                          : 'default'
                      }
                    />
                  </Box>
                }
                secondary={
                  <>
                    <Typography variant="body2" color="textSecondary">
                      {getConditionDisplay(rule)}
                    </Typography>
                    <Box display="flex" gap={1} mt={1}>
                      {rule.actions.channels.map(channel => (
                        <Chip
                          key={channel}
                          label={channel}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </>
                }
              />
              <ListItemSecondaryAction>
                <FormControlLabel
                  control={
                    <Switch
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(rule)}
                      color="primary"
                    />
                  }
                  label=""
                />
                <IconButton
                  edge="end"
                  aria-label="edit"
                  onClick={() => handleOpenDialog(rule)}
                  sx={{ mr: 1 }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDeleteRule(rule.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedRule ? 'Edit Notification Rule' : 'New Notification Rule'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Rule Name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Condition Type</InputLabel>
              <Select
                value={formData.condition?.type}
                onChange={e =>
                  setFormData({
                    ...formData,
                    condition: { ...formData.condition, type: e.target.value },
                  })
                }
                label="Condition Type"
              >
                <MenuItem value="time">Time-based</MenuItem>
                <MenuItem value="supply">Supply Level</MenuItem>
                <MenuItem value="compliance">Compliance Rate</MenuItem>
                <MenuItem value="refill">Refill Reminder</MenuItem>
              </Select>
            </FormControl>

            {formData.condition?.type === 'time' && (
              <TextField
                fullWidth
                type="time"
                label="Time"
                value={formData.condition?.value || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    condition: { ...formData.condition, value: e.target.value },
                  })
                }
                sx={{ mb: 2 }}
              />
            )}

            {(formData.condition?.type === 'supply' ||
              formData.condition?.type === 'compliance') && (
              <TextField
                fullWidth
                type="number"
                label={`${
                  formData.condition?.type === 'supply'
                    ? 'Supply'
                    : 'Compliance'
                } Threshold (%)`}
                value={formData.condition?.value || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    condition: {
                      ...formData.condition,
                      value: parseInt(e.target.value),
                    },
                  })
                }
                sx={{ mb: 2 }}
              />
            )}

            {formData.condition?.type === 'refill' && (
              <TextField
                fullWidth
                type="number"
                label="Days Before Refill"
                value={formData.condition?.value || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    condition: {
                      ...formData.condition,
                      value: parseInt(e.target.value),
                    },
                  })
                }
                sx={{ mb: 2 }}
              />
            )}

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Notification Channels</InputLabel>
              <Select
                multiple
                value={formData.actions?.channels || []}
                onChange={e =>
                  setFormData({
                    ...formData,
                    actions: {
                      ...formData.actions,
                      channels: e.target.value as string[],
                    },
                  })
                }
                label="Notification Channels"
                renderValue={selected => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map(value => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="app">In-App</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="sms">SMS</MenuItem>
                <MenuItem value="push">Push Notification</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.actions?.priority || 'medium'}
                onChange={e =>
                  setFormData({
                    ...formData,
                    actions: {
                      ...formData.actions,
                      priority: e.target.value as 'low' | 'medium' | 'high',
                    },
                  })
                }
                label="Priority"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Custom Message (Optional)"
              value={formData.actions?.message || ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  actions: {
                    ...formData.actions,
                    message: e.target.value,
                  },
                })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveRule} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
