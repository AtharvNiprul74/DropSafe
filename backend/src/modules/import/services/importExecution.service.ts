import { prisma } from '../../../config/database';
import {
  ImportType,
  ImportSessionStatus,
  ImportResultStatus,
  Prisma,
} from '@prisma/client';
import { importSessionService } from './importSession.service';
import { validationPipelineService } from './validationPipeline.service';
import { recordAuditLog } from '../../../middlewares/governanceLog';
import { ValidationError } from '../../../core/errors/AppError';

export interface CommitImportOptions {
  allowPartial?: boolean;
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class ImportExecutionService {
  /**
   * Transactionally execute and commit validated import records into academic tables
   */
  public async commitImport(
    organizationId: string,
    sessionId: string,
    options: CommitImportOptions = {}
  ) {
    const { allowPartial = true, actorUserId, ipAddress, userAgent } = options;

    // 1. Verify session status is VALIDATED
    const session = await importSessionService.getSessionById(organizationId, sessionId);

    if (session.status !== ImportSessionStatus.VALIDATED) {
      throw new ValidationError(
        `Cannot commit import session in '${session.status}' status. Session must be in 'VALIDATED' status.`
      );
    }

    // 2. Run/retrieve validation pipeline results
    const validationResult = await validationPipelineService.validateSession(
      organizationId,
      sessionId
    );

    if (validationResult.isFatal) {
      throw new ValidationError(
        `Cannot commit import session due to fatal structural error: ${validationResult.fatalError}`
      );
    }

    const { totalRecords, validRecords, rejectedRecords, validRows, rowErrors } = validationResult;

    // Zero valid records check
    if (validRecords === 0) {
      await importSessionService.transitionStatus(
        organizationId,
        sessionId,
        ImportSessionStatus.FAILED,
        'Import failed: Zero valid records to commit'
      );

      return prisma.importReport.update({
        where: { import_session_id: sessionId },
        data: {
          result_status: ImportResultStatus.FAILED,
          summary: {
            reason: 'Zero valid records found in batch',
            errors: rowErrors,
            failed_at: new Date().toISOString(),
          } as any,
        },
      });
    }

    // allowPartial check
    if (!allowPartial && rejectedRecords > 0) {
      await importSessionService.transitionStatus(
        organizationId,
        sessionId,
        ImportSessionStatus.FAILED,
        `Import aborted: Strict commit required (allow_partial=false) but ${rejectedRecords} records were rejected`
      );

      return prisma.importReport.update({
        where: { import_session_id: sessionId },
        data: {
          result_status: ImportResultStatus.FAILED,
          summary: {
            reason: `Strict commit aborted: ${rejectedRecords} records failed validation`,
            errors: rowErrors,
            failed_at: new Date().toISOString(),
          } as any,
        },
      });
    }

    // 3. Transition to PROCESSING
    await importSessionService.transitionStatus(
      organizationId,
      sessionId,
      ImportSessionStatus.PROCESSING
    );

    let insertedRecords = 0;
    let updatedRecords = 0;

    // 4. Transactional Commit
    const finalizedReport = await prisma.$transaction(
      async (tx) => {
        switch (session.import_type) {
          case ImportType.STUDENT: {
            const counts = await this.commitStudents(tx, organizationId, validRows);
            insertedRecords = counts.inserted;
            updatedRecords = counts.updated;
            break;
          }

          case ImportType.ENROLLMENT: {
            const counts = await this.commitEnrollments(tx, organizationId, validRows);
            insertedRecords = counts.inserted;
            updatedRecords = counts.updated;
            break;
          }

          case ImportType.ATTENDANCE: {
            const counts = await this.commitAttendance(tx, organizationId, validRows);
            insertedRecords = counts.inserted;
            updatedRecords = counts.updated;
            break;
          }

          case ImportType.ASSESSMENT: {
            const counts = await this.commitAssessments(tx, organizationId, validRows);
            insertedRecords = counts.inserted;
            updatedRecords = counts.updated;
            break;
          }

          default:
            throw new ValidationError(`Unsupported import type: ${session.import_type}`);
        }

        const resultStatus =
          rejectedRecords === 0
            ? ImportResultStatus.SUCCESS
            : ImportResultStatus.PARTIAL_SUCCESS;

        // Finalize Import Report
        const report = await tx.importReport.upsert({
          where: { import_session_id: sessionId },
          update: {
            total_records: totalRecords,
            valid_records: validRecords,
            rejected_records: rejectedRecords,
            inserted_records: insertedRecords,
            updated_records: updatedRecords,
            result_status: resultStatus,
            summary: {
              status: resultStatus,
              inserted: insertedRecords,
              updated: updatedRecords,
              rejected: rejectedRecords,
              errors: rowErrors,
              committed_at: new Date().toISOString(),
            } as any,
          },
          create: {
            import_session_id: sessionId,
            total_records: totalRecords,
            valid_records: validRecords,
            rejected_records: rejectedRecords,
            inserted_records: insertedRecords,
            updated_records: updatedRecords,
            result_status: resultStatus,
            summary: {
              status: resultStatus,
              inserted: insertedRecords,
              updated: updatedRecords,
              rejected: rejectedRecords,
              errors: rowErrors,
              committed_at: new Date().toISOString(),
            } as any,
          },
        });

        // Mark session as COMPLETED
        await tx.importSession.update({
          where: { id: sessionId },
          data: {
            status: ImportSessionStatus.COMPLETED,
            completed_at: new Date(),
          },
        });

        return report;
      },
      {
        timeout: 30000, // 30 seconds for bulk operations
      }
    );

    // 5. Governance Audit Log
    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'import:commit',
      entityType: 'import_session',
      entityId: sessionId,
      details: {
        import_type: session.import_type,
        total_records: totalRecords,
        inserted_records: insertedRecords,
        updated_records: updatedRecords,
        rejected_records: rejectedRecords,
        result_status: finalizedReport.result_status,
      },
      ipAddress,
      userAgent,
    });

    return finalizedReport;
  }

  // ==================================================================
  // DOMAIN COMMITTERS
  // ==================================================================

  /**
   * Commit Valid Student Rows
   */
  private async commitStudents(
    tx: Prisma.TransactionClient,
    organizationId: string,
    validRows: any[]
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const row of validRows) {
      // Check if student with this identifier already exists in tenant
      const existingIdentifier = await tx.studentIdentifier.findFirst({
        where: {
          organization_id: organizationId,
          identifier_type: row.identifier_type,
          identifier_value: row.identifier_value,
        },
        include: { student: true },
      });

      if (existingIdentifier) {
        // Update existing student profile
        await tx.student.update({
          where: { id: existingIdentifier.student_id },
          data: {
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email || existingIdentifier.student.email,
            date_of_birth: row.date_of_birth ? new Date(row.date_of_birth) : existingIdentifier.student.date_of_birth,
            gender: row.gender || existingIdentifier.student.gender,
            phone: row.phone || existingIdentifier.student.phone,
            status: row.status || existingIdentifier.student.status,
          },
        });
        updated++;
      } else {
        // Create new Student and primary Identifier
        const newStudent = await tx.student.create({
          data: {
            organization_id: organizationId,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email || null,
            date_of_birth: row.date_of_birth ? new Date(row.date_of_birth) : null,
            gender: row.gender || null,
            phone: row.phone || null,
            status: row.status || 'ACTIVE',
          },
        });

        await tx.studentIdentifier.create({
          data: {
            organization_id: organizationId,
            student_id: newStudent.id,
            identifier_type: row.identifier_type,
            identifier_value: row.identifier_value,
            is_primary: true,
          },
        });
        inserted++;
      }
    }

    return { inserted, updated };
  }

  /**
   * Commit Valid Enrollment Rows (with automatic AcademicRecord provisioning)
   */
  private async commitEnrollments(
    tx: Prisma.TransactionClient,
    organizationId: string,
    validRows: any[]
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const row of validRows) {
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          organization_id_student_id_academic_period_id: {
            organization_id: organizationId,
            student_id: row.studentId,
            academic_period_id: row.periodId,
          },
        },
        include: { academic_record: true },
      });

      if (existingEnrollment) {
        // Update enrollment status
        await tx.enrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            status: row.status,
          },
        });

        // Ensure AcademicRecord is linked
        if (!existingEnrollment.academic_record) {
          await tx.academicRecord.create({
            data: {
              organization_id: organizationId,
              enrollment_id: existingEnrollment.id,
            },
          });
        }
        updated++;
      } else {
        // Create new enrollment
        const newEnrollment = await tx.enrollment.create({
          data: {
            organization_id: organizationId,
            student_id: row.studentId,
            academic_period_id: row.periodId,
            status: row.status,
            enrollment_date: row.enrollmentDate,
          },
        });

        // Atomically provision AcademicRecord
        await tx.academicRecord.create({
          data: {
            organization_id: organizationId,
            enrollment_id: newEnrollment.id,
          },
        });
        inserted++;
      }
    }

    return { inserted, updated };
  }

  /**
   * Commit Valid Attendance Rows
   */
  private async commitAttendance(
    tx: Prisma.TransactionClient,
    organizationId: string,
    validRows: any[]
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const row of validRows) {
      const existingAttendance = await tx.attendanceRecord.findUnique({
        where: {
          organization_id_academic_record_id_learning_component_id: {
            organization_id: organizationId,
            academic_record_id: row.academicRecordId,
            learning_component_id: row.componentId,
          },
        },
      });

      if (existingAttendance) {
        await tx.attendanceRecord.update({
          where: { id: existingAttendance.id },
          data: {
            attended_sessions: row.attendedSessions,
            total_sessions: row.totalSessions,
          },
        });
        updated++;
      } else {
        await tx.attendanceRecord.create({
          data: {
            organization_id: organizationId,
            academic_record_id: row.academicRecordId,
            learning_component_id: row.componentId,
            attended_sessions: row.attendedSessions,
            total_sessions: row.totalSessions,
          },
        });
        inserted++;
      }
    }

    return { inserted, updated };
  }

  /**
   * Commit Valid Assessment Rows
   */
  private async commitAssessments(
    tx: Prisma.TransactionClient,
    organizationId: string,
    validRows: any[]
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const row of validRows) {
      const existingAssessment = await tx.assessmentRecord.findUnique({
        where: {
          organization_id_academic_record_id_learning_component_id: {
            organization_id: organizationId,
            academic_record_id: row.academicRecordId,
            learning_component_id: row.componentId,
          },
        },
      });

      if (existingAssessment) {
        await tx.assessmentRecord.update({
          where: { id: existingAssessment.id },
          data: {
            obtained_marks: new Prisma.Decimal(row.obtainedMarks),
            maximum_marks: new Prisma.Decimal(row.maximumMarks),
            grading_outcome: row.gradingOutcome,
          },
        });
        updated++;
      } else {
        await tx.assessmentRecord.create({
          data: {
            organization_id: organizationId,
            academic_record_id: row.academicRecordId,
            learning_component_id: row.componentId,
            obtained_marks: new Prisma.Decimal(row.obtainedMarks),
            maximum_marks: new Prisma.Decimal(row.maximumMarks),
            grading_outcome: row.gradingOutcome,
          },
        });
        inserted++;
      }
    }

    return { inserted, updated };
  }
}

export const importExecutionService = new ImportExecutionService();
