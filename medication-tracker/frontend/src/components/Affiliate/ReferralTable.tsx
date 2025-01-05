import React, { useState } from 'react';
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
  Tooltip,
} from '@mui/material';
import {
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { DateTime } from 'luxon';

interface Referral {
  id: string;
  userId: string;
  source: string;
  campaign?: string;
  status: 'pending' | 'converted' | 'expired';
  createdAt: string;
  commission?: number;
}

interface ReferralTableProps {
  referrals: Referral[];
}

export const ReferralTable: React.FC<ReferralTableProps> = ({ referrals }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { color: 'default' | 'success' | 'warning' | 'error', icon: React.ReactNode }> = {
      pending: {
        color: 'warning',
        icon: <WarningIcon fontSize="small" />,
      },
      converted: {
        color: 'success',
        icon: <CheckCircleIcon fontSize="small" />,
      },
      expired: {
        color: 'error',
        icon: <InfoIcon fontSize="small" />,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={config.color}
        size="small"
        icon={config.icon}
      />
    );
  };

  return (
    <Card>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Referrals
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>User ID</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Campaign</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Commission</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {referrals
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>
                      {DateTime.fromISO(referral.createdAt).toFormat('dd LLL yyyy')}
                    </TableCell>
                    <TableCell>{referral.userId}</TableCell>
                    <TableCell>{referral.source}</TableCell>
                    <TableCell>
                      {referral.campaign || (
                        <Typography variant="body2" color="text.secondary">
                          No Campaign
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{getStatusChip(referral.status)}</TableCell>
                    <TableCell align="right">
                      {referral.commission ? (
                        `$${referral.commission.toFixed(2)}`
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Pending
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={referrals.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box>
    </Card>
  );
};
