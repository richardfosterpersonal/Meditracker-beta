import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material';
import { DateTime } from 'luxon';
import { AffiliateService } from '../../../services/affiliate';

interface Payment {
  id: string;
  affiliateId: string;
  affiliateName: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  createdAt: string;
  paidAt?: string;
  paymentMethod: string;
}

export const PaymentManagement: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const affiliateService = new AffiliateService();

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await affiliateService.getAdminPayments();
      setPayments(response);
    } catch (error) {
      console.error('Failed to load payments:', error);
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

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setOpenDialog(true);
  };

  const handleProcessPayment = async (paymentId: string) => {
    try {
      await affiliateService.processPayment(paymentId);
      loadPayments();
    } catch (error) {
      console.error('Failed to process payment:', error);
    }
  };

  const handleDownloadInvoice = async (paymentId: string) => {
    try {
      await affiliateService.downloadPaymentInvoice(paymentId);
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  };

  const getStatusChip = (status: string) => {
    const statusColors: Record<string, 'default' | 'primary' | 'success' | 'error'> = {
      pending: 'default',
      processing: 'primary',
      paid: 'success',
      failed: 'error',
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
      <Grid container spacing={3}>
        {/* Payment Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pending Payments
              </Typography>
              <Typography variant="h4">
                ${payments
                  .filter((p) => p.status === 'pending')
                  .reduce((sum, p) => sum + p.amount, 0)
                  .toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Processing
              </Typography>
              <Typography variant="h4">
                ${payments
                  .filter((p) => p.status === 'processing')
                  .reduce((sum, p) => sum + p.amount, 0)
                  .toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Paid This Month
              </Typography>
              <Typography variant="h4">
                ${payments
                  .filter(
                    (p) =>
                      p.status === 'paid' &&
                      DateTime.fromISO(p.paidAt || '').hasSame(DateTime.now(), 'month')
                  )
                  .reduce((sum, p) => sum + p.amount, 0)
                  .toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Payments Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment History
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Affiliate</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Payment Method</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.affiliateName}</TableCell>
                          <TableCell>${payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{getStatusChip(payment.status)}</TableCell>
                          <TableCell>
                            {DateTime.fromISO(payment.createdAt).toFormat('dd LLL yyyy')}
                          </TableCell>
                          <TableCell>{payment.paymentMethod}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleViewPayment(payment)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadInvoice(payment.id)}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={payments.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payment Details Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Affiliate"
                  value={selectedPayment.affiliateName}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  value={`$${selectedPayment.amount.toLocaleString()}`}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Status"
                  value={selectedPayment.status}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Payment Method"
                  value={selectedPayment.paymentMethod}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Created Date"
                  value={DateTime.fromISO(selectedPayment.createdAt).toFormat(
                    'dd LLL yyyy HH:mm'
                  )}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              {selectedPayment.paidAt && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Paid Date"
                    value={DateTime.fromISO(selectedPayment.paidAt).toFormat(
                      'dd LLL yyyy HH:mm'
                    )}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
          {selectedPayment?.status === 'pending' && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleProcessPayment(selectedPayment.id)}
            >
              Process Payment
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
