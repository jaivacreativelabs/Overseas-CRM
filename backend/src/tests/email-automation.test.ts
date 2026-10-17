import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserModel } from '../modules/users/user.model';
import { LeadModel } from '../modules/leads/lead.model';
import { DocumentModel } from '../modules/documents/document.model';
import { DocumentService } from '../modules/documents/document.service';
import { ApplicationModel } from '../modules/applications/application.model';
import { ApplicationService } from '../modules/applications/application.service';
import { OfferModel } from '../modules/offers/offer.model';
import { OfferService } from '../modules/offers/offer.service';
import { AutomationService } from '../modules/integrations/automation.service';
import { EmailService } from '../modules/integrations/email.service';
import { IntegrationLogModel, LogStatus } from '../modules/integrations/integration-log.model';
import { NotificationModel } from '../modules/notifications/notification.model';
import { UserRole, DocumentStatus, ApplicationStatus, OfferStatus } from '../config/constants';
import { WorkflowTrigger } from '../modules/integrations/automation-workflow.model';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let mongoServer: MongoMemoryServer | null = null;

async function runTests() {
  console.log('🚀 Starting CRM Lifecycle Email Automation Tests...');

  const customUri = process.env.TEST_MONGODB_URI;
  if (customUri) {
    await mongoose.connect(customUri);
  } else {
    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/jaiva_crm_test', { serverSelectionTimeoutMS: 1500 });
    } catch {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    }
  }
  console.log('✓ Connected to test database');

  try {
    await Promise.all([
      UserModel.deleteMany({ email: { $in: ['counsellor@crmtest.com', 'student@crmtest.com'] } }),
      LeadModel.deleteMany({ email: 'student@crmtest.com' }),
      DocumentModel.deleteMany({ title: 'Passport Photo Page' }),
      ApplicationModel.deleteMany({ applicationNumber: 'APP-998811' }),
      OfferModel.deleteMany({ originalOfferFileName: 'original.pdf' }),
      IntegrationLogModel.deleteMany({ 'requestData.to': 'student@crmtest.com' }),
      NotificationModel.deleteMany({ title: 'Document Uploaded' }),
    ]);

    await AutomationService.initializeDefaultWorkflows();
    console.log('✓ Initialized default automation workflows');

    const counsellor = await UserModel.create({
      name: 'Test Counsellor',
      email: 'counsellor@crmtest.com',
      passwordHash: 'hashed123',
      role: UserRole.COUNSELLOR,
      isActive: true,
    });

    const studentUser = await UserModel.create({
      name: 'Alex Student',
      email: 'student@crmtest.com',
      passwordHash: 'hashed123',
      role: UserRole.STUDENT,
      assignedCounsellorId: counsellor._id,
      isActive: true,
    });

    const lead = await LeadModel.create({
      name: 'Alex Student',
      email: 'student@crmtest.com',
      phone: '+1234567890',
      studentUserId: studentUser._id,
      counsellorId: counsellor._id,
      targetCountry: 'Canada',
      targetCourse: 'Computer Science',
    });
    console.log('✓ Created test counsellor, student user, and lead record');

    const requestedDoc = await DocumentService.requestDocument(
      lead._id.toString(),
      {
        title: 'Passport Photo Page',
        category: 'IDENTITY',
        isMandatory: true,
      },
      counsellor._id.toString(),
      counsellor.name,
      UserRole.COUNSELLOR
    );

    if (!requestedDoc || requestedDoc.title !== 'Passport Photo Page') {
      throw new Error('Failed to create document request');
    }
    console.log('✓ Successfully requested document via DocumentService');

    await sleep(600);

    const docRequestedLog = await IntegrationLogModel.findOne({
      eventType: 'document.requested',
      'requestData.to': 'student@crmtest.com',
    });

    if (!docRequestedLog) {
      throw new Error('IntegrationLogModel entry not found for document.requested');
    }
    if (docRequestedLog.status !== LogStatus.SUCCESS) {
      throw new Error(`Expected SUCCESS status for document.requested log but got ${docRequestedLog.status}`);
    }
    console.log('✓ Verified IntegrationLogModel row for document.requested with studentEmail');

    const uploadedDoc = await DocumentService.uploadDocument(
      requestedDoc._id.toString(),
      {
        fileUrl: 'https://storage.test.com/passport.pdf',
        originalFileName: 'passport.pdf',
        fileSize: 10240,
        mimeType: 'application/pdf',
      },
      studentUser._id.toString(),
      studentUser.name,
      UserRole.STUDENT
    );

    if (uploadedDoc.status !== DocumentStatus.PENDING) {
      throw new Error(`Expected document status PENDING after upload, got ${uploadedDoc.status}`);
    }
    console.log('✓ Successfully uploaded document');

    await sleep(300);

    const counsellorNotification = await NotificationModel.findOne({
      userId: counsellor._id,
      title: 'Document Uploaded',
    });

    if (!counsellorNotification) {
      throw new Error('Counsellor in-house NotificationModel row not found for document upload');
    }
    console.log('✓ Verified NotificationModel row for document.uploaded targeting counsellor');

    const emailLogForUpload = await IntegrationLogModel.findOne({
      eventType: 'document.uploaded',
    });

    if (emailLogForUpload) {
      throw new Error('Counsellor upload event must NOT create an email IntegrationLog row');
    }
    console.log('✓ Verified no email was dispatched to counsellor on document upload');

    const testApp = await ApplicationService.createApplication(
      lead._id.toString(),
      {
        universityId: new Types.ObjectId().toString(),
        universityName: 'University of British Columbia',
        courseId: new Types.ObjectId().toString(),
        courseTitle: 'MSc Computer Science',
        country: 'Canada',
        intake: 'Fall 2026',
        applicationNumber: 'APP-998811',
      },
      counsellor._id.toString(),
      counsellor.name,
      UserRole.COUNSELLOR
    );

    await sleep(400);

    const appSubmittedLog = await IntegrationLogModel.findOne({
      eventType: 'application.submitted',
      'requestData.to': 'student@crmtest.com',
    });

    if (!appSubmittedLog) {
      throw new Error('IntegrationLogModel entry not found for application.submitted');
    }
    if (appSubmittedLog.status !== LogStatus.SUCCESS) {
      throw new Error(`Expected SUCCESS status for application.submitted log but got ${appSubmittedLog.status}`);
    }
    console.log('✓ Verified real ApplicationService.createApplication dispatches application.submitted email log');

    await ApplicationService.updateApplicationStatus(
      testApp._id.toString(),
      {
        status: ApplicationStatus.REJECTED,
        rejectionReason: 'Academic prerequisites not fulfilled',
      },
      counsellor._id.toString(),
      counsellor.name,
      UserRole.COUNSELLOR
    );

    await sleep(400);

    const appRejectedLog = await IntegrationLogModel.findOne({
      eventType: 'application.rejected',
      'requestData.to': 'student@crmtest.com',
    });

    if (!appRejectedLog) {
      throw new Error('IntegrationLogModel entry not found for application.rejected');
    }
    if (appRejectedLog.status !== LogStatus.SUCCESS) {
      throw new Error(`Expected SUCCESS status for application.rejected log but got ${appRejectedLog.status}`);
    }
    console.log('✓ Verified real ApplicationService.updateApplicationStatus dispatches application.rejected email log');

    const testOfferAccepted = await OfferModel.create({
      leadId: lead._id,
      studentId: studentUser._id,
      applicationId: testApp._id,
      universityName: 'University of British Columbia',
      courseTitle: 'MSc Computer Science',
      offerType: 'UNCONDITIONAL',
      tuitionFee: 25000,
      depositAmount: 5000,
      currency: 'CAD',
      status: OfferStatus.SIGNED_UPLOADED,
      originalOfferUrl: 'https://storage.test.com/original.pdf',
      originalOfferFileName: 'original.pdf',
      signedOfferUrl: 'https://storage.test.com/signed.pdf',
      signedOfferFileName: 'signed.pdf',
      uploadedById: counsellor._id,
      uploadedByName: counsellor.name,
    });

    await OfferService.reviewSignedOffer(
      testOfferAccepted._id.toString(),
      OfferStatus.ACCEPTED,
      'Signed agreement is verified',
      counsellor._id.toString(),
      counsellor.name,
      UserRole.COUNSELLOR
    );

    await sleep(400);

    const offerAcceptedLog = await IntegrationLogModel.findOne({
      eventType: 'offer.accepted',
      'requestData.to': 'student@crmtest.com',
    });

    if (!offerAcceptedLog) {
      throw new Error('IntegrationLogModel entry not found for offer.accepted');
    }
    if (offerAcceptedLog.status !== LogStatus.SUCCESS) {
      throw new Error(`Expected SUCCESS status for offer.accepted log but got ${offerAcceptedLog.status}`);
    }
    console.log('✓ Verified real OfferService.reviewSignedOffer (ACCEPTED) dispatches offer.accepted email log');

    const testOfferRejected = await OfferModel.create({
      leadId: lead._id,
      studentId: studentUser._id,
      applicationId: testApp._id,
      universityName: 'University of British Columbia',
      courseTitle: 'MSc Computer Science',
      offerType: 'UNCONDITIONAL',
      tuitionFee: 25000,
      depositAmount: 5000,
      currency: 'CAD',
      status: OfferStatus.SIGNED_UPLOADED,
      originalOfferUrl: 'https://storage.test.com/original.pdf',
      originalOfferFileName: 'original.pdf',
      signedOfferUrl: 'https://storage.test.com/signed.pdf',
      signedOfferFileName: 'signed.pdf',
      uploadedById: counsellor._id,
      uploadedByName: counsellor.name,
    });

    await OfferService.reviewSignedOffer(
      testOfferRejected._id.toString(),
      OfferStatus.REJECTED,
      'Missing student signature on page 4',
      counsellor._id.toString(),
      counsellor.name,
      UserRole.COUNSELLOR
    );

    await sleep(400);

    const offerRejectedLog = await IntegrationLogModel.findOne({
      eventType: 'offer.rejected',
      'requestData.to': 'student@crmtest.com',
    });

    if (!offerRejectedLog) {
      throw new Error('IntegrationLogModel entry not found for offer.rejected');
    }
    if (offerRejectedLog.status !== LogStatus.SUCCESS) {
      throw new Error(`Expected SUCCESS status for offer.rejected log but got ${offerRejectedLog.status}`);
    }
    console.log('✓ Verified real OfferService.reviewSignedOffer (REJECTED) dispatches offer.rejected email log');

    const triggersToVerify: WorkflowTrigger[] = [
      'lead.created',
      'counselling.scheduled',
      'profile.verified',
      'shortlist.updated',
      'document.requested',
      'document.reviewed',
      'application.submitted',
      'application.rejected',
      'offer.received',
      'offer.accepted',
      'offer.rejected',
      'payment.requested',
      'payment.success',
      'visa.updated',
      'travel.updated',
      'departure.recorded',
      'arrival.confirmed',
      'orientation.invited',
    ];

    for (const t of triggersToVerify) {
      const samplePayload = {
        name: 'Alex Student',
        studentEmail: 'student@crmtest.com',
        universityName: 'University of Toronto',
        courseTitle: 'MSc Computer Science',
        intake: 'Fall 2026',
        scheduledDate: '2026-11-01',
        scheduledTime: '10:00 AM',
        counsellorName: 'Sarah Counsellor',
        googleMeetLink: 'https://meet.google.com/abc-defg-hij',
        title: 'Passport Copy',
        status: 'APPROVED',
        isApproved: true,
        amount: 5000,
        currency: 'CAD',
      };

      const template = EmailService.renderTemplate(t, samplePayload);
      if (!template.subject || !template.bodyHtml || !template.textTwin) {
        throw new Error(`Template rendering failed for trigger: ${t}`);
      }

      const html = EmailService.buildHtmlLayout({
        preheader: template.preheader,
        title: template.title,
        badge: template.badge,
        badgeBg: template.badgeBg,
        badgeColor: template.badgeColor,
        bodyHtml: template.bodyHtml,
        ctaText: template.ctaText,
        ctaUrl: template.ctaUrl,
      });

      if (!html.includes('#0057F8')) {
        throw new Error(`Template for ${t} missing primary brand color #0057F8`);
      }
      if (!html.includes('max-width:600px')) {
        throw new Error(`Template for ${t} missing 600px max-width table layout`);
      }
      if (!html.includes('color-scheme')) {
        throw new Error(`Template for ${t} missing color-scheme meta`);
      }
    }
    console.log('✓ Verified all 16 student email templates adhere to 600px table and #0057F8 brand guidelines');

    const directDispatchResult = await EmailService.sendLifecycleEmail('lead.created', {
      name: 'Alex Student',
      studentEmail: 'student@crmtest.com',
      targetCountry: 'Canada',
      targetCourse: 'Data Science',
    });

    if (!directDispatchResult.success) {
      throw new Error(`Expected stream transport dispatch to succeed, got error: ${directDispatchResult.errorMessage}`);
    }
    console.log('✓ Verified stream transport operates smoothly when SMTP_HOST is unset');

    console.log('\n🎉 ALL EMAIL AUTOMATION INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } finally {
    await Promise.all([
      UserModel.deleteMany({ email: { $in: ['counsellor@crmtest.com', 'student@crmtest.com'] } }),
      LeadModel.deleteMany({ email: 'student@crmtest.com' }),
      DocumentModel.deleteMany({ title: 'Passport Photo Page' }),
      ApplicationModel.deleteMany({ applicationNumber: 'APP-998811' }),
      OfferModel.deleteMany({ originalOfferFileName: 'original.pdf' }),
      IntegrationLogModel.deleteMany({ 'requestData.to': 'student@crmtest.com' }),
      NotificationModel.deleteMany({ title: 'Document Uploaded' }),
    ]);
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
