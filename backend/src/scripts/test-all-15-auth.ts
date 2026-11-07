import { connectDatabase } from '../config/database';
import { AuthService } from '../modules/auth/auth.service';
import { LeadService } from '../modules/leads/lead.service';
import { UserRole } from '../config/constants';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const STUDENTS_LIST = [
  { studentId: 'STU-2026-0101', name: 'Aarav Sharma', email: 'aarav.sharma.dtu@gmail.com' },
  { studentId: 'STU-2026-0102', name: 'Ananya Iyer', email: 'ananya.iyer.annauniv@gmail.com' },
  { studentId: 'STU-2026-0103', name: 'Aditya Verma', email: 'aditya.verma.vjti@gmail.com' },
  { studentId: 'STU-2026-0104', name: 'Diya Nambiar', email: 'diya.nambiar.nitc@gmail.com' },
  { studentId: 'STU-2026-0105', name: 'Kavya Deshmukh', email: 'kavya.deshmukh.coep@gmail.com' },
  { studentId: 'STU-2026-0106', name: 'Rohan Kulkarni', email: 'rohan.kulkarni.rvce@gmail.com' },
  { studentId: 'STU-2026-0107', name: 'Meera Krishnan', email: 'meera.krishnan.psg@gmail.com' },
  { studentId: 'STU-2026-0108', name: 'Nikhil Joshi', email: 'nikhil.joshi.manipal@gmail.com' },
  { studentId: 'STU-2026-0109', name: 'Sneha Mukherjee', email: 'sneha.mukherjee.ju@gmail.com' },
  { studentId: 'STU-2026-0110', name: 'Arjun Pillai', email: 'arjun.pillai.vit@gmail.com' },
  { studentId: 'STU-2026-0111', name: 'Pooja Hegde', email: 'pooja.hegde.bmsce@gmail.com' },
  { studentId: 'STU-2026-0112', name: 'Siddharth Rao', email: 'siddharth.rao.cbit@gmail.com' },
  { studentId: 'STU-2026-0113', name: 'Tanvi Agarwal', email: 'tanvi.agarwal.thapar@gmail.com' },
  { studentId: 'STU-2026-0114', name: 'Varun Nair', email: 'varun.nair.pes@gmail.com' },
  { studentId: 'STU-2026-0115', name: 'Ishita Sen', email: 'ishita.sen.bits@gmail.com' },
];

async function runAuthTests() {
  await connectDatabase();
  console.log('====================================================');
  console.log('🧪 TESTING AUTHENTICATION FOR ALL 15 STUDENT ACCOUNTS');
  console.log('====================================================\n');

  let successCount = 0;
  let failureCount = 0;

  for (const stu of STUDENTS_LIST) {
    try {
      // 1. Test Login with Correct Credentials
      const loginRes = await AuthService.login(stu.email, 'Password@123');
      if (!loginRes.token || !loginRes.user) {
        throw new Error('Login returned empty token or user object');
      }

      // Verify JWT payload
      const decoded: any = jwt.verify(loginRes.token, env.JWT_SECRET);
      if (decoded.role !== UserRole.STUDENT) {
        throw new Error(`Expected role STUDENT, got ${decoded.role}`);
      }

      // Verify user object
      if (loginRes.user.role !== UserRole.STUDENT) {
        throw new Error(`User object role mismatch: expected STUDENT, got ${loginRes.user.role}`);
      }

      // 2. Test Fetching Student Profile for Portal
      const profile = await LeadService.getStudentProfileForUser(
        loginRes.user._id!.toString(),
        loginRes.user.email
      );

      if (!profile || profile.email.toLowerCase() !== stu.email.toLowerCase()) {
        throw new Error(`Profile email mismatch: expected ${stu.email}, got ${profile?.email}`);
      }
      if (profile.studentId !== stu.studentId) {
        throw new Error(`Profile studentId mismatch: expected ${stu.studentId}, got ${profile?.studentId}`);
      }

      // 3. Test Invalid Password
      let failedAsExpected = false;
      try {
        await AuthService.login(stu.email, 'WrongPassword@999');
      } catch (err: any) {
        if (err.message.includes('Invalid email or password')) {
          failedAsExpected = true;
        }
      }
      if (!failedAsExpected) {
        throw new Error('Incorrect password was NOT rejected!');
      }

      console.log(`✅ [${stu.studentId}] ${stu.name.padEnd(16)} | Email: ${stu.email.padEnd(35)} | Login: SUCCESS | Role: STUDENT | Portal Profile: OK | Bad PW Rejected: OK`);
      successCount++;
    } catch (err: any) {
      console.error(`❌ [${stu.studentId}] ${stu.name} FAILED: ${err.message}`);
      failureCount++;
    }
  }

  // 4. Test Unregistered Email
  console.log('\n--- Testing Edge Cases ---');
  let nonExistentRejected = false;
  try {
    await AuthService.login('nonexistent.student.999@iiec.edu', 'Password@123');
  } catch (err: any) {
    if (err.message.includes('Invalid email or password')) {
      nonExistentRejected = true;
    }
  }
  console.log(`Unregistered email rejected: ${nonExistentRejected ? '✅ PASS' : '❌ FAIL'}`);

  // 5. Test Existing Core CRM Accounts
  console.log('\n--- Testing Existing Staff / Admin Accounts ---');
  const staffTests = [
    { label: '👑 Owner Admin', email: 'owner@jaivacrm.com', role: UserRole.ADMIN },
    { label: '🛡️ Branch Admin', email: 'admin@jaivacrm.com', role: UserRole.ADMIN },
    { label: '🎓 Counsellor', email: 'counsellor@jaivacrm.com', role: UserRole.COUNSELLOR },
    { label: '👨‍🎓 Existing Student Rohan', email: 'rohan.sharma@example.com', role: UserRole.STUDENT },
  ];

  for (const staff of staffTests) {
    try {
      const res = await AuthService.login(staff.email, 'Password@123');
      const pass = res.user.role === staff.role;
      console.log(`${staff.label.padEnd(28)} | ${staff.email.padEnd(26)} | Login: ${pass ? '✅ SUCCESS' : '❌ ROLE MISMATCH'}`);
    } catch (err: any) {
      console.log(`${staff.label.padEnd(28)} | ${staff.email.padEnd(26)} | Login: ❌ FAILED (${err.message})`);
    }
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${successCount}/15 Student accounts tested successfully.`);
  if (failureCount > 0) {
    console.log(`FAILURES: ${failureCount}`);
  }
  console.log('====================================================');

  process.exit(failureCount === 0 ? 0 : 1);
}

runAuthTests();
