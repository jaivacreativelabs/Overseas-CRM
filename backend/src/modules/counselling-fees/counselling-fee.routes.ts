import { Router } from 'express';
import { CounsellingFeeController } from './counselling-fee.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { COUNSELLING_FEE_ROLES } from './counselling-fee.constants';
import {
  counsellingFeeLeadParamSchema,
  counsellingFeeSummariesSchema,
  recordCounsellingFeePaymentSchema,
  setCounsellingFeeSchema,
} from './counselling-fee.validator';

const router = Router();

const requireCounsellingFeeAccess = authorize(...COUNSELLING_FEE_ROLES);

router.use(authenticate, requireCounsellingFeeAccess);

router.get('/summaries', validate(counsellingFeeSummariesSchema), CounsellingFeeController.getSummaries);
router.get('/lead/:leadId', validate(counsellingFeeLeadParamSchema), CounsellingFeeController.getFeeByLeadId);
router.put('/lead/:leadId', validate(setCounsellingFeeSchema), CounsellingFeeController.setFee);
router.post(
  '/lead/:leadId/payments',
  validate(recordCounsellingFeePaymentSchema),
  CounsellingFeeController.recordPayment
);

export default router;