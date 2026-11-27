import { env } from '../../config/env';
import { WorkflowTrigger } from './automation-workflow.model';

export interface WhatsAppTemplateMessage {
  templateName: string;
  languageCode: string;
  bodyParams: string[];
}

export interface WhatsAppSendResult {
  success: boolean;
  skipped?: boolean;
  to?: string;
  messageId?: string;
  errorMessage?: string;
  durationMs: number;
  request?: Record<string, any>;
}

/**
 * Sends WhatsApp template messages through the Meta WhatsApp Cloud API.
 * Business-initiated messages must use a template approved in WhatsApp Manager.
 */
export class WhatsAppService {
  public static isConfigured(): boolean {
    return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
  }

  /**
   * Converts a stored phone number into the digits-only international format
   * the Cloud API expects (e.g. "098765 43210" -> "919876543210").
   */
  public static normalizePhone(raw?: string | null): string | null {
    if (!raw) return null;
    let digits = String(raw).replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = `${env.WHATSAPP_DEFAULT_COUNTRY_CODE}${digits}`;
    return digits.length >= 11 && digits.length <= 15 ? digits : null;
  }

  /**
   * Picks the template and its {{1}}, {{2}}... values for a lifecycle trigger.
   */
  public static buildMessage(
    trigger: WorkflowTrigger,
    payload: Record<string, any>,
    config: Record<string, any> = {}
  ): WhatsAppTemplateMessage | null {
    const portalUrl = `${env.FRONTEND_URL.replace(/\/+$/, '')}/portal`;
    const studentName = payload.name || payload.studentName || 'Student';

    if (trigger === 'document.requested') {
      const templateName = env.WHATSAPP_TEMPLATE_DOCUMENT_REQUESTED || config.templateName || 'hello_world';
      // Meta's built-in sample template takes no variables and only exists in en_US.
      if (templateName === 'hello_world') {
        return { templateName, languageCode: 'en_US', bodyParams: [] };
      }
      return {
        templateName,
        languageCode: env.WHATSAPP_TEMPLATE_LANGUAGE,
        // Template body must use {{1}} = student name, {{2}} = document, {{3}} = portal link
        bodyParams: [studentName, payload.title || 'Required document', portalUrl],
      };
    }

    if (!config.templateName) return null;
    return {
      templateName: config.templateName,
      languageCode: config.languageCode || env.WHATSAPP_TEMPLATE_LANGUAGE,
      bodyParams: Array.isArray(config.bodyParams) ? config.bodyParams.map(String) : [],
    };
  }

  public static async sendTemplate(rawPhone: string | undefined, message: WhatsAppTemplateMessage): Promise<WhatsAppSendResult> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      return {
        success: false,
        skipped: true,
        errorMessage: 'WhatsApp is not configured (set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID).',
        durationMs: 0,
      };
    }

    const to = this.normalizePhone(rawPhone);
    if (!to) {
      return {
        success: false,
        skipped: true,
        errorMessage: `No valid phone number for WhatsApp (got "${rawPhone ?? ''}").`,
        durationMs: 0,
      };
    }

    const template: Record<string, any> = {
      name: message.templateName,
      language: { code: message.languageCode },
    };
    if (message.bodyParams.length > 0) {
      template.components = [
        {
          type: 'body',
          parameters: message.bodyParams.map((text) => ({ type: 'text', text })),
        },
      ];
    }
    const body = { messaging_product: 'whatsapp', to, type: 'template', template };

    if (env.WHATSAPP_DRY_RUN) {
      return { success: true, skipped: true, to, messageId: 'dry-run', durationMs: 0, request: body };
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      const data: any = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        const code = data.error?.code ? ` (code ${data.error.code})` : '';
        return {
          success: false,
          to,
          errorMessage: `${data.error?.message || `HTTP ${res.status}`}${code}`,
          durationMs: Date.now() - startTime,
          request: body,
        };
      }

      return {
        success: true,
        to,
        messageId: data.messages?.[0]?.id,
        durationMs: Date.now() - startTime,
        request: body,
      };
    } catch (err: any) {
      return {
        success: false,
        to,
        errorMessage: err?.message || 'WhatsApp request failed',
        durationMs: Date.now() - startTime,
        request: body,
      };
    }
  }
}
