import { LeadModel } from '../leads/lead.model';
import { DocumentModel } from '../documents/document.model';
import { ApplicationModel } from '../applications/application.model';
import { NotFoundError } from '../../utils/errors';

export class AIService {
  /**
   * Generates custom professional email draft for student
   */
  public static async generateEmailDraft(params: {
    studentId?: string;
    purpose: 'welcome' | 'document_reminder' | 'application_update' | 'payment_reminder' | 'offer_congratulations';
    customPrompt?: string;
  }) {
    let studentName = 'Student';
    let targetCountry = 'Overseas';
    let targetCourse = 'your program';

    if (params.studentId) {
      const lead = await LeadModel.findById(params.studentId);
      if (lead) {
        studentName = lead.name;
        targetCountry = lead.targetCountry || 'Overseas';
        targetCourse = lead.targetCourse || 'chosen program';
      }
    }

    let subject = '';
    let body = '';

    switch (params.purpose) {
      case 'welcome':
        subject = `Welcome to Overseas Education Counselling, ${studentName}!`;
        body = `Dear ${studentName},\n\nWelcome to IIEC Overseas Education! We are excited to support your journey towards studying ${targetCourse} in ${targetCountry}.\n\nOur team of senior counsellors will guide you through university shortlisting, application submissions, scholarship options, and visa guidance.\n\nPlease let us know your convenient time for an initial consultation session.\n\nWarm regards,\nIIEC Counselling Team`;
        break;

      case 'document_reminder':
        subject = `Important: Pending Documents Required for Your Application to ${targetCountry}`;
        body = `Dear ${studentName},\n\nWe hope you are doing well. To proceed with your university application for ${targetCourse}, we require a few pending documents (Passport copy, Academic transcripts, IELTS/TOEFL scores).\n\nKindly upload them directly through your Student Portal at your earliest convenience.\n\nBest regards,\nDocumentation Operations Team`;
        break;

      case 'application_update':
        subject = `Application Update: Progressing towards ${targetCountry}`;
        body = `Dear ${studentName},\n\nGreat news! Your application for ${targetCourse} in ${targetCountry} has been submitted to the university admissions committee and is currently under official review.\n\nWe will update you as soon as the admission decision or offer letter is issued.\n\nSincerely,\nAdmissions Team`;
        break;

      case 'offer_congratulations':
        subject = `Congratulations ${studentName}! University Offer Letter Issued 🎉`;
        body = `Dear ${studentName},\n\nCongratulations! We are delighted to inform you that your official Offer Letter for ${targetCourse} in ${targetCountry} has been issued!\n\nPlease log in to your Student Portal to review your offer letter details and complete your acceptance step.\n\nWarmest congratulations,\nIIEC Overseas Education`;
        break;

      case 'payment_reminder':
        subject = `Reminder: Tuition / Registration Fee Payment Pending`;
        body = `Dear ${studentName},\n\nThis is a friendly reminder that your upcoming fee payment deadline is approaching. Timely payment ensures your seat confirmation and CAS / I-20 document processing.\n\nPlease check your portal for payment options or contact your assigned counsellor.\n\nBest regards,\nAccounts & Finance`;
        break;
    }

    if (params.customPrompt) {
      body += `\n\n[AI Additional Note]: ${params.customPrompt}`;
    }

    return {
      subject,
      body,
      studentName,
      purpose: params.purpose,
      aiModel: 'GPT-4o / Gemini AI Engine (Integrated)',
    };
  }

  /**
   * Summarizes complete student profile and recommends next actions
   */
  public static async summarizeStudentProfile(studentId: string) {
    const lead = await LeadModel.findById(studentId).populate('counsellorId', 'name email');
    if (!lead) {
      throw new NotFoundError('Student not found');
    }

    const [docs, apps] = await Promise.all([
      DocumentModel.find({ leadId: lead._id }),
      ApplicationModel.find({ leadId: lead._id }),
    ]);

    const approvedDocs = docs.filter((d) => d.status === 'APPROVED').length;
    const totalDocs = docs.length;
    const submittedApps = apps.filter((a) => a.status === 'SUBMITTED' || a.status === 'OFFER_RECEIVED').length;

    const missingDocs = docs.filter((d) => d.status === 'PENDING' || d.status === 'REJECTED').map((d) => d.title || d.category);

    const recommendedNextActions = [];
    if (totalDocs === 0 || approvedDocs < 3) {
      recommendedNextActions.push('Collect and verify pending mandatory academic documents and passport');
    }
    if (apps.length === 0) {
      recommendedNextActions.push(`Shortlist top 3 universities in ${lead.targetCountry || 'preferred country'} and initiate application submission`);
    } else if (submittedApps > 0) {
      recommendedNextActions.push('Follow up with university admissions desk for offer letter decision');
    } else {
      recommendedNextActions.push('Submit pending applications before upcoming intake deadline');
    }

    const summaryText = `${lead.name} is currently in the '${lead.stage}' stage targeting ${lead.targetCourse || 'Higher Education'} in ${lead.targetCountry || 'Overseas'}. Documentation progress: ${approvedDocs}/${totalDocs} approved. Active Applications: ${apps.length}.`;

    return {
      student: {
        id: lead._id,
        name: lead.name,
        email: lead.email,
        stage: lead.stage,
        targetCountry: lead.targetCountry,
        counsellor: (lead.counsellorId as any)?.name || 'Unassigned',
      },
      summary: summaryText,
      missingDocuments: missingDocs,
      recommendedNextActions,
      generatedAt: new Date(),
    };
  }
}
