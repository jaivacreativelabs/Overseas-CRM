import { Request, Response, NextFunction } from 'express';
import { LeadService } from './lead.service';
import { ApiResponse } from '../../utils/api-response';
import { LeadSource, LeadStatus, StudentStage, UserRole } from '../../config/constants';

export class LeadController {
  static async getLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
      const search = req.query.search as string;
      const status = req.query.status as LeadStatus;
      const stage = req.query.stage as StudentStage;
      const source = req.query.source as LeadSource;
      const counsellorId = req.query.counsellorId as string;
      const targetCountry = req.query.targetCountry as string;
      const isArchived = req.query.isArchived === 'true';
      const isStudent = req.query.isStudent !== undefined ? req.query.isStudent === 'true' : undefined;

      const result = await LeadService.getLeads({
        page,
        limit,
        search,
        status,
        stage,
        source,
        counsellorId,
        targetCountry,
        isArchived,
        isStudent,
      });

      return ApiResponse.success(res, 'Leads retrieved successfully', result.leads, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getLeadById(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await LeadService.getLeadById(req.params.id);
      return ApiResponse.success(res, 'Lead retrieved successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  static async createLead(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await LeadService.createLead({
        ...req.body,
        actorUserId: req.user?.userId,
        actorName: (req as any).user?.email || 'System',
        actorRole: req.user?.role,
      });
      return ApiResponse.created(res, 'Lead created successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  static async updateLead(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await LeadService.updateLead(
        req.params.id,
        req.body,
        req.user?.userId,
        (req as any).user?.email || 'System',
        req.user?.role
      );
      return ApiResponse.success(res, 'Lead updated successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  static async recordContactAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const contactAttempt = await LeadService.recordContactAttempt(
        req.params.id,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.created(res, 'Contact attempt recorded', contactAttempt);
    } catch (error) {
      next(error);
    }
  }

  static async scheduleCounselling(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await LeadService.scheduleCounselling(
        req.params.id,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.created(res, 'Counselling scheduled successfully', session);
    } catch (error) {
      next(error);
    }
  }

  static async updateCounsellingAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await LeadService.updateCounsellingAttendance(
        req.params.id,
        req.params.sessionId,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Counselling attendance updated', session);
    } catch (error) {
      next(error);
    }
  }

  static async convertToInterested(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LeadService.convertToInterested(
        req.params.id,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Lead marked as Interested and student account provisioned', result);
    } catch (error) {
      next(error);
    }
  }

  static async markClosedLost(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await LeadService.markClosedLost(
        req.params.id,
        req.body.reason,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Lead marked as Closed Lost', lead);
    } catch (error) {
      next(error);
    }
  }

  static async reopenClosedLost(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await LeadService.reopenClosedLost(
        req.params.id,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Closed Lost lead reopened successfully', lead);
    } catch (error) {
      next(error);
    }
  }

  static async archiveLead(req: Request, res: Response, next: NextFunction) {
    try {
      await LeadService.archiveLead(req.params.id, req.user!.userId, req.user!.role);
      return ApiResponse.success(res, 'Lead archived successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteLead(req: Request, res: Response, next: NextFunction) {
    try {
      await LeadService.deleteLead(req.params.id, req.user!.userId, req.user!.role);
      return ApiResponse.success(res, 'Lead permanently deleted');
    } catch (error) {
      next(error);
    }
  }
}
