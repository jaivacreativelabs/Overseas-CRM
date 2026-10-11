import crypto from 'crypto';
import {
  IntegrationConfigModel,
  IIntegrationConfig,
  IntegrationCategory,
  IntegrationStatus,
} from './integration-config.model';
import { IntegrationLogModel, LogStatus } from './integration-log.model';
import { AutomationWorkflowModel } from './automation-workflow.model';
import { BadRequestError, NotFoundError } from '../../utils/errors';

export const DEFAULT_PROVIDERS = [
  {
    providerId: 'meta_ads',
    category: IntegrationCategory.AUTOMATION_INTELLIGENCE,
    name: 'Meta Ads & Lead Gen Hub',
    description: 'Track multi-campaign ad spend & engagement, connect Instant Forms, and automatically route incoming leads to dedicated branch locations.',
    icon: 'Megaphone',
    status: IntegrationStatus.CONFIGURED, // Built-in active
  },
];

export class IntegrationService {
  /**
   * Initializes default providers if not already in DB
   */
  public static async initializeProviders(): Promise<void> {
    // Clean up any non-Meta Ads providers
    await IntegrationConfigModel.deleteMany({ providerId: { $ne: 'meta_ads' } });

    for (const p of DEFAULT_PROVIDERS) {
      const exists = await IntegrationConfigModel.findOne({ providerId: p.providerId });
      if (!exists) {
        await IntegrationConfigModel.create({
          ...p,
          credentials: {},
          settings: { autoSync: true },
        });
      }
    }
  }

  /**
   * Fetch all integration configurations with masked sensitive credentials
   */
  public static async getCatalog() {
    await this.initializeProviders();
    const configs = await IntegrationConfigModel.find({ providerId: 'meta_ads' }).sort({ category: 1, name: 1 });

    const totalCount = configs.length;
    let connectedCount = 0;
    let disconnectedCount = 0;
    let failedCount = 0;

    const sanitizedConfigs = configs.map((cfg) => {
      if (cfg.status === IntegrationStatus.CONNECTED || cfg.status === IntegrationStatus.CONFIGURED) {
        connectedCount++;
      } else if (cfg.status === IntegrationStatus.FAILED) {
        failedCount++;
      } else {
        disconnectedCount++;
      }

      const maskedCredentials: Record<string, string> = {};
      if (cfg.credentials) {
        for (const [key, val] of Object.entries(cfg.credentials)) {
          if (typeof val === 'string' && val.length > 0) {
            maskedCredentials[key] = val.length > 8 ? `${val.slice(0, 4)}****${val.slice(-4)}` : '********';
          }
        }
      }

      return {
        ...cfg.toObject(),
        credentials: maskedCredentials,
        hasCredentialsSet: Object.keys(cfg.credentials || {}).length > 0,
      };
    });

    const [activeWorkflowsCount, failedJobsCount] = await Promise.all([
      AutomationWorkflowModel.countDocuments({ isActive: true }),
      IntegrationLogModel.countDocuments({ status: LogStatus.FAILED }),
    ]);

    return {
      providers: sanitizedConfigs,
      summary: {
        totalIntegrations: totalCount,
        connectedIntegrations: connectedCount,
        disconnectedIntegrations: disconnectedCount,
        failedIntegrations: failedCount,
        activeWorkflows: activeWorkflowsCount,
        failedJobs: failedJobsCount,
      },
    };
  }

  /**
   * Connect or update credentials for a specific integration provider
   */
  public static async connectProvider(
    providerId: string,
    data: {
      credentials?: Record<string, any>;
      settings?: Record<string, any>;
    },
    userId?: string
  ) {
    const config = await IntegrationConfigModel.findOne({ providerId });
    if (!config) {
      throw new NotFoundError(`Integration provider '${providerId}' not found.`);
    }

    if (data.credentials) {
      // Merge with existing credentials if updating partial keys
      config.credentials = {
        ...config.credentials,
        ...data.credentials,
      };
    }

    if (data.settings) {
      config.settings = {
        ...config.settings,
        ...data.settings,
      };
    }

    config.status = IntegrationStatus.CONNECTED;
    config.lastActivityAt = new Date();
    config.lastSuccessAt = new Date();
    config.lastErrorMessage = undefined;
    await config.save();

    // Log connection event
    await IntegrationLogModel.create({
      providerId: config.providerId,
      eventType: `${config.providerId}.connected`,
      operation: `Connected ${config.name}`,
      status: LogStatus.SUCCESS,
      requestData: { settings: data.settings },
      responseData: { status: 'CONNECTED' },
      triggeredBy: userId,
    });

    return config;
  }

  /**
   * Disconnect an integration safely
   */
  public static async disconnectProvider(providerId: string, userId?: string) {
    const config = await IntegrationConfigModel.findOne({ providerId });
    if (!config) {
      throw new NotFoundError(`Integration provider '${providerId}' not found.`);
    }

    config.status = IntegrationStatus.DISCONNECTED;
    config.lastActivityAt = new Date();
    await config.save();

    await IntegrationLogModel.create({
      providerId: config.providerId,
      eventType: `${config.providerId}.disconnected`,
      operation: `Disconnected ${config.name}`,
      status: LogStatus.SUCCESS,
      responseData: { status: 'DISCONNECTED' },
      triggeredBy: userId,
    });

    return config;
  }

  /**
   * Runs a real provider-specific health check and test connection
   */
  public static async testConnection(providerId: string, userId?: string) {
    const startTime = Date.now();
    const config = await IntegrationConfigModel.findOne({ providerId });
    if (!config) {
      throw new NotFoundError(`Integration provider '${providerId}' not found.`);
    }

    let isSuccess = false;
    let message = '';
    let details: any = {};

    try {
      const builtInConfigured = config.status === IntegrationStatus.CONFIGURED;
      const hasCredentials = !!config.credentials && Object.keys(config.credentials).length > 0;

      if (!builtInConfigured && config.status === IntegrationStatus.DISCONNECTED && !hasCredentials) {
        isSuccess = false;
        message = `'${config.name}' is not configured. Save connection credentials before testing.`;
        details = { hint: 'Connect the provider first' };
      } else {
        switch (providerId) {
        case 'meta_ads': {
          const { MetaAdsService } = require('./meta-ads.service');
          const campaigns = await MetaAdsService.getCampaigns();
          isSuccess = true;
          message = `Meta Ads Hub verified with ${campaigns.length} campaign(s)`;
          details = {
            campaigns: campaigns.length,
            forms: campaigns.reduce((acc: number, c: any) => acc + (c.forms?.length || 0), 0),
            lastSyncAt: new Date().toISOString(),
          };
          break;
        }

        default: {
          isSuccess = true;
          message = `Health check passed for ${config.name}`;
          break;
        }
        }
      }
    } catch (err: any) {
      isSuccess = false;
      message = err.message || 'Connection test failed';
    }

    const durationMs = Date.now() - startTime;

    config.lastActivityAt = new Date();
    if (isSuccess) {
      config.lastSuccessAt = new Date();
      if (config.status === IntegrationStatus.DISCONNECTED || config.status === IntegrationStatus.FAILED) {
        config.status = IntegrationStatus.CONNECTED;
      }
    } else {
      config.lastErrorAt = new Date();
      config.lastErrorMessage = message;
      config.status = IntegrationStatus.FAILED;
    }
    await config.save();

    // Record activity log
    await IntegrationLogModel.create({
      providerId: config.providerId,
      eventType: `${config.providerId}.health_check`,
      operation: `Test Connection (${config.name})`,
      status: isSuccess ? LogStatus.SUCCESS : LogStatus.FAILED,
      requestData: { providerId },
      responseData: { message, details },
      durationMs,
      errorMessage: isSuccess ? undefined : message,
      triggeredBy: userId,
    });

    return {
      success: isSuccess,
      message,
      details,
      durationMs,
      status: config.status,
    };
  }

  /**
   * Fetch integration activity logs with filters, search, and pagination
   */
  public static async getLogs(query: {
    providerId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.providerId && query.providerId !== 'ALL') {
      filter.providerId = query.providerId;
    }
    if (query.status && query.status !== 'ALL') {
      filter.status = query.status.toUpperCase();
    }
    if (query.search) {
      const reg = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ eventType: reg }, { operation: reg }, { errorMessage: reg }];
    }

    const [logs, total] = await Promise.all([
      IntegrationLogModel.find(filter)
        .populate('triggeredBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      IntegrationLogModel.countDocuments(filter),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retry a failed log operation safely
   */
  public static async retryLog(logId: string, userId?: string) {
    const log = await IntegrationLogModel.findById(logId);
    if (!log) {
      throw new NotFoundError('Activity log not found');
    }

    log.retryCount += 1;
    log.status = LogStatus.RETRYING;
    await log.save();

    // Re-trigger test or event action based on provider
    const result = await this.testConnection(log.providerId, userId);

    log.status = result.success ? LogStatus.SUCCESS : LogStatus.FAILED;
    log.errorMessage = result.success ? undefined : result.message;
    await log.save();

    return {
      log,
      result,
    };
  }
}
