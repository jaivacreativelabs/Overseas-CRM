import { Router } from 'express';
import { UniversityController } from './university.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

// Masters (all authenticated users can read, staff can write)
router.get('/countries', UniversityController.getCountries);
router.post('/countries', requireStaff, UniversityController.createCountry);

router.get('/list', UniversityController.getUniversities);
router.post('/', requireStaff, UniversityController.createUniversity);

router.get('/courses', UniversityController.getCourses);
router.post('/courses', requireStaff, UniversityController.createCourse);

// Shortlists
router.get('/shortlists/:leadId', UniversityController.getShortlist);
router.post('/shortlists/:leadId', requireStaff, UniversityController.addToShortlist);
router.put('/shortlists/item/:shortlistId/visibility', requireStaff, UniversityController.toggleVisibility);
router.post('/shortlists/:leadId/select/:shortlistId', UniversityController.studentSelectUniversity);

export default router;
