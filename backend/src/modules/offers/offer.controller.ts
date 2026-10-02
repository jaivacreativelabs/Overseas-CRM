import { Request, Response, NextFunction } from 'express';
import { OfferService } from './offer.service';
import { ApiResponse } from '../../utils/api-response';
import { OfferStatus } from '../../config/constants';

export class OfferController {
  static async getAllOffers(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as any;
      const offers = await OfferService.getAllOffers(status);
      return ApiResponse.success(res, 'All offers retrieved', offers);
    } catch (error) {
      next(error);
    }
  }

  static async getOffers(req: Request, res: Response, next: NextFunction) {
    try {
      const offers = await OfferService.getOffersForLead(req.params.leadId);
      return ApiResponse.success(res, 'Offers retrieved', offers);
    } catch (error) {
      next(error);
    }
  }

  static async uploadOriginal(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      const originalOfferUrl = file ? `/uploads/${file.filename}` : req.body.originalOfferUrl;
      const originalOfferFileName = file ? file.originalname : req.body.originalOfferFileName || 'offer_letter.pdf';

      if (!originalOfferUrl) {
        return ApiResponse.error(res, 'Original offer file or URL is required', 400);
      }

      const offer = await OfferService.uploadOriginalOffer(
        req.params.leadId,
        {
          applicationId: req.body.applicationId,
          offerType: req.body.offerType || 'CONDITIONAL',
          conditions: req.body.conditions,
          tuitionFee: parseFloat(req.body.tuitionFee) || 0,
          depositAmount: parseFloat(req.body.depositAmount) || 0,
          currency: req.body.currency || 'USD',
          deadlineDate: req.body.deadlineDate,
          originalOfferUrl,
          originalOfferFileName,
        },
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.created(res, 'Original offer uploaded', offer);
    } catch (error) {
      next(error);
    }
  }

  static async uploadSigned(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      const signedOfferUrl = file ? `/uploads/${file.filename}` : req.body.signedOfferUrl;
      const signedOfferFileName = file ? file.originalname : req.body.signedOfferFileName || 'signed_offer.pdf';

      if (!signedOfferUrl) {
        return ApiResponse.error(res, 'Signed offer file or URL is required', 400);
      }

      const offer = await OfferService.uploadSignedOffer(
        req.params.id,
        signedOfferUrl,
        signedOfferFileName,
        req.user!.userId,
        (req as any).user?.email || 'Student'
      );
      return ApiResponse.success(res, 'Signed offer uploaded', offer);
    } catch (error) {
      next(error);
    }
  }

  static async reviewSigned(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, notes, reviewNotes, rejectionReason } = req.body;
      const finalNotes = notes || reviewNotes || rejectionReason;
      const offer = await OfferService.reviewSignedOffer(
        req.params.id,
        status as OfferStatus.ACCEPTED | OfferStatus.REJECTED,
        finalNotes,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Offer review completed', offer);
    } catch (error) {
      next(error);
    }
  }
}
