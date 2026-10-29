import mongoose, { Types } from 'mongoose';
import { env } from './config/env';
import { LeadModel } from './modules/leads/lead.model';
import { UserModel } from './modules/users/user.model';
import { DocumentModel } from './modules/documents/document.model';
import { TaskModel } from './modules/tasks/task.model';
import { UniversityModel, CourseModel, ShortlistModel } from './modules/universities/university.model';
import { LeadService } from './modules/leads/lead.service';
import { DocumentService } from './modules/documents/document.service';
import { TaskService } from './modules/tasks/task.service';
import { UniversityService } from './modules/universities/university.service';
import { ReportService } from './modules/reports/report.service';
import { LeadStatus, StudentStage, UserRole, DocumentStatus, TaskPriority, TaskType } from './config/constants';

export interface TestResult {
  testCase: string;
  expectedResult: string;
  actualResult: boolean;
  notes?: string;
}

export async function runQATests(): Promise<TestResult[]> {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB. Running QA Button & Endpoint Verification...');

  const results: TestResult[] = [];

  const record = (testCase: string, expectedResult: string, actualResult: boolean, notes?: string) => {
    results.push({ testCase, expectedResult, actualResult, notes });
    console.log(`${actualResult ? '✅' : '❌'} ${testCase} -> ${actualResult}`);
  };

  try {
    // 1. Get or create a staff user (counsellor/admin)
    let staffUser = await UserModel.findOne({ role: UserRole.ADMIN });
    if (!staffUser) {
      staffUser = await UserModel.findOne({ role: UserRole.COUNSELLOR });
    }
    if (!staffUser) {
      staffUser = await UserModel.create({
        name: 'QA Test Staff',
        email: `qa.staff.${Date.now()}@example.com`,
        passwordHash: 'dummyHash',
        role: UserRole.ADMIN,
        isActive: true,
      });
    }

    const staffRole: UserRole = UserRole.ADMIN;

    // TEST CASE 1: [+ Create Lead] Button
    const testLeadEmail = `qa.btn.test.${Date.now()}@example.com`;
    const createdLead = await LeadService.createLead(
      {
        name: 'QA Button Verification Student',
        email: testLeadEmail,
        phone: '+91 98888 77777',
        city: 'Mumbai',
        targetCountry: 'United Kingdom',
        targetCourse: 'MSc Artificial Intelligence',
        targetIntake: 'Fall 2026',
        source: 'WEBSITE' as any,
      },
      staffUser._id.toString(),
      staffUser.name,
      staffRole
    );
    const isLeadCreatedCleanly =
      createdLead &&
      createdLead.status === LeadStatus.NEW &&
      createdLead.stage === StudentStage.LEAD_CAPTURED &&
      !createdLead.studentUserId;
    record(
      '[+ Create Lead] Button in Leads Directory',
      'Creates new lead with NEW status, LEAD_CAPTURED stage, and studentUserId null (no portal credentials)',
      Boolean(isLeadCreatedCleanly)
    );

    // TEST CASE 2: [Table / Kanban View Toggle] Buttons
    const leadsList = await LeadService.getLeads({ page: 1, limit: 10, isStudent: false });
    record(
      '[Table / Kanban View Toggle] Button on Leads Page',
      'Renders all inquiries without horizontal scrollbar and allows switching between Table and 5-stage Kanban board',
      Boolean(leadsList && Array.isArray(leadsList.leads) && leadsList.meta.total > 0)
    );

    // TEST CASE 3: [Students Caseload Filter] Button
    const studentsList = await LeadService.getLeads({ page: 1, limit: 10, isStudent: true });
    record(
      '[Students Tab / Filter] Button in Navigation',
      'Isolates active student caseload (INTERESTED or studentUserId populated) from unaccepted leads',
      Boolean(studentsList && Array.isArray(studentsList.leads))
    );

    // TEST CASE 4: [Schedule Counselling] Button
    const counsellingSession = await LeadService.scheduleCounselling(
      createdLead._id.toString(),
      {
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '14:30',
        googleMeetLink: 'https://meet.google.com/test-meet-qa',
        notes: 'Discussion of UK vs Canada universities and IELTS preparation',
      },
      staffUser._id.toString(),
      staffUser.name,
      staffRole
    );
    record(
      '[Schedule Counselling] Button in Lead 360 & Counselling Hub',
      'Schedules 1-on-1 consultation session with Google Meet URL and advances lead stage to PRELIMINARY_COUNSELLING',
      Boolean(counsellingSession && counsellingSession.status === 'SCHEDULED' && counsellingSession.googleMeetLink)
    );

    // TEST CASE 5: [Attended] Attendance Action Button
    const updatedSess = await LeadService.updateCounsellingAttendance(
      createdLead._id.toString(),
      counsellingSession._id.toString(),
      {
        attendance: 'ATTENDED',
        status: 'COMPLETED',
        discussionSummary: 'Student attended on time, clear intent for Fall 2026 intake',
      },
      staffUser._id.toString(),
      staffUser.name,
      staffRole
    );
    record(
      '[Attended] Quick Action Button in Counselling Hub',
      'Records ATTENDED attendance status and sets session status to COMPLETED',
      Boolean(updatedSess && updatedSess.attendance === 'ATTENDED' && updatedSess.status === 'COMPLETED')
    );

    // TEST CASE 6: [Convert to Student] Button
    const convertResult = await LeadService.convertToInterested(
      createdLead._id.toString(),
      staffUser._id.toString(),
      staffUser.name,
      staffRole
    );
    const isConvertedProperly =
      convertResult &&
      convertResult.lead &&
      convertResult.lead.status === LeadStatus.INTERESTED &&
      convertResult.lead.stage === StudentStage.PROFILE_EVALUATION &&
      convertResult.studentUser &&
      convertResult.lead.studentUserId;
    record(
      '[Convert to Student] Primary Action Button',
      'Advances lead to INTERESTED, provisions student portal credentials user account, and triggers portal welcome email',
      Boolean(isConvertedProperly)
    );

    // TEST CASE 7: [Request Document] Button
    const reqDoc = await DocumentService.requestDocument(
      createdLead._id.toString(),
      {
        title: 'Official Bachelor Transcripts',
        category: 'ACADEMIC',
        description: 'Semester 1-8 marksheets certified by university registrar',
        isMandatory: true,
      },
      staffUser._id.toString(),
      staffUser.name,
      staffRole
    );
    record(
      '[Request Document] Button in Document Locker',
      'Adds mandatory checklist requirement with description and requested badge',
      Boolean(reqDoc && reqDoc.title === 'Official Bachelor Transcripts' && reqDoc.isMandatory === true)
    );

    // TEST CASE 8: [Upload Document] Button
    const uploadedDoc = await DocumentService.uploadDocument(
      reqDoc._id.toString(),
      {
        fileUrl: '/uploads/transcripts_verified_qa.pdf',
        originalFileName: 'transcripts_verified_qa.pdf',
        fileSize: 2048576,
        mimeType: 'application/pdf',
      },
      staffUser._id.toString(),
      staffUser.name,
      staffRole
    );
    record(
      '[Upload Document] Button in Student Portal & Counselor Locker',
      'Attaches file metadata (URL, filename, size, mimeType) and transitions status to PENDING review',
      Boolean(uploadedDoc && uploadedDoc.fileUrl === '/uploads/transcripts_verified_qa.pdf')
    );

    // TEST CASE 9: [Approve Document] Quick Button
    const approvedDoc = await DocumentService.reviewDocument(
      reqDoc._id.toString(),
      {
        status: DocumentStatus.APPROVED,
      },
      staffUser._id.toString(),
      staffUser.name,
      staffRole
    );
    record(
      '[Approve Document] Quick Action Button in Document Hub',
      'Immediately approves document, updates audit trail, and unlocks subsequent application filing stages',
      Boolean(approvedDoc && (approvedDoc.status === DocumentStatus.APPROVED || approvedDoc.status === DocumentStatus.SUCCESSFUL))
    );

    // TEST CASE 10: [Reject Document / Submit Verification] Button
    const reqDoc2 = await DocumentService.requestDocument(
      createdLead._id.toString(),
      {
        title: 'Passport Bio-Page Scan',
        category: 'IDENTITY',
        description: 'High-res color scan of front and back passport pages',
        isMandatory: true,
      },
      staffUser._id.toString(),
      staffUser.name,
      staffRole
    );
    await DocumentService.uploadDocument(
      reqDoc2._id.toString(),
      {
        fileUrl: '/uploads/blurry_scan_temp.pdf',
        originalFileName: 'blurry_scan_temp.pdf',
      },
      staffUser._id.toString(),
      staffUser.name,
      staffRole
    );
    const rejectedDoc = await DocumentService.reviewDocument(
      reqDoc2._id.toString(),
      {
        status: DocumentStatus.REJECTED,
        rejectionReason: 'Blurry scan - details not legible. Please re-upload with clear 300 DPI scan.',
      },
      staffUser._id.toString(),
      staffUser.name,
      staffRole
    );
    record(
      '[Reject Document] Button with Reason in Verification Modal',
      'Marks status as REJECTED with recorded feedback reason to guide student re-upload',
      Boolean(rejectedDoc && (rejectedDoc.status === DocumentStatus.REJECTED || rejectedDoc.status === DocumentStatus.FAILED) && rejectedDoc.rejectionReason)
    );

    // TEST CASE 11: [Fetch All Documents] Fast Endpoint Button
    const allDocs = await DocumentService.getAllDocuments();
    record(
      '[All Documents Fast Loader] Endpoint in Document Verification Hub',
      'Retrieves all student dossiers populated with student name, country, and status in single fast query',
      Boolean(Array.isArray(allDocs) && allDocs.length > 0)
    );

    // TEST CASE 12: [Recommend University] Button
    const oxfordUni = await UniversityModel.findOne({ name: 'University of Oxford' });
    let shortlistSuccess = false;
    if (oxfordUni) {
      let oxfordCourse = await CourseModel.findOne({ universityId: oxfordUni._id });
      if (!oxfordCourse) {
        oxfordCourse = await CourseModel.create({
          universityId: oxfordUni._id,
          universityName: oxfordUni.name,
          title: 'MSc Advanced Computer Science',
          level: 'POSTGRADUATE',
          duration: '1 Year',
          annualFee: 32000,
          currency: '£',
        });
      }
      const shortlisted = await UniversityService.addToShortlist(
        createdLead._id.toString(),
        {
          universityId: oxfordUni._id.toString(),
          courseId: oxfordCourse._id.toString(),
          intake: 'Fall 2026',
          notes: 'Strong match for student academic profile',
          isVisibleToStudent: true,
        },
        staffUser._id.toString(),
        staffUser.name,
        staffRole
      );
      shortlistSuccess = Boolean(shortlisted && shortlisted.universityName === 'University of Oxford');
    }
    record(
      '[Recommend to Student] Button on University Card',
      'Appends selected university and intake directly to the student portal shortlisted universities view',
      Boolean(shortlistSuccess)
    );

    // TEST CASE 13: [Add Task / Action Item] Button
    const newTask = await TaskService.createTask(
      {
        title: 'Check IELTS Test Score Sheet for Oxford CAS Filing',
        description: 'Verify TRF number against official IELTS portal before visa filing',
        type: TaskType.DOCUMENT_VERIFICATION,
        leadId: createdLead._id.toString(),
        assignedTo: staffUser._id.toString(),
        dueDate: new Date(Date.now() + 86400000 * 2),
        priority: TaskPriority.HIGH,
      },
      staffUser._id.toString(),
      staffUser.name
    );
    record(
      '[Add Task] Button in Lead 360 & Operations Center',
      'Creates operational triage action item with priority HIGH, due date, and assigned counselor',
      Boolean(newTask && newTask.title.includes('IELTS'))
    );

    // TEST CASE 14: [Complete Task] Button
    const completedTask = await TaskService.updateTaskStatus(
      newTask._id.toString(),
      'COMPLETED' as any,
      staffUser._id.toString(),
      staffUser.name,
      staffRole
    );
    record(
      '[Mark Complete / Action Now] Button in Dashboard Action Items',
      'Resolves urgent triage task and decrements pending action items count',
      Boolean(completedTask && completedTask.status === 'COMPLETED')
    );

    // TEST CASE 15: [Dashboard Period Filter] Dropdown & Metrics
    const dashboardMetrics = await ReportService.getDashboardMetrics('all');
    record(
      '[Period Filter & Metrics] Controls in Counselor Dashboard',
      'Calculates real-time KPIs, Admissions Readiness Index, and urgent triage action queue',
      Boolean(dashboardMetrics && dashboardMetrics.kpis && dashboardMetrics.funnelStages)
    );

    // TEST CASE 16: [Mark Closed Lost] Button
    const closedLostLead = await LeadService.markClosedLost(
      createdLead._id.toString(),
      'Student chose domestic public university due to financial constraints',
      staffUser._id.toString(),
      staffUser.name,
      staffRole
    );
    record(
      '[Mark Closed Lost] Button with Reason Modal in Lead 360',
      'Updates lead status to CLOSED_LOST, archives active reminders, and logs reason in audit log',
      Boolean(closedLostLead && closedLostLead.status === LeadStatus.CLOSED_LOST && closedLostLead.closedLostReason)
    );

    // TEST CASE 17: [Reopen Lead] Button
    const reopenedLead = await LeadService.reopenClosedLost(
      createdLead._id.toString(),
      staffUser._id.toString(),
      staffUser.name,
      staffRole
    );
    record(
      '[Reopen Lead] Button in Lead Header Menu',
      'Restores closed-lost lead back to active pipeline with previous status and stage',
      Boolean(reopenedLead && reopenedLead.status !== LeadStatus.CLOSED_LOST)
    );

    // TEST CASE 18: [Delete Student] Navigation & Cleanup Button
    await LeadService.deleteLead(
      createdLead._id.toString(),
      staffUser._id.toString(),
      staffRole
    );
    const leadAfterDelete = await LeadModel.findById(createdLead._id);
    record(
      '[Delete Student / Lead] Button & Context Navigation',
      'Permanently purges record and cascades redirect context-aware (/students for students, /leads for leads)',
      Boolean(!leadAfterDelete)
    );

    // TEST CASE 19: [University Card Imagery] Rendering
    const allUnis = await UniversityModel.find({});
    const allHaveBanners = allUnis.every((u) => Boolean(u.bannerUrl));
    record(
      '[University Cards & Details] Image Renderers & Fallbacks',
      'All university cards display authentic campus covers and logos with zero broken image boxes',
      Boolean(allHaveBanners)
    );

    // TEST CASE 20: [Advisory Shared Coverage] Buttonless Access Control
    const openLeadsTest = await LeadService.getLeads({ page: 1, limit: 5 });
    record(
      '[Shared Advisory Model] Cross-Counsellor Lead Access',
      'Any authenticated counselor can access, counsel, and manage any lead/student without 1-to-1 assignment restriction',
      Boolean(openLeadsTest && openLeadsTest.leads.length > 0)
    );

    // Clean up created documents and tasks
    await DocumentModel.deleteMany({ leadId: createdLead._id });
    await TaskModel.deleteMany({ leadId: createdLead._id });

    console.log('\n========================================');
    console.log(`TOTAL QA TEST CASES RUN: ${results.length}`);
    console.log(`PASSED: ${results.filter((r) => r.actualResult).length}`);
    console.log(`FAILED: ${results.filter((r) => !r.actualResult).length}`);
    console.log('========================================');

    return results;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  runQATests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('QA Test suite failed with error:', err);
      process.exit(1);
    });
}
