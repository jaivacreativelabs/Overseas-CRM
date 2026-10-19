import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { LeadModel } from '../../src/modules/leads/lead.model';
import { DocumentModel } from '../../src/modules/documents/document.model';
import { TaskModel } from '../../src/modules/tasks/task.model';
import { UserRole, DocumentStatus, StudentStage, LeadStatus, TaskStatus, TaskPriority, TaskType } from '../../src/config/constants';
import { env } from '../../src/config/env';

async function runTests() {
  console.log('🚀 Starting JAIVA CRM Student Portal Verification Tests...');

  const testDbUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/jaiva_crm_test';
  await mongoose.connect(testDbUri);

  // Clean test database
  await Promise.all([
    UserModel.deleteMany({ email: { $in: ['counsellor@test.com', 'student1@test.com', 'student2@test.com'] } }),
    LeadModel.deleteMany({ email: { $in: ['student1@test.com', 'student2@test.com'] } }),
  ]);
  console.log('✓ Connected to local test database');

  const app = createApp();

  // Test setup: create users
  // 1. Counsellor User
  const counsellor = await UserModel.create({
    name: 'Sarah Counsellor',
    email: 'counsellor@test.com',
    passwordHash: 'hashed123',
    role: UserRole.COUNSELLOR,
    isActive: true,
  });

  // 2. Student 1 User
  const student1 = await UserModel.create({
    name: 'Student One',
    email: 'student1@test.com',
    passwordHash: 'hashed123',
    role: UserRole.STUDENT,
    assignedCounsellorId: counsellor._id,
    isActive: true,
  });

  // 3. Student 2 User
  const student2 = await UserModel.create({
    name: 'Student Two',
    email: 'student2@test.com',
    passwordHash: 'hashed123',
    role: UserRole.STUDENT,
    assignedCounsellorId: counsellor._id,
    isActive: true,
  });

  // 4. Create Lead for Student 1
  const lead1 = await LeadModel.create({
    name: 'Student One',
    email: 'student1@test.com',
    phone: '+919876543210',
    status: LeadStatus.INTERESTED,
    stage: StudentStage.DOCUMENT_COLLECTION,
    studentUserId: student1._id,
    counsellorId: counsellor._id,
    targetCountry: 'United Kingdom',
    targetCourse: 'MSc Computer Science',
    isArchived: false,
  });

  // 5. Create Lead for Student 2
  const lead2 = await LeadModel.create({
    name: 'Student Two',
    email: 'student2@test.com',
    phone: '+919876543211',
    status: LeadStatus.INTERESTED,
    stage: StudentStage.DOCUMENT_COLLECTION,
    studentUserId: student2._id,
    counsellorId: counsellor._id,
    targetCountry: 'Canada',
    isArchived: false,
  });

  const counsellorToken = jwt.sign(
    { userId: counsellor._id.toString(), email: counsellor.email, role: counsellor.role },
    env.JWT_SECRET
  );

  const student1Token = jwt.sign(
    { userId: student1._id.toString(), email: student1.email, role: student1.role, studentId: student1._id.toString() },
    env.JWT_SECRET
  );

  const student2Token = jwt.sign(
    { userId: student2._id.toString(), email: student2.email, role: student2.role, studentId: student2._id.toString() },
    env.JWT_SECRET
  );

  // Helper request function using supertest-like fetch or http
  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  try {
    // TEST 1: Retrieve student profile via /my-student-profile
    console.log('\n--- TEST 1: Student Profile Retrieval ---');
    const profileRes = await fetch(`${baseUrl}/leads/my-student-profile`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const profileJson = await profileRes.json();
    if (profileRes.status !== 200 || profileJson.data?._id !== lead1._id.toString()) {
      throw new Error(`Profile retrieval failed: ${JSON.stringify(profileJson)}`);
    }
    console.log('✅ TEST 1 PASSED: Student 1 successfully retrieved their own linked lead profile');

    // TEST 2: Counselor requests multiple documents for Student 1
    console.log('\n--- TEST 2: Multiple Document Requests from Counselor ---');
    const req1Res = await fetch(`${baseUrl}/documents/lead/${lead1._id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${counsellorToken}` },
      body: JSON.stringify({
        title: 'Passport Copy',
        category: 'IDENTITY',
        description: 'Provide all pages including front and back',
        isMandatory: true,
      }),
    });
    const doc1 = (await req1Res.json()).data;

    const req2Res = await fetch(`${baseUrl}/documents/lead/${lead1._id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${counsellorToken}` },
      body: JSON.stringify({
        title: 'IELTS Scorecard',
        category: 'LANGUAGE_TEST',
        description: 'Minimum 6.5 overall band required',
        isMandatory: true,
      }),
    });
    const doc2 = (await req2Res.json()).data;

    if (!doc1?._id || !doc2?._id) {
      throw new Error('Failed to create multiple document requests');
    }
    console.log('✅ TEST 2 PASSED: Counselor successfully requested Passport Copy and IELTS Scorecard');

    // TEST 3: Student 1 sees both requested documents
    console.log('\n--- TEST 3: Student Portal Sees Requested Documents ---');
    const studentDocsRes = await fetch(`${baseUrl}/documents/lead/${lead1._id}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const studentDocsJson = await studentDocsRes.json();
    const studentDocs = studentDocsJson.data;

    if (studentDocs.length !== 2) {
      throw new Error(`Expected 2 documents, found ${studentDocs.length}`);
    }
    const hasPassport = studentDocs.some((d: any) => d.title === 'Passport Copy' && d.description.includes('front and back'));
    const hasIelts = studentDocs.some((d: any) => d.title === 'IELTS Scorecard');
    if (!hasPassport || !hasIelts) {
      throw new Error('Requested documents do not match counselor inputs');
    }
    console.log('✅ TEST 3 PASSED: Student 1 sees all requested documents with counselor instructions');

    // TEST 4: Student 1 uploads a file for Passport Copy
    console.log('\n--- TEST 4: Student File Submission & Persistence ---');
    const uploadRes = await fetch(`${baseUrl}/documents/${doc1._id}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({
        fileUrl: '/uploads/passport_scanned_copy.pdf',
        originalFileName: 'passport_scanned_copy.pdf',
        fileSize: 2048500,
        mimeType: 'application/pdf',
      }),
    });
    const uploadJson = await uploadRes.json();
    if (uploadRes.status !== 200 || uploadJson.data.status !== DocumentStatus.PENDING || uploadJson.data.fileUrl !== '/uploads/passport_scanned_copy.pdf') {
      throw new Error(`Upload failed: ${JSON.stringify(uploadJson)}`);
    }

    const recheckDoc = await DocumentModel.findById(doc1._id);
    if (!recheckDoc?.uploadedAt || recheckDoc.originalFileName !== 'passport_scanned_copy.pdf') {
      throw new Error('Uploaded document did not persist in database');
    }
    console.log('✅ TEST 4 PASSED: Student upload successfully recorded and persisted in database');

    // TEST 5: Counselor reviews: Approves Passport Copy
    console.log('\n--- TEST 5: Counselor Approval Workflow ---');
    const approveRes = await fetch(`${baseUrl}/documents/${doc1._id}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${counsellorToken}` },
      body: JSON.stringify({
        status: DocumentStatus.APPROVED,
      }),
    });
    const approveJson = await approveRes.json();
    if (approveRes.status !== 200 || (approveJson.data.status !== DocumentStatus.SUCCESSFUL && approveJson.data.status !== DocumentStatus.APPROVED)) {
      throw new Error(`Approval failed: ${JSON.stringify(approveJson)}`);
    }
    console.log('✅ TEST 5 PASSED: Counselor approved Passport Copy (normalized to SUCCESSFUL/APPROVED)');

    // TEST 6: Counselor reviews: Rejects IELTS with mandatory reason
    console.log('\n--- TEST 6: Counselor Rejection with Reason ---');
    // First student uploads IELTS
    await fetch(`${baseUrl}/documents/${doc2._id}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({
        fileUrl: '/uploads/ielts_blurry.jpg',
        originalFileName: 'ielts_blurry.jpg',
      }),
    });

    const rejectRes = await fetch(`${baseUrl}/documents/${doc2._id}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${counsellorToken}` },
      body: JSON.stringify({
        status: DocumentStatus.REJECTED,
        rejectionReason: 'Scan is blurry and candidate number is not legible. Please upload high resolution PDF.',
      }),
    });
    const rejectJson = await rejectRes.json();
    if (rejectRes.status !== 200 || !rejectJson.data.rejectionReason) {
      throw new Error(`Rejection failed: ${JSON.stringify(rejectJson)}`);
    }
    console.log('✅ TEST 6 PASSED: Counselor rejected IELTS with clear reason');

    // TEST 7: Student Portal sees Rejection Reason & Re-uploads replacement
    console.log('\n--- TEST 7: Rejection Visibility & Re-upload by Student ---');
    const studentCheckAfterReject = await fetch(`${baseUrl}/documents/lead/${lead1._id}`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const rejectedDocs = (await studentCheckAfterReject.json()).data;
    const rejectedIelts = rejectedDocs.find((d: any) => d._id === doc2._id);
    if (!rejectedIelts || !rejectedIelts.rejectionReason.includes('blurry')) {
      throw new Error('Rejection reason not visible to student');
    }

    // Student re-uploads clear copy
    const reuploadRes = await fetch(`${baseUrl}/documents/${doc2._id}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({
        fileUrl: '/uploads/ielts_clear_official.pdf',
        originalFileName: 'ielts_clear_official.pdf',
      }),
    });
    const reuploadedDoc = (await reuploadRes.json()).data;
    if (reuploadedDoc.status !== DocumentStatus.PENDING || reuploadedDoc.rejectionReason) {
      throw new Error('Re-upload did not return document to awaiting-review state');
    }
    console.log('✅ TEST 7 PASSED: Student viewed rejection reason and re-uploaded document returning status to PENDING');

    // TEST 8: Student Isolation & Data Protection
    console.log('\n--- TEST 8: Cross-Student Isolation & Authorization Guard ---');
    // Student 2 attempts to fetch Student 1's documents
    const unauthorizedAccessRes = await fetch(`${baseUrl}/documents/lead/${lead1._id}`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    if (unauthorizedAccessRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for Student 2 accessing Student 1 documents, got ${unauthorizedAccessRes.status}`);
    }

    // Student 2 attempts to upload into Student 1's document
    const unauthorizedUploadRes = await fetch(`${baseUrl}/documents/${doc1._id}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student2Token}` },
      body: JSON.stringify({ fileUrl: '/uploads/hack.pdf', originalFileName: 'hack.pdf' }),
    });
    if (unauthorizedUploadRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for Student 2 uploading to Student 1 request, got ${unauthorizedUploadRes.status}`);
    }
    console.log('✅ TEST 8 PASSED: Student isolation strictly enforced across reading and uploading');

    // TEST 9: Student Tasks Isolation & Retrieval
    console.log('\n--- TEST 9: Tasks Synchronization for Student ---');
    await TaskModel.create({
      leadId: lead1._id,
      title: 'Submit Academic Transcripts',
      description: 'Your counselor needs sem 1-8 marksheets',
      type: TaskType.DOCUMENT_COLLECTION,
      priority: TaskPriority.HIGH,
      status: TaskStatus.PENDING,
      dueDate: new Date(Date.now() + 86400000),
      createdBy: counsellor._id,
      createdByName: counsellor.name,
      assignedTo: counsellor._id,
      assignedToName: counsellor.name,
    });

    const tasksRes = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const tasksJson = await tasksRes.json();
    if (tasksRes.status !== 200 || !tasksJson.data || tasksJson.data.length === 0) {
      throw new Error(`Student failed to fetch their tasks: ${JSON.stringify(tasksJson)}`);
    }
    console.log('✅ TEST 9 PASSED: Student retrieved their relevant pending tasks without 403 Forbidden');

    console.log('\n🎉 ALL 9 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } finally {
    server.close();
    // Clean test records
    await Promise.all([
      UserModel.deleteMany({ email: { $in: ['counsellor@test.com', 'student1@test.com', 'student2@test.com'] } }),
      LeadModel.deleteMany({ email: { $in: ['student1@test.com', 'student2@test.com'] } }),
      DocumentModel.deleteMany({ title: { $in: ['Passport Copy', 'IELTS Scorecard'] } }),
      TaskModel.deleteMany({ title: 'Submit Academic Transcripts' }),
    ]);
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
