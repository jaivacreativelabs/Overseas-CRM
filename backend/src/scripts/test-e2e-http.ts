import { createApp } from '../app';
import { connectDatabase } from '../config/database';
import http from 'http';

const STUDENTS = [
  { id: 'STU-2026-0101', name: 'Aarav Sharma', email: 'aarav.sharma.dtu@gmail.com' },
  { id: 'STU-2026-0102', name: 'Ananya Iyer', email: 'ananya.iyer.annauniv@gmail.com' },
  { id: 'STU-2026-0103', name: 'Aditya Verma', email: 'aditya.verma.vjti@gmail.com' },
  { id: 'STU-2026-0104', name: 'Diya Nambiar', email: 'diya.nambiar.nitc@gmail.com' },
  { id: 'STU-2026-0105', name: 'Kavya Deshmukh', email: 'kavya.deshmukh.coep@gmail.com' },
  { id: 'STU-2026-0106', name: 'Rohan Kulkarni', email: 'rohan.kulkarni.rvce@gmail.com' },
  { id: 'STU-2026-0107', name: 'Meera Krishnan', email: 'meera.krishnan.psg@gmail.com' },
  { id: 'STU-2026-0108', name: 'Nikhil Joshi', email: 'nikhil.joshi.manipal@gmail.com' },
  { id: 'STU-2026-0109', name: 'Sneha Mukherjee', email: 'sneha.mukherjee.ju@gmail.com' },
  { id: 'STU-2026-0110', name: 'Arjun Pillai', email: 'arjun.pillai.vit@gmail.com' },
  { id: 'STU-2026-0111', name: 'Pooja Hegde', email: 'pooja.hegde.bmsce@gmail.com' },
  { id: 'STU-2026-0112', name: 'Siddharth Rao', email: 'siddharth.rao.cbit@gmail.com' },
  { id: 'STU-2026-0113', name: 'Tanvi Agarwal', email: 'tanvi.agarwal.thapar@gmail.com' },
  { id: 'STU-2026-0114', name: 'Varun Nair', email: 'varun.nair.pes@gmail.com' },
  { id: 'STU-2026-0115', name: 'Ishita Sen', email: 'ishita.sen.bits@gmail.com' },
];

async function postJson(url: string, body: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data: any = await res.json();
  return { status: res.status, data };
}

async function getJson(url: string, token: string) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data: any = await res.json();
  return { status: res.status, data };
}

async function runE2E() {
  await connectDatabase();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5099, resolve));
  const baseUrl = 'http://localhost:5099/api/v1';

  console.log('Test server listening on http://localhost:5099/api/v1\n');
  let passed = 0;

  for (const stu of STUDENTS) {
    // 1. Login with correct password
    const loginRes = await postJson(`${baseUrl}/auth/login`, {
      email: stu.email,
      password: 'Password@123',
    });

    if (loginRes.status !== 200 || !loginRes.data.success) {
      console.error(`❌ HTTP Login failed for ${stu.name}:`, loginRes.data);
      continue;
    }

    const token = loginRes.data.data.token;
    const userRole = loginRes.data.data.user.role;

    if (userRole !== 'STUDENT') {
      console.error(`❌ Role is not STUDENT for ${stu.name}: ${userRole}`);
      continue;
    }

    // 2. Fetch student portal profile using token
    const profileRes = await getJson(`${baseUrl}/leads/my-student-profile`, token);
    if (profileRes.status !== 200 || !profileRes.data.success) {
      console.error(`❌ Fetch my-student-profile failed for ${stu.name}:`, profileRes.data);
      continue;
    }

    const profileData = profileRes.data.data;
    if (profileData.studentId !== stu.id) {
      console.error(`❌ studentId mismatch: expected ${stu.id}, got ${profileData.studentId}`);
      continue;
    }

    // 3. Test that student CANNOT access restricted staff endpoint
    const forbiddenRes = await getJson(`${baseUrl}/leads`, token);
    if (forbiddenRes.status !== 403) {
      console.error(`❌ Staff endpoint /leads was NOT blocked with 403 for student: status=${forbiddenRes.status}`);
      continue;
    }

    // 4. Test wrong password
    const badPwRes = await postJson(`${baseUrl}/auth/login`, {
      email: stu.email,
      password: 'WrongPassword@123',
    });
    if (badPwRes.status !== 401) {
      console.error(`❌ Bad password returned status ${badPwRes.status} instead of 401`);
      continue;
    }

    console.log(`✅ [${stu.id}] ${stu.name.padEnd(16)} | HTTP 200 Login | JWT Auth Valid | Student Portal Profile OK | Staff Route Blocked (403) | Bad PW Rejected (401)`);
    passed++;
  }

  // Close server
  server.close();

  console.log(`\n====================================================`);
  console.log(`E2E HTTP Test Results: ${passed}/${STUDENTS.length} accounts passed all checks.`);
  console.log(`====================================================`);

  process.exit(passed === STUDENTS.length ? 0 : 1);
}

runE2E();
