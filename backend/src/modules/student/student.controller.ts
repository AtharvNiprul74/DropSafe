import { Request, Response, NextFunction } from 'express';
import { studentService } from './student.service';
import {
  createStudentSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
  createIdentifierSchema,
  updateIdentifierSchema,
  createEnrollmentSchema,
  updateEnrollmentStatusSchema,
  recordAttendanceSchema,
  updateAttendanceSchema,
  recordAssessmentSchema,
  updateAssessmentSchema,
} from './student.validation';
import { sendSuccess, sendCreated } from '../../core/utils/response';
import { getTenantId } from '../../middlewares/tenantIsolation';
import { ValidationError } from '../../core/errors/AppError';
import { StudentStatus, EnrollmentStatus } from '@prisma/client';

export class StudentController {
  // ==========================================
  // 1. STUDENT IDENTITY
  // ==========================================

  async createStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = createStudentSchema.parse(req.body);
      const student = await studentService.createStudent(orgId, validated, req.user?.userId);
      sendCreated(res, student, 'Student profile created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const search = req.query.search as string | undefined;
      const status = req.query.status as StudentStatus | undefined;
      const periodId = req.query.periodId as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const result = await studentService.listStudents(orgId, { search, status, periodId, page, limit });
      sendSuccess(res, result.items, 'Students retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getStudentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const student = await studentService.getStudentById(orgId, id);
      sendSuccess(res, student, 'Student profile retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const validated = updateStudentSchema.parse(req.body);
      const updated = await studentService.updateStudent(orgId, id, validated, req.user?.userId);
      sendSuccess(res, updated, 'Student profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStudentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const { status } = updateStudentStatusSchema.parse(req.body);
      const updated = await studentService.updateStudentStatus(orgId, id, status, req.user?.userId);
      sendSuccess(res, updated, `Student status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  async deleteStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const result = await studentService.deleteStudent(orgId, id, req.user?.userId);
      sendSuccess(res, result, 'Student profile deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 2. STUDENT IDENTIFIERS
  // ==========================================

  async addIdentifier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const studentId = String(req.params.id);
      const validated = createIdentifierSchema.parse(req.body);
      const identifier = await studentService.addIdentifier(orgId, studentId, validated, req.user?.userId);
      sendCreated(res, identifier, 'Student identifier assigned successfully');
    } catch (error) {
      next(error);
    }
  }

  async listIdentifiers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const studentId = String(req.params.id);
      const identifiers = await studentService.listIdentifiers(orgId, studentId);
      sendSuccess(res, identifiers, 'Student identifiers retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateIdentifier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const studentId = String(req.params.id);
      const identifierId = String(req.params.identifierId);
      const validated = updateIdentifierSchema.parse(req.body);
      const updated = await studentService.updateIdentifier(
        orgId,
        studentId,
        identifierId,
        validated,
        req.user?.userId
      );
      sendSuccess(res, updated, 'Student identifier updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteIdentifier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const studentId = String(req.params.id);
      const identifierId = String(req.params.identifierId);
      const result = await studentService.deleteIdentifier(orgId, studentId, identifierId, req.user?.userId);
      sendSuccess(res, result, 'Student identifier removed successfully');
    } catch (error) {
      next(error);
    }
  }

  async lookupStudentByIdentifier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const type = req.query.type as string;
      const value = req.query.value as string;

      if (!type || !value) {
        throw new ValidationError("Query parameters 'type' and 'value' are required for student lookup");
      }

      const student = await studentService.lookupStudentByIdentifier(orgId, type, value);
      sendSuccess(res, student, 'Student matched by identifier');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 3. ENROLLMENTS ENGINE
  // ==========================================

  async createEnrollment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const studentId = req.params.id ? String(req.params.id) : req.body.student_id;
      const validated = createEnrollmentSchema.parse({
        ...req.body,
        student_id: studentId,
      });

      const enrollment = await studentService.createEnrollment(orgId, validated, req.user?.userId);
      sendCreated(res, enrollment, 'Student enrolled into academic period successfully');
    } catch (error) {
      next(error);
    }
  }

  async listEnrollments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const studentId = req.params.id ? String(req.params.id) : (req.query.studentId as string | undefined);
      const periodId = req.query.periodId as string | undefined;
      const status = req.query.status as EnrollmentStatus | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const result = await studentService.listEnrollments(orgId, { studentId, periodId, status, page, limit });
      sendSuccess(res, result.items, 'Enrollments retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getEnrollmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const enrollmentId = String(req.params.enrollmentId);
      const enrollment = await studentService.getEnrollmentById(orgId, enrollmentId);
      sendSuccess(res, enrollment, 'Enrollment details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateEnrollmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const enrollmentId = String(req.params.enrollmentId);
      const { status } = updateEnrollmentStatusSchema.parse(req.body);
      const updated = await studentService.updateEnrollmentStatus(orgId, enrollmentId, status, req.user?.userId);
      sendSuccess(res, updated, `Enrollment status transitioned to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 4. ACADEMIC RECORDS & PERFORMANCE
  // ==========================================

  async getAcademicRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const recordId = String(req.params.recordId);
      const record = await studentService.getAcademicRecord(orgId, recordId);
      sendSuccess(res, record, 'Academic record and performance metrics retrieved');
    } catch (error) {
      next(error);
    }
  }

  async recordAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const recordId = String(req.params.recordId);
      const validated = recordAttendanceSchema.parse(req.body);
      const attendance = await studentService.recordAttendance(orgId, recordId, validated, req.user?.userId);
      sendCreated(res, attendance, 'Attendance recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const attendanceId = String(req.params.attendanceId);
      const validated = updateAttendanceSchema.parse(req.body);
      const updated = await studentService.updateAttendance(orgId, attendanceId, validated, req.user?.userId);
      sendSuccess(res, updated, 'Attendance record updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async recordAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const recordId = String(req.params.recordId);
      const validated = recordAssessmentSchema.parse(req.body);
      const assessment = await studentService.recordAssessment(orgId, recordId, validated, req.user?.userId);
      sendCreated(res, assessment, 'Assessment marks recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const assessmentId = String(req.params.assessmentId);
      const validated = updateAssessmentSchema.parse(req.body);
      const updated = await studentService.updateAssessment(orgId, assessmentId, validated, req.user?.userId);
      sendSuccess(res, updated, 'Assessment record updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const studentController = new StudentController();
