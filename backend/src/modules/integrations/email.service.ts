import fs from 'fs';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { WorkflowTrigger } from './automation-workflow.model';

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface TemplateResult {
  subject: string;
  preheader: string;
  title: string;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  textTwin: string;
}

export class EmailService {
  private static transporter: Transporter | null = null;

  public static getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    if (env.SMTP_HOST && env.SMTP_HOST.trim().length > 0) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            }
          : undefined,
      });
    } else {
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      } as any);
    }

    return this.transporter;
  }

  public static resetTransporter(): void {
    this.transporter = null;
  }

  public static buildHtmlLayout(data: {
    preheader: string;
    title: string;
    badge?: string;
    badgeBg?: string;
    badgeColor?: string;
    bodyHtml: string;
    ctaText?: string;
    ctaUrl?: string;
  }): string {
    const portalUrl = (env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '') + '/portal';
    const ctaUrl = data.ctaUrl || portalUrl;
    const badgeHtml = data.badge
      ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr>
            <td style="background-color:${data.badgeBg || '#EEF4FF'};color:${data.badgeColor || '#0057F8'};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">
              ${escapeHtml(data.badge)}
            </td>
          </tr>
        </table>`
      : '';

    const ctaHtml = data.ctaText
      ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-top:24px;margin-bottom:16px;">
          <tr>
            <td align="center" style="border-radius:6px;background-color:#0057F8;">
              <a href="${escapeHtml(ctaUrl)}" target="_blank" style="font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;background-color:#0057F8;border:1px solid #0057F8;">
                ${escapeHtml(data.ctaText)}
              </a>
            </td>
          </tr>
        </table>`
      : '';

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(data.title)}</title>
  <style type="text/css">
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #F8FAFC; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #0F172A !important; }
      .email-card { background-color: #1E293B !important; border-color: #334155 !important; }
      .email-title { color: #F8FAFC !important; }
      .email-text { color: #CBD5E1 !important; }
      .email-footer { color: #64748B !important; }
      .data-table-td { border-color: #334155 !important; color: #E2E8F0 !important; }
      .data-table-th { background-color: #0F172A !important; color: #94A3B8 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#F8FAFC;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtml(data.preheader)}
  </div>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F8FAFC;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-card" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:20px 32px;border-bottom:2px solid #0057F8;background-color:#FFFFFF;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <a href="${escapeHtml(portalUrl)}" target="_blank" style="text-decoration:none;display:inline-block;">
                      <img src="cid:brand-logo" alt="IIEC Overseas Education" height="40" style="display:block;height:40px;width:auto;max-width:200px;border:0;" />
                    </a>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="font-size:12px;font-weight:600;color:#64748B;letter-spacing:0.5px;text-transform:uppercase;">Student Portal</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px 32px;">
              ${badgeHtml}
              <h1 class="email-title" style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0F172A;line-height:1.4;">
                ${escapeHtml(data.title)}
              </h1>
              <div class="email-text" style="font-size:14px;line-height:1.6;color:#334155;">
                ${data.bodyHtml}
              </div>
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td class="email-footer" style="padding:24px 32px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;line-height:1.5;">
              <p style="margin:0 0 8px 0;">This is an automated notification from IIEC Overseas Education. Please do not reply directly to this email.</p>
              <p style="margin:0;">&copy; ${new Date().getFullYear()} IIEC Overseas Education Services. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  public static renderTemplate(trigger: WorkflowTrigger, payload: Record<string, any>): TemplateResult {
    const studentName = escapeHtml(payload.name || payload.studentName || 'Student');
    const portalUrl = (env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '') + '/portal';
    const loginUrl = (env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '') + '/login';

    switch (trigger) {
      case 'lead.created': {
        const targetCountry = escapeHtml(payload.targetCountry || 'Abroad');
        const targetCourse = escapeHtml(payload.targetCourse || 'your desired program');
        const username = escapeHtml(payload.portalUsername || payload.studentEmail || payload.email || '');
        const tempPassword = payload.portalPassword || payload.password;

        const credentialsHtml = tempPassword
          ? `<div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:20px;margin:24px 0;">
              <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#0F172A;text-transform:uppercase;letter-spacing:0.5px;">Your Student Portal Login Credentials</p>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;color:#334155;">
                <tr><td style="padding:6px 0;color:#64748B;width:140px;">Portal Login:</td><td style="padding:6px 0;"><a href="${loginUrl}" style="color:#0057F8;text-decoration:none;font-weight:600;">${loginUrl}</a></td></tr>
                <tr><td style="padding:6px 0;color:#64748B;">Username / Email:</td><td style="padding:6px 0;font-weight:600;color:#0F172A;">${username}</td></tr>
                <tr><td style="padding:6px 0;color:#64748B;">Temporary Password:</td><td style="padding:6px 0;"><span style="font-family:monospace;font-size:15px;font-weight:700;background-color:#EEF4FF;color:#0057F8;padding:3px 8px;border-radius:4px;border:1px solid #D0E2FF;">${escapeHtml(tempPassword)}</span></td></tr>
              </table>
              <p style="margin:12px 0 0 0;font-size:12px;color:#64748B;">Please log in to your portal to complete your student profile and access all application services.</p>
            </div>`
          : '';

        const credentialsText = tempPassword
          ? `\n\nYour Student Portal Login Credentials:\nPortal Login: ${loginUrl}\nUsername: ${payload.portalUsername || payload.studentEmail || payload.email}\nTemporary Password: ${tempPassword}\n`
          : '';

        return {
          subject: 'Welcome to IIEC Overseas Education',
          preheader: 'Welcome to IIEC! Your student portal login credentials are ready.',
          title: 'Welcome to Your Study Abroad Journey',
          badge: 'Registration Confirmed',
          badgeBg: '#EEF4FF',
          badgeColor: '#0057F8',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>Thank you for connecting with IIEC Overseas Education. We are thrilled to partner with you on your goal of studying ${targetCourse} in ${targetCountry}.</p>
            ${credentialsHtml}
            <p>Your dedicated counsellor will contact you shortly to review your academic aspirations, shortlist top university programs, and assist with document preparation.</p>`,
          ctaText: 'Log In to Student Portal',
          ctaUrl: loginUrl,
          textTwin: `Dear ${studentName},\n\nThank you for connecting with IIEC Overseas Education! We are thrilled to partner with you on your journey to study ${targetCourse} in ${targetCountry}.\n\nYour assigned counsellor will contact you shortly.${credentialsText}\nLog in to your portal at ${loginUrl}\n\nWarm regards,\nIIEC Overseas Education`,
        };
      }

      case 'counselling.scheduled': {
        const date = escapeHtml(payload.scheduledDate || 'Upcoming');
        const time = escapeHtml(payload.scheduledTime || 'Scheduled Time');
        const counsellorName = escapeHtml(payload.counsellorName || 'Your Counsellor');
        const meetLink = payload.googleMeetLink ? escapeHtml(payload.googleMeetLink) : '';
        const meetRow = meetLink
          ? `<tr><td style="padding:8px 0;color:#64748B;">Meeting Link:</td><td style="padding:8px 0;font-weight:600;"><a href="${meetLink}" style="color:#0057F8;text-decoration:none;">${meetLink}</a></td></tr>`
          : '';

        return {
          subject: 'Your Counselling Session is Scheduled',
          preheader: `Your session with ${counsellorName} is confirmed for ${date} at ${time}.`,
          title: 'Preliminary Counselling Session Scheduled',
          badge: 'Session Confirmed',
          badgeBg: '#F0FDF4',
          badgeColor: '#166534',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>Your preliminary counselling session has been scheduled. Here are the session details:</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;font-size:14px;">
              <tr><td style="padding:8px 0;color:#64748B;width:120px;">Counsellor:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${counsellorName}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Date:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${date}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Time:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${time}</td></tr>
              ${meetRow}
            </table>
            <p>Please ensure you are ready with your academic history and questions.</p>`,
          ctaText: meetLink ? 'Join Google Meet' : 'View in Portal',
          ctaUrl: meetLink || portalUrl,
          textTwin: `Dear ${studentName},\n\nYour counselling session with ${counsellorName} is scheduled for ${date} at ${time}.${meetLink ? `\nMeeting link: ${meetLink}` : ''}\n\nView details in your portal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'profile.verified': {
        return {
          subject: 'Profile Evaluation Verified & Completed',
          preheader: 'Your profile evaluation is complete. You can now explore university shortlists.',
          title: 'Profile Evaluation Complete',
          badge: 'Evaluation Verified',
          badgeBg: '#F0FDF4',
          badgeColor: '#166534',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>Great news! Your academic and financial profile evaluation has been signed off and verified by your counselling team.</p>
            <p>Your profile has transitioned to the <strong>University Shortlisting</strong> stage. Log in to your portal to review curated university and course options tailored to your preferences.</p>`,
          ctaText: 'View University Shortlist',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nYour academic and financial profile evaluation has been signed off and verified!\n\nYou can now review your curated university shortlist in your portal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'shortlist.updated': {
        const uni = escapeHtml(payload.universityName || 'University');
        const course = escapeHtml(payload.courseTitle || 'Selected Program');
        const intake = escapeHtml(payload.intake || 'Upcoming');
        return {
          subject: 'New University Shortlisted for Your Profile',
          preheader: `${course} at ${uni} has been added to your shortlist.`,
          title: 'University Shortlist Updated',
          badge: 'Shortlist Updated',
          badgeBg: '#EEF4FF',
          badgeColor: '#0057F8',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>Your counsellor has added a new recommended program to your university shortlist:</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;font-size:14px;">
              <tr><td style="padding:8px 0;color:#64748B;width:120px;">University:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${uni}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Program:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${course}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Intake:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${intake}</td></tr>
            </table>
            <p>Please log in to your portal to review and select your preferred program to initiate applications.</p>`,
          ctaText: 'Review Shortlist',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nA new university program was added to your shortlist: ${course} at ${uni} (${intake}).\n\nReview and confirm your choice in the student portal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'document.requested': {
        const docTitle = escapeHtml(payload.title || 'Required Document');
        const category = escapeHtml(payload.category || 'ACADEMIC');
        const mandatoryText = payload.isMandatory !== false ? 'Mandatory' : 'Optional';
        return {
          subject: `Document Required: ${payload.title || 'Action Required'}`,
          preheader: `Please upload your ${docTitle} to proceed with your application.`,
          title: 'Document Request',
          badge: mandatoryText,
          badgeBg: payload.isMandatory !== false ? '#FEF2F2' : '#F1F5F9',
          badgeColor: payload.isMandatory !== false ? '#991B1B' : '#475569',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>Your admissions counsellor has requested the following document for your application file:</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;font-size:14px;">
              <tr><td style="padding:8px 0;color:#64748B;width:120px;">Document:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${docTitle}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Category:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${category}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Requirement:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${mandatoryText}</td></tr>
            </table>
            <p>Please upload a clear PDF or image scan through the student document portal.</p>`,
          ctaText: 'Upload Document',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nA document has been requested: ${docTitle} (${category}, ${mandatoryText}).\n\nPlease upload it via the student portal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'document.reviewed': {
        const docTitle = escapeHtml(payload.title || 'Document');
        const isApproved = payload.isApproved === true || payload.status === 'SUCCESSFUL' || payload.status === 'APPROVED';
        const statusLabel = isApproved ? 'Approved' : 'Revision Required';
        const reasonHtml = !isApproved && payload.rejectionReason
          ? `<p style="margin-top:12px;padding:12px;background-color:#FEF2F2;border-left:4px solid #DC2626;color:#991B1B;"><strong>Reason:</strong> ${escapeHtml(payload.rejectionReason)}</p>`
          : '';

        return {
          subject: `Document Status Update: ${payload.title || 'Document'} (${statusLabel})`,
          preheader: `Your document ${docTitle} status is now: ${statusLabel}.`,
          title: `Document ${statusLabel}`,
          badge: statusLabel,
          badgeBg: isApproved ? '#F0FDF4' : '#FEF2F2',
          badgeColor: isApproved ? '#166534' : '#991B1B',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>Your uploaded document <strong>${docTitle}</strong> has been reviewed by your counselling team.</p>
            <p>Status: <strong>${statusLabel}</strong></p>
            ${reasonHtml}
            ${!isApproved ? '<p>Please re-upload a revised copy addressing the notes above.</p>' : '<p>Thank you for keeping your documentation up to date.</p>'}`,
          ctaText: 'Open Documents Portal',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nYour document "${docTitle}" review status is: ${statusLabel}.${!isApproved && payload.rejectionReason ? `\nReason: ${payload.rejectionReason}\nPlease re-upload in the portal.` : ''}\n\nPortal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'application.submitted': {
        const uni = escapeHtml(payload.universityName || 'University');
        const course = escapeHtml(payload.courseTitle || 'Program');
        const intake = escapeHtml(payload.intake || 'Upcoming');
        const appNo = payload.applicationNumber ? escapeHtml(payload.applicationNumber) : 'Pending';

        return {
          subject: `Application Submitted: ${payload.universityName || 'University'}`,
          preheader: `Your application for ${course} at ${uni} has been officially submitted.`,
          title: 'Application Successfully Submitted',
          badge: 'Application Submitted',
          badgeBg: '#EEF4FF',
          badgeColor: '#0057F8',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>We are pleased to inform you that your university application has been formally submitted:</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;font-size:14px;">
              <tr><td style="padding:8px 0;color:#64748B;width:140px;">University:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${uni}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Course:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${course}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Intake:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${intake}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Application ID:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${appNo}</td></tr>
            </table>
            <p>Our admissions team will track the status with the university international office.</p>`,
          ctaText: 'Track Application Status',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nYour application for ${course} at ${uni} (${intake}) has been submitted.\nApplication ID: ${appNo}\n\nTrack progress in your portal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'application.rejected': {
        const uni = escapeHtml(payload.universityName || 'University');
        const course = escapeHtml(payload.courseTitle || 'Program');
        const reasonHtml = payload.rejectionReason
          ? `<p style="margin-top:12px;padding:12px;background-color:#FEF2F2;border-left:4px solid #DC2626;color:#991B1B;"><strong>Feedback:</strong> ${escapeHtml(payload.rejectionReason)}</p>`
          : '';

        return {
          subject: `Application Decision Update: ${payload.universityName || 'University'}`,
          preheader: `Update regarding your application for ${course} at ${uni}.`,
          title: 'Application Decision Received',
          badge: 'Decision Received',
          badgeBg: '#FEF2F2',
          badgeColor: '#991B1B',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>We received an update regarding your application for <strong>${course}</strong> at <strong>${uni}</strong>. The university was unable to offer an admission place for this intake.</p>
            ${reasonHtml}
            <p>Do not be discouraged — your counsellor is already preparing alternative university options from your shortlist. Please check your portal to choose the next step.</p>`,
          ctaText: 'Explore Alternative Universities',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nWe received a decision regarding your application for ${course} at ${uni}. The university was unable to issue an offer for this cycle.${payload.rejectionReason ? `\nFeedback: ${payload.rejectionReason}` : ''}\n\nYour counsellor is ready to help you apply to alternative options: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'offer.received':
      case 'offer.issued': {
        const uni = escapeHtml(payload.universityName || 'University');
        const course = escapeHtml(payload.courseTitle || 'Program');
        const offerType = escapeHtml(payload.offerType || 'Official');
        const deposit = payload.depositAmount ? `${escapeHtml(payload.currency || 'USD')} ${escapeHtml(payload.depositAmount)}` : 'N/A';

        return {
          subject: `Congratulations! University Offer Letter Received: ${payload.universityName || 'University'}`,
          preheader: `Congratulations! Your offer letter for ${course} at ${uni} has arrived.`,
          title: 'Offer Letter Received',
          badge: `${offerType} Offer`,
          badgeBg: '#F0FDF4',
          badgeColor: '#166534',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>Congratulations! We are delighted to share that an official admission offer has been issued for you:</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;font-size:14px;">
              <tr><td style="padding:8px 0;color:#64748B;width:140px;">Institution:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${uni}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Program:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${course}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Offer Type:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${offerType}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Tuition Deposit:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${deposit}</td></tr>
            </table>
            <p>Log in to your student portal to download the official offer letter, review acceptance conditions, and upload your signed copy.</p>`,
          ctaText: 'Download & Sign Offer',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nCongratulations! An official offer letter has arrived for ${course} at ${uni} (${offerType} Offer).\nTuition Deposit: ${deposit}\n\nDownload and accept your offer in the portal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'offer.accepted': {
        return {
          subject: 'Signed Offer Letter Approved & Confirmed',
          preheader: 'Your signed acceptance has been verified by your counsellor.',
          title: 'Offer Acceptance Confirmed',
          badge: 'Offer Accepted',
          badgeBg: '#F0FDF4',
          badgeColor: '#166534',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>Your counsellor has reviewed and approved your signed offer letter acceptance.</p>
            <p>Your application is now ready for fee deposit processing and visa documentation.</p>`,
          ctaText: 'Proceed to Fee Payment',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nYour signed offer acceptance has been approved by your counsellor!\nNext step: Fee Payment & Visa Filing.\n\nPortal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'offer.rejected': {
        const reasonHtml = payload.rejectionReason
          ? `<p style="margin-top:12px;padding:12px;background-color:#FEF2F2;border-left:4px solid #DC2626;color:#991B1B;"><strong>Reason:</strong> ${escapeHtml(payload.rejectionReason)}</p>`
          : '';

        return {
          subject: 'Action Required: Signed Offer Letter Revision',
          preheader: 'Your signed offer letter submission requires revision.',
          title: 'Offer Acceptance Needs Revision',
          badge: 'Revision Required',
          badgeBg: '#FEF2F2',
          badgeColor: '#991B1B',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>Your counsellor reviewed your uploaded signed offer letter and noted that corrections are required.</p>
            ${reasonHtml}
            <p>Please re-sign and upload a clear document to finalize your university acceptance.</p>`,
          ctaText: 'Re-upload Signed Offer',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nYour signed offer letter acceptance requires revision.${payload.rejectionReason ? `\nReason: ${payload.rejectionReason}` : ''}\n\nPlease re-upload via the portal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'payment.requested': {
        const title = escapeHtml(payload.title || 'Tuition Deposit');
        const amount = payload.amount ? `${escapeHtml(payload.currency || 'USD')} ${escapeHtml(payload.amount)}` : 'Amount Pending';
        const dueDate = payload.dueDate ? escapeHtml(new Date(payload.dueDate).toLocaleDateString()) : 'Immediate';

        return {
          subject: `Payment Request: ${payload.title || 'Fee Payment'}`,
          preheader: `Payment request for ${amount} has been generated. Due date: ${dueDate}.`,
          title: 'Fee Payment Request',
          badge: 'Payment Due',
          badgeBg: '#FEF3C7',
          badgeColor: '#92400E',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>A fee payment request has been generated for your university admissions process:</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;font-size:14px;">
              <tr><td style="padding:8px 0;color:#64748B;width:120px;">Payment:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${title}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Amount Due:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${amount}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Due Date:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${dueDate}</td></tr>
            </table>
            <p>Please log in to your portal to view official bank transfer instructions and upload payment proof.</p>`,
          ctaText: 'View Payment Details',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nA fee payment request has been generated: ${title} (${amount}, Due: ${dueDate}).\n\nView bank details and upload receipt: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'payment.success': {
        const amount = payload.amount ? `${escapeHtml(payload.currency || 'USD')} ${escapeHtml(payload.amount)}` : '';
        const title = escapeHtml(payload.title || 'Tuition Deposit');
        return {
          subject: 'Payment Confirmation & Official Receipt',
          preheader: `Your fee payment of ${amount} has been verified successfully.`,
          title: 'Payment Verified & Receipt Issued',
          badge: 'Payment Verified',
          badgeBg: '#F0FDF4',
          badgeColor: '#166534',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>Your payment for <strong>${title}</strong> (${amount}) has been successfully verified by our finance team.</p>
            <p>An official CRM receipt has been recorded. Your admission file will now move forward to visa filing and CAS/I-20 issuance.</p>`,
          ctaText: 'Download Official Receipt',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nYour fee payment for ${title} (${amount}) has been verified successfully!\n\nView and download your official receipt in the portal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'visa.updated': {
        const status = escapeHtml(payload.status || 'PENDING');
        const isApproved = status === 'APPROVED';
        const badgeColor = isApproved ? '#166534' : status === 'REJECTED' ? '#991B1B' : '#0057F8';
        const badgeBg = isApproved ? '#F0FDF4' : status === 'REJECTED' ? '#FEF2F2' : '#EEF4FF';
        const reasonHtml = status === 'REJECTED' && payload.rejectionReason
          ? `<p style="margin-top:12px;padding:12px;background-color:#FEF2F2;border-left:4px solid #DC2626;color:#991B1B;"><strong>Refusal Reason:</strong> ${escapeHtml(payload.rejectionReason)}</p>`
          : '';

        return {
          subject: `Visa Status Update: ${status}`,
          preheader: `Your visa application status is now ${status}.`,
          title: `Visa Application ${status}`,
          badge: `Visa ${status}`,
          badgeBg,
          badgeColor,
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>An update has been recorded for your student visa application:</p>
            <p style="font-size:16px;">Current Status: <strong>${status}</strong></p>
            ${reasonHtml}
            ${isApproved ? '<p>Congratulations! You are now cleared for pre-departure briefings and travel arrangements.</p>' : '<p>Please contact your visa counsellor immediately to discuss the next steps.</p>'}`,
          ctaText: 'View Visa Status in Portal',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nYour visa application status update: ${status}.${status === 'REJECTED' && payload.rejectionReason ? `\nRefusal Reason: ${payload.rejectionReason}` : ''}\n\nView details: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'travel.updated': {
        return {
          subject: 'Pre-Departure Travel & Accommodation Details Updated',
          preheader: 'Your flight, accommodation, or insurance details were updated.',
          title: 'Travel Support Details Updated',
          badge: 'Travel Updated',
          badgeBg: '#EEF4FF',
          badgeColor: '#0057F8',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>Your pre-departure arrangements (flight booking, overseas accommodation, or travel insurance) have been updated in your file.</p>
            <p>Please review your confirmed bookings and emergency contacts in the student portal.</p>`,
          ctaText: 'View Travel Checklist',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nYour pre-departure travel and accommodation arrangements have been updated.\n\nReview your checklist in the portal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'departure.recorded': {
        const depDate = payload.departureDate ? escapeHtml(new Date(payload.departureDate).toLocaleDateString()) : 'Upcoming';
        return {
          subject: 'Bon Voyage! Departure Confirmed',
          preheader: `Your departure date has been recorded for ${depDate}.`,
          title: 'Departure Confirmed - Safe Travels!',
          badge: 'Departed',
          badgeBg: '#F0FDF4',
          badgeColor: '#166534',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>Your departure date has been confirmed for <strong>${depDate}</strong>.</p>
            <p>The entire team at IIEC wishes you a safe flight and tremendous success in your overseas studies!</p>
            <p>Remember to keep your travel documents, passport, and university offer letter in your hand luggage.</p>`,
          ctaText: 'Access Student Portal',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nBon Voyage! Your departure date is recorded for ${depDate}.\nKeep your documents handy and have a safe journey!\n\nPortal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'arrival.confirmed': {
        const arrDate = payload.arrivalDate ? escapeHtml(new Date(payload.arrivalDate).toLocaleDateString()) : 'Confirmed';
        return {
          subject: 'Welcome to Your Study Destination! Arrival Confirmed',
          preheader: 'Welcome! Your arrival has been confirmed.',
          title: 'Arrival Confirmed - Welcome!',
          badge: 'Arrival Confirmed',
          badgeBg: '#F0FDF4',
          badgeColor: '#166534',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>Welcome to your host country! Your arrival has been confirmed on <strong>${arrDate}</strong>.</p>
            <p>Please remember to complete your university on-campus registration and collect your student ID.</p>`,
          ctaText: 'Access Student Portal',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nWelcome to your study destination! Your arrival on ${arrDate} is confirmed.\n\nPortal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      case 'orientation.invited': {
        const sessionDate = payload.sessionDate ? escapeHtml(new Date(payload.sessionDate).toLocaleDateString()) : 'Upcoming';
        const sessionTime = escapeHtml(payload.sessionTime || 'TBA');
        const title = escapeHtml(payload.title || 'Pre-Departure Briefing');
        const meetLink = payload.googleMeetLink ? escapeHtml(payload.googleMeetLink) : '';
        const venue = payload.venue ? escapeHtml(payload.venue) : '';

        return {
          subject: `Invitation: ${payload.title || 'Pre-Departure Orientation Session'}`,
          preheader: `You are invited to ${title} on ${sessionDate} at ${sessionTime}.`,
          title: 'Pre-Departure Orientation Invitation',
          badge: 'Orientation Invite',
          badgeBg: '#EEF4FF',
          badgeColor: '#0057F8',
          bodyHtml: `<p>Dear ${studentName},</p>
            <p>You are cordially invited to attend an essential pre-departure orientation briefing:</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;font-size:14px;">
              <tr><td style="padding:8px 0;color:#64748B;width:120px;">Session:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${title}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Date:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${sessionDate}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">Time:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${sessionTime}</td></tr>
              ${venue ? `<tr><td style="padding:8px 0;color:#64748B;">Venue:</td><td style="padding:8px 0;font-weight:600;color:#0F172A;">${venue}</td></tr>` : ''}
              ${meetLink ? `<tr><td style="padding:8px 0;color:#64748B;">Online Link:</td><td style="padding:8px 0;font-weight:600;"><a href="${meetLink}" style="color:#0057F8;">${meetLink}</a></td></tr>` : ''}
            </table>
            <p>Our senior advisors will cover immigration procedures, accommodation check-in, banking, and cultural adaptation.</p>`,
          ctaText: meetLink ? 'Join Online Session' : 'View Session in Portal',
          ctaUrl: meetLink || portalUrl,
          textTwin: `Dear ${studentName},\n\nYou are invited to ${title} on ${sessionDate} at ${sessionTime}.${venue ? `\nVenue: ${venue}` : ''}${meetLink ? `\nLink: ${meetLink}` : ''}\n\nPortal: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }

      default: {
        return {
          subject: `Notification: ${trigger}`,
          preheader: 'Update regarding your overseas education profile.',
          title: 'Update on Your Profile',
          bodyHtml: `<p>Dear ${studentName},</p><p>There has been an update regarding your profile. Please check your student portal.</p>`,
          ctaText: 'Access Student Portal',
          ctaUrl: portalUrl,
          textTwin: `Dear ${studentName},\n\nThere has been an update regarding your profile: ${portalUrl}\n\nIIEC Overseas Education`,
        };
      }
    }
  }

  public static async sendLifecycleEmail(
    trigger: WorkflowTrigger,
    payload: Record<string, any>,
    config?: Record<string, any>
  ): Promise<{ success: boolean; errorMessage?: string; durationMs: number; messageId?: string }> {
    const startTime = Date.now();
    try {
      const recipient = payload.studentEmail || payload.email;
      if (!recipient || typeof recipient !== 'string' || !recipient.includes('@')) {
        return {
          success: false,
          errorMessage: 'No valid student recipient email address provided in payload',
          durationMs: Date.now() - startTime,
        };
      }

      const templateResult = this.renderTemplate(trigger, payload);
      const subject = config?.subject || templateResult.subject;
      const html = this.buildHtmlLayout({
        preheader: templateResult.preheader,
        title: templateResult.title,
        badge: templateResult.badge,
        badgeBg: templateResult.badgeBg,
        badgeColor: templateResult.badgeColor,
        bodyHtml: templateResult.bodyHtml,
        ctaText: templateResult.ctaText,
        ctaUrl: templateResult.ctaUrl,
      });

      const attachments: any[] = [];
      const possibleLogoPaths = [
        path.resolve(__dirname, '../../assets/logo.png'),
        path.resolve(__dirname, '../../../../frontend/public/logo.png'),
        path.resolve(process.cwd(), 'src/assets/logo.png'),
        path.resolve(process.cwd(), '../frontend/public/logo.png'),
      ];
      for (const p of possibleLogoPaths) {
        if (fs.existsSync(p)) {
          attachments.push({
            filename: 'logo.png',
            path: p,
            cid: 'brand-logo',
          });
          break;
        }
      }

      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: env.EMAIL_FROM || 'IIEC Admissions <admissions@iiec.edu>',
        to: recipient,
        subject,
        html,
        text: templateResult.textTwin,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      return {
        success: true,
        durationMs: Date.now() - startTime,
        messageId: info.messageId || `msg_${Date.now()}`,
      };
    } catch (err: any) {
      return {
        success: false,
        errorMessage: err?.message || 'Failed to dispatch email',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
