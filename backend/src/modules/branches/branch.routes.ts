import { Router } from 'express';
import { BranchController } from './branch.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwnerAdmin } from '../../middleware/rbac.middleware';

const router = Router();

// EVERY endpoint in Branch Management is strictly restricted to Owner Admin only
router.use(authenticate);
router.use(requireOwnerAdmin);

// Export CSV for authorized Owner Admin
router.get('/export', BranchController.exportBranchesCSV);

// List and Detail routes
router.get('/', BranchController.getBranches);
router.get('/:id', BranchController.getBranchById);
router.get('/:id/applications', BranchController.getBranchApplications);
router.get('/:id/logs', BranchController.getBranchLogs);

// Assignments
router.post('/assign-student', BranchController.assignStudent);
router.post('/assign-staff', BranchController.assignStaff);

// Modifications
router.post('/', BranchController.createBranch);
router.put('/:id', BranchController.updateBranch);
router.patch('/:id/status', BranchController.toggleStatus);
router.delete('/:id', BranchController.deleteBranch);

export default router;
