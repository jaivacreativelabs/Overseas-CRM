import { Request, Response, NextFunction } from 'express';
import { LeadService } from './lead.service';
import { ApiResponse } from '../../utils/api-response';
import { LeadSource, LeadStatus, StudentStage, UserRole } from '../../config/constants';

export class LeadController {
  static async getLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
      const search = req.query.search as string;
      const status = req.query.status as LeadStatus;
      const stage = req.query.stage as StudentStage;
      const source = req.query.source as LeadSource;
      const counsellorId = req.query.counsellorId as string;
      const targetCountry = req.query.targetCountry as string;
      const isArchived = req.query.isArchived === 'true';
      const isStudent = req.query.isStudent !== undefined ? req.query.isStudent === 'true' : undefined;

      const result = await LeadService.getLeads({
        page,
        limit,
        search,
        status,
        stage,
        source,
        counsellorId,
        targetCountry,
        isArchived,
        isStudent,
      });

      return ApiResponse.success(res, 'Leads retrieved successfully', result.leads, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getLeadById(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await LeadService.getLeadById(req.params.id);
      return ApiResponse.success(res, 'Lead retrieved successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  static async createLead(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await LeadService.createLead({
        ...req.body,
        actorUserId: req.user?.userId,
        actorName: (req as any).user?.email || 'System',
        actorRole: req.user?.role,
      });
      return ApiResponse.created(res, 'Lead created successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  static async updateLead(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await LeadService.updateLead(
        req.params.id,
        req.body,
        req.user?.userId,
        (req as any).user?.email || 'System',
        req.user?.role
      );
      return ApiResponse.success(res, 'Lead updated successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  static async recordContactAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const contactAttempt = await LeadService.recordContactAttempt(
        req.params.id,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.created(res, 'Contact attempt recorded', contactAttempt);
    } catch (error) {
      next(error);
    }
  }

  static async scheduleCounselling(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await LeadService.scheduleCounselling(
        req.params.id,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.created(res, 'Counselling scheduled successfully', session);
    } catch (error) {
      next(error);
    }
  }

  static async updateCounsellingAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await LeadService.updateCounsellingAttendance(
        req.params.id,
        req.params.sessionId,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Counselling attendance updated', session);
    } catch (error) {
      next(error);
    }
  }

  static async convertToInterested(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LeadService.convertToInterested(
        req.params.id,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Lead marked as Interested and student account provisioned', result);
    } catch (error) {
      next(error);
    }
  }

  static async markClosedLost(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await LeadService.markClosedLost(
        req.params.id,
        req.body.reason,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Lead marked as Closed Lost', lead);
    } catch (error) {
      next(error);
    }
  }

  static async reopenClosedLost(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await LeadService.reopenClosedLost(
        req.params.id,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Closed Lost lead reopened successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  static async archiveLead(req: Request, res: Response, next: NextFunction) {
    try {
      await LeadService.archiveLead(req.params.id, req.user!.userId, req.user!.role);
      return ApiResponse.success(res, 'Lead archived successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteLead(req: Request, res: Response, next: NextFunction) {
    try {
      await LeadService.deleteLead(req.params.id, req.user!.userId, req.user!.role);
      return ApiResponse.success(res, 'Lead permanently deleted');
    } catch (error) {
      next(error);
    }
  }

  static async downloadAllDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const leadId = req.params.id;
      const lead = await LeadService.getLeadById(leadId);
      if (!lead) return ApiResponse.error(res, 'Student record not found', 404);

      // Concurrently fetch all associated student data
      const [profile, shortlists, applications, offers, documents] = await Promise.all([
        require('../profile-evaluation/profile-evaluation.model').ProfileEvaluationModel.findOne({ leadId: lead._id }).lean(),
        require('../universities/university.model').ShortlistModel.find({ leadId: lead._id }).populate('universityId').populate('courseId').lean(),
        require('../applications/application.model').ApplicationModel.find({ leadId: lead._id }).populate('universityId').populate('courseId').lean(),
        require('../offers/offer.model').OfferModel.find({ leadId: lead._id }).lean(),
        require('../documents/document.model').DocumentModel.find({ leadId: lead._id }).lean(),
      ]);

      const selectedShortlist = shortlists.find((s: any) => s.status === 'SELECTED_BY_STUDENT') || shortlists[0];
      const selectedUniv = selectedShortlist?.universityId || {};
      const selectedCourse = selectedShortlist?.courseId || {};

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Student Dossier - ${lead.name}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 40px; margin: 0; }
    .container { max-width: 900px; margin: auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0057f8; padding-bottom: 20px; margin-bottom: 30px; }
    .brand { font-size: 22px; font-weight: 800; color: #0057f8; letter-spacing: -0.5px; }
    .badge { display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 700; border-radius: 20px; background: #e0edff; color: #0057f8; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .field { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9; }
    .field label { display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
    .field value { font-size: 14px; font-weight: 600; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 12px; color: #475569; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .status-badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .status-submitted { background: #fef3c7; color: #d97706; }
    .status-offer { background: #dcfce7; color: #15803d; }
    .status-rejected { background: #fee2e2; color: #b91c1c; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="brand">JAIVA OVERSEAS EDUCATION CRM</div>
        <div style="font-size: 13px; color: #64748b;">Official Student Dossier & Application Record</div>
      </div>
      <div>
        <span class="badge">Stage: ${lead.stage?.replace(/_/g, ' ')}</span>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Generated: ${new Date().toLocaleString()}</div>
      </div>
    </div>

    <!-- Student Profile -->
    <div class="section">
      <div class="section-title">1. Student Profile & Contact Information</div>
      <div class="grid-3">
        <div class="field"><label>Full Name</label><div class="value">${lead.name}</div></div>
        <div class="field"><label>Email Address</label><div class="value">${lead.email}</div></div>
        <div class="field"><label>Phone Number</label><div class="value">${lead.phone}</div></div>
        <div class="field"><label>Target Country</label><div class="value">${lead.targetCountry || 'N/A'}</div></div>
        <div class="field"><label>Target Intake</label><div class="value">${lead.targetIntake || 'N/A'}</div></div>
        <div class="field"><label>Passport Number</label><div class="value">${lead.passportNumber || 'N/A'}</div></div>
      </div>
    </div>

    <!-- Profile Evaluation -->
    ${profile ? `
    <div class="section">
      <div class="section-title">2. Academic Profile & Eligibility Evaluation</div>
      <div class="grid-3">
        <div class="field"><label>Highest Qualification</label><div class="value">${profile.highestQualification || 'N/A'}</div></div>
        <div class="field"><label>Institution</label><div class="value">${profile.institution || 'N/A'}</div></div>
        <div class="field"><label>GPA / Percentage</label><div class="value">${profile.percentageGpa || 'N/A'}</div></div>
        <div class="field"><label>Passing Year</label><div class="value">${profile.yearOfPassing || 'N/A'}</div></div>
        <div class="field"><label>Backlogs Count</label><div class="value">${profile.backlogsCount || 0}</div></div>
        <div class="field"><label>English Proficiency Test</label><div class="value">${profile.testScore?.testType || 'N/A'} (Overall: ${profile.testScore?.overall || 'N/A'})</div></div>
      </div>
    </div>` : ''}

    <!-- Selected University & Course Specifications -->
    <div class="section">
      <div class="section-title">3. Selected University & Course Specification</div>
      ${selectedShortlist ? `
      <div class="grid-2" style="margin-bottom: 12px;">
        <div class="field"><label>University Name</label><div class="value">${selectedShortlist.universityName}</div></div>
        <div class="field"><label>Course Title</label><div class="value">${selectedShortlist.courseTitle}</div></div>
        <div class="field"><label>Country & Location</label><div class="value">${selectedShortlist.country} ${selectedUniv.city ? `(${selectedUniv.city})` : ''}</div></div>
        <div class="field"><label>Intake & Duration</label><div class="value">${selectedShortlist.intake} ${selectedCourse.durationMonths ? `(${selectedCourse.durationMonths} Months)` : ''}</div></div>
        <div class="field"><label>Tuition Fee</label><div class="value">${selectedShortlist.currency || 'USD'} ${selectedShortlist.annualFee || selectedCourse.annualFee || 'N/A'} / Year</div></div>
        <div class="field"><label>Application Fee</label><div class="value">${selectedCourse.applicationFee ? `${selectedShortlist.currency || 'USD'} ${selectedCourse.applicationFee}` : 'Waived / None'}</div></div>
      </div>

      <div class="grid-2">
        <div class="field"><label>Academic Prerequisites</label><div class="value" style="font-size: 12px;">${selectedCourse.academicRequirements || 'Standard Bachelor/Master Entry Criteria'}</div></div>
        <div class="field"><label>English Proficiency Requirement</label><div class="value" style="font-size: 12px;">${selectedCourse.englishRequirements || 'IELTS 6.5 Overall (min 6.0 in each band) or equivalent'}</div></div>
        <div class="field"><label>Scholarship Information</label><div class="value" style="font-size: 12px;">${selectedCourse.scholarshipInfo || selectedUniv.scholarshipInfo || 'Merit-based international scholarships available upon application.'}</div></div>
        <div class="field"><label>Accommodation Details</label><div class="value" style="font-size: 12px;">${selectedCourse.accommodationInfo || selectedUniv.accommodationInfo || 'On-campus university dormitories & off-campus private student halls.'}</div></div>
      </div>
      ` : '<div style="color: #64748b;">No university selection confirmed yet.</div>'}
    </div>

    <!-- Application Lifecycle & History -->
    <div class="section">
      <div class="section-title">4. Application History & Pipeline Status</div>
      <table>
        <thead>
          <tr>
            <th>Application #</th>
            <th>University</th>
            <th>Course</th>
            <th>Submission Date</th>
            <th>Status</th>
            <th>Rejection / Notes</th>
          </tr>
        </thead>
        <tbody>
          ${applications.length === 0 ? '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No applications submitted yet.</td></tr>' : 
            applications.map((app: any) => `
            <tr>
              <td><strong>${app.applicationNumber || 'N/A'}</strong></td>
              <td>${app.universityName}</td>
              <td>${app.courseTitle}</td>
              <td>${new Date(app.submissionDate).toLocaleDateString()}</td>
              <td><span class="status-badge ${app.status === 'REJECTED' ? 'status-rejected' : app.status === 'OFFER_RECEIVED' ? 'status-offer' : 'status-submitted'}">${app.status}</span></td>
              <td>${app.rejectionReason || app.notes || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Offers & Acceptances -->
    <div class="section">
      <div class="section-title">5. Official Offers & Signed Acceptances</div>
      <table>
        <thead>
          <tr>
            <th>University</th>
            <th>Offer Type</th>
            <th>Tuition & Deposit</th>
            <th>Original Offer Letter</th>
            <th>Signed Offer Letter</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${offers.length === 0 ? '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No offer letters issued yet.</td></tr>' :
            offers.map((off: any) => `
            <tr>
              <td>${off.universityName}</td>
              <td>${off.offerType}</td>
              <td>${off.currency} ${off.tuitionFee} (Deposit: ${off.depositAmount})</td>
              <td>${off.originalOfferUrl ? `<a href="${off.originalOfferUrl}" target="_blank">View Original (${off.originalOfferFileName})</a>` : 'N/A'}</td>
              <td>${off.signedOfferUrl ? `<a href="${off.signedOfferUrl}" target="_blank" style="color:#15803d; font-weight:bold;">View Signed (${off.signedOfferFileName || 'Signed Copy'})</a>` : '<span style="color:#94a3b8;">Pending Signature</span>'}</td>
              <td><span class="status-badge status-offer">${off.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Uploaded Documents Checklist -->
    <div class="section">
      <div class="section-title">6. Student Document Checklist</div>
      <table>
        <thead>
          <tr>
            <th>Document Title</th>
            <th>Category</th>
            <th>Mandatory</th>
            <th>Status</th>
            <th>File Attachment</th>
          </tr>
        </thead>
        <tbody>
          ${documents.length === 0 ? '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No document checklist generated yet.</td></tr>' :
            documents.map((doc: any) => `
            <tr>
              <td><strong>${doc.title}</strong></td>
              <td>${doc.category}</td>
              <td>${doc.isMandatory ? 'Yes' : 'No'}</td>
              <td><span class="status-badge ${doc.status === 'APPROVED' ? 'status-offer' : doc.status === 'REJECTED' ? 'status-rejected' : 'status-submitted'}">${doc.status}</span></td>
              <td>${doc.fileUrl ? `<a href="${doc.fileUrl}" target="_blank">${doc.originalFileName || 'View File'}</a>` : 'Not Uploaded'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      This is an official document generated by Jaiva Overseas Education CRM System.<br/>
      Confidential student record for internal university filing and compliance.
    </div>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Student_Dossier_${lead.name.replace(/\s+/g, '_')}.html"`);
      return res.send(html);
    } catch (error) {
      next(error);
    }
  }
}
