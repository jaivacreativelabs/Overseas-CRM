import { Router } from 'express';
import { CounsellingFeeController } from './counselling-fee.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { UserRole } from '../../config/constants';
import { COUNSELLING_FEE_ROLES } from './counselling-fee.constants';
import {
  counsellingFeeLeadParamSchema,
  counsellingFeeSummariesSchema,
  recordCounsellingFeePaymentSchema,
  setCounsellingFeeSchema,
} from './counselling-fee.validator';

const router = Router();
const requireFeeStaffAccess = authorize(...COUNSELLING_FEE_ROLES);

const allowStudentFeeRead = (req: any, res: any, next: any) => {
  if (req.user?.role === UserRole.STUDENT) {
    return next();
  }
  return requireFeeStaffAccess(req, res, next);
};

router.use(authenticate);

router.get('/summaries', requireFeeStaffAccess, validate(counsellingFeeSummariesSchema), CounsellingFeeController.getSummaries);
router.get('/lead/:leadId', allowStudentFeeRead, validate(counsellingFeeLeadParamSchema), CounsellingFeeController.getFeeByLeadId);
router.put('/lead/:leadId', requireFeeStaffAccess, validate(setCounsellingFeeSchema), CounsellingFeeController.setFee);
router.post(
  '/lead/:leadId/payments',
  requireFeeStaffAccess,
  validate(recordCounsellingFeePaymentSchema),
  CounsellingFeeController.recordPayment
);

export default router;