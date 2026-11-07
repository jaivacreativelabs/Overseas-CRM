import { connectDatabase } from '../config/database';
import { UserModel } from '../modules/users/user.model';
import { LeadModel } from '../modules/leads/lead.model';

async function checkDetails() {
  await connectDatabase();
  const leads = await LeadModel.find({ studentId: { $regex: /^STU-2026/ } }).lean();
  for (const l of leads) {
    const u = await UserModel.findById(l.studentUserId).lean();
    console.log(`${l.studentId}: Lead _id=${l._id}, studentUserId=${l.studentUserId}, User _id=${u?._id}, user.leadId=${u?.leadId}, role=${u?.role}, stage=${u?.stage}`);
  }
  process.exit(0);
}

checkDetails();
