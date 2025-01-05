import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondary,
  IconButton,
  Typography,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Skeleton,
  Box,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { FamilyMember } from '../../types/family';
import { useFamilyService } from '../../hooks/useFamilyService';
import PermissionsDialog from './PermissionsDialog';

interface Props {
  members: FamilyMember[];
  loading: boolean;
  onMemberRemoved: () => void;
}

export default function FamilyMemberList({ members, loading, onMemberRemoved }: Props) {
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [openPermissions, setOpenPermissions] = useState(false);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const { removeFamilyMember } = useFamilyService();

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, member: FamilyMember) => {
    setSelectedMember(member);
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEditPermissions = () => {
    setMenuAnchor(null);
    setOpenPermissions(true);
  };

  const handleDelete = () => {
    setMenuAnchor(null);
    setOpenConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (selectedMember) {
      await removeFamilyMember(selectedMember.id);
      setOpenConfirmDelete(false);
      onMemberRemoved();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <List>
        {[1, 2, 3].map((i) => (
          <ListItem key={i}>
            <Skeleton variant="rectangular" width="100%" height={68} />
          </ListItem>
        ))}
      </List>
    );
  }

  if (members.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="textSecondary">
          No family members added yet. Add family members to share medication management.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <List>
        {members.map((member) => (
          <ListItem
            key={member.id}
            secondaryAction={
              <IconButton edge="end" onClick={(e) => handleMenuClick(e, member)}>
                <MoreVertIcon />
              </IconButton>
            }
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              borderRadius: 1,
              mb: 1,
            }}
          >
            <ListItemText
              primary={
                <Typography variant="subtitle1">
                  {member.name}
                  <Chip
                    size="small"
                    label={member.status.toLowerCase()}
                    color={getStatusColor(member.status)}
                    sx={{ ml: 1 }}
                  />
                </Typography>
              }
              secondary={
                <>
                  <Typography component="span" variant="body2" color="text.primary">
                    {member.relationship.toLowerCase()} • 
                  </Typography>
                  {" " + member.email}
                </>
              }
            />
          </ListItem>
        ))}
      </List>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditPermissions}>
          <EditIcon sx={{ mr: 1 }} /> Edit Permissions
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} /> Remove Access
        </MenuItem>
      </Menu>

      {selectedMember && (
        <>
          <PermissionsDialog
            open={openPermissions}
            onClose={() => setOpenPermissions(false)}
            member={selectedMember}
          />

          <Dialog open={openConfirmDelete} onClose={() => setOpenConfirmDelete(false)}>
            <DialogTitle>Remove Family Member?</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to remove {selectedMember.name}'s access? They will no longer
                be able to view or manage medications.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenConfirmDelete(false)}>Cancel</Button>
              <Button onClick={confirmDelete} color="error" variant="contained">
                Remove Access
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </>
  );
}
