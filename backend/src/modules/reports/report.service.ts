import { LeadModel } from '../leads/lead.model';
import { ApplicationModel } from '../applications/application.model';
import { TaskModel } from '../tasks/task.model';
import { UserModel } from '../users/user.model';
import { OfferModel } from '../offers/offer.model';
import { PaymentModel } from '../payments/payment.model';
import { VisaRecordModel } from '../visa/visa.model';
import { LeadStatus, StudentStage, TaskStatus, UserRole } from '../../config/constants';

export class ReportService {
  static async getDashboardMetrics() {
    const [
      totalLeads,
      activeStudents,
      activeApplications,
      pendingTasks,
      approvedVisas,
      totalPaymentsVerified,
    ] = await Promise.all([
      LeadModel.countDocuments({ isArchived: false }),
      LeadModel.countDocuments({ status: LeadStatus.INTERESTED, isArchived: false }),
      ApplicationModel.countDocuments({ status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }),
      TaskModel.countDocuments({ status: TaskStatus.PENDING }),
      VisaRecordModel.countDocuments({ status: 'APPROVED' }),
      PaymentModel.aggregate([
        { $match: { status: 'VERIFIED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    // Leads by source
    const leadsBySource = await LeadModel.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $project: { source: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);

    // Leads by stage funnel
    const stageCounts = await LeadModel.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]);

    const stageMap: Record<string, number> = {};
    stageCounts.forEach((sc) => {
      stageMap[sc._id] = sc.count;
    });

    const funnelStages = Object.values(StudentStage).map((stage) => ({
      stage,
      count: stageMap[stage] || 0,
    }));

    // Counsellor workload
    const counsellors = await UserModel.find({
      role: UserRole.COUNSELLOR,
      isActive: true,
      isArchived: false,
    }).select('name email');

    const counsellorStats = await Promise.all(
      counsellors.map(async (c) => {
        const [assignedLeads, pendingTasksCount] = await Promise.all([
          LeadModel.countDocuments({ counsellorId: c._id, isArchived: false }),
          TaskModel.countDocuments({ assignedTo: c._id, status: TaskStatus.PENDING }),
        ]);

        return {
          counsellorId: c._id,
          name: c.name,
          email: c.email,
          assignedLeads,
          pendingTasks: pendingTasksCount,
        };
      })
    );

    return {
      kpis: {
        totalLeads,
        activeStudents,
        activeApplications,
        pendingTasks,
        approvedVisas,
        verifiedRevenue: totalPaymentsVerified[0]?.total || 0,
      },
      leadsBySource,
      funnelStages,
      counsellorStats,
    };
  }
}
