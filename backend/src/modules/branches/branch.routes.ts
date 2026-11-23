import { Router } from 'express';
import { BranchController } from './branch.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireOwnerAdmin, requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

// Branch names for filter and assignment dropdowns. Staff-wide and read-only: name and location
// only (no bank details or staff lists). Counsellors get just their own branch.
router.get('/options', requireStaff, BranchController.getBranchOptions);

// Every other endpoint in Branch Management is strictly restricted to Owner Admin only
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
