import { prisma } from '../../../config/database';
import {
  ImportType,
  ImportSessionStatus,
  ImportResultStatus,
  StudentStatus,
  EnrollmentStatus,
} from '@prisma/client';
import { csvParserService } from './csvParser.service';
import { importStorageService } from './importStorage.service';
import { importSessionService } from './importSession.service';
import {
  validateStudentHeaders,
  mapStudentRow,
  studentRowSchema,
  StudentRowParsed,
} from '../validators/student.row.validator';
import {
  validateEnrollmentHeaders,
  mapEnrollmentRow,
  enrollmentRowSchema,
  EnrollmentRowParsed,
} from '../validators/enrollment.row.validator';
import {
  validateAttendanceHeaders,
  mapAttendanceRow,
  attendanceRowSchema,
  AttendanceRowParsed,
} from '../validators/attendance.row.validator';
import {
  validateAssessmentHeaders,
  mapAssessmentRow,
  assessmentRowSchema,
  AssessmentRowParsed,
} from '../validators/assessment.row.validator';
import { ValidationError, NotFoundError } from '../../../core/errors/AppError';

export interface RowValidationError {
  row: number;
  identifier?: string;
  errors: string[];
}

export interface ValidationPipelineResult {
  sessionId: string;
  importType: ImportType;
  totalRecords: number;
  validRecords: number;
  rejectedRecords: number;
  isFatal: boolean;
  fatalError?: string;
  rowErrors: RowValidationError[];
  validRows: any[];
}

export class ValidationPipelineService {
  /**
   * Run the complete Two-Stage Validation Pipeline on a session
   */
  public async validateSession(
    organizationId: string,
    sessionId: string,
    fileId?: string
  ): Promise<ValidationPipelineResult> {
    // 1. Verify session existence & transition to VALIDATING
    const session = await importSessionService.getSessionById(organizationId, sessionId);

    if (
      session.status !== ImportSessionStatus.CREATED &&
      session.status !== ImportSessionStatus.VALIDATING &&
      session.status !== ImportSessionStatus.VALIDATED
    ) {
      throw new ValidationError(
        `Cannot validate session '${sessionId}' in status '${session.status}'. Must be in 'CREATED' or 'VALIDATED' status.`
      );
    }

    if (session.status === ImportSessionStatus.CREATED) {
      await importSessionService.transitionStatus(
        organizationId,
        sessionId,
        ImportSessionStatus.VALIDATING
      );
    }

    // 2. Fetch File Content
    let fileBuffer: Buffer;
    try {
      const fileData = await importStorageService.getFileBuffer(sessionId, fileId);
      fileBuffer = fileData.buffer;
    } catch (err: any) {
      return this.handleFatalError(
        organizationId,
        sessionId,
        session.import_type,
        `Stage 1 Fatal Error: ${err.message || 'File not found'}`
      );
    }

    // ------------------------------------------------------------------
    // STAGE 1: FATAL STRUCTURAL CHECKS
    // ------------------------------------------------------------------
    let parsedCsv;
    try {
      parsedCsv = csvParserService.parse(fileBuffer);
    } catch (parseErr: any) {
      return this.handleFatalError(
        organizationId,
        sessionId,
        session.import_type,
        `Stage 1 Fatal Error (Parsing/Encoding): ${parseErr.message}`
      );
    }

    const { headers, rows } = parsedCsv;

    if (rows.length === 0) {
      return this.handleFatalError(
        organizationId,
        sessionId,
        session.import_type,
        'Stage 1 Fatal Error: CSV file contains headers but zero data rows'
      );
    }

    // Header validation per import type
    const headerValidation = this.validateHeadersForType(session.import_type, headers);
    if (!headerValidation.valid) {
      return this.handleFatalError(
        organizationId,
        sessionId,
        session.import_type,
        `Stage 1 Fatal Error (Missing Required Headers): ${headerValidation.missing.join(', ')}`
      );
    }

    // ------------------------------------------------------------------
    // STAGE 2: ROW-LEVEL LOGICAL & RELATIONAL VALIDATION
    // ------------------------------------------------------------------
    let stage2Result: {
      validRows: any[];
      rowErrors: RowValidationError[];
    };

    switch (session.import_type) {
      case ImportType.STUDENT:
        stage2Result = await this.validateStudentRows(organizationId, rows);
        break;
      case ImportType.ENROLLMENT:
        stage2Result = await this.validateEnrollmentRows(organizationId, rows);
        break;
      case ImportType.ATTENDANCE:
        stage2Result = await this.validateAttendanceRows(organizationId, rows);
        break;
      case ImportType.ASSESSMENT:
        stage2Result = await this.validateAssessmentRows(organizationId, rows);
        break;
      default:
        return this.handleFatalError(
          organizationId,
          sessionId,
          session.import_type,
          `Unsupported import type: ${session.import_type}`
        );
    }

    const totalRecords = rows.length;
    const validRecords = stage2Result.validRows.length;
    const rejectedRecords = stage2Result.rowErrors.length;

    // Transition session to VALIDATED
    await importSessionService.transitionStatus(
      organizationId,
      sessionId,
      ImportSessionStatus.VALIDATED
    );

    // Update or create initial report preview
    await prisma.importReport.upsert({
      where: { import_session_id: sessionId },
      update: {
        total_records: totalRecords,
        valid_records: validRecords,
        rejected_records: rejectedRecords,
        result_status:
          rejectedRecords === 0
            ? ImportResultStatus.SUCCESS
            : validRecords > 0
            ? ImportResultStatus.PARTIAL_SUCCESS
            : ImportResultStatus.FAILED,
        summary: {
          stage: 'VALIDATED',
          errors: stage2Result.rowErrors,
          validated_at: new Date().toISOString(),
        } as any,
      },
      create: {
        import_session_id: sessionId,
        total_records: totalRecords,
        valid_records: validRecords,
        rejected_records: rejectedRecords,
        inserted_records: 0,
        updated_records: 0,
        result_status:
          rejectedRecords === 0
            ? ImportResultStatus.SUCCESS
            : validRecords > 0
            ? ImportResultStatus.PARTIAL_SUCCESS
            : ImportResultStatus.FAILED,
        summary: {
          stage: 'VALIDATED',
          errors: stage2Result.rowErrors,
          validated_at: new Date().toISOString(),
        } as any,
      },
    });

    return {
      sessionId,
      importType: session.import_type,
      totalRecords,
      validRecords,
      rejectedRecords,
      isFatal: false,
      rowErrors: stage2Result.rowErrors,
      validRows: stage2Result.validRows,
    };
  }

  /**
   * Header validation dispatcher
   */
  private validateHeadersForType(
    importType: ImportType,
    headers: string[]
  ): { valid: boolean; missing: string[] } {
    switch (importType) {
      case ImportType.STUDENT:
        return validateStudentHeaders(headers);
      case ImportType.ENROLLMENT:
        return validateEnrollmentHeaders(headers);
      case ImportType.ATTENDANCE:
        return validateAttendanceHeaders(headers);
      case ImportType.ASSESSMENT:
        return validateAssessmentHeaders(headers);
      default:
        return { valid: false, missing: [`Unknown import type ${importType}`] };
    }
  }

  /**
   * Handle Stage 1 Fatal Structural Error: Transitions session to FAILED and ensures Zero Partial Commit
   */
  private async handleFatalError(
    organizationId: string,
    sessionId: string,
    importType: ImportType,
    errorMessage: string
  ): Promise<ValidationPipelineResult> {
    await importSessionService.transitionStatus(
      organizationId,
      sessionId,
      ImportSessionStatus.FAILED,
      errorMessage
    );

    await prisma.importReport.upsert({
      where: { import_session_id: sessionId },
      update: {
        total_records: 0,
        valid_records: 0,
        rejected_records: 0,
        inserted_records: 0,
        updated_records: 0,
        result_status: ImportResultStatus.FAILED,
        summary: {
          fatal_error: errorMessage,
          failed_at: new Date().toISOString(),
        },
      },
      create: {
        import_session_id: sessionId,
        total_records: 0,
        valid_records: 0,
        rejected_records: 0,
        inserted_records: 0,
        updated_records: 0,
        result_status: ImportResultStatus.FAILED,
        summary: {
          fatal_error: errorMessage,
          failed_at: new Date().toISOString(),
        },
      },
    });

    return {
      sessionId,
      importType,
      totalRecords: 0,
      validRecords: 0,
      rejectedRecords: 0,
      isFatal: true,
      fatalError: errorMessage,
      rowErrors: [],
      validRows: [],
    };
  }

  // ==================================================================
  // STAGE 2 VALIDATORS
  // ==================================================================

  /**
   * Validate Student Rows
   */
  private async validateStudentRows(
    organizationId: string,
    rawRows: Record<string, string>[]
  ) {
    const validRows: any[] = [];
    const rowErrors: RowValidationError[] = [];
    const seenIdentifiersInFile = new Set<string>();

    // Fetch organization settings for default student identifier label
    const orgSettings = await prisma.organizationSettings.findUnique({
      where: { organization_id: organizationId },
    });
    const defaultIdType = orgSettings?.student_identifier_label || 'PRN';

    for (let index = 0; index < rawRows.length; index++) {
      const rowNumber = index + 2; // Row 1 is header, CSV rows start from line 2
      const mapped = mapStudentRow(rawRows[index], defaultIdType);

      // 1. Zod row schema validation
      const parseResult = studentRowSchema.safeParse(mapped);
      if (!parseResult.success) {
        const errors = parseResult.error.issues.map((issue) => issue.message);
        rowErrors.push({
          row: rowNumber,
          identifier: (mapped.identifier_value as string) || undefined,
          errors,
        });
        continue;
      }

      const rowData = parseResult.data;

      // 2. Intra-file duplicate check
      const idKey = `${rowData.identifier_type.toUpperCase()}:${rowData.identifier_value.toUpperCase()}`;
      if (seenIdentifiersInFile.has(idKey)) {
        rowErrors.push({
          row: rowNumber,
          identifier: rowData.identifier_value,
          errors: [`Duplicate student identifier '${rowData.identifier_value}' in uploaded CSV file`],
        });
        continue;
      }
      seenIdentifiersInFile.add(idKey);

      validRows.push({
        rowNumber,
        ...rowData,
      });
    }

    return { validRows, rowErrors };
  }

  /**
   * Validate Enrollment Rows
   */
  private async validateEnrollmentRows(
    organizationId: string,
    rawRows: Record<string, string>[]
  ) {
    const validRows: any[] = [];
    const rowErrors: RowValidationError[] = [];
    const seenEnrollmentsInFile = new Set<string>();

    // 1. Preload active academic periods in organization
    const periods = await prisma.academicPeriod.findMany({
      where: { organization_id: organizationId },
      select: { id: true, period_code: true, status: true },
    });
    const periodMap = new Map(periods.map((p) => [p.period_code.toUpperCase(), p]));

    // 2. Preload student identifiers in organization
    const identifiers = await prisma.studentIdentifier.findMany({
      where: { organization_id: organizationId },
      select: { identifier_value: true, identifier_type: true, student_id: true },
    });
    const studentIdMap = new Map(
      identifiers.map((i) => [i.identifier_value.toUpperCase(), i.student_id])
    );

    for (let index = 0; index < rawRows.length; index++) {
      const rowNumber = index + 2;
      const mapped = mapEnrollmentRow(rawRows[index]);

      // Schema check
      const parseResult = enrollmentRowSchema.safeParse(mapped);
      if (!parseResult.success) {
        rowErrors.push({
          row: rowNumber,
          identifier: (mapped.identifier_value as string) || undefined,
          errors: parseResult.error.issues.map((i) => i.message),
        });
        continue;
      }

      const rowData = parseResult.data;
      const errors: string[] = [];

      // Foreign key 1: Student existence
      const studentId = studentIdMap.get(rowData.identifier_value.toUpperCase());
      if (!studentId) {
        errors.push(`Student with identifier '${rowData.identifier_value}' not found in organization`);
      }

      // Foreign key 2: Academic Period existence & lifecycle status
      const period = periodMap.get(rowData.period_code.toUpperCase());
      if (!period) {
        errors.push(`Academic period with code '${rowData.period_code}' not found in organization`);
      } else if (period.status === 'COMPLETED' || period.status === 'ARCHIVED') {
        errors.push(
          `Cannot enroll students into academic period '${rowData.period_code}' with status '${period.status}'`
        );
      }

      // Intra-file duplicate check
      const fileKey = `${rowData.identifier_value.toUpperCase()}@${rowData.period_code.toUpperCase()}`;
      if (seenEnrollmentsInFile.has(fileKey)) {
        errors.push(
          `Duplicate enrollment row for student '${rowData.identifier_value}' in period '${rowData.period_code}' in uploaded CSV`
        );
      }
      seenEnrollmentsInFile.add(fileKey);

      if (errors.length > 0) {
        rowErrors.push({
          row: rowNumber,
          identifier: rowData.identifier_value,
          errors,
        });
        continue;
      }

      validRows.push({
        rowNumber,
        studentId: studentId!,
        periodId: period!.id,
        identifierValue: rowData.identifier_value,
        periodCode: rowData.period_code,
        status: rowData.status,
        enrollmentDate: rowData.enrollment_date ? new Date(rowData.enrollment_date) : new Date(),
      });
    }

    return { validRows, rowErrors };
  }

  /**
   * Validate Attendance Rows
   */
  private async validateAttendanceRows(
    organizationId: string,
    rawRows: Record<string, string>[]
  ) {
    const validRows: any[] = [];
    const rowErrors: RowValidationError[] = [];
    const seenAttendanceInFile = new Set<string>();

    // 1. Preload student identifiers to student_id
    const identifiers = await prisma.studentIdentifier.findMany({
      where: { organization_id: organizationId },
      select: { identifier_value: true, student_id: true },
    });
    const studentMap = new Map(
      identifiers.map((i) => [i.identifier_value.toUpperCase(), i.student_id])
    );

    // 2. Preload learning components with academic_period_id
    const components = await prisma.learningComponent.findMany({
      where: { organization_id: organizationId },
      select: { id: true, component_code: true, academic_period_id: true },
    });
    const componentMap = new Map(
      components.map((c) => [c.component_code.toUpperCase(), c])
    );

    // 3. Preload all active enrollments with their academic_record
    const enrollments = await prisma.enrollment.findMany({
      where: { organization_id: organizationId },
      select: {
        student_id: true,
        academic_period_id: true,
        academic_record: { select: { id: true } },
      },
    });

    // Map: `${student_id}@${academic_period_id}` -> academic_record_id
    const enrollmentRecordMap = new Map<string, string>();
    for (const enr of enrollments) {
      if (enr.academic_record?.id) {
        enrollmentRecordMap.set(`${enr.student_id}@${enr.academic_period_id}`, enr.academic_record.id);
      }
    }

    for (let index = 0; index < rawRows.length; index++) {
      const rowNumber = index + 2;
      const mapped = mapAttendanceRow(rawRows[index]);

      // Schema check (including logical limit attended <= total)
      const parseResult = attendanceRowSchema.safeParse(mapped);
      if (!parseResult.success) {
        rowErrors.push({
          row: rowNumber,
          identifier: (mapped.identifier_value as string) || undefined,
          errors: parseResult.error.issues.map((i) => i.message),
        });
        continue;
      }

      const rowData = parseResult.data;
      const errors: string[] = [];

      // Student existence
      const studentId = studentMap.get(rowData.identifier_value.toUpperCase());
      if (!studentId) {
        errors.push(`Student with identifier '${rowData.identifier_value}' not found in organization`);
      }

      // Component existence
      const component = componentMap.get(rowData.component_code.toUpperCase());
      if (!component) {
        errors.push(`Learning component with code '${rowData.component_code}' not found in organization`);
      }

      // Enrollment & AcademicRecord verification
      let academicRecordId: string | undefined;
      if (studentId && component) {
        academicRecordId = enrollmentRecordMap.get(`${studentId}@${component.academic_period_id}`);
        if (!academicRecordId) {
          errors.push(
            `Student '${rowData.identifier_value}' is not enrolled in the academic period for component '${rowData.component_code}'`
          );
        }
      }

      // Duplicate in file check
      const fileKey = `${rowData.identifier_value.toUpperCase()}@${rowData.component_code.toUpperCase()}`;
      if (seenAttendanceInFile.has(fileKey)) {
        errors.push(
          `Duplicate attendance row for student '${rowData.identifier_value}' and component '${rowData.component_code}' in uploaded CSV`
        );
      }
      seenAttendanceInFile.add(fileKey);

      if (errors.length > 0) {
        rowErrors.push({
          row: rowNumber,
          identifier: rowData.identifier_value,
          errors,
        });
        continue;
      }

      validRows.push({
        rowNumber,
        academicRecordId: academicRecordId!,
        componentId: component!.id,
        identifierValue: rowData.identifier_value,
        componentCode: rowData.component_code,
        attendedSessions: rowData.attended_sessions,
        totalSessions: rowData.total_sessions,
      });
    }

    return { validRows, rowErrors };
  }

  /**
   * Validate Assessment Rows
   */
  private async validateAssessmentRows(
    organizationId: string,
    rawRows: Record<string, string>[]
  ) {
    const validRows: any[] = [];
    const rowErrors: RowValidationError[] = [];
    const seenAssessmentInFile = new Set<string>();

    // 1. Preload student identifiers
    const identifiers = await prisma.studentIdentifier.findMany({
      where: { organization_id: organizationId },
      select: { identifier_value: true, student_id: true },
    });
    const studentMap = new Map(
      identifiers.map((i) => [i.identifier_value.toUpperCase(), i.student_id])
    );

    // 2. Preload components with passing and maximum marks
    const components = await prisma.learningComponent.findMany({
      where: { organization_id: organizationId },
      select: {
        id: true,
        component_code: true,
        academic_period_id: true,
        maximum_marks: true,
        passing_marks: true,
      },
    });
    const componentMap = new Map(
      components.map((c) => [c.component_code.toUpperCase(), c])
    );

    // 3. Preload enrollments with academic records
    const enrollments = await prisma.enrollment.findMany({
      where: { organization_id: organizationId },
      select: {
        student_id: true,
        academic_period_id: true,
        academic_record: { select: { id: true } },
      },
    });

    const enrollmentRecordMap = new Map<string, string>();
    for (const enr of enrollments) {
      if (enr.academic_record?.id) {
        enrollmentRecordMap.set(`${enr.student_id}@${enr.academic_period_id}`, enr.academic_record.id);
      }
    }

    for (let index = 0; index < rawRows.length; index++) {
      const rowNumber = index + 2;
      const mapped = mapAssessmentRow(rawRows[index]);

      // Schema check
      const parseResult = assessmentRowSchema.safeParse(mapped);
      if (!parseResult.success) {
        rowErrors.push({
          row: rowNumber,
          identifier: (mapped.identifier_value as string) || undefined,
          errors: parseResult.error.issues.map((i) => i.message),
        });
        continue;
      }

      const rowData = parseResult.data;
      const errors: string[] = [];

      // Student existence
      const studentId = studentMap.get(rowData.identifier_value.toUpperCase());
      if (!studentId) {
        errors.push(`Student with identifier '${rowData.identifier_value}' not found in organization`);
      }

      // Component existence
      const component = componentMap.get(rowData.component_code.toUpperCase());
      if (!component) {
        errors.push(`Learning component with code '${rowData.component_code}' not found in organization`);
      }

      // Enrollment & AcademicRecord verification
      let academicRecordId: string | undefined;
      if (studentId && component) {
        academicRecordId = enrollmentRecordMap.get(`${studentId}@${component.academic_period_id}`);
        if (!academicRecordId) {
          errors.push(
            `Student '${rowData.identifier_value}' is not enrolled in the academic period for component '${rowData.component_code}'`
          );
        }
      }

      // Resolve maximum marks: from row or fallback to component definition
      const maxMarks =
        typeof rowData.maximum_marks === 'number'
          ? rowData.maximum_marks
          : component
          ? Number(component.maximum_marks)
          : 100;

      // Logical check: obtained_marks <= maximum_marks
      if (rowData.obtained_marks > maxMarks) {
        errors.push(
          `Logical limit violation: obtained_marks (${rowData.obtained_marks}) cannot exceed maximum_marks (${maxMarks})`
        );
      }

      // Duplicate in file check
      const fileKey = `${rowData.identifier_value.toUpperCase()}@${rowData.component_code.toUpperCase()}`;
      if (seenAssessmentInFile.has(fileKey)) {
        errors.push(
          `Duplicate assessment row for student '${rowData.identifier_value}' and component '${rowData.component_code}' in uploaded CSV`
        );
      }
      seenAssessmentInFile.add(fileKey);

      if (errors.length > 0) {
        rowErrors.push({
          row: rowNumber,
          identifier: rowData.identifier_value,
          errors,
        });
        continue;
      }

      const passingMarks = component ? Number(component.passing_marks) : 40;
      const gradingOutcome = rowData.obtained_marks >= passingMarks ? 'PASS' : 'FAIL';

      validRows.push({
        rowNumber,
        academicRecordId: academicRecordId!,
        componentId: component!.id,
        identifierValue: rowData.identifier_value,
        componentCode: rowData.component_code,
        obtainedMarks: rowData.obtained_marks,
        maximumMarks: maxMarks,
        gradingOutcome,
      });
    }

    return { validRows, rowErrors };
  }
}

export const validationPipelineService = new ValidationPipelineService();
