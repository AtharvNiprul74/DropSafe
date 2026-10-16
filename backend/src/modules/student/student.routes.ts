import { Router } from 'express';
import { studentController } from './student.controller';
import { authenticate } from '../../middlewares/auth';
import { enforceTenantIsolation } from '../../middlewares/tenantIsolation';
import { requireAnyPermission } from '../../middlewares/rbac';
import { AccessAction } from '@prisma/client';

const router = Router();

// Enforce authentication and strict tenant isolation on all student & academic record routes
router.use(authenticate, enforceTenantIsolation);

const canViewStudent = requireAnyPermission(
  ['student:view', 'organization:update'],
  AccessAction.READ
);
const canCreateStudent = requireAnyPermission(
  ['student:create', 'organization:update'],
  AccessAction.WRITE
);
const canUpdateStudent = requireAnyPermission(
  ['student:update', 'organization:update'],
  AccessAction.WRITE
);

const canRecordAttendance = requireAnyPermission(
  ['attendance:create', 'student:update', 'organization:update'],
  AccessAction.WRITE
);
const canUpdateAttendance = requireAnyPermission(
  ['attendance:update', 'student:update', 'organization:update'],
  AccessAction.WRITE
);

const canRecordAssessment = requireAnyPermission(
  ['assessment:create', 'student:update', 'organization:update'],
  AccessAction.WRITE
);
const canUpdateAssessment = requireAnyPermission(
  ['assessment:update', 'student:update', 'organization:update'],
  AccessAction.WRITE
);

// ==========================================
// 1. LOOKUP & GLOBAL ENROLLMENTS (Defined before /:id parameterized routes)
// ==========================================
router.get('/lookup/identifier', canViewStudent, (req, res, next) =>
  studentController.lookupStudentByIdentifier(req, res, next)
);

router.get('/enrollments', canViewStudent, (req, res, next) =>
  studentController.listEnrollments(req, res, next)
);
router.post('/enrollments', canCreateStudent, (req, res, next) =>
  studentController.createEnrollment(req, res, next)
);
router.get('/enrollments/:enrollmentId', canViewStudent, (req, res, next) =>
  studentController.getEnrollmentById(req, res, next)
);
router.patch('/enrollments/:enrollmentId/status', canUpdateStudent, (req, res, next) =>
  studentController.updateEnrollmentStatus(req, res, next)
);

// ==========================================
// 2. ACADEMIC RECORDS & PERFORMANCE (ATTENDANCE & ASSESSMENTS)
// ==========================================
router.get('/academic-records/:recordId', canViewStudent, (req, res, next) =>
  studentController.getAcademicRecord(req, res, next)
);

router.post('/academic-records/:recordId/attendance', canRecordAttendance, (req, res, next) =>
  studentController.recordAttendance(req, res, next)
);
router.patch('/academic-records/attendance/:attendanceId', canUpdateAttendance, (req, res, next) =>
  studentController.updateAttendance(req, res, next)
);

router.post('/academic-records/:recordId/assessments', canRecordAssessment, (req, res, next) =>
  studentController.recordAssessment(req, res, next)
);
router.patch('/academic-records/assessments/:assessmentId', canUpdateAssessment, (req, res, next) =>
  studentController.updateAssessment(req, res, next)
);

// ==========================================
// 3. STUDENT IDENTITY & PROFILE
// ==========================================
router.post('/', canCreateStudent, (req, res, next) => studentController.createStudent(req, res, next));
router.get('/', canViewStudent, (req, res, next) => studentController.listStudents(req, res, next));
router.get('/:id', canViewStudent, (req, res, next) => studentController.getStudentById(req, res, next));
router.patch('/:id', canUpdateStudent, (req, res, next) => studentController.updateStudent(req, res, next));
router.patch('/:id/status', canUpdateStudent, (req, res, next) =>
  studentController.updateStudentStatus(req, res, next)
);
router.delete('/:id', canUpdateStudent, (req, res, next) => studentController.deleteStudent(req, res, next));

// ==========================================
// 4. STUDENT IDENTIFIERS
// ==========================================
router.post('/:id/identifiers', canUpdateStudent, (req, res, next) =>
  studentController.addIdentifier(req, res, next)
);
router.get('/:id/identifiers', canViewStudent, (req, res, next) =>
  studentController.listIdentifiers(req, res, next)
);
router.patch('/:id/identifiers/:identifierId', canUpdateStudent, (req, res, next) =>
  studentController.updateIdentifier(req, res, next)
);
router.delete('/:id/identifiers/:identifierId', canUpdateStudent, (req, res, next) =>
  studentController.deleteIdentifier(req, res, next)
);

// ==========================================
// 5. STUDENT-SCOPED ENROLLMENTS
// ==========================================
router.post('/:id/enrollments', canCreateStudent, (req, res, next) =>
  studentController.createEnrollment(req, res, next)
);
router.get('/:id/enrollments', canViewStudent, (req, res, next) =>
  studentController.listEnrollments(req, res, next)
);

export default router;
