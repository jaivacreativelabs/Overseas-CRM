import { logger } from '../../utils/logger';

export interface MetaAdAccount {
  id: string; // e.g. "act_123456789"
  account_id: string; // e.g. "123456789"
  name: string;
  currency: string;
  account_status: number;
  balance?: number;
  amount_spent?: string | number;
}

export interface MetaGraphCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  objective: string;
  budget_remaining?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  insights?: {
    data?: Array<{
      spend: string;
      impressions: string;
      clicks: string;
      ctr?: string;
      cpc?: string;
      cpm?: string;
      actions?: Array<{ action_type: string; value: string }>;
    }>;
  };
}

export class MetaGraphApiService {
  private static readonly GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

  /**
   * Verify token and fetch user details from Meta Graph API
   */
  static async getMe(accessToken: string): Promise<any> {
    try {
      const res = await fetch(`${this.GRAPH_API_BASE}/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`);
      const data = await res.json();
      if ((data as any).error) {
        throw new Error((data as any).error.message || 'Invalid Meta Access Token');
      }
      return data;
    } catch (err: any) {
      logger.error('Meta Graph API getMe failed:', err);
      throw err;
    }
  }

  /**
   * Fetch accessible Ad Accounts for the authenticated user / system user
   */
  static async getAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
    try {
      const res = await fetch(
        `${this.GRAPH_API_BASE}/me/adaccounts?fields=id,account_id,name,currency,account_status,balance,amount_spent&access_token=${encodeURIComponent(accessToken)}`
      );
      const data = await res.json();
      if ((data as any).error) {
        throw new Error((data as any).error.message || 'Failed to fetch Meta ad accounts');
      }
      return (data as any).data || [];
    } catch (err: any) {
      logger.error('Meta Graph API getAdAccounts failed:', err);
      throw err;
    }
  }

  /**
   * Fetch active campaigns and their performance insights from a specific Ad Account
   */
  static async getCampaigns(adAccountId: string, accessToken: string): Promise<any[]> {
    try {
      const cleanAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      const fields = [
        'id',
        'name',
        'status',
        'objective',
        'daily_budget',
        'lifetime_budget',
        'budget_remaining',
        'insights.date_preset(last_30d){spend,impressions,clicks,ctr,cpc,cpm,actions}',
      ].join(',');

      const res = await fetch(
        `${this.GRAPH_API_BASE}/${cleanAccountId}/campaigns?fields=${encodeURIComponent(fields)}&limit=50&access_token=${encodeURIComponent(accessToken)}`
      );
      const data = await res.json();

      if ((data as any).error) {
        throw new Error((data as any).error.message || 'Failed to fetch campaigns from Meta');
      }

      const rawCampaigns: MetaGraphCampaign[] = (data as any).data || [];

      // Transform raw Meta Graph API campaigns to CRM campaign format
      return rawCampaigns.map((c) => {
        const insights = c.insights?.data?.[0];
        const spend = insights ? parseFloat(insights.spend || '0') : 0;
        const impressions = insights ? parseInt(insights.impressions || '0', 10) : 0;
        const clicks = insights ? parseInt(insights.clicks || '0', 10) : 0;
        const ctr = insights?.ctr ? parseFloat(insights.ctr) : impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;

        // Extract lead actions from Meta actions array
        const leadAction = insights?.actions?.find(
          (a) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped' || a.action_type === 'contact'
        );
        const leadsCount = leadAction ? parseInt(leadAction.value || '0', 10) : 0;
        const costPerLead = leadsCount > 0 ? Math.round(spend / leadsCount) : 0;

        return {
          campaignId: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
          spend,
          currency: 'INR',
          impressions,
          clicks,
          ctr,
          leadsCount,
          costPerLead,
          dailyBudget: c.daily_budget ? Math.round(parseInt(c.daily_budget, 10) / 100) : 0,
          lifetimeBudget: c.lifetime_budget ? Math.round(parseInt(c.lifetime_budget, 10) / 100) : 0,
          lastSyncAt: new Date(),
        };
      });
    } catch (err: any) {
      logger.error('Meta Graph API getCampaigns failed:', err);
      throw err;
    }
  }

  /**
   * Toggles campaign status directly in Meta Ads Manager via Graph API
   */
  static async toggleCampaignStatus(
    campaignId: string,
    newStatus: 'ACTIVE' | 'PAUSED',
    accessToken: string
  ): Promise<boolean> {
    try {
      const res = await fetch(`${this.GRAPH_API_BASE}/${campaignId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          access_token: accessToken,
        }),
      });
      const data = await res.json();
      if ((data as any).error) {
        throw new Error((data as any).error.message || 'Failed to update campaign status on Meta');
      }
      return (data as any).success === true;
    } catch (err: any) {
      logger.error('Meta Graph API toggleCampaignStatus failed:', err);
      throw err;
    }
  }

  /**
   * Fetches real lead payload from Meta when an incoming leadgen webhook arrives
   */
  static async getLeadData(leadgenId: string, accessToken: string): Promise<any> {
    try {
      const res = await fetch(
        `${this.GRAPH_API_BASE}/${leadgenId}?fields=created_time,id,field_data,form_id,campaign_id,campaign_name&access_token=${encodeURIComponent(accessToken)}`
      );
      const data = await res.json();
      if ((data as any).error) {
        throw new Error((data as any).error.message || 'Failed to fetch lead payload from Meta Graph API');
      }

      // Parse field_data array into key-value map
      const fields: Record<string, string> = {};
      if (Array.isArray((data as any).field_data)) {
        for (const item of (data as any).field_data) {
          const val = Array.isArray(item.values) ? item.values[0] : item.values;
          fields[item.name] = val;
        }
      }

      return {
        leadgenId: (data as any).id,
        createdTime: (data as any).created_time,
        formId: (data as any).form_id,
        campaignId: (data as any).campaign_id,
        campaignName: (data as any).campaign_name,
        name: fields.full_name || fields.name || `${fields.first_name || ''} ${fields.last_name || ''}`.trim() || 'Meta Lead',
        email: fields.email || `lead_${leadgenId}@meta.com`,
        phone: fields.phone_number || fields.phone || '0000000000',
        city: fields.city || fields.state || '',
        country: fields.country || '',
        rawFields: fields,
      };
    } catch (err: any) {
      logger.error('Meta Graph API getLeadData failed:', err);
      throw err;
    }
  }
}
