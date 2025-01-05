import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  useTheme,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { DateTime } from 'luxon';
import { AffiliateService } from '../../../services/affiliate';

interface Affiliate {
  id: string;
  userId: string;
  companyName: string;
  website?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  totalReferrals: number;
  totalRevenue: number;
  totalCommissions: number;
  conversionRate: number;
  createdAt: string;
}

export const AffiliateTable: React.FC = () => {
  const theme = useTheme();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const affiliateService = new AffiliateService();

  useEffect(() => {
    loadAffiliates();
  }, []);

  const loadAffiliates = async () => {
    try {
      setLoading(true);
      const response = await affiliateService.getAdminAffiliates();
      setAffiliates(response);
    } catch (error) {
      console.error('Failed to load affiliates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewAffiliate = (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    setOpenDialog(true);
  };

  const handleUpdateStatus = async (affiliateId: string, status: string) => {
    try {
      await affiliateService.updateAffiliateStatus(affiliateId, status);
      loadAffiliates();
    } catch (error) {
      console.error('Failed to update affiliate status:', error);
    }
  };

  const getStatusChip = (status: string) => {
    const statusColors: Record<string, 'default' | 'primary' | 'success' | 'error'> = {
      pending: 'default',
      approved: 'success',
      rejected: 'error',
      suspended: 'error',
    };

    return (
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={statusColors[status]}
        size="small"
      />
    );
  };

  return (
    <Box>
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Referrals</TableCell>
                <TableCell>Revenue</TableCell>
                <TableCell>Commissions</TableCell>
                <TableCell>Conv. Rate</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {affiliates
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((affiliate) => (
                  <TableRow key={affiliate.id}>
                    <TableCell>
                      <Typography variant="body1">{affiliate.companyName}</Typography>
                      {affiliate.website && (
                        <Typography variant="body2" color="textSecondary">
                          {affiliate.website}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{getStatusChip(affiliate.status)}</TableCell>
                    <TableCell>{affiliate.totalReferrals}</TableCell>
                    <TableCell>${affiliate.totalRevenue.toLocaleString()}</TableCell>
                    <TableCell>${affiliate.totalCommissions.toLocaleString()}</TableCell>
                    <TableCell>
                      {(affiliate.conversionRate * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      {DateTime.fromISO(affiliate.createdAt).toFormat('dd LLL yyyy')}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleViewAffiliate(affiliate)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                      {affiliate.status === 'pending' && (
                        <>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() =>
                              handleUpdateStatus(affiliate.id, 'approved')
                            }
                          >
                            <CheckCircleIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              handleUpdateStatus(affiliate.id, 'rejected')
                            }
                          >
                            <BlockIcon />
                          </IconButton>
                        </>
                      )}
                      {affiliate.status === 'approved' && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            handleUpdateStatus(affiliate.id, 'suspended')
                          }
                        >
                          <BlockIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={affiliates.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

      {/* Affiliate Details Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Affiliate Details</DialogTitle>
        <DialogContent>
          {selectedAffiliate && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={selectedAffiliate.companyName}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Website"
                  value={selectedAffiliate.website || 'N/A'}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Total Referrals"
                  value={selectedAffiliate.totalReferrals}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Total Revenue"
                  value={`$${selectedAffiliate.totalRevenue.toLocaleString()}`}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Total Commissions"
                  value={`$${selectedAffiliate.totalCommissions.toLocaleString()}`}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Conversion Rate"
                  value={`${(selectedAffiliate.conversionRate * 100).toFixed(1)}%`}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
          {selectedAffiliate?.status === 'pending' && (
            <>
              <Button
                color="success"
                variant="contained"
                onClick={() =>
                  handleUpdateStatus(selectedAffiliate.id, 'approved')
                }
              >
                Approve
              </Button>
              <Button
                color="error"
                variant="contained"
                onClick={() =>
                  handleUpdateStatus(selectedAffiliate.id, 'rejected')
                }
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
