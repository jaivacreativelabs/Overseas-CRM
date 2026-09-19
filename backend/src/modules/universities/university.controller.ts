import { Request, Response, NextFunction } from 'express';
import { UniversityService } from './university.service';
import { ApiResponse } from '../../utils/api-response';
import { UserRole } from '../../config/constants';

export class UniversityController {
  static async getCountries(req: Request, res: Response, next: NextFunction) {
    try {
      const countries = await UniversityService.getCountries();
      return ApiResponse.success(res, 'Countries retrieved', countries);
    } catch (error) {
      next(error);
    }
  }

  static async createCountry(req: Request, res: Response, next: NextFunction) {
    try {
      const country = await UniversityService.createCountry(req.body);
      return ApiResponse.created(res, 'Country created', country);
    } catch (error) {
      next(error);
    }
  }

  static async getUniversities(req: Request, res: Response, next: NextFunction) {
    try {
      const country = req.query.country as string;
      const universities = await UniversityService.getUniversities(country);
      return ApiResponse.success(res, 'Universities retrieved', universities);
    } catch (error) {
      next(error);
    }
  }

  static async createUniversity(req: Request, res: Response, next: NextFunction) {
    try {
      const university = await UniversityService.createUniversity(req.body);
      return ApiResponse.created(res, 'University created', university);
    } catch (error) {
      next(error);
    }
  }

  static async getCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const universityId = req.query.universityId as string;
      const country = req.query.country as string;
      const courses = await UniversityService.getCourses(universityId, country);
      return ApiResponse.success(res, 'Courses retrieved', courses);
    } catch (error) {
      next(error);
    }
  }

  static async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await UniversityService.createCourse(req.body);
      return ApiResponse.created(res, 'Course created', course);
    } catch (error) {
      next(error);
    }
  }

  static async getShortlist(req: Request, res: Response, next: NextFunction) {
    try {
      const isStudent = req.user?.role === UserRole.STUDENT;
      const shortlist = await UniversityService.getShortlistForLead(req.params.leadId, isStudent);
      return ApiResponse.success(res, 'Shortlist retrieved', shortlist);
    } catch (error) {
      next(error);
    }
  }

  static async addToShortlist(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await UniversityService.addToShortlist(
        req.params.leadId,
        req.body,
        req.user!.userId,
        (req as any).user?.email || 'Staff',
        req.user!.role
      );
      return ApiResponse.created(res, 'Shortlist entry added', item);
    } catch (error) {
      next(error);
    }
  }

  static async toggleVisibility(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await UniversityService.toggleVisibility(
        req.params.shortlistId,
        req.body.isVisible,
        req.user!.userId,
        req.user!.role
      );
      return ApiResponse.success(res, 'Visibility updated', item);
    } catch (error) {
      next(error);
    }
  }

  static async studentSelectUniversity(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await UniversityService.studentSelectUniversity(
        req.params.leadId,
        req.params.shortlistId,
        req.user!.userId,
        (req as any).user?.email || 'Student'
      );
      return ApiResponse.success(res, 'University successfully selected', item);
    } catch (error) {
      next(error);
    }
  }
}
