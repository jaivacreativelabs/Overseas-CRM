import crypto from 'crypto';
import { BranchModel, IBranch } from './branch.model';
import { LeadModel } from '../leads/lead.model';
import { UserModel } from '../users/user.model';
import { ApplicationModel } from '../applications/application.model';
import { IntegrationLogModel, LogStatus } from '../integrations/integration-log.model';
import { BadRequestError, NotFoundError, ConflictError } from '../../utils/errors';

// State codes lookup for Indian States & UTs
const STATE_CODE_MAP: Record<string, string> = {
  'KARNATAKA': 'KA',
  'MAHARASHTRA': 'MH',
  'TAMIL NADU': 'TN',
  'DELHI': 'DL',
  'TELANGANA': 'TS',
  'GUJARAT': 'GJ',
  'KERALA': 'KL',
  'WEST BENGAL': 'WB',
  'RAJASTHAN': 'RJ',
  'UTTAR PRADESH': 'UP',
  'PUNJAB': 'PB',
  'HARYANA': 'HR',
  'ANDHRA PRADESH': 'AP',
  'BIHAR': 'BR',
  'CHHATTISGARH': 'CG',
  'GOA': 'GA',
  'JHARKHAND': 'JH',
  'MADHYA PRADESH': 'MP',
  'ODISHA': 'OD',
  'UTTARAKHAND': 'UK',
  'ASSAM': 'AS',
  'CHANDIGARH': 'CH',
  'PUDUCHERRY': 'PY',
};

export class BranchService {
  /**
   * Generates a readable unique Branch ID: e.g. KA-BLR-A81F2C
   */
  public static generateBranchIdCode(stateName: string, cityName: string): string {
    const cleanState = (stateName || '').trim().toUpperCase();
    const cleanCity = (cityName || '').trim().replace(/[^a-zA-Z]/g, '').toUpperCase();

    const stateCode = STATE_CODE_MAP[cleanState] || cleanState.slice(0, 2).padEnd(2, 'X');
    const cityCode = cleanCity.slice(0, 3).padEnd(3, 'X');

    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();

    return `${stateCode}-${cityCode}-${randomSuffix}`;
  }

  /**
   * Creates a new branch with server-generated unique ID and backend validation
   */
  public static async createBranch(
    data: {
      name: string;
      state: string;
      city: string;
      address: string;
      pinCode?: string;
      contactNumber?: string;
      email?: string;
      managerName?: string;
      managerEmail?: string;
      capacity: number;
      openingDate?: string;
      notes?: string;
      status?: 'ACTIVE' | 'INACTIVE';
    },
    performedByUserId?: string
  ): Promise<IBranch> {
    if (!data.name || !data.state || !data.city || !data.address) {
      throw new BadRequestError('Branch name, state, city, and full address are mandatory');
    }

    if (!data.capacity || Number(data.capacity) < 1) {
      throw new BadRequestError('Branch capacity must be a positive integer');
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      throw new BadRequestError('Invalid branch email address format');
    }

    if (data.managerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.managerEmail.trim())) {
      throw new BadRequestError('Invalid branch manager email address format');
    }

    if (data.pinCode && !/^\d{6}$/.test(data.pinCode.trim())) {
      throw new BadRequestError('PIN code must be a 6-digit number');
    }

    // Check duplicate branch name in same state & city
    const existingSameLoc = await BranchModel.findOne({
      name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
      state: { $regex: new RegExp(`^${data.state.trim()}$`, 'i') },
      city: { $regex: new RegExp(`^${data.city.trim()}$`, 'i') },
      isArchived: false,
    });

    if (existingSameLoc) {
      throw new ConflictError(`A branch named '${data.name}' already exists in ${data.city}, ${data.state}.`);
    }

    // Attempt to generate unique ID with retry logic for rare collisions
    let branchId = '';
    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      const candidateId = this.generateBranchIdCode(data.state, data.city);
      const exists = await BranchModel.findOne({ branchId: candidateId });
      if (!exists) {
        branchId = candidateId;
        break;
      }
    }

    if (!branchId) {
      throw new BadRequestError('Failed to generate unique Branch ID. Please try again.');
    }

    const branch = new BranchModel({
      branchId,
      name: data.name.trim(),
      state: data.state.trim(),
      city: data.city.trim(),
      address: data.address.trim(),
      pinCode: data.pinCode?.trim(),
      contactNumber: data.contactNumber?.trim(),
      email: data.email?.toLowerCase().trim(),
      managerName: data.managerName?.trim(),
      managerEmail: data.managerEmail?.toLowerCase().trim(),
      capacity: Number(data.capacity),
      assignedStudentsCount: 0,
      openingDate: data.openingDate ? new Date(data.openingDate) : new Date(),
      status: data.status || 'ACTIVE',
      notes: data.notes?.trim() || '',
    });

    await branch.save();

    // Log branch creation audit trail
    await IntegrationLogModel.create({
      providerId: 'branch_management',
      eventType: 'branch.created',
      operation: `Created Branch '${branch.name}' (${branch.branchId})`,
      status: LogStatus.SUCCESS,
      requestData: { branchId: branch.branchId, state: branch.state, city: branch.city, capacity: branch.capacity },
      triggeredBy: performedByUserId,
    });

    return branch;
  }

  /**
   * Get list of branches with pagination, search, filters, and state summary statistics
   */
  public static async getBranches(query: {
    search?: string;
    state?: string;
    city?: string;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { isArchived: false };

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { branchId: searchRegex },
        { state: searchRegex },
        { city: searchRegex },
        { address: searchRegex },
        { managerName: searchRegex },
      ];
    }

    if (query.state && query.state !== 'ALL') {
      filter.state = { $regex: new RegExp(`^${query.state.trim()}$`, 'i') };
    }

    if (query.city && query.city !== 'ALL') {
      filter.city = { $regex: new RegExp(`^${query.city.trim()}$`, 'i') };
    }

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status.toUpperCase();
    }

    const sortField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;

    const [branches, total] = await Promise.all([
      BranchModel.find(filter)
        .populate('assignedStaffIds', 'name email role phone avatar')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit),
      BranchModel.countDocuments(filter),
    ]);

    // Recalculate actual assigned student counts from Lead model for guaranteed data consistency
    const allBranches = await BranchModel.find({ isArchived: false });

    let totalCapacity = 0;
    let totalAssignedStudents = 0;
    let activeBranchCount = 0;
    let inactiveBranchCount = 0;

    const stateSummaryMap: Record<
      string,
      {
        state: string;
        branchCount: number;
        totalCapacity: number;
        assignedStudents: number;
        availableSeats: number;
      }
    > = {};

    for (const b of allBranches) {
      if (b.status === 'ACTIVE') activeBranchCount++;
      else inactiveBranchCount++;

      // Get real count from DB
      const realAssignedCount = await LeadModel.countDocuments({
        branchId: b._id,
        isArchived: false,
      });

      if (b.assignedStudentsCount !== realAssignedCount) {
        b.assignedStudentsCount = realAssignedCount;
        await b.save();
      }

      const availableSeats = Math.max(0, b.capacity - b.assignedStudentsCount);
      totalCapacity += b.capacity;
      totalAssignedStudents += b.assignedStudentsCount;

      const stKey = b.state.toUpperCase();
      if (!stateSummaryMap[stKey]) {
        stateSummaryMap[stKey] = {
          state: b.state,
          branchCount: 0,
          totalCapacity: 0,
          assignedStudents: 0,
          availableSeats: 0,
        };
      }
      stateSummaryMap[stKey].branchCount += 1;
      stateSummaryMap[stKey].totalCapacity += b.capacity;
      stateSummaryMap[stKey].assignedStudents += b.assignedStudentsCount;
      stateSummaryMap[stKey].availableSeats += availableSeats;
    }

    const formattedBranches = branches.map((b) => {
      const obj = b.toObject();
      const availableSeats = Math.max(0, b.capacity - b.assignedStudentsCount);
      const utilizationPercentage = b.capacity > 0 ? Math.min(100, Math.round((b.assignedStudentsCount / b.capacity) * 100)) : 0;
      return {
        ...obj,
        availableSeats,
        utilizationPercentage,
      };
    });

    return {
      branches: formattedBranches,
      summary: {
        totalBranches: allBranches.length,
        activeBranches: activeBranchCount,
        inactiveBranches: inactiveBranchCount,
        statesCovered: Object.keys(stateSummaryMap).length,
        totalCapacity,
        totalAssignedStudents,
        availableSeats: Math.max(0, totalCapacity - totalAssignedStudents),
      },
      stateSummaries: Object.values(stateSummaryMap),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single branch details with assigned students list & staff list
   */
  public static async getBranchById(id: string) {
    const branch = await BranchModel.findOne({ _id: id, isArchived: false }).populate(
      'assignedStaffIds',
      'name email role phone avatar'
    );
    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    // Sync real student count
    const assignedStudents = await LeadModel.find({
      branchId: branch._id,
      isArchived: false,
    })
      .select('name email phone city state stage status targetCountry targetCourse createdAt')
      .sort({ createdAt: -1 });

    if (branch.assignedStudentsCount !== assignedStudents.length) {
      branch.assignedStudentsCount = assignedStudents.length;
      await branch.save();
    }

    const availableSeats = Math.max(0, branch.capacity - branch.assignedStudentsCount);
    const utilizationPercentage = branch.capacity > 0 ? Math.min(100, Math.round((branch.assignedStudentsCount / branch.capacity) * 100)) : 0;

    return {
      branch: {
        ...branch.toObject(),
        availableSeats,
        utilizationPercentage,
      },
      assignedStudents,
    };
  }

  /**
   * Fetch applications associated with students assigned to a branch
   */
  public static async getBranchApplications(id: string) {
    const branch = await BranchModel.findOne({ _id: id, isArchived: false });
    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    const assignedLeads = await LeadModel.find({ branchId: branch._id, isArchived: false }).select('_id');
    const leadIds = assignedLeads.map((l) => l._id);

    const applications = await ApplicationModel.find({ leadId: { $in: leadIds } })
      .populate('leadId', 'name email phone stage targetCountry')
      .sort({ createdAt: -1 });

    return applications;
  }

  /**
   * Fetch activity logs for a specific branch
   */
  public static async getBranchLogs(id: string) {
    const branch = await BranchModel.findOne({ _id: id, isArchived: false });
    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    const logs = await IntegrationLogModel.find({
      $or: [{ 'requestData.branchId': branch.branchId }, { operation: new RegExp(branch.name, 'i') }],
    })
      .populate('triggeredBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(50);

    return logs;
  }

  /**
   * Updates branch details while leaving branchId intact and validating capacity bounds
   */
  public static async updateBranch(
    id: string,
    data: {
      name?: string;
      state?: string;
      city?: string;
      address?: string;
      pinCode?: string;
      contactNumber?: string;
      email?: string;
      managerName?: string;
      managerEmail?: string;
      capacity?: number;
      notes?: string;
      status?: 'ACTIVE' | 'INACTIVE';
    },
    performedByUserId?: string
  ): Promise<IBranch> {
    const branch = await BranchModel.findOne({ _id: id, isArchived: false });
    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    if (data.capacity !== undefined) {
      const newCapacity = Number(data.capacity);
      if (isNaN(newCapacity) || newCapacity < 1) {
        throw new BadRequestError('Branch capacity must be a positive integer');
      }

      // Check real assigned count
      const realAssigned = await LeadModel.countDocuments({
        branchId: branch._id,
        isArchived: false,
      });

      if (newCapacity < realAssigned) {
        throw new BadRequestError(
          `Cannot reduce capacity to ${newCapacity}. Branch currently has ${realAssigned} students assigned.`
        );
      }
      branch.capacity = newCapacity;
    }

    if (data.name) branch.name = data.name.trim();
    if (data.state) branch.state = data.state.trim();
    if (data.city) branch.city = data.city.trim();
    if (data.address) branch.address = data.address.trim();
    if (data.pinCode !== undefined) branch.pinCode = data.pinCode.trim();
    if (data.contactNumber !== undefined) branch.contactNumber = data.contactNumber.trim();
    if (data.email !== undefined) branch.email = data.email.toLowerCase().trim();
    if (data.managerName !== undefined) branch.managerName = data.managerName.trim();
    if (data.managerEmail !== undefined) branch.managerEmail = data.managerEmail.toLowerCase().trim();
    if (data.notes !== undefined) branch.notes = data.notes.trim();
    if (data.status) branch.status = data.status;

    await branch.save();

    await IntegrationLogModel.create({
      providerId: 'branch_management',
      eventType: 'branch.updated',
      operation: `Updated Branch '${branch.name}' (${branch.branchId})`,
      status: LogStatus.SUCCESS,
      requestData: { branchId: branch.branchId, capacity: branch.capacity, status: branch.status },
      triggeredBy: performedByUserId,
    });

    return branch;
  }

  /**
   * Activates or deactivates a branch
   */
  public static async toggleStatus(id: string, status: 'ACTIVE' | 'INACTIVE', performedByUserId?: string): Promise<IBranch> {
    const branch = await BranchModel.findOne({ _id: id, isArchived: false });
    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    branch.status = status;
    await branch.save();

    await IntegrationLogModel.create({
      providerId: 'branch_management',
      eventType: status === 'ACTIVE' ? 'branch.activated' : 'branch.deactivated',
      operation: `Set Branch '${branch.name}' status to ${status}`,
      status: LogStatus.SUCCESS,
      requestData: { branchId: branch.branchId, status },
      triggeredBy: performedByUserId,
    });

    return branch;
  }

  /**
   * Deletes a branch safely only when no active students/leads depend on it
   */
  public static async deleteBranch(id: string, performedByUserId?: string): Promise<void> {
    const branch = await BranchModel.findOne({ _id: id, isArchived: false });
    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    const assignedStudentsCount = await LeadModel.countDocuments({
      branchId: branch._id,
      isArchived: false,
    });

    if (assignedStudentsCount > 0) {
      await IntegrationLogModel.create({
        providerId: 'branch_management',
        eventType: 'branch.deletion_blocked',
        operation: `Blocked deletion of Branch '${branch.name}'`,
        status: LogStatus.FAILED,
        errorMessage: `Deletion blocked: ${assignedStudentsCount} student(s) currently assigned`,
        triggeredBy: performedByUserId,
      });

      throw new BadRequestError(
        `Cannot delete branch '${branch.name}' (${branch.branchId}) because ${assignedStudentsCount} student(s) are currently assigned to it. Reassign or deassign students first, or deactivate the branch instead.`
      );
    }

    branch.isArchived = true;
    await branch.save();

    await IntegrationLogModel.create({
      providerId: 'branch_management',
      eventType: 'branch.deleted',
      operation: `Deleted Branch '${branch.name}' (${branch.branchId})`,
      status: LogStatus.SUCCESS,
      requestData: { branchId: branch.branchId },
      triggeredBy: performedByUserId,
    });
  }

  /**
   * Assigns or reassigns a student to a branch with capacity and active status validations
   */
  public static async assignStudentToBranch(studentLeadId: string, branchId: string | null, performedByUserId?: string): Promise<any> {
    const lead = await LeadModel.findOne({ _id: studentLeadId, isArchived: false });
    if (!lead) {
      throw new NotFoundError('Student/Lead record not found');
    }

    // If unassigning
    if (!branchId) {
      const oldBranchId = lead.branchId;
      lead.branchId = undefined;
      await lead.save();

      if (oldBranchId) {
        const count = await LeadModel.countDocuments({ branchId: oldBranchId, isArchived: false });
        await BranchModel.updateOne({ _id: oldBranchId }, { $set: { assignedStudentsCount: count } });
      }
      return lead;
    }

    const newBranch = await BranchModel.findOne({ _id: branchId, isArchived: false });
    if (!newBranch) {
      throw new NotFoundError('Target branch not found');
    }

    if (newBranch.status !== 'ACTIVE') {
      throw new BadRequestError(`Cannot assign student to inactive branch '${newBranch.name}'`);
    }

    // Check real current student count
    const currentCount = await LeadModel.countDocuments({ branchId: newBranch._id, isArchived: false });
    if (lead.branchId?.toString() !== newBranch._id.toString() && currentCount >= newBranch.capacity) {
      throw new BadRequestError(
        `Branch '${newBranch.name}' has reached its maximum capacity of ${newBranch.capacity} students.`
      );
    }

    const oldBranchId = lead.branchId;
    lead.branchId = newBranch._id;
    await lead.save();

    // Update user record if student has user account
    if (lead.studentUserId) {
      await UserModel.updateOne({ _id: lead.studentUserId }, { $set: { branchId: newBranch._id } });
    }

    // Update counts
    const newCount = await LeadModel.countDocuments({ branchId: newBranch._id, isArchived: false });
    newBranch.assignedStudentsCount = newCount;
    await newBranch.save();

    if (oldBranchId && oldBranchId.toString() !== newBranch._id.toString()) {
      const oldCount = await LeadModel.countDocuments({ branchId: oldBranchId, isArchived: false });
      await BranchModel.updateOne({ _id: oldBranchId }, { $set: { assignedStudentsCount: oldCount } });
    }

    await IntegrationLogModel.create({
      providerId: 'branch_management',
      eventType: 'student.branch_assigned',
      operation: `Assigned Student '${lead.name}' to Branch '${newBranch.name}'`,
      status: LogStatus.SUCCESS,
      requestData: { studentId: lead._id, branchId: newBranch.branchId },
      triggeredBy: performedByUserId,
    });

    return lead;
  }

  /**
   * Assigns staff members to a branch
   */
  public static async assignStaffToBranch(branchId: string, staffUserIds: string[], performedByUserId?: string) {
    const branch = await BranchModel.findOne({ _id: branchId, isArchived: false });
    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    branch.assignedStaffIds = staffUserIds as any;
    await branch.save();

    await IntegrationLogModel.create({
      providerId: 'branch_management',
      eventType: 'staff.branch_assigned',
      operation: `Updated Staff assignments for Branch '${branch.name}'`,
      status: LogStatus.SUCCESS,
      requestData: { branchId: branch.branchId, staffCount: staffUserIds.length },
      triggeredBy: performedByUserId,
    });

    return branch.populate('assignedStaffIds', 'name email role phone avatar');
  }

  /**
   * Export all branch records to CSV string
   */
  public static async exportBranchesToCSV(): Promise<string> {
    const result = await this.getBranches({ limit: 1000 });
    const branches = result.branches;

    const headers = [
      'Branch ID',
      'Branch Name',
      'State',
      'City',
      'Address',
      'PIN Code',
      'Branch Manager',
      'Manager Email',
      'Assigned Students',
      'Capacity',
      'Available Seats',
      'Utilization %',
      'Status',
      'Created Date',
    ];

    const rows = branches.map((b) => [
      `"${b.branchId || ''}"`,
      `"${b.name || ''}"`,
      `"${b.state || ''}"`,
      `"${b.city || ''}"`,
      `"${b.address || ''}"`,
      `"${b.pinCode || ''}"`,
      `"${b.managerName || ''}"`,
      `"${b.managerEmail || ''}"`,
      `"${b.assignedStudentsCount || 0}"`,
      `"${b.capacity || 0}"`,
      `"${b.availableSeats || 0}"`,
      `"${b.utilizationPercentage || 0}%"`,
      `"${b.status || ''}"`,
      `"${b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
