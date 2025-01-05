import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  ContentCopy,
  Download,
  Link as LinkIcon,
  Share,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} role="tabpanel">
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export const MarketingTools: React.FC = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [baseUrl, setBaseUrl] = useState('https://medtrack.app/ref');
  const [campaignId, setCampaignId] = useState('');

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
  };

  const generateTrackingLink = () => {
    const params = new URLSearchParams();
    params.append('ref', 'YOUR_AFFILIATE_ID');
    if (campaignId) {
      params.append('campaign', campaignId);
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const marketingAssets = [
    {
      name: 'Product Banner (728x90)',
      preview: '/assets/marketing/banner-728x90.png',
      downloadUrl: '/assets/marketing/banner-728x90.png',
    },
    {
      name: 'Square Ad (300x250)',
      preview: '/assets/marketing/ad-300x250.png',
      downloadUrl: '/assets/marketing/ad-300x250.png',
    },
    {
      name: 'Social Media Kit',
      preview: '/assets/marketing/social-kit-preview.png',
      downloadUrl: '/assets/marketing/social-kit.zip',
    },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Marketing Tools
        </Typography>

        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="Tracking Links" />
          <Tab label="Marketing Assets" />
          <Tab label="Email Templates" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Campaign ID (optional)"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                helperText="Add a campaign ID to track different marketing efforts"
              />
            </Grid>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Your Tracking Link
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: theme.palette.grey[100],
                      p: 2,
                      borderRadius: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ flexGrow: 1, wordBreak: 'break-all' }}
                    >
                      {generateTrackingLink()}
                    </Typography>
                    <IconButton
                      onClick={() => handleCopyLink(generateTrackingLink())}
                      size="small"
                    >
                      <ContentCopy />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {marketingAssets.map((asset, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {asset.name}
                    </Typography>
                    <Box
                      component="img"
                      src={asset.preview}
                      alt={asset.name}
                      sx={{
                        width: '100%',
                        height: 'auto',
                        mb: 2,
                        borderRadius: 1,
                      }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<Download />}
                      fullWidth
                      href={asset.downloadUrl}
                    >
                      Download
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Email Templates
              </Typography>
              <Grid container spacing={2}>
                {['Welcome', 'Product Promotion', 'Success Story'].map(
                  (template, index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {template}
                          </Typography>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Professional email template optimized for {template.toLowerCase()} campaigns
                            </Typography>
                          </Box>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Button
                                variant="outlined"
                                startIcon={<ContentCopy />}
                                fullWidth
                                size="small"
                              >
                                Copy
                              </Button>
                            </Grid>
                            <Grid item xs={6}>
                              <Button
                                variant="contained"
                                startIcon={<Download />}
                                fullWidth
                                size="small"
                              >
                                Download
                              </Button>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                )}
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>
      </CardContent>
    </Card>
  );
};
