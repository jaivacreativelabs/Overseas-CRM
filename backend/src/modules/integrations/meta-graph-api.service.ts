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

  private static async graphGet(pathOrUrl: string, accessToken?: string): Promise<any> {
    const url = pathOrUrl.startsWith('http')
      ? pathOrUrl
      : `${this.GRAPH_API_BASE}/${pathOrUrl}${pathOrUrl.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(accessToken || '')}`;
    const res = await fetch(url);
    const data: any = await res.json();
    if (data?.error) {
      throw new Error(data.error.message || 'Meta Graph API request failed');
    }
    return data;
  }

  /**
   * Turns a raw Graph API Lead object (field_data array) into CRM-friendly fields.
   */
  static parseLead(raw: any): ParsedMetaLead {
    const fields: Record<string, string> = {};
    if (Array.isArray(raw?.field_data)) {
      for (const item of raw.field_data) {
        const val = Array.isArray(item.values) ? item.values[0] : item.values;
        if (item.name) fields[item.name] = val ?? '';
      }
    }

    const leadgenId: string = raw.id;
    const fullName =
      fields.full_name || fields.name || `${fields.first_name || ''} ${fields.last_name || ''}`.trim();

    return {
      leadgenId,
      createdTime: raw.created_time,
      formId: raw.form_id,
      campaignId: raw.campaign_id,
      campaignName: raw.campaign_name,
      name: fullName || 'Meta Lead',
      email: fields.email || fields.work_email || `lead_${leadgenId}@meta.com`,
      phone: fields.phone_number || fields.phone || fields.work_phone_number || '0000000000',
      city: fields.city || fields.state || '',
      country: fields.country || '',
      rawFields: fields,
    };
  }

  /**
   * Fetches real lead payload from Meta when an incoming leadgen webhook arrives
   */
  static async getLeadData(leadgenId: string, accessToken: string): Promise<ParsedMetaLead> {
    try {
      const data = await this.graphGet(`${leadgenId}?fields=${LEAD_FIELDS}`, accessToken);
      return this.parseLead(data);
    } catch (err: any) {
      logger.error('Meta Graph API getLeadData failed:', err);
      throw err;
    }
  }

  /**
   * Exchanges a user/system-user token for the Page access token (needed to read leads).
   * Falls back to the given token, which may already be a Page token.
   */
  static async getPageAccessToken(pageId: string, accessToken: string): Promise<string> {
    try {
      const data = await this.graphGet(`${pageId}?fields=access_token`, accessToken);
      return data.access_token || accessToken;
    } catch {
      return accessToken;
    }
  }

  /**
   * Lists the Instant (lead gen) forms that exist on a Facebook Page.
   */
  static async getLeadForms(pageId: string, pageAccessToken: string): Promise<MetaLeadForm[]> {
    const forms: MetaLeadForm[] = [];
    let next: string | null = `${pageId}/leadgen_forms?fields=id,name,status,leads_count,created_time&limit=100`;
    let guard = 0;
    while (next && guard++ < 20) {
      const data = await this.graphGet(next, pageAccessToken);
      forms.push(...(data.data || []));
      next = data.paging?.next || null;
    }
    return forms;
  }

  /**
   * Pulls leads submitted on a form, optionally only those created after `sinceUnix` (seconds).
   */
  static async getFormLeads(formId: string, pageAccessToken: string, sinceUnix?: number): Promise<ParsedMetaLead[]> {
    let path = `${formId}/leads?fields=${LEAD_FIELDS}&limit=100`;
    if (sinceUnix) {
      const filtering = JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: sinceUnix }]);
      path += `&filtering=${encodeURIComponent(filtering)}`;
    }

    const leads: ParsedMetaLead[] = [];
    let next: string | null = path;
    let guard = 0;
    while (next && guard++ < 50) {
      const data = await this.graphGet(next, pageAccessToken);
      for (const raw of data.data || []) leads.push(this.parseLead(raw));
      next = data.paging?.next || null;
    }
    return leads;
  }

  /**
   * Subscribes our Meta App to the Page's `leadgen` webhook field so new leads are pushed in real time.
   */
  static async subscribePageToLeadgen(pageId: string, pageAccessToken: string): Promise<boolean> {
    const res = await fetch(`${this.GRAPH_API_BASE}/${pageId}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ subscribed_fields: 'leadgen', access_token: pageAccessToken }).toString(),
    });
    const data: any = await res.json();
    if (data?.error) {
      throw new Error(data.error.message || 'Failed to subscribe Page to leadgen webhooks');
    }
    return data?.success === true;
  }
}

const LEAD_FIELDS = 'id,created_time,field_data,form_id,campaign_id,campaign_name';

export interface ParsedMetaLead {
  leadgenId: string;
  createdTime?: string;
  formId?: string;
  campaignId?: string;
  campaignName?: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  rawFields: Record<string, string>;
}

export interface MetaLeadForm {
  id: string;
  name: string;
  status?: string;
  leads_count?: number;
  created_time?: string;
}
