import { Request, Response, NextFunction } from 'express';
import { DocumentService } from './document.service';
import { ApiResponse } from '../../utils/api-response';

export class DocumentController {
  static async getDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const docs = await DocumentService.getDocumentsForLead(req.params.leadId);
      return ApiResponse.success(res, 'Documents fetched', docs);
    } catch (error) {
      next(error);
    }
  }

  static async requestDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await DocumentService.requestDocument(
        req.params.leadId,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.created(res, 'Document requested', doc);
    } catch (error) {
      next(error);
    }
  }

  static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      const fileUrl = file ? `/uploads/${file.filename}` : req.body.fileUrl;
      const originalFileName = file ? file.originalname : req.body.originalFileName || 'document.pdf';

      const doc = await DocumentService.uploadDocument(
        req.params.id,
        {
          fileUrl,
          originalFileName,
          fileSize: file ? file.size : undefined,
          mimeType: file ? file.mimetype : undefined,
        },
        req.user!.userId,
        (req as any).user?.email || 'User',
        req.user!.role
      );
      return ApiResponse.success(res, 'Document uploaded successfully', doc);
    } catch (error) {
      next(error);
    }
  }

  static async reviewDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await DocumentService.reviewDocument(
        req.params.id,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Document review completed', doc);
    } catch (error) {
      next(error);
    }
  }
}
