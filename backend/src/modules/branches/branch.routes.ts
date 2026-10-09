import { Router } from 'express';
import { BranchController } from './branch.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin, requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Staff and Admin can view branches
router.get('/', requireStaff, BranchController.getBranches);
router.get('/:id', requireStaff, BranchController.getBranchById);

// Staff and Admin can assign students to branches
router.post('/assign-student', requireStaff, BranchController.assignStudent);

// Admin exclusive management routes
router.post('/', requireAdmin, BranchController.createBranch);
router.put('/:id', requireAdmin, BranchController.updateBranch);
router.patch('/:id/status', requireAdmin, BranchController.toggleStatus);
router.delete('/:id', requireAdmin, BranchController.deleteBranch);

export default router;
