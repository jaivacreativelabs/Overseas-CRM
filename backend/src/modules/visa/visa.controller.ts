import { Request, Response, NextFunction } from 'express';
import { VisaService } from './visa.service';
import { ApiResponse } from '../../utils/api-response';
import { BadRequestError } from '../../utils/errors';

export class VisaController {
  /**
   * GET /api/v1/visa
   * List visa records with filtering, searching, pagination & summary statistics
   */
  static async getVisaList(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await VisaService.getVisaRecords(req.query, req.user);
      return ApiResponse.success(res, 'Visa records retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/visa/:id
   * Get single visa record by ID
   */
  static async getVisaById(req: Request, res: Response, next: NextFunction) {
    try {
      const visa = await VisaService.getVisaById(req.params.id, req.user);
      return ApiResponse.success(res, 'Visa record retrieved', visa);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/visa/lead/:leadId
   * Get visa record by lead ID
   */
  static async getVisaForLead(req: Request, res: Response, next: NextFunction) {
    try {
      const visa = await VisaService.getVisaForLead(req.params.leadId, req.user);
      return ApiResponse.success(res, 'Visa record retrieved', visa);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/visa/:id/status
   * Update status of a visa application with audit trail and remarks
   */
  static async updateVisaStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const userName = (req as any).user?.name || (req as any).user?.email || 'Staff';
      const visa = await VisaService.updateVisaStatus(
        req.params.id,
        req.body,
        user.userId,
        userName,
        user.role
      );
      return ApiResponse.success(res, 'Visa status updated successfully', visa);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/visa/:id/decision
   * Record official Visa Decision (Approved or Rejected)
   */
  static async recordDecision(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const userName = (req as any).user?.name || (req as any).user?.email || 'Staff';
      const visa = await VisaService.recordVisaDecision(
        req.params.id,
        req.body,
        user.userId,
        userName,
        user.role
      );
      return ApiResponse.success(res, 'Visa decision recorded successfully', visa);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/visa/upload-document
   * Upload supporting decision document or visa grant letter
   */
  static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        throw new BadRequestError('No file provided for upload');
      }
      return ApiResponse.success(res, 'Document uploaded successfully', {
        fileUrl: `/uploads/${file.filename}`,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Legacy PUT /api/v1/visa/lead/:leadId
   * Backward compatibility for lead detail page
   */
  static async updateVisa(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const userName = (req as any).user?.name || (req as any).user?.email || 'Staff';
      const visa = await VisaService.updateVisaStatus(
        req.params.leadId,
        req.body,
        user.userId,
        userName,
        user.role
      );
      return ApiResponse.success(res, 'Visa record updated', visa);
    } catch (error) {
      next(error);
    }
  }
}
