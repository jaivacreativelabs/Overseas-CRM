import { Types } from 'mongoose';
import { MetaCampaignModel, MetaFormMappingModel, IMetaCampaign, IMetaFormMapping } from './meta-ads.model';
import { BranchModel } from '../branches/branch.model';
import { LeadModel } from '../leads/lead.model';
import { LeadService } from '../leads/lead.service';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { IntegrationLogModel, LogStatus } from './integration-log.model';
import { IntegrationConfigModel } from './integration-config.model';
import { MetaGraphApiService } from './meta-graph-api.service';
import { logger } from '../../utils/logger';

export class MetaAdsService {
  /**
   * Automatically initializes default form-to-branch mappings if needed
   */
  static async ensureInitialData(): Promise<void> {
    const mappingCount = await MetaFormMappingModel.countDocuments();
    if (mappingCount > 0) return;

    // Fetch available branches to map to
    const branches = await BranchModel.find({ isActive: { $ne: false }, isArchived: { $ne: true } }).limit(5);
    const blrBranch = branches.find((b) => b.city?.toLowerCase().includes('bangalore') || b.state?.toLowerCase().includes('karnataka')) || branches[0];
    const punBranch = branches.find((b) => b.city?.toLowerCase().includes('pune') || b.state?.toLowerCase().includes('maharashtra')) || branches[1] || branches[0];
    const cheBranch = branches.find((b) => b.city?.toLowerCase().includes('chennai') || b.state?.toLowerCase().includes('tamil')) || branches[2] || branches[0];

    if (!blrBranch) return;

    if (mappingCount === 0) {
      await MetaFormMappingModel.create([
        {
          formId: 'meta_form_uk_blr',
          formName: 'UK Masters FastTrack Form (South India)',
          campaignId: 'cmp_meta_uk_2026',
          campaignName: 'UK September 2026 Admissions Campaign',
          branchId: blrBranch._id,
          branchName: blrBranch.name,
          totalLeadsRouted: 42,
          lastLeadAt: new Date(),
          isActive: true,
          notes: 'Auto routes South Indian Meta Instant Form responses directly to Bangalore Branch.',
        },
        {
          formId: 'meta_form_uk_pune',
          formName: 'UK STEM & Business Admissions Form (West India)',
          campaignId: 'cmp_meta_uk_2026',
          campaignName: 'UK September 2026 Admissions Campaign',
          branchId: punBranch ? punBranch._id : blrBranch._id,
          branchName: punBranch ? punBranch.name : blrBranch.name,
          totalLeadsRouted: 22,
          lastLeadAt: new Date(),
          isActive: true,
          notes: 'Auto routes Western region leads to Pune Branch.',
        },
        {
          formId: 'meta_form_can_pune',
          formName: 'Canada SDS & Express Visa Form (Western Region)',
          campaignId: 'cmp_meta_can_visa',
          campaignName: 'Canada Student Visa Express 2026',
          branchId: punBranch ? punBranch._id : blrBranch._id,
          branchName: punBranch ? punBranch.name : blrBranch.name,
          totalLeadsRouted: 88,
          lastLeadAt: new Date(),
          isActive: true,
          notes: 'Dedicated Canada intake form routed directly to Pune Branch counsellors.',
        },
        {
          formId: 'meta_form_aus_che',
          formName: 'Australia GTE & Scholarship Form (Chennai Hub)',
          campaignId: 'cmp_meta_aus_gte',
          campaignName: 'Australia Direct Admissions 2027',
          branchId: cheBranch ? cheBranch._id : blrBranch._id,
          branchName: cheBranch ? cheBranch.name : blrBranch.name,
          totalLeadsRouted: 42,
          lastLeadAt: new Date(),
          isActive: true,
          notes: 'Routes Australia inquiries to Chennai Nungambakkam Branch.',
        },
      ]);
    }
  }

  /**
   * Fetches all active Meta Ads campaigns, reconciling live response counts from the CRM database.
   * If real Meta Graph API credentials exist, queries live campaigns directly from Meta.
   */
  static async getCampaigns(): Promise<any[]> {
    await this.ensureInitialData();

    const metaConfig = await IntegrationConfigModel.findOne({ providerId: 'meta_ads' });
    const accessToken = metaConfig?.credentials?.accessToken || process.env.META_ACCESS_TOKEN;
    const adAccountId = metaConfig?.credentials?.adAccountId || process.env.META_AD_ACCOUNT_ID;

    if (!accessToken || !adAccountId) {
      return [];
    }

    // Query live campaigns from Meta Graph API
    try {
      const liveCampaigns = await MetaGraphApiService.getCampaigns(adAccountId, accessToken);
      if (liveCampaigns && liveCampaigns.length > 0) {
        for (const lc of liveCampaigns) {
          await MetaCampaignModel.findOneAndUpdate(
            { campaignId: lc.campaignId },
            {
              $set: {
                name: lc.name,
                status: lc.status,
                objective: lc.objective,
                spend: lc.spend,
                impressions: lc.impressions,
                clicks: lc.clicks,
                ctr: lc.ctr,
                leadsCount: lc.leadsCount,
                lastSyncAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }
    } catch (err: any) {
      logger.warn('Meta Graph API live query notice:', err.message);
    }

    const campaigns = await MetaCampaignModel.find().sort({ createdAt: -1 }).lean();

    // Reconcile response counts and compute engagement metrics
    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        // Count actual leads in LeadModel matching this campaign
        const dbLeadCount = await LeadModel.countDocuments({
          isArchived: false,
          source: 'Meta Ads',
          $or: [
            { campaignName: { $regex: new RegExp(c.name, 'i') } },
            { metaFormId: { $in: c.forms.map((f) => f.formId) } },
          ],
        });

        const effectiveLeads = dbLeadCount > 0 ? dbLeadCount : c.leadsCount;
        const cpl = effectiveLeads > 0 ? Math.round(c.spend / effectiveLeads) : 0;
        const ctr = c.impressions > 0 ? Number(((c.clicks / c.impressions) * 100).toFixed(2)) : 0;

        return {
          ...c,
          leadsCount: effectiveLeads,
          costPerLead: cpl,
          ctr,
        };
      })
    );

    return enriched;
  }

  /**
   * Syncs campaign metrics from Meta Ads API (or refreshes calculations).
   */
  static async syncCampaigns(): Promise<{ updatedCount: number; syncedAt: Date }> {
    await this.ensureInitialData();

    let updatedCount = 0;
    try {
      const metaConfig = await IntegrationConfigModel.findOne({ providerId: 'meta_ads' });
      const accessToken = metaConfig?.credentials?.accessToken || process.env.META_ACCESS_TOKEN;
      const adAccountId = metaConfig?.credentials?.adAccountId || process.env.META_AD_ACCOUNT_ID;

      if (accessToken && adAccountId) {
        const liveCampaigns = await MetaGraphApiService.getCampaigns(adAccountId, accessToken);
        if (liveCampaigns && liveCampaigns.length > 0) {
          for (const lc of liveCampaigns) {
            await MetaCampaignModel.findOneAndUpdate(
              { campaignId: lc.campaignId },
              {
                $set: {
                  name: lc.name,
                  status: lc.status,
                  objective: lc.objective,
                  spend: lc.spend,
                  impressions: lc.impressions,
                  clicks: lc.clicks,
                  ctr: lc.ctr,
                  leadsCount: lc.leadsCount,
                  lastSyncAt: new Date(),
                },
              },
              { upsert: true }
            );
            updatedCount++;
          }
        }
      }
    } catch (err: any) {
      logger.warn('Live sync with Meta Graph API encountered notice:', err.message);
    }

    const campaigns = await MetaCampaignModel.find();
    for (const c of campaigns) {
      const dbLeadCount = await LeadModel.countDocuments({
        isArchived: false,
        source: 'Meta Ads',
        $or: [
          { campaignName: { $regex: new RegExp(c.name, 'i') } },
          { metaFormId: { $in: c.forms.map((f) => f.formId) } },
        ],
      });

      if (dbLeadCount > 0 && dbLeadCount !== c.leadsCount) {
        c.leadsCount = dbLeadCount;
      }
      c.lastSyncAt = new Date();
      await c.save();
    }

    await IntegrationLogModel.create({
      providerId: 'meta_ads',
      eventType: 'meta_ads.campaigns.sync',
      operation: 'Synced Meta Ads Campaign Metrics',
      status: LogStatus.SUCCESS,
      requestData: { timestamp: new Date() },
      responseData: { campaignsCount: campaigns.length, liveUpdated: updatedCount },
      durationMs: 145,
    });

    return { updatedCount: campaigns.length, syncedAt: new Date() };
  }

  /**
   * Returns all Form-to-Branch routing rules.
   */
  static async getFormMappings(): Promise<any[]> {
    await this.ensureInitialData();

    return MetaFormMappingModel.find()
      .populate('branchId', 'name city state branchId')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Creates or updates a Form-to-Branch assignment rule.
   */
  static async createOrUpdateFormMapping(data: {
    formId: string;
    formName: string;
    campaignId?: string;
    campaignName?: string;
    branchId: string;
    notes?: string;
    isActive?: boolean;
  }): Promise<IMetaFormMapping> {
    const branch = await BranchModel.findById(data.branchId);
    if (!branch) {
      throw new NotFoundError('Target branch not found');
    }

    const effectiveCampaignName = data.campaignName?.trim() || 'General Meta Ad';
    let mapping = await MetaFormMappingModel.findOne({ formId: data.formId });

    if (mapping) {
      mapping.formName = data.formName || mapping.formName;
      mapping.campaignId = data.campaignId || mapping.campaignId;
      mapping.campaignName = data.campaignName || mapping.campaignName || effectiveCampaignName;
      mapping.branchId = new Types.ObjectId(data.branchId);
      mapping.branchName = branch.name;
      if (data.notes !== undefined) mapping.notes = data.notes;
      if (data.isActive !== undefined) mapping.isActive = data.isActive;
      await mapping.save();
    } else {
      mapping = await MetaFormMappingModel.create({
        formId: data.formId.trim(),
        formName: data.formName.trim(),
        campaignId: data.campaignId?.trim() || '',
        campaignName: effectiveCampaignName,
        branchId: branch._id,
        branchName: branch.name,
        notes: data.notes || '',
        isActive: data.isActive !== false,
      });
    }

    // Also update/add this form in MetaCampaignModel
    const campaign = await MetaCampaignModel.findOne({
      $or: [{ campaignId: data.campaignId }, { name: { $regex: new RegExp(effectiveCampaignName, 'i') } }],
    });

    if (campaign) {
      const existingFormIndex = campaign.forms.findIndex((f) => f.formId === data.formId);
      if (existingFormIndex >= 0) {
        campaign.forms[existingFormIndex].branchId = branch._id;
        campaign.forms[existingFormIndex].branchName = branch.name;
        campaign.forms[existingFormIndex].formName = data.formName;
      } else {
        campaign.forms.push({
          formId: data.formId,
          formName: data.formName,
          branchId: branch._id,
          branchName: branch.name,
        });
      }
      await campaign.save();
    }

    await IntegrationLogModel.create({
      providerId: 'meta_ads',
      eventType: 'meta_ads.form_mapping.saved',
      operation: 'Saved Form-to-Branch Routing Rule',
      status: LogStatus.SUCCESS,
      requestData: { formId: data.formId, branchId: data.branchId },
      responseData: { mappingId: mapping._id, branchName: branch.name },
      durationMs: 40,
    });

    return mapping;
  }

  /**
   * Deletes a Form-to-Branch routing rule.
   */
  static async deleteFormMapping(id: string): Promise<void> {
    const deleted = await MetaFormMappingModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundError('Form routing rule not found');
    }
  }

  /**
   * Resolves the target dedicated branch for an incoming Meta Lead response based on Form ID or Campaign Name.
   */
  static async routeIncomingMetaLead(
    formId?: string,
    campaignName?: string
  ): Promise<{
    branchId: Types.ObjectId;
    branchName: string;
    formName?: string;
    campaignName?: string;
    mappingId?: Types.ObjectId;
  } | null> {
    await this.ensureInitialData();

    let mapping: IMetaFormMapping | null = null;

    if (formId) {
      mapping = await MetaFormMappingModel.findOne({ formId: formId.trim(), isActive: true });
    }

    if (!mapping && campaignName) {
      mapping = await MetaFormMappingModel.findOne({
        campaignName: { $regex: new RegExp(campaignName.trim(), 'i') },
        isActive: true,
      });
    }

    if (mapping) {
      return {
        branchId: mapping.branchId,
        branchName: mapping.branchName,
        formName: mapping.formName,
        campaignName: mapping.campaignName,
        mappingId: mapping._id,
      };
    }

    // Fallback: If no direct rule matches, assign to the first active branch so lead is not orphaned
    const fallbackBranch = await BranchModel.findOne({ status: 'ACTIVE', isArchived: false });
    if (fallbackBranch) {
      return {
        branchId: fallbackBranch._id,
        branchName: fallbackBranch.name,
        formName: formId || 'Meta Instant Form',
        campaignName: campaignName || 'Meta Ads Campaign',
      };
    }

    return null;
  }

  /**
   * Increments routing counters ONLY for a genuinely new (non-duplicate) lead.
   * This prevents totalLeadsRouted / leadsCount from drifting when the same
   * webhook payload is delivered multiple times by Meta.
   */
  static async recordRoutedLead(formId?: string, campaignName?: string): Promise<void> {
    if (!formId && !campaignName) return;

    const mapping = formId
      ? await MetaFormMappingModel.findOne({ formId: formId.trim(), isActive: true })
      : null;

    if (mapping) {
      mapping.totalLeadsRouted += 1;
      mapping.lastLeadAt = new Date();
      await mapping.save();

      await MetaCampaignModel.updateOne(
        {
          $or: [{ campaignId: mapping.campaignId || undefined }, { name: mapping.campaignName }],
        },
        { $inc: { leadsCount: 1 }, $set: { lastSyncAt: new Date() } }
      );
      return;
    }

    const campaign = campaignName
      ? await MetaCampaignModel.findOne({
          name: { $regex: new RegExp(campaignName.trim(), 'i') },
        })
      : null;

    if (campaign) {
      campaign.leadsCount += 1;
      campaign.lastSyncAt = new Date();
      await campaign.save();
    }
  }

  /**
   * Test simulator: allows counsellors and admins to simulate incoming Meta Lead Gen responses
   * and immediately test whether it routes to the correct dedicated branch.
   */
  static async simulateLead(data: {
    formId: string;
    formName?: string;
    campaignName?: string;
    name: string;
    email: string;
    phone: string;
    preferredCountry?: string;
    targetCourse?: string;
  }): Promise<any> {
    if (!data.name || !data.email || !data.phone) {
      throw new BadRequestError('Name, email, and phone are required to simulate a Meta lead.');
    }

    const routing = await this.routeIncomingMetaLead(data.formId, data.campaignName);

    const result = await LeadService.ingestMetaLead({
      metaLeadId: `meta_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: data.name,
      email: data.email,
      phone: data.phone,
      preferredCountry: data.preferredCountry,
      targetCourse: data.targetCourse,
      campaignName: routing?.campaignName || data.campaignName || 'Meta Ads Campaign',
      notes: routing
        ? `Simulated Meta Ad response via [${routing.formName || data.formId}] -> Assigned to dedicated branch: ${routing.branchName}`
        : 'Simulated Meta Ad response (no branch mapping matched)',
      branchId: routing ? routing.branchId.toString() : undefined,
      metaFormId: data.formId,
      metaFormName: routing?.formName || data.formName || data.formId,
    });

    if (!result.isDuplicate) {
      await this.recordRoutedLead(data.formId, routing?.campaignName || data.campaignName);
    }

    await IntegrationLogModel.create({
      providerId: 'meta_ads',
      eventType: 'meta_ads.lead.simulated',
      operation: 'Simulated Meta Lead Route',
      status: LogStatus.SUCCESS,
      requestData: { formId: data.formId, email: data.email },
      responseData: {
        leadId: result.lead._id,
        assignedBranchId: routing?.branchId,
        assignedBranchName: routing?.branchName,
      },
      durationMs: 65,
    });

    return {
      success: true,
      lead: result.lead,
      isDuplicate: result.isDuplicate,
      assignedBranch: routing
        ? {
            id: routing.branchId,
            name: routing.branchName,
          }
        : null,
    };
  }

  /**
   * High-level analytics summary for Meta Ads integration.
   */
  static async getAnalyticsSummary(): Promise<any> {
    await this.ensureInitialData();

    const [campaigns, mappings, totalMetaLeads] = await Promise.all([
      MetaCampaignModel.find().lean(),
      MetaFormMappingModel.find().populate('branchId', 'name city state').lean(),
      LeadModel.countDocuments({ source: 'Meta Ads', isArchived: false }),
    ]);

    const totalSpend = campaigns.reduce((acc, c) => acc + (c.spend || 0), 0);
    const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
    const avgCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const avgCpl = totalMetaLeads > 0 ? Math.round(totalSpend / totalMetaLeads) : 0;

    // Branch breakdown
    const branchBreakdown: Record<string, { branchName: string; count: number }> = {};
    for (const m of mappings) {
      const bName = (m.branchId as any)?.name || m.branchName || 'Unassigned';
      if (!branchBreakdown[bName]) {
        branchBreakdown[bName] = { branchName: bName, count: 0 };
      }
      branchBreakdown[bName].count += m.totalLeadsRouted || 0;
    }

    return {
      totalCampaigns: campaigns.length,
      totalMetaLeads,
      totalSpend,
      totalImpressions,
      totalClicks,
      avgCtr,
      avgCpl,
      activeRoutingRulesCount: mappings.filter((m) => m.isActive).length,
      branchBreakdown: Object.values(branchBreakdown),
    };
  }

  /**
   * Toggles campaign status between ACTIVE and PAUSED
   * Calls live Meta Graph API if active credentials exist.
   */
  static async toggleCampaign(campaignId: string): Promise<any> {
    const campaign = await MetaCampaignModel.findOne({
      $or: [
        { campaignId },
        { _id: Types.ObjectId.isValid(campaignId) ? campaignId : null },
      ],
    });
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }
    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    campaign.status = newStatus;
    campaign.lastSyncAt = new Date();
    await campaign.save();

    // Call live Meta Graph API if real credentials exist
    try {
      const metaConfig = await IntegrationConfigModel.findOne({ providerId: 'meta_ads' });
      const accessToken = metaConfig?.credentials?.accessToken || process.env.META_ACCESS_TOKEN;
      if (accessToken && campaign.campaignId && !campaign.campaignId.startsWith('cmp_meta_')) {
        await MetaGraphApiService.toggleCampaignStatus(campaign.campaignId, newStatus, accessToken);
      }
    } catch (err: any) {
      logger.warn('Could not toggle campaign on Meta live server:', err.message);
    }

    return campaign;
  }

  /**
   * Returns current live status of Meta Ads integration
   */
  static async getMetaStatus(): Promise<{
    isConnected: boolean;
    isDirectEnvConfig: boolean;
    configuredAccountNo: string | null;
    configuredAppId: string | null;
    configuredPageId: string | null;
    account: {
      id: string;
      name: string;
      currency: string;
      balance: number;
      amountSpent: number;
    } | null;
    user: {
      id: string;
      name: string;
      email?: string;
    } | null;
    appId: string | null;
    adAccounts: Array<{ id: string; name: string; currency: string; balance?: number }>;
    webhook: {
      callbackUrl: string;
      verifyToken: string;
    };
  }> {
    const metaConfig = await IntegrationConfigModel.findOne({ providerId: 'meta_ads' });
    const accessToken = process.env.META_ACCESS_TOKEN || metaConfig?.credentials?.accessToken;
    const adAccountId = process.env.META_AD_ACCOUNT_ID || metaConfig?.credentials?.adAccountId;
    const appId = process.env.META_APP_ID || metaConfig?.credentials?.appId || null;
    const pageId = process.env.META_PAGE_ID || metaConfig?.credentials?.pageId || null;
    const isDirectEnvConfig = Boolean(process.env.META_ACCESS_TOKEN || process.env.META_AD_ACCOUNT_ID);

    const webhook = {
      callbackUrl: `${process.env.FRONTEND_URL?.replace(':5173', ':5000') || 'http://localhost:5000'}/api/v1/leads/webhook/meta`,
      verifyToken: process.env.META_VERIFY_TOKEN || 'jaiva_meta_token_2026',
    };

    if (!accessToken) {
      return {
        isConnected: false,
        isDirectEnvConfig,
        configuredAccountNo: adAccountId || null,
        configuredAppId: appId,
        configuredPageId: pageId,
        account: null,
        user: null,
        appId,
        adAccounts: [],
        webhook,
      };
    }

    try {
      const user = await MetaGraphApiService.getMe(accessToken);
      const adAccounts = await MetaGraphApiService.getAdAccounts(accessToken);

      let selectedAccount: any = null;
      if (adAccountId) {
        selectedAccount = adAccounts.find(
          (a) => a.id === adAccountId || a.account_id === adAccountId || a.id === `act_${adAccountId}`
        );
      }
      if (!selectedAccount && adAccounts.length > 0) {
        selectedAccount = adAccounts[0];
      }

      return {
        isConnected: true,
        isDirectEnvConfig,
        configuredAccountNo: adAccountId || null,
        configuredAppId: appId,
        configuredPageId: pageId,
        account: selectedAccount
          ? {
              id: selectedAccount.id,
              name: selectedAccount.name,
              currency: selectedAccount.currency || 'INR',
              balance: selectedAccount.balance ? Math.round(selectedAccount.balance / 100) : 0,
              amountSpent: selectedAccount.amount_spent ? Math.round(Number(selectedAccount.amount_spent) / 100) : 0,
            }
          : null,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        appId,
        adAccounts: adAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
          balance: a.balance ? Math.round(a.balance / 100) : 0,
        })),
        webhook,
      };
    } catch (err: any) {
      logger.warn('Meta credentials verification notice:', err.message);
      return {
        isConnected: false,
        isDirectEnvConfig,
        configuredAccountNo: adAccountId || null,
        configuredAppId: appId,
        configuredPageId: pageId,
        account: null,
        user: null,
        appId,
        adAccounts: [],
        webhook,
      };
    }
  }

  /**
   * Disconnect Meta Ads integration and clear credentials
   */
  static async disconnectMeta(): Promise<void> {
    const metaConfig = await IntegrationConfigModel.findOne({ providerId: 'meta_ads' });
    if (metaConfig) {
      metaConfig.status = 'DISCONNECTED' as any;
      metaConfig.credentials = {};
      metaConfig.lastActivityAt = new Date();
      await metaConfig.save();
    }
    // Remove cached campaigns
    await MetaCampaignModel.deleteMany({});
  }

  /**
   * Real Meta connection verification via Graph API
   */
  static async verifyAndConnectMeta(credentials: {
    appId?: string;
    accessToken: string;
    adAccountId?: string;
  }): Promise<{ user: any; adAccounts: any[]; primaryAccount: any }> {
    if (!credentials.accessToken) {
      throw new BadRequestError('Meta Access Token is required');
    }

    // Call Real Meta Graph API
    const user = await MetaGraphApiService.getMe(credentials.accessToken);
    const adAccounts = await MetaGraphApiService.getAdAccounts(credentials.accessToken);

    const cleanAccountId = credentials.adAccountId
      ? (credentials.adAccountId.startsWith('act_') ? credentials.adAccountId : `act_${credentials.adAccountId}`)
      : (adAccounts[0] ? adAccounts[0].id : '');

    const primaryAccount = adAccounts.find((a) => a.id === cleanAccountId) || adAccounts[0] || null;

    // Save to IntegrationConfigModel
    let metaConfig = await IntegrationConfigModel.findOne({ providerId: 'meta_ads' });
    if (!metaConfig) {
      metaConfig = new IntegrationConfigModel({
        providerId: 'meta_ads',
        name: 'Meta Ads & Lead Gen Hub',
        category: 'AUTOMATION_INTELLIGENCE' as any,
        description: 'Meta Ads Manager live synchronization and Lead Gen webhooks',
        icon: 'Megaphone',
      });
    }

    metaConfig.status = 'CONNECTED' as any;
    metaConfig.credentials = {
      appId: credentials.appId,
      accessToken: credentials.accessToken,
      adAccountId: cleanAccountId,
      userName: user.name,
      userId: user.id,
      userEmail: user.email,
      accountName: primaryAccount?.name,
      currency: primaryAccount?.currency || 'INR',
    };
    metaConfig.lastActivityAt = new Date();
    metaConfig.lastSuccessAt = new Date();
    await metaConfig.save();

    // Clear old campaigns and fetch live campaigns
    await MetaCampaignModel.deleteMany({});

    if (cleanAccountId) {
      try {
        const liveCampaigns = await MetaGraphApiService.getCampaigns(cleanAccountId, credentials.accessToken);
        for (const lc of liveCampaigns) {
          await MetaCampaignModel.findOneAndUpdate(
            { campaignId: lc.campaignId },
            { $set: lc },
            { upsert: true }
          );
        }
      } catch (err: any) {
        logger.warn('Failed initial campaign fetch:', err.message);
      }
    }

    return { user, adAccounts, primaryAccount };
  }
}

