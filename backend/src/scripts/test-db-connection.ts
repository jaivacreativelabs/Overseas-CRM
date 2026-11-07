import { connectDatabase } from '../config/database';
import { UserModel } from '../modules/users/user.model';
import { LeadModel } from '../modules/leads/lead.model';

async function main() {
  try {
    await connectDatabase();
    const users = await UserModel.find({}, 'name email role adminType').lean();
    console.log('Total users:', users.length);
    console.log('Users:', users);
    const leads = await LeadModel.find({}, 'name email studentId status stage studentUserId').lean();
    console.log('Total leads/students:', leads.length);
    console.log('Leads:', leads);
    process.exit(0);
  } catch (err) {
    console.error('Error connecting to DB:', err);
    process.exit(1);
  }
}

main();

