import { connectDatabase } from '../config/database';
import { UserModel } from '../modules/users/user.model';
import { BranchModel } from '../modules/branches/branch.model';
import { LeadModel } from '../modules/leads/lead.model';

async function inspect15Students() {
  await connectDatabase();
  // Ensure models are registered
  void UserModel;
  void BranchModel;

  const leads = await LeadModel.find({ studentId: { $regex: /^STU-2026/ } })
    .populate('counsellorId', 'name email')
    .populate('branchId', 'name city state')
    .sort({ studentId: 1 })
    .lean();

  console.log(`Found ${leads.length} student leads:`);
  for (const l of leads) {
    console.log(JSON.stringify({
      studentId: l.studentId,
      name: l.name,
      email: l.email,
      phone: l.phone,
      city: l.city,
      state: l.state,
      targetCountry: l.targetCountry,
      targetCourse: l.targetCourse,
      targetIntake: l.targetIntake,
      stage: l.stage,
      status: l.status,
      counsellor: (l.counsellorId as any)?.name,
      branch: (l.branchId as any)?.name,
      collegeName: l.collegeName,
      department: l.department,
      course: l.course,
      studentUserId: l.studentUserId
    }, null, 2));
  }
  process.exit(0);
}

inspect15Students();
