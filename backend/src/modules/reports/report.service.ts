import { LeadModel } from '../leads/lead.model';
import { ApplicationModel } from '../applications/application.model';
import { TaskModel } from '../tasks/task.model';
import { UserModel } from '../users/user.model';
import { OfferModel } from '../offers/offer.model';
import { PaymentModel } from '../payments/payment.model';
import { VisaRecordModel } from '../visa/visa.model';
import { LeadStatus, StudentStage, TaskStatus, UserRole } from '../../config/constants';

export class ReportService {
  static async getDashboardMetrics(period?: string) {
    let dateFilter: any = {};
    if (period && period !== 'all') {
      const now = new Date();
      let startDate = new Date();
      if (period === 'weekly') {
        startDate.setDate(now.getDate() - 7);
        dateFilter = { createdAt: { $gte: startDate } };
      } else if (period === 'monthly') {
        startDate.setDate(now.getDate() - 30);
        dateFilter = { createdAt: { $gte: startDate } };
      } else if (period === 'yearly') {
        startDate.setDate(now.getDate() - 365);
        dateFilter = { createdAt: { $gte: startDate } };
      }
    }

    const leadMatch = { isArchived: false, ...dateFilter };

    const [
      totalLeads,
      activeStudents,
      activeApplications,
      pendingTasks,
      approvedVisas,
      totalPaymentsVerified,
    ] = await Promise.all([
      LeadModel.countDocuments(leadMatch),
      LeadModel.countDocuments({ ...leadMatch, status: LeadStatus.INTERESTED }),
      ApplicationModel.countDocuments({ ...dateFilter, status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }),
      TaskModel.countDocuments({ ...dateFilter, status: TaskStatus.PENDING }),
      VisaRecordModel.countDocuments({ ...dateFilter, status: 'APPROVED' }),
      PaymentModel.aggregate([
        { $match: { status: 'VERIFIED', ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    // Leads by source
    const leadsBySource = await LeadModel.aggregate([
      { $match: leadMatch },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $project: { source: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);

    // Leads by stage funnel
    const stageCounts = await LeadModel.aggregate([
      { $match: leadMatch },
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

    // Lead Generation Trends
    let groupStage: any = {
      _id: {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      }
    };
    
    if (period === 'weekly' || period === 'monthly') {
      groupStage._id = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
    }

    const leadsByMonthAggr = await LeadModel.aggregate([
      { $match: leadMatch },
      {
        $group: {
          _id: groupStage._id,
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const leadsByMonth = leadsByMonthAggr.map(item => {
      let nameStr = `${monthNames[item._id.month - 1]} ${item._id.year}`;
      if (item._id.day) {
        nameStr = `${item._id.day} ${monthNames[item._id.month - 1]}`;
      }
      return {
        name: nameStr,
        leads: item.count
      };
    });

    // Counsellor workload
    const counsellors = await UserModel.find({
      role: UserRole.COUNSELLOR,
      isActive: true,
      isArchived: false,
    }).select('name email');

    const counsellorStats = await Promise.all(
      counsellors.map(async (c) => {
        const [assignedLeads, pendingTasksCount] = await Promise.all([
          LeadModel.countDocuments({ counsellorId: c._id, ...leadMatch }),
          TaskModel.countDocuments({ assignedTo: c._id, status: TaskStatus.PENDING, ...dateFilter }),
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
      leadsByMonth,
      counsellorStats,
    };
  }
}
