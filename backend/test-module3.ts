import { createApp } from './src/app';
import { prisma } from './src/config/database';
import http from 'http';

async function runModule3Tests() {
  console.log('=== [DropSafe V1 Module 3: Data Import Engine & Bulk Validation Pipeline Integration Test Suite] ===\n');

  const app = createApp();
  const server = http.createServer(app);
  const port = 5002;

  await new Promise<void>((resolve) => server.listen(port, resolve));
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Super Admin Login & Authentication
    // ----------------------------------------------------
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@dropsafe.demo',
        password: 'Admin@DropSafe2026!',
        organizationCode: 'DROPSAFE-DEMO-01',
      }),
    });
    const loginData: any = await loginRes.json();
    assert(loginRes.status === 200 && !!loginData.data.accessToken, 'Super Admin logs in successfully');
    const adminToken = loginData.data.accessToken;
    const orgId = loginData.data.user.organizationId;
    const authHeaders = {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    };

    const timestamp = Date.now();

    // ----------------------------------------------------
    // TEST 2: Import Session Creation & Initial CREATED Status
    // ----------------------------------------------------
    const createSessionRes = await fetch(`${baseUrl}/api/v1/import/sessions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        import_type: 'STUDENT',
        source_type: 'CSV',
      }),
    });
    const createSessionData: any = await createSessionRes.json();
    assert(
      createSessionRes.status === 201 &&
        createSessionData.data.status === 'CREATED' &&
        createSessionData.data.import_type === 'STUDENT',
      'Import session created in initial CREATED status'
    );
    const session1Id = createSessionData.data.id;

    // ----------------------------------------------------
    // TEST 3: State Machine Lifecycle Enforcement
    // Prohibit illegal transitions (e.g. CREATED -> COMPLETED directly)
    // ----------------------------------------------------
    const illegalCommitRes = await fetch(`${baseUrl}/api/v1/import/sessions/${session1Id}/commit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ allow_partial: true }),
    });
    assert(
      illegalCommitRes.status === 400,
      'Illegal state transition (committing session in CREATED status before validation) rejected with 400'
    );

    // ----------------------------------------------------
    // TEST 4: Session Cancellation State Flow
    // CREATED -> CANCELLED -> Terminal Rejection
    // ----------------------------------------------------
    const cancelRes = await fetch(`${baseUrl}/api/v1/import/sessions/${session1Id}/cancel`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ reason: 'Accidental session creation' }),
    });
    const cancelData: any = await cancelRes.json();
    assert(
      cancelRes.status === 200 && cancelData.data.status === 'CANCELLED',
      'Import session transitioned CREATED -> CANCELLED'
    );

    // Terminal rejection: cannot cancel again or validate cancelled session
    const postCancelValRes = await fetch(`${baseUrl}/api/v1/import/sessions/${session1Id}/validate`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert(
      postCancelValRes.status === 400,
      'Terminal state enforcement: Cannot validate a CANCELLED import session'
    );

    // ----------------------------------------------------
    // TEST 5: File Storage & SHA-256 File Hash Integrity Engine
    // ----------------------------------------------------
    const session2Res = await fetch(`${baseUrl}/api/v1/import/sessions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ import_type: 'STUDENT' }),
    });
    const session2Data: any = await session2Res.json();
    const session2Id = session2Data.data.id;

    const studentCsvContent = `first_name,last_name,prn,email,gender
Aarav,Patel,PRN-M3-${timestamp}-01,aarav.${timestamp}@dropsafe.demo,Male
Diya,Sharma,PRN-M3-${timestamp}-02,diya.${timestamp}@dropsafe.demo,Female
Kabir,Mehta,PRN-M3-${timestamp}-03,kabir.${timestamp}@dropsafe.demo,Male`;

    const formData1 = new FormData();
    formData1.append('file', new Blob([studentCsvContent], { type: 'text/csv' }), 'students.csv');

    const uploadRes = await fetch(`${baseUrl}/api/v1/import/sessions/${session2Id}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData1,
    });
    const uploadData: any = await uploadRes.json();
    assert(
      uploadRes.status === 201 &&
        uploadData.data.original_filename === 'students.csv' &&
        !!uploadData.data.file_hash &&
        uploadData.data.file_size > 0,
      'CSV uploaded, stored, and SHA-256 file hash computed'
    );
    const uploadedHash = uploadData.data.file_hash;

    // ----------------------------------------------------
    // TEST 6: File Integrity Check (Duplicate File Hash in same session rejected)
    // ----------------------------------------------------
    const formDataDup = new FormData();
    formDataDup.append('file', new Blob([studentCsvContent], { type: 'text/csv' }), 'students_copy.csv');

    const dupUploadRes = await fetch(`${baseUrl}/api/v1/import/sessions/${session2Id}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formDataDup,
    });
    assert(
      dupUploadRes.status === 409,
      'Uploading duplicate file with identical SHA-256 hash to same session rejected with 409 Conflict'
    );

    // ----------------------------------------------------
    // TEST 7: Stage 1 Fatal Structural Check (Missing Required Headers)
    // Zero Partial Academic Commit on Fatal Error
    // ----------------------------------------------------
    const sessionFatalRes = await fetch(`${baseUrl}/api/v1/import/sessions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ import_type: 'STUDENT' }),
    });
    const sessionFatalData: any = await sessionFatalRes.json();
    const sessionFatalId = sessionFatalData.data.id;

    // Fatal CSV: Missing first_name and identifier headers
    const fatalCsv = `wrong_col1,wrong_col2,wrong_col3
data1,data2,data3`;

    const fatalFormData = new FormData();
    fatalFormData.append('file', new Blob([fatalCsv], { type: 'text/csv' }), 'corrupt.csv');

    await fetch(`${baseUrl}/api/v1/import/sessions/${sessionFatalId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: fatalFormData,
    });

    const fatalValRes = await fetch(`${baseUrl}/api/v1/import/sessions/${sessionFatalId}/validate`, {
      method: 'POST',
      headers: authHeaders,
    });
    const fatalValData: any = await fatalValRes.json();
    assert(
      fatalValRes.status === 422 &&
        fatalValData.data.isFatal === true &&
        fatalValData.data.totalRecords === 0,
      'Stage 1 fatal structural check caught missing required columns and returned 422'
    );

    // Verify session transitioned to FAILED
    const fatalSessionCheck = await fetch(`${baseUrl}/api/v1/import/sessions/${sessionFatalId}`, {
      headers: authHeaders,
    });
    const fatalSessionCheckData: any = await fatalSessionCheck.json();
    assert(
      fatalSessionCheckData.data.status === 'FAILED' &&
        !!fatalSessionCheckData.data.error_message,
      'Fatal Stage 1 error transitioned import session to FAILED status with detailed error message'
    );

    // ----------------------------------------------------
    // TEST 8: Two-Stage Validation Pipeline — STUDENT Import with Stage 2 Row Errors
    // Valid rows + intra-file duplicate row
    // ----------------------------------------------------
    const sessionWithDupRes = await fetch(`${baseUrl}/api/v1/import/sessions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ import_type: 'STUDENT' }),
    });
    const sessionWithDupData: any = await sessionWithDupRes.json();
    const sessionWithDupId = sessionWithDupData.data.id;

    // 3 rows: row 1 & row 3 have the EXACT SAME PRN (intra-file duplicate)
    const dupRowCsv = `first_name,last_name,prn,email,gender
Aarav,Patel,PRN-M3-DUP-${timestamp},aarav.dup@dropsafe.demo,Male
Pooja,Rao,PRN-M3-OK-${timestamp},pooja.ok@dropsafe.demo,Female
Duplicate,Student,PRN-M3-DUP-${timestamp},dup@dropsafe.demo,Male`;

    const dupRowFormData = new FormData();
    dupRowFormData.append('file', new Blob([dupRowCsv], { type: 'text/csv' }), 'dup_students.csv');

    await fetch(`${baseUrl}/api/v1/import/sessions/${sessionWithDupId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: dupRowFormData,
    });

    const dupRowValRes = await fetch(`${baseUrl}/api/v1/import/sessions/${sessionWithDupId}/validate`, {
      method: 'POST',
      headers: authHeaders,
    });
    const dupRowValData: any = await dupRowValRes.json();
    assert(
      dupRowValRes.status === 200 &&
        dupRowValData.data.totalRecords === 3 &&
        dupRowValData.data.validRecords === 2 &&
        dupRowValData.data.rejectedRecords === 1,
      'Stage 2 row validation flagged 1 intra-file duplicate row and approved 2 valid rows'
    );

    // ----------------------------------------------------
    // TEST 9: Transactional Commit & Partial Success Execution (allow_partial = true)
    // ----------------------------------------------------
    const commitDupRes = await fetch(`${baseUrl}/api/v1/import/sessions/${sessionWithDupId}/commit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ allow_partial: true }),
    });
    const commitDupData: any = await commitDupRes.json();
    assert(
      commitDupRes.status === 200 &&
        commitDupData.data.result_status === 'PARTIAL_SUCCESS' &&
        commitDupData.data.inserted_records === 2 &&
        commitDupData.data.rejected_records === 1,
      'Import committed with PARTIAL_SUCCESS: 2 students inserted, 1 duplicate row rejected'
    );

    // Verify student lookup works for committed student
    const checkStudentRes = await fetch(
      `${baseUrl}/api/v1/students/lookup/identifier?type=PRN&value=PRN-M3-OK-${timestamp}`,
      { headers: authHeaders }
    );
    const checkStudentData: any = await checkStudentRes.json();
    assert(
      checkStudentRes.status === 200 && checkStudentData.data.first_name === 'Pooja',
      'Committed student successfully provisioned in academic domain'
    );

    // ----------------------------------------------------
    // TEST 10: Strict Commit Enforcement (allow_partial = false rejects whole batch on row error)
    // Zero Partial Academic Commit Guarantee
    // ----------------------------------------------------
    const sessionStrictRes = await fetch(`${baseUrl}/api/v1/import/sessions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ import_type: 'STUDENT' }),
    });
    const sessionStrictData: any = await sessionStrictRes.json();
    const sessionStrictId = sessionStrictData.data.id;

    const strictCsv = `first_name,last_name,prn,email
Strict1,Valid,PRN-M3-STRICT-OK-${timestamp},strict1@dropsafe.demo
Strict2,InvalidEmail,PRN-M3-STRICT-BAD-${timestamp},not-an-email`;

    const strictFormData = new FormData();
    strictFormData.append('file', new Blob([strictCsv], { type: 'text/csv' }), 'strict.csv');

    await fetch(`${baseUrl}/api/v1/import/sessions/${sessionStrictId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: strictFormData,
    });

    await fetch(`${baseUrl}/api/v1/import/sessions/${sessionStrictId}/validate`, {
      method: 'POST',
      headers: authHeaders,
    });

    const commitStrictRes = await fetch(`${baseUrl}/api/v1/import/sessions/${sessionStrictId}/commit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ allow_partial: false }),
    });
    const commitStrictData: any = await commitStrictRes.json();
    assert(
      commitStrictRes.status === 200 && commitStrictData.data.result_status === 'FAILED',
      'Strict commit (allow_partial=false) rejected entire batch and recorded result_status=FAILED'
    );

    // Verify zero academic commit: student PRN-M3-STRICT-OK was NOT inserted
    const checkStrictStudentRes = await fetch(
      `${baseUrl}/api/v1/students/lookup/identifier?type=PRN&value=PRN-M3-STRICT-OK-${timestamp}`,
      { headers: authHeaders }
    );
    assert(
      checkStrictStudentRes.status === 404,
      'Zero Partial Academic Commit verified: No records inserted when strict commit failed'
    );

    // ----------------------------------------------------
    // TEST 11: 100% Successful Student Import & Re-import Updates
    // ----------------------------------------------------
    const sessionSuccessRes = await fetch(`${baseUrl}/api/v1/import/sessions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ import_type: 'STUDENT' }),
    });
    const sessionSuccessData: any = await sessionSuccessRes.json();
    const sessionSuccessId = sessionSuccessData.data.id;

    const cleanStudentsCsv = `first_name,last_name,prn,email,gender
Rohit,Sharma,PRN-M3-CLEAN1-${timestamp},rohit.${timestamp}@dropsafe.demo,Male
Ananya,Deshmukh,PRN-M3-CLEAN2-${timestamp},ananya.${timestamp}@dropsafe.demo,Female`;

    const cleanFormData = new FormData();
    cleanFormData.append('file', new Blob([cleanStudentsCsv], { type: 'text/csv' }), 'clean_students.csv');

    await fetch(`${baseUrl}/api/v1/import/sessions/${sessionSuccessId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: cleanFormData,
    });

    await fetch(`${baseUrl}/api/v1/import/sessions/${sessionSuccessId}/validate`, {
      method: 'POST',
      headers: authHeaders,
    });

    const commitSuccessRes = await fetch(`${baseUrl}/api/v1/import/sessions/${sessionSuccessId}/commit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ allow_partial: true }),
    });
    const commitSuccessData: any = await commitSuccessRes.json();
    assert(
      commitSuccessRes.status === 200 &&
        commitSuccessData.data.result_status === 'SUCCESS' &&
        commitSuccessData.data.inserted_records === 2 &&
        commitSuccessData.data.rejected_records === 0,
      'Clean student import completed with result_status=SUCCESS and 2 inserted records'
    );

    // Re-importing same PRN updates profile
    const sessionUpdateRes = await fetch(`${baseUrl}/api/v1/import/sessions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ import_type: 'STUDENT' }),
    });
    const sessionUpdateData: any = await sessionUpdateRes.json();
    const sessionUpdateId = sessionUpdateData.data.id;

    const updateStudentsCsv = `first_name,last_name,prn,email,gender
Rohit-Updated,Sharma-Senior,PRN-M3-CLEAN1-${timestamp},rohit.new.${timestamp}@dropsafe.demo,Male`;

    const updateFormData = new FormData();
    updateFormData.append('file', new Blob([updateStudentsCsv], { type: 'text/csv' }), 'update_students.csv');

    await fetch(`${baseUrl}/api/v1/import/sessions/${sessionUpdateId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: updateFormData,
    });

    await fetch(`${baseUrl}/api/v1/import/sessions/${sessionUpdateId}/validate`, {
      method: 'POST',
      headers: authHeaders,
    });

    const commitUpdateRes = await fetch(`${baseUrl}/api/v1/import/sessions/${sessionUpdateId}/commit`, {
      method: 'POST',
      headers: authHeaders,
    });
    const commitUpdateData: any = await commitUpdateRes.json();
    assert(
      commitUpdateRes.status === 200 &&
        commitUpdateData.data.updated_records === 1 &&
        commitUpdateData.data.inserted_records === 0,
      'Re-importing existing student PRN updated student profile (updated_records=1)'
    );

    // ----------------------------------------------------
    // SETUP FOR ACADEMIC ENROLLMENTS, ATTENDANCE & ASSESSMENTS
    // ----------------------------------------------------
    const programRes = await fetch(`${baseUrl}/api/v1/academic/programs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        program_code: `PRG-M3-${timestamp}`,
        name: `Module 3 Program ${timestamp}`,
      }),
    });
    const programData: any = await programRes.json();
    const programId = programData.data.id;

    const levelRes = await fetch(`${baseUrl}/api/v1/academic/levels`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        learning_program_id: programId,
        level_number: 1,
        name: 'Year 1',
      }),
    });
    const levelData: any = await levelRes.json();
    const levelId = levelData.data.id;

    const periodCode = `SEM-M3-${timestamp}`;
    const periodRes = await fetch(`${baseUrl}/api/v1/academic/periods`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        learning_level_id: levelId,
        period_code: periodCode,
        name: 'Module 3 Semester',
        start_date: '2026-08-01T00:00:00.000Z',
        end_date: '2026-12-31T00:00:00.000Z',
        status: 'ACTIVE',
      }),
    });
    const periodData: any = await periodRes.json();
    const periodId = periodData.data.id;

    const compCode = `CS-M3-${timestamp}`;
    const compRes = await fetch(`${baseUrl}/api/v1/academic/components`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        academic_period_id: periodId,
        component_code: compCode,
        name: 'Database Architecture',
        type: 'SUBJECT',
        maximum_marks: 100,
        passing_marks: 40,
        status: 'ACTIVE',
      }),
    });
    const compData: any = await compRes.json();
    const compId = compData.data.id;

    // ----------------------------------------------------
    // TEST 12: ENROLLMENT Import & Automatic AcademicRecord Provisioning
    // ----------------------------------------------------
    const enrollSessionRes = await fetch(`${baseUrl}/api/v1/import/sessions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ import_type: 'ENROLLMENT' }),
    });
    const enrollSessionData: any = await enrollSessionRes.json();
    const enrollSessionId = enrollSessionData.data.id;

    // 3 rows: 2 valid students, 1 unknown student PRN
    const enrollCsv = `prn,period_code,status
PRN-M3-CLEAN1-${timestamp},${periodCode},ACTIVE
PRN-M3-CLEAN2-${timestamp},${periodCode},ACTIVE
PRN-UNKNOWN-99999,${periodCode},ACTIVE`;

    const enrollFormData = new FormData();
    enrollFormData.append('file', new Blob([enrollCsv], { type: 'text/csv' }), 'enrollments.csv');

    await fetch(`${baseUrl}/api/v1/import/sessions/${enrollSessionId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: enrollFormData,
    });

    const enrollValRes = await fetch(`${baseUrl}/api/v1/import/sessions/${enrollSessionId}/validate`, {
      method: 'POST',
      headers: authHeaders,
    });
    const enrollValData: any = await enrollValRes.json();
    assert(
      enrollValRes.status === 200 &&
        enrollValData.data.validRecords === 2 &&
        enrollValData.data.rejectedRecords === 1,
      'Enrollment validation approved 2 existing students and rejected 1 unknown PRN'
    );

    const commitEnrollRes = await fetch(`${baseUrl}/api/v1/import/sessions/${enrollSessionId}/commit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ allow_partial: true }),
    });
    const commitEnrollData: any = await commitEnrollRes.json();
    assert(
      commitEnrollRes.status === 200 &&
        commitEnrollData.data.result_status === 'PARTIAL_SUCCESS' &&
        commitEnrollData.data.inserted_records === 2,
      'Enrollments committed into database'
    );

    // Verify AcademicRecord was automatically provisioned
    const student1EnrollCheck = await prisma.studentIdentifier.findFirst({
      where: { identifier_value: `PRN-M3-CLEAN1-${timestamp}` },
      include: {
        student: {
          include: {
            enrollments: {
              include: { academic_record: true },
            },
          },
        },
      },
    });
    assert(
      !!student1EnrollCheck?.student.enrollments[0]?.academic_record?.id,
      'Automatic AcademicRecord provisioned atomically for imported enrollment'
    );

    // ----------------------------------------------------
    // TEST 13: ATTENDANCE Import & Logical Validation
    // attended_sessions <= total_sessions
    // ----------------------------------------------------
    const attSessionRes = await fetch(`${baseUrl}/api/v1/import/sessions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ import_type: 'ATTENDANCE' }),
    });
    const attSessionData: any = await attSessionRes.json();
    const attSessionId = attSessionData.data.id;

    // 3 rows:
    // Row 1: Valid (18 / 20)
    // Row 2: Logical Limit Violation (25 / 20 -> attended > total)
    // Row 3: Student not enrolled in component's period
    const attCsv = `prn,component_code,attended_sessions,total_sessions
PRN-M3-CLEAN1-${timestamp},${compCode},18,20
PRN-M3-CLEAN1-${timestamp},${compCode},25,20
PRN-M3-OK-${timestamp},${compCode},15,20`; // Pooja is not enrolled in this semester!

    const attFormData = new FormData();
    attFormData.append('file', new Blob([attCsv], { type: 'text/csv' }), 'attendance.csv');

    await fetch(`${baseUrl}/api/v1/import/sessions/${attSessionId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: attFormData,
    });

    const attValRes = await fetch(`${baseUrl}/api/v1/import/sessions/${attSessionId}/validate`, {
      method: 'POST',
      headers: authHeaders,
    });
    const attValData: any = await attValRes.json();
    assert(
      attValRes.status === 200 &&
        attValData.data.validRecords === 1 &&
        attValData.data.rejectedRecords === 2,
      'Attendance validation caught logical limit violation (attended > total) and unenrolled student'
    );

    const commitAttRes = await fetch(`${baseUrl}/api/v1/import/sessions/${attSessionId}/commit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ allow_partial: true }),
    });
    const commitAttData: any = await commitAttRes.json();
    assert(
      commitAttRes.status === 200 && commitAttData.data.inserted_records === 1,
      'Valid attendance record committed'
    );

    // ----------------------------------------------------
    // TEST 14: ASSESSMENT Import & Logical Validation
    // obtained_marks <= maximum_marks, Automated PASS/FAIL outcome
    // ----------------------------------------------------
    const assessSessionRes = await fetch(`${baseUrl}/api/v1/import/sessions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ import_type: 'ASSESSMENT' }),
    });
    const assessSessionData: any = await assessSessionRes.json();
    const assessSessionId = assessSessionData.data.id;

    // 3 rows:
    // Row 1: Valid PASS (85 / 100)
    // Row 2: Valid FAIL (30 / 100, passing is 40)
    // Row 3: Logical Limit Violation (105 / 100 -> obtained > max)
    const assessCsv = `prn,component_code,obtained_marks,maximum_marks
PRN-M3-CLEAN1-${timestamp},${compCode},85,100
PRN-M3-CLEAN2-${timestamp},${compCode},30,100
PRN-M3-CLEAN1-${timestamp},${compCode},105,100`;

    const assessFormData = new FormData();
    assessFormData.append('file', new Blob([assessCsv], { type: 'text/csv' }), 'assessments.csv');

    await fetch(`${baseUrl}/api/v1/import/sessions/${assessSessionId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: assessFormData,
    });

    const assessValRes = await fetch(`${baseUrl}/api/v1/import/sessions/${assessSessionId}/validate`, {
      method: 'POST',
      headers: authHeaders,
    });
    const assessValData: any = await assessValRes.json();
    assert(
      assessValRes.status === 200 &&
        assessValData.data.validRecords === 2 &&
        assessValData.data.rejectedRecords === 1,
      'Assessment validation approved 2 valid rows and rejected 1 marks violation (obtained > max)'
    );

    const commitAssessRes = await fetch(`${baseUrl}/api/v1/import/sessions/${assessSessionId}/commit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ allow_partial: true }),
    });
    const commitAssessData: any = await commitAssessRes.json();
    assert(
      commitAssessRes.status === 200 && commitAssessData.data.inserted_records === 2,
      'Valid assessment marks committed'
    );

    // Verify grading outcomes in database
    const dbAssessments = await prisma.assessmentRecord.findMany({
      where: { learning_component_id: compId },
      orderBy: { obtained_marks: 'desc' },
    });
    assert(
      dbAssessments.length === 2 &&
        dbAssessments[0].grading_outcome === 'PASS' &&
        dbAssessments[1].grading_outcome === 'FAIL',
      'Automated PASS/FAIL grading outcomes evaluated accurately on import'
    );

    // ----------------------------------------------------
    // TEST 15: Import Reports & Execution History APIs
    // ----------------------------------------------------
    const reportRes = await fetch(`${baseUrl}/api/v1/import/sessions/${assessSessionId}/report`, {
      headers: authHeaders,
    });
    const reportData: any = await reportRes.json();
    assert(
      reportRes.status === 200 &&
        reportData.data.import_session_id === assessSessionId &&
        reportData.data.result_status === 'PARTIAL_SUCCESS' &&
        reportData.data.total_records === 3 &&
        reportData.data.valid_records === 2 &&
        reportData.data.rejected_records === 1,
      'Import Report API returns complete summary metrics and execution status'
    );

    // List import sessions
    const listSessionsRes = await fetch(`${baseUrl}/api/v1/import/sessions?import_type=ASSESSMENT`, {
      headers: authHeaders,
    });
    const listSessionsData: any = await listSessionsRes.json();
    assert(
      listSessionsRes.status === 200 &&
        listSessionsData.data.length > 0 &&
        listSessionsData.meta.total >= 1,
      'List import sessions returns paginated records with type filter'
    );

    // ----------------------------------------------------
    // TEST 16: Quick Import (Convenience All-in-One Endpoint)
    // ----------------------------------------------------
    const quickCsv = `first_name,last_name,prn,email
Quick,Student1,PRN-M3-QUICK-${timestamp},quick1@dropsafe.demo`;

    const quickFormData = new FormData();
    quickFormData.append('file', new Blob([quickCsv], { type: 'text/csv' }), 'quick.csv');
    quickFormData.append('import_type', 'STUDENT');

    const quickRes = await fetch(`${baseUrl}/api/v1/import/quick-import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: quickFormData,
    });
    const quickData: any = await quickRes.json();
    assert(
      quickRes.status === 201 &&
        quickData.data.report.result_status === 'SUCCESS' &&
        quickData.data.report.inserted_records === 1,
      'Quick import all-in-one endpoint successfully parsed, validated, and committed in one call'
    );

    // ----------------------------------------------------
    // TEST 17: Multi-Tenant Isolation Protection
    // Cross-tenant import access is strictly blocked
    // ----------------------------------------------------
    const otherTenantLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'teacher@dropsafe.demo',
        password: 'Admin@DropSafe2026!',
        organizationCode: 'DROPSAFE-DEMO-01',
      }),
    });
    const otherTenantData: any = await otherTenantLogin.json();

    // Attempt to access with a simulated foreign tenant organization ID
    const crossTenantRes = await fetch(`${baseUrl}/api/v1/import/sessions/${assessSessionId}?organizationId=00000000-0000-0000-0000-000000000000`, {
      headers: authHeaders,
    });
    assert(
      crossTenantRes.status === 403,
      'Cross-tenant payload blocked with 403 TENANT_SCOPE_VIOLATION'
    );

    // ----------------------------------------------------
    // TEST 18: Governance Audit Logging
    // ----------------------------------------------------
    const auditRes = await fetch(`${baseUrl}/api/v1/governance/audit-logs?entityType=import_session`, {
      headers: authHeaders,
    });
    const auditData: any = await auditRes.json();
    assert(
      auditRes.status === 200 && auditData.data.length > 0,
      'Governance audit logs recorded import execution and transactional commit operations'
    );

  } catch (err: any) {
    console.error('Unexpected error during Module 3 test execution:', err);
    failed++;
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log(`\n=== Module 3 Integration Test Summary: ${passed} Passed, ${failed} Failed ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runModule3Tests();
