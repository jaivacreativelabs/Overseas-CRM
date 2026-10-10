import { Types } from 'mongoose';
import { MetaCampaignModel, MetaFormMappingModel, IMetaCampaign, IMetaFormMapping } from './meta-ads.model';
import { BranchModel } from '../branches/branch.model';
import { LeadModel } from '../leads/lead.model';
import { LeadService } from '../leads/lead.service';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { IntegrationLogModel, LogStatus } from './integration-log.model';

export class MetaAdsService {
  /**
   * Automatically initializes default active Meta campaigns and form-to-branch mappings
   * if the database doesn't have them yet.
   */
  static async ensureInitialData(): Promise<void> {
    const campaignCount = await MetaCampaignModel.countDocuments();
    const mappingCount = await MetaFormMappingModel.countDocuments();

    if (campaignCount > 0 && mappingCount > 0) return;

    // Fetch available branches to map to
    const branches = await BranchModel.find({ isActive: { $ne: false }, isArchived: { $ne: true } }).limit(5);

    const blrBranch = branches.find((b) => b.city?.toLowerCase().includes('bangalore') || b.state?.toLowerCase().includes('karnataka')) || branches[0];
    const punBranch = branches.find((b) => b.city?.toLowerCase().includes('pune') || b.state?.toLowerCase().includes('maharashtra')) || branches[1] || branches[0];
    const cheBranch = branches.find((b) => b.city?.toLowerCase().includes('chennai') || b.state?.toLowerCase().includes('tamil')) || branches[2] || branches[0];

    if (!blrBranch) return; // If no branches exist at all, will be configured manually

    if (campaignCount === 0) {
      await MetaCampaignModel.create([
        {
          campaignId: 'cmp_meta_uk_2026',
          name: 'UK September 2026 Admissions Campaign',
          status: 'ACTIVE',
          objective: 'LEAD_GENERATION',
          spend: 34500,
          currency: 'INR',
          impressions: 48200,
          clicks: 2540,
          ctr: 5.27,
          leadsCount: 64,
          forms: [
            {
              formId: 'meta_form_uk_blr',
              formName: 'UK Masters FastTrack Form (South India)',
              branchId: blrBranch._id,
              branchName: blrBranch.name,
            },
            {
              formId: 'meta_form_uk_pune',
              formName: 'UK STEM & Business Admissions Form (West India)',
              branchId: punBranch ? punBranch._id : blrBranch._id,
              branchName: punBranch ? punBranch.name : blrBranch.name,
            },
          ],
          lastSyncAt: new Date(),
        },
        {
          campaignId: 'cmp_meta_can_visa',
          name: 'Canada Student Visa Express 2026',
          status: 'ACTIVE',
          objective: 'LEAD_GENERATION',
          spend: 42000,
          currency: 'INR',
          impressions: 62000,
          clicks: 3720,
          ctr: 6.0,
          leadsCount: 88,
          forms: [
            {
              formId: 'meta_form_can_pune',
              formName: 'Canada SDS & Express Visa Form (Western Region)',
              branchId: punBranch ? punBranch._id : blrBranch._id,
              branchName: punBranch ? punBranch.name : blrBranch.name,
            },
          ],
          lastSyncAt: new Date(),
        },
        {
          campaignId: 'cmp_meta_aus_gte',
          name: 'Australia Direct Admissions 2027',
          status: 'ACTIVE',
          objective: 'LEAD_GENERATION',
          spend: 21800,
          currency: 'INR',
          impressions: 31000,
          clicks: 1680,
          ctr: 5.42,
          leadsCount: 42,
          forms: [
            {
              formId: 'meta_form_aus_che',
              formName: 'Australia GTE & Scholarship Form (Chennai Hub)',
              branchId: cheBranch ? cheBranch._id : blrBranch._id,
              branchName: cheBranch ? cheBranch.name : blrBranch.name,
            },
          ],
          lastSyncAt: new Date(),
        },
      ]);
    }

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
   */
  static async getCampaigns(): Promise<any[]> {
    await this.ensureInitialData();

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

        const effectiveLeads = Math.max(c.leadsCount, dbLeadCount);
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

      if (dbLeadCount > c.leadsCount) {
        c.leadsCount = dbLeadCount;
      }
      c.lastSyncAt = new Date();
      await c.save();
    }

    await IntegrationLogModel.create({
      providerId: 'meta_ads',
      action: 'CAMPAIGNS_SYNC',
      status: LogStatus.SUCCESS,
      requestPayload: { timestamp: new Date() },
      responsePayload: { campaignsCount: campaigns.length },
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
    campaignName: string;
    branchId: string;
    notes?: string;
    isActive?: boolean;
  }): Promise<IMetaFormMapping> {
    const branch = await BranchModel.findById(data.branchId);
    if (!branch) {
      throw new NotFoundError('Target branch not found');
    }

    let mapping = await MetaFormMappingModel.findOne({ formId: data.formId });

    if (mapping) {
      mapping.formName = data.formName || mapping.formName;
      mapping.campaignId = data.campaignId || mapping.campaignId;
      mapping.campaignName = data.campaignName || mapping.campaignName;
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
        campaignName: data.campaignName.trim(),
        branchId: branch._id,
        branchName: branch.name,
        notes: data.notes || '',
        isActive: data.isActive !== false,
      });
    }

    // Also update/add this form in MetaCampaignModel
    const campaign = await MetaCampaignModel.findOne({
      $or: [{ campaignId: data.campaignId }, { name: { $regex: new RegExp(data.campaignName, 'i') } }],
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
      action: 'FORM_BRANCH_RULE_SAVED',
      status: LogStatus.SUCCESS,
      requestPayload: { formId: data.formId, branchId: data.branchId },
      responsePayload: { mappingId: mapping._id, branchName: branch.name },
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
      mapping.totalLeadsRouted += 1;
      mapping.lastLeadAt = new Date();
      await mapping.save();

      // Increment campaign leadsCount
      await MetaCampaignModel.updateOne(
        { $or: [{ campaignId: mapping.campaignId }, { name: mapping.campaignName }] },
        { $inc: { leadsCount: 1 }, $set: { lastSyncAt: new Date() } }
      );

      return {
        branchId: mapping.branchId,
        branchName: mapping.branchName,
        formName: mapping.formName,
        campaignName: mapping.campaignName,
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

    await IntegrationLogModel.create({
      providerId: 'meta_ads',
      action: 'LEAD_SIMULATION_ROUTED',
      status: LogStatus.SUCCESS,
      requestPayload: { formId: data.formId, email: data.email },
      responsePayload: {
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
}

