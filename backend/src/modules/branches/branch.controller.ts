import { Request, Response } from 'express';
import { BranchService } from './branch.service';
import { ApiResponse } from '../../utils/api-response';

export class BranchController {
  public static createBranch = async (req: Request, res: Response) => {
    const branch = await BranchService.createBranch(req.body, req.user?.userId);
    return ApiResponse.success(res, 'Branch created successfully', branch, 201);
  };

  public static getBranches = async (req: Request, res: Response) => {
    const result = await BranchService.getBranches({
      search: req.query.search as string,
      state: req.query.state as string,
      city: req.query.city as string,
      status: req.query.status as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    });
    return ApiResponse.success(res, 'Branches fetched successfully', result);
  };

  public static getBranchById = async (req: Request, res: Response) => {
    const result = await BranchService.getBranchById(req.params.id);
    return ApiResponse.success(res, 'Branch details fetched successfully', result);
  };

  public static getBranchApplications = async (req: Request, res: Response) => {
    const applications = await BranchService.getBranchApplications(req.params.id);
    return ApiResponse.success(res, 'Branch applications fetched successfully', applications);
  };

  public static getBranchLogs = async (req: Request, res: Response) => {
    const logs = await BranchService.getBranchLogs(req.params.id);
    return ApiResponse.success(res, 'Branch activity logs fetched successfully', logs);
  };

  public static updateBranch = async (req: Request, res: Response) => {
    const branch = await BranchService.updateBranch(req.params.id, req.body, req.user?.userId);
    return ApiResponse.success(res, 'Branch updated successfully', branch);
  };

  public static toggleStatus = async (req: Request, res: Response) => {
    const { status } = req.body;
    const branch = await BranchService.toggleStatus(req.params.id, status, req.user?.userId);
    return ApiResponse.success(res, `Branch status updated to ${status}`, branch);
  };

  public static deleteBranch = async (req: Request, res: Response) => {
    await BranchService.deleteBranch(req.params.id, req.user?.userId);
    return ApiResponse.success(res, 'Branch deleted successfully');
  };

  public static assignStudent = async (req: Request, res: Response) => {
    const { studentLeadId, branchId } = req.body;
    const result = await BranchService.assignStudentToBranch(studentLeadId, branchId, req.user?.userId);
    return ApiResponse.success(res, 'Student branch assignment updated successfully', result);
  };

  public static assignStaff = async (req: Request, res: Response) => {
    const { branchId, staffUserIds } = req.body;
    const branch = await BranchService.assignStaffToBranch(branchId, staffUserIds, req.user?.userId);
    return ApiResponse.success(res, 'Staff assignments updated successfully', branch);
  };

  public static exportBranchesCSV = async (req: Request, res: Response) => {
    const csvContent = await BranchService.exportBranchesToCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=branch_management_export.csv');
    return res.status(200).send(csvContent);
  };
}
