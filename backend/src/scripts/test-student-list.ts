import { connectDatabase } from '../config/database';
import { LeadService } from '../modules/leads/lead.service';

async function testStudentList() {
  await connectDatabase();
  const res = await LeadService.getLeads({ isStudent: true, page: 1, limit: 50 });
  console.log(`Total students returned: ${res.meta.total}`);
  console.log(`Leads in response: ${res.leads.length}`);
  res.leads.forEach((l: any, idx: number) => {
    console.log(`${idx + 1}. ${l.name} (${l.studentId || 'No Student ID'}) - ${l.email} - Stage: ${l.stage}`);
  });
  process.exit(0);
}

testStudentList();
