import axios from 'axios';
import { DateTime } from 'luxon';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export class AffiliateService {
  async getAffiliateProgram(type: 'partner' | 'referrer') {
    const response = await axios.get(`${API_BASE_URL}/affiliate/programs/${type}`);
    return response.data;
  }

  async applyForProgram(data: {
    programId: string;
    type: 'partner' | 'referrer';
    companyName: string;
    website?: string;
    taxId: string;
    documents: Array<{ type: string; url: string }>;
  }) {
    const response = await axios.post(`${API_BASE_URL}/affiliate/apply`, data);
    return response.data;
  }

  async getAffiliateReport(startDate: Date, endDate: Date) {
    const response = await axios.get(`${API_BASE_URL}/affiliate/report`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
    return response.data;
  }

  async generateTrackingLink(params: {
    campaignId?: string;
    source?: string;
    medium?: string;
  }) {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlParams.append(key, value);
      }
    });
    
    // Add affiliate ID from local storage or context
    const affiliateId = localStorage.getItem('affiliateId');
    if (affiliateId) {
      urlParams.append('ref', affiliateId);
    }

    return `${window.location.origin}/ref?${urlParams.toString()}`;
  }

  async getMarketingAssets() {
    const response = await axios.get(`${API_BASE_URL}/affiliate/marketing-assets`);
    return response.data;
  }

  async getEmailTemplates() {
    const response = await axios.get(`${API_BASE_URL}/affiliate/email-templates`);
    return response.data;
  }

  async trackReferral(data: {
    affiliateId: string;
    userId: string;
    source: string;
    campaign?: string;
  }) {
    const response = await axios.post(`${API_BASE_URL}/affiliate/referral`, data);
    return response.data;
  }

  async getPaymentHistory(params: {
    startDate?: Date;
    endDate?: Date;
    status?: 'pending' | 'paid' | 'failed';
  }) {
    const response = await axios.get(`${API_BASE_URL}/affiliate/payments`, {
      params: {
        startDate: params.startDate?.toISOString(),
        endDate: params.endDate?.toISOString(),
        status: params.status,
      },
    });
    return response.data;
  }

  async updatePaymentInfo(data: {
    paymentMethod: 'bank' | 'paypal';
    accountDetails: Record<string, any>;
  }) {
    const response = await axios.put(
      `${API_BASE_URL}/affiliate/payment-info`,
      data
    );
    return response.data;
  }

  async getCommissionStats(period: 'daily' | 'weekly' | 'monthly' = 'monthly') {
    const response = await axios.get(`${API_BASE_URL}/affiliate/commission-stats`, {
      params: { period },
    });
    return response.data;
  }

  async getReferralStats(params: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'source' | 'campaign' | 'status';
  }) {
    const response = await axios.get(`${API_BASE_URL}/affiliate/referral-stats`, {
      params: {
        startDate: params.startDate?.toISOString(),
        endDate: params.endDate?.toISOString(),
        groupBy: params.groupBy,
      },
    });
    return response.data;
  }

  async downloadMarketingAsset(assetId: string) {
    const response = await axios.get(
      `${API_BASE_URL}/affiliate/marketing-assets/${assetId}/download`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }
}
