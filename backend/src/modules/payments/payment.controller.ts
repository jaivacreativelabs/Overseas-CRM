import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { ApiResponse } from '../../utils/api-response';

export class PaymentController {
  static async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const payments = await PaymentService.getPaymentsForLead(req.params.leadId);
      return ApiResponse.success(res, 'Payments retrieved', payments);
    } catch (error) {
      next(error);
    }
  }

  static async createRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await PaymentService.createPaymentRequest(
        req.params.leadId,
        {
          ...req.body,
          amount: parseFloat(req.body.amount),
        },
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.created(res, 'Payment request created', payment);
    } catch (error) {
      next(error);
    }
  }

  static async submitProof(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      const proofUrl = file ? `/uploads/${file.filename}` : req.body.proofUrl;
      const proofFileName = file ? file.originalname : req.body.proofFileName || 'receipt.png';

      const payment = await PaymentService.submitPaymentProof(
        req.params.id,
        {
          transactionReference: req.body.transactionReference,
          paymentMode: req.body.paymentMode || 'Wire Transfer / Online',
          paidDate: req.body.paidDate,
          proofUrl,
          proofFileName,
        },
        req.user!.userId,
        (req as any).user?.email || 'Student'
      );
      return ApiResponse.success(res, 'Payment proof submitted', payment);
    } catch (error) {
      next(error);
    }
  }

  static async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await PaymentService.verifyPayment(
        req.params.id,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.success(res, 'Payment verification recorded', payment);
    } catch (error) {
      next(error);
    }
  }
}
