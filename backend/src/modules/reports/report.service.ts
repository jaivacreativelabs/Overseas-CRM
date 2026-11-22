import { Types } from 'mongoose';
import { LeadModel } from '../leads/lead.model';
import { ApplicationModel } from '../applications/application.model';
import { TaskModel } from '../tasks/task.model';
import { PaymentModel } from '../payments/payment.model';
import { VisaRecordModel } from '../visa/visa.model';
import { LeadStatus, StudentStage, TaskStatus } from '../../config/constants';

export class ReportService {
  static async getDashboardMetrics(period?: string, branchId?: string) {
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

    // Optional branch scope: leads filter on branchId directly; lead-linked records
    // (applications, tasks, visas, payments) are scoped through that branch's leads.
    const branchObjectId = branchId && Types.ObjectId.isValid(branchId) ? new Types.ObjectId(branchId) : null;
    let branchLeadScope: any = {};
    if (branchObjectId) {
      const branchLeadIds = await LeadModel.distinct('_id', { branchId: branchObjectId });
      branchLeadScope = { leadId: { $in: branchLeadIds } };
    }

    const leadMatch: any = { isArchived: false, ...dateFilter, ...(branchObjectId ? { branchId: branchObjectId } : {}) };
    const scopedFilter = { ...dateFilter, ...branchLeadScope };

    // Lead Generation Trends grouping (by day for weekly/monthly, else by month)
    const trendGroupId: any =
      period === 'weekly' || period === 'monthly'
        ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } }
        : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };

    // Every dashboard query is independent: run them in one parallel round-trip.
    const [
      totalLeads,
      activeStudents,
      activeApplications,
      pendingTasks,
      approvedVisas,
      totalPaymentsVerified,
      leadsBySource,
      stageCounts,
      leadsByMonthAggr,
    ] = await Promise.all([
      LeadModel.countDocuments(leadMatch),
      LeadModel.countDocuments({ ...leadMatch, status: LeadStatus.INTERESTED }),
      ApplicationModel.countDocuments({ ...scopedFilter, status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }),
      TaskModel.countDocuments({ ...scopedFilter, status: TaskStatus.PENDING }),
      VisaRecordModel.countDocuments({ ...scopedFilter, status: 'APPROVED' }),
      PaymentModel.aggregate([
        { $match: { status: 'VERIFIED', ...scopedFilter } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Leads by source
      LeadModel.aggregate([
        { $match: leadMatch },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $project: { source: '$_id', count: 1, _id: 0 } },
        { $sort: { count: -1 } },
      ]),
      // Leads by stage funnel
      LeadModel.aggregate([
        { $match: leadMatch },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      // Lead generation trend
      LeadModel.aggregate([
        { $match: leadMatch },
        { $group: { _id: trendGroupId, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
    ]);

    const stageMap: Record<string, number> = {};
    stageCounts.forEach((sc) => {
      stageMap[sc._id] = sc.count;
    });

    const funnelStages = Object.values(StudentStage).map((stage) => ({
      stage,
      count: stageMap[stage] || 0,
    }));

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

    // counsellorStats / urgentTasks were removed: the dashboard no longer shows them and they cost
    // 2 queries per counsellor plus a populated task scan on every dashboard load.
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
    };
  }
}
