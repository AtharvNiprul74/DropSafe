import { createApp } from './src/app';
import { prisma } from './src/config/database';
import http from 'http';

async function runModule2Tests() {
  console.log('=== [DropSafe V1 Module 2: Academic Domain & Organization Management Integration Test Suite] ===\n');

  const app = createApp();
  const server = http.createServer(app);
  const port = 5001;

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

    // ----------------------------------------------------
    // TEST 2: Organization Settings Management
    // ----------------------------------------------------
    const updateSettingsRes = await fetch(`${baseUrl}/api/v1/organization/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        studentIdentifierLabel: 'PRN',
        graduatedStudentRetentionMonths: 48,
        chatbotEnabled: true,
        predictionEnabled: true,
        counselingEnabled: true,
      }),
    });
    const updateSettingsData: any = await updateSettingsRes.json();
    assert(
      updateSettingsRes.status === 200 &&
        updateSettingsData.data.student_identifier_label === 'PRN' &&
        updateSettingsData.data.graduated_student_retention_months === 48,
      'Organization settings updated with custom identifier label and retention policy'
    );

    // ----------------------------------------------------
    // TEST 3: Learning Program Creation & Tenant Uniqueness
    // ----------------------------------------------------
    const timestamp = Date.now();
    const programCode = `BTECH-CS-${timestamp}`;
    const programName = `Computer Science & Engineering ${timestamp}`;

    const createProgRes = await fetch(`${baseUrl}/api/v1/academic/programs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        program_code: programCode,
        name: programName,
        description: 'Undergraduate engineering program in computing',
        status: 'ACTIVE',
      }),
    });
    const createProgData: any = await createProgRes.json();
    assert(createProgRes.status === 201 && createProgData.data.program_code === programCode, 'Learning Program created successfully');
    const programId = createProgData.data.id;

    // Test duplicate program_code rejection
    const dupCodeRes = await fetch(`${baseUrl}/api/v1/academic/programs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        program_code: programCode,
        name: `Different Name ${timestamp}`,
      }),
    });
    assert(dupCodeRes.status === 409, 'Duplicate program_code in same tenant rejected with 409 Conflict');

    // Test duplicate program name rejection
    const dupNameRes = await fetch(`${baseUrl}/api/v1/academic/programs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        program_code: `DIFF-${timestamp}`,
        name: programName,
      }),
    });
    assert(dupNameRes.status === 409, 'Duplicate program name in same tenant rejected with 409 Conflict');

    // ----------------------------------------------------
    // TEST 4: Learning Program State Machine Lifecycle
    // ACTIVE -> INACTIVE -> ACTIVE -> ARCHIVED -> Terminal Rejection
    // ----------------------------------------------------
    const tempProgRes = await fetch(`${baseUrl}/api/v1/academic/programs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        program_code: `TEMP-${timestamp}`,
        name: `Temporary Program ${timestamp}`,
      }),
    });
    const tempProgData: any = await tempProgRes.json();
    const tempProgId = tempProgData.data.id;

    // Transition ACTIVE -> INACTIVE
    const inactProgRes = await fetch(`${baseUrl}/api/v1/academic/programs/${tempProgId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    const inactProgData: any = await inactProgRes.json();
    assert(inactProgRes.status === 200 && inactProgData.data.status === 'INACTIVE', 'Program status transitioned ACTIVE -> INACTIVE');

    // Transition INACTIVE -> ACTIVE
    const reactProgRes = await fetch(`${baseUrl}/api/v1/academic/programs/${tempProgId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    assert(reactProgRes.status === 200, 'Program status transitioned INACTIVE -> ACTIVE');

    // Transition ACTIVE -> ARCHIVED
    const archProgRes = await fetch(`${baseUrl}/api/v1/academic/programs/${tempProgId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'ARCHIVED' }),
    });
    assert(archProgRes.status === 200, 'Program status transitioned ACTIVE -> ARCHIVED');

    // Terminal State: Cannot transition out of ARCHIVED
    const invalidReactivationRes = await fetch(`${baseUrl}/api/v1/academic/programs/${tempProgId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    assert(invalidReactivationRes.status === 400, 'Terminal state enforcement: Cannot transition program out of ARCHIVED status');

    // ----------------------------------------------------
    // TEST 5: Learning Levels Creation & Level Number Uniqueness
    // ----------------------------------------------------
    const createLevelRes = await fetch(`${baseUrl}/api/v1/academic/levels`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        learning_program_id: programId,
        level_number: 1,
        name: 'First Year (Year 1)',
        status: 'ACTIVE',
      }),
    });
    const createLevelData: any = await createLevelRes.json();
    assert(createLevelRes.status === 201 && createLevelData.data.level_number === 1, 'Learning Level created under program');
    const levelId = createLevelData.data.id;

    // Test duplicate level_number for same program
    const dupLevelRes = await fetch(`${baseUrl}/api/v1/academic/levels`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        learning_program_id: programId,
        level_number: 1,
        name: 'Duplicate Year 1',
      }),
    });
    assert(dupLevelRes.status === 409, 'Duplicate level_number for same program rejected with 409 Conflict');

    // ----------------------------------------------------
    // TEST 6: Academic Periods & Strict Lifecycle State Machine
    // PLANNED -> ACTIVE -> COMPLETED -> ARCHIVED
    // ----------------------------------------------------
    // Date validation: end_date <= start_date rejection
    const invalidDatesRes = await fetch(`${baseUrl}/api/v1/academic/periods`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        learning_level_id: levelId,
        period_code: `INV-DATES-${timestamp}`,
        name: 'Invalid Date Period',
        start_date: '2026-06-01T00:00:00.000Z',
        end_date: '2026-01-01T00:00:00.000Z', // Before start
      }),
    });
    assert(invalidDatesRes.status === 400, 'Academic Period with end_date <= start_date rejected with 400 ValidationError');

    // Create valid Academic Period in PLANNED status
    const periodCode = `SEM-1-${timestamp}`;
    const createPeriodRes = await fetch(`${baseUrl}/api/v1/academic/periods`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        learning_level_id: levelId,
        period_code: periodCode,
        name: 'Fall 2026 Semester',
        start_date: '2026-08-01T00:00:00.000Z',
        end_date: '2026-12-15T00:00:00.000Z',
        status: 'PLANNED',
      }),
    });
    const createPeriodData: any = await createPeriodRes.json();
    assert(createPeriodRes.status === 201 && createPeriodData.data.status === 'PLANNED', 'Academic Period created in PLANNED status');
    const periodId = createPeriodData.data.id;

    // Transition PLANNED -> ACTIVE
    const actPeriodRes = await fetch(`${baseUrl}/api/v1/academic/periods/${periodId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    assert(actPeriodRes.status === 200, 'Period status transitioned PLANNED -> ACTIVE');

    // Invalid transition: ACTIVE -> PLANNED (Backwards flow prohibited)
    const invalidPeriodStepRes = await fetch(`${baseUrl}/api/v1/academic/periods/${periodId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'PLANNED' }),
    });
    assert(invalidPeriodStepRes.status === 400, 'Illegal state transition ACTIVE -> PLANNED rejected with 400 ValidationError');

    // ----------------------------------------------------
    // TEST 7: Learning Components (Domain Rules: Marks Validation)
    // ----------------------------------------------------
    // Marks validation: passing_marks > maximum_marks rejection
    const invalidMarksRes = await fetch(`${baseUrl}/api/v1/academic/components`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        academic_period_id: periodId,
        component_code: `INV-MARKS-${timestamp}`,
        name: 'Invalid Subject',
        type: 'SUBJECT',
        maximum_marks: 100,
        passing_marks: 120, // Cannot exceed max!
      }),
    });
    assert(invalidMarksRes.status === 400, 'Component with passing_marks > maximum_marks rejected with 400 ValidationError');

    // Create Valid Learning Component 1 (CS101)
    const createComp1Res = await fetch(`${baseUrl}/api/v1/academic/components`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        academic_period_id: periodId,
        component_code: `CS101-${timestamp}`,
        name: 'Data Structures and Algorithms',
        type: 'SUBJECT',
        maximum_marks: 100,
        passing_marks: 40,
        status: 'ACTIVE',
      }),
    });
    const createComp1Data: any = await createComp1Res.json();
    assert(createComp1Res.status === 201 && createComp1Data.data.maximum_marks === 100, 'Learning Component 1 (CS101) created');
    const comp1Id = createComp1Data.data.id;

    // Create Valid Learning Component 2 (MATH101)
    const createComp2Res = await fetch(`${baseUrl}/api/v1/academic/components`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        academic_period_id: periodId,
        component_code: `MATH101-${timestamp}`,
        name: 'Linear Algebra and Discrete Math',
        type: 'SUBJECT',
        maximum_marks: 100,
        passing_marks: 50,
        status: 'ACTIVE',
      }),
    });
    const createComp2Data: any = await createComp2Res.json();
    assert(createComp2Res.status === 201, 'Learning Component 2 (MATH101) created');
    const comp2Id = createComp2Data.data.id;

    // ----------------------------------------------------
    // TEST 8: Academic Hierarchy Tree View API
    // ----------------------------------------------------
    const hierarchyRes = await fetch(`${baseUrl}/api/v1/academic/hierarchy?programId=${programId}`, {
      headers: authHeaders,
    });
    const hierarchyData: any = await hierarchyRes.json();
    assert(
      hierarchyRes.status === 200 &&
        hierarchyData.data.length > 0 &&
        hierarchyData.data[0].learning_levels[0].academic_periods[0].learning_components.length >= 2,
      'Academic Hierarchy Tree view returns nested Programs -> Levels -> Periods -> Components'
    );

    // ----------------------------------------------------
    // TEST 9: Student Identity (Decoupled Profile Creation)
    // ----------------------------------------------------
    const studentEmail = `student.${timestamp}@dropsafe.demo`;
    const createStudentRes = await fetch(`${baseUrl}/api/v1/students`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        first_name: 'Aarav',
        last_name: 'Sharma',
        email: studentEmail,
        date_of_birth: '2005-04-12T00:00:00.000Z',
        gender: 'Male',
        phone: '+919876543210',
        status: 'ACTIVE',
      }),
    });
    const createStudentData: any = await createStudentRes.json();
    assert(createStudentRes.status === 201 && createStudentData.data.first_name === 'Aarav', 'Student profile created (Decoupled identity)');
    const studentId = createStudentData.data.id;

    // ----------------------------------------------------
    // TEST 10: Student Identifiers (Tenant-Unique Business Keys & Primary Management)
    // ----------------------------------------------------
    const prnValue = `PRN-${timestamp}`;
    const addIdentifierRes = await fetch(`${baseUrl}/api/v1/students/${studentId}/identifiers`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        identifier_type: 'PRN',
        identifier_value: prnValue,
        is_primary: true,
      }),
    });
    const addIdentifierData: any = await addIdentifierRes.json();
    assert(addIdentifierRes.status === 201 && addIdentifierData.data.is_primary === true, 'Primary student identifier assigned');

    // Create a 2nd student and attempt to assign the EXACT SAME identifier
    const student2Res = await fetch(`${baseUrl}/api/v1/students`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        first_name: 'Rohan',
        last_name: 'Verma',
        email: `rohan.${timestamp}@dropsafe.demo`,
      }),
    });
    const student2Data: any = await student2Res.json();
    const student2Id = student2Data.data.id;

    const dupIdentRes = await fetch(`${baseUrl}/api/v1/students/${student2Id}/identifiers`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        identifier_type: 'PRN',
        identifier_value: prnValue, // Duplicate!
      }),
    });
    assert(dupIdentRes.status === 409, 'Tenant-unique identifier collision rejected with 409 Conflict');

    // Quick Lookup student by identifier
    const lookupRes = await fetch(
      `${baseUrl}/api/v1/students/lookup/identifier?type=PRN&value=${encodeURIComponent(prnValue)}`,
      { headers: authHeaders }
    );
    const lookupData: any = await lookupRes.json();
    assert(lookupRes.status === 200 && lookupData.data.id === studentId, 'Lookup student by business identifier succeeds');

    // ----------------------------------------------------
    // TEST 11: Enrollment Engine & Automatic AcademicRecord Provisioning
    // ----------------------------------------------------
    const enrollRes = await fetch(`${baseUrl}/api/v1/students/${studentId}/enrollments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        academic_period_id: periodId,
        status: 'ACTIVE',
      }),
    });
    const enrollData: any = await enrollRes.json();
    assert(
      enrollRes.status === 201 &&
        enrollData.data.status === 'ACTIVE' &&
        !!enrollData.data.academic_record?.id,
      'Student enrolled into academic period and AcademicRecord automatically provisioned'
    );
    const enrollmentId = enrollData.data.id;
    const academicRecordId = enrollData.data.academic_record.id;

    // Duplicate enrollment in same period rejection
    const dupEnrollRes = await fetch(`${baseUrl}/api/v1/students/${studentId}/enrollments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        academic_period_id: periodId,
      }),
    });
    assert(dupEnrollRes.status === 409, 'Duplicate enrollment in same academic period rejected with 409 Conflict');

    // ----------------------------------------------------
    // TEST 12: Attendance Domain Validation Rules
    // attended_sessions <= total_sessions
    // ----------------------------------------------------
    // Violation: attended > total (25 attended out of 20)
    const invalidAttRes = await fetch(`${baseUrl}/api/v1/students/academic-records/${academicRecordId}/attendance`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        learning_component_id: comp1Id,
        attended_sessions: 25,
        total_sessions: 20, // Violation!
      }),
    });
    assert(invalidAttRes.status === 400, 'Attendance violation (attended_sessions > total_sessions) rejected with 400 ValidationError');

    // Valid Attendance: 18 attended out of 20 (90%)
    const validAttRes = await fetch(`${baseUrl}/api/v1/students/academic-records/${academicRecordId}/attendance`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        learning_component_id: comp1Id,
        attended_sessions: 18,
        total_sessions: 20,
      }),
    });
    const validAttData: any = await validAttRes.json();
    assert(
      validAttRes.status === 201 && validAttData.data.attendance_percentage === 90,
      'Valid attendance recorded and 90% attendance percentage calculated'
    );

    // ----------------------------------------------------
    // TEST 13: Assessment Domain Validation Rules & Grading Outcomes
    // obtained_marks <= maximum_marks, PASS / FAIL automated outcome
    // ----------------------------------------------------
    // Violation: obtained > maximum (105 marks out of 100)
    const invalidMarksRecRes = await fetch(`${baseUrl}/api/v1/students/academic-records/${academicRecordId}/assessments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        learning_component_id: comp1Id,
        obtained_marks: 105,
        maximum_marks: 100, // Violation!
      }),
    });
    assert(invalidMarksRecRes.status === 400, 'Assessment violation (obtained_marks > maximum_marks) rejected with 400 ValidationError');

    // Valid Assessment (Passing: 85/100, passing_marks is 40 -> outcome = PASS)
    const validAss1Res = await fetch(`${baseUrl}/api/v1/students/academic-records/${academicRecordId}/assessments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        learning_component_id: comp1Id,
        obtained_marks: 85,
        maximum_marks: 100,
      }),
    });
    const validAss1Data: any = await validAss1Res.json();
    assert(
      validAss1Res.status === 201 &&
        validAss1Data.data.score_percentage === 85 &&
        validAss1Data.data.grading_outcome === 'PASS',
      'Assessment 1 recorded with 85% score and automated PASS outcome'
    );

    // Valid Assessment (Failing: 35/100, passing_marks is 50 for MATH101 -> outcome = FAIL)
    const validAss2Res = await fetch(`${baseUrl}/api/v1/students/academic-records/${academicRecordId}/assessments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        learning_component_id: comp2Id,
        obtained_marks: 35,
        maximum_marks: 100,
      }),
    });
    const validAss2Data: any = await validAss2Res.json();
    assert(
      validAss2Res.status === 201 &&
        validAss2Data.data.score_percentage === 35 &&
        validAss2Data.data.grading_outcome === 'FAIL',
      'Assessment 2 recorded with 35% score and automated FAIL outcome'
    );

    // ----------------------------------------------------
    // TEST 14: Relational Integrity (Component Period Mismatch)
    // Attempting to record attendance for a component belonging to a different academic period
    // ----------------------------------------------------
    const otherPeriodRes = await fetch(`${baseUrl}/api/v1/academic/periods`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        learning_level_id: levelId,
        period_code: `DIFF-PERIOD-${timestamp}`,
        name: 'Spring 2027 Semester',
        start_date: '2027-01-10T00:00:00.000Z',
        end_date: '2027-05-20T00:00:00.000Z',
        status: 'PLANNED',
      }),
    });
    const otherPeriodData: any = await otherPeriodRes.json();
    const otherPeriodId = otherPeriodData.data.id;

    const foreignCompRes = await fetch(`${baseUrl}/api/v1/academic/components`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        academic_period_id: otherPeriodId, // Different period!
        component_code: `FOREIGN-${timestamp}`,
        name: 'Foreign Subject',
        maximum_marks: 100,
        passing_marks: 40,
      }),
    });
    const foreignCompData: any = await foreignCompRes.json();
    const foreignCompId = foreignCompData.data.id;

    const crossPeriodAttRes = await fetch(`${baseUrl}/api/v1/students/academic-records/${academicRecordId}/attendance`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        learning_component_id: foreignCompId, // Mismatched period!
        attended_sessions: 10,
        total_sessions: 10,
      }),
    });
    assert(crossPeriodAttRes.status === 400, 'Relational integrity enforced: Component from mismatched academic period rejected');

    // ----------------------------------------------------
    // TEST 15: Full Academic Record Inspection & Analytical Summary
    // ----------------------------------------------------
    const getRecRes = await fetch(`${baseUrl}/api/v1/students/academic-records/${academicRecordId}`, {
      headers: authHeaders,
    });
    const getRecData: any = await getRecRes.json();
    assert(
      getRecRes.status === 200 &&
        getRecData.data.summary.overall_attendance_percentage === 90 &&
        getRecData.data.summary.total_attended_sessions === 18 &&
        getRecData.data.summary.overall_score_percentage === 60 && // (85 + 35) / 200 = 60%
        getRecData.data.attendance_records.length === 1 &&
        getRecData.data.assessment_records.length === 2,
      'Full Academic Record returns correct aggregate attendance and score summaries'
    );

    // ----------------------------------------------------
    // TEST 16: Enrollment Lifecycle State Machine
    // ACTIVE -> COMPLETED
    // ----------------------------------------------------
    const completeEnrollRes = await fetch(`${baseUrl}/api/v1/students/enrollments/${enrollmentId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const completeEnrollData: any = await completeEnrollRes.json();
    assert(
      completeEnrollRes.status === 200 && completeEnrollData.data.status === 'COMPLETED',
      'Enrollment status transitioned ACTIVE -> COMPLETED'
    );

    // ----------------------------------------------------
    // TEST 17: Strict Tenant Isolation on Module 2 Endpoints
    // ----------------------------------------------------
    const tenantViolationRes = await fetch(`${baseUrl}/api/v1/academic/programs`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organization_id: '00000000-0000-0000-0000-000000000000', // Cross-tenant spoofing attempt
        program_code: `SPOOF-${timestamp}`,
        name: 'Spoofed Program',
      }),
    });
    assert(tenantViolationRes.status === 403, 'Cross-tenant payload blocked with 403 TENANT_SCOPE_VIOLATION');

    // ----------------------------------------------------
    // TEST 18: Governance Audit Logging for Module 2 Operations
    // ----------------------------------------------------
    const auditLogsRes = await fetch(`${baseUrl}/api/v1/governance/audit-logs?limit=20`, {
      headers: authHeaders,
    });
    const auditLogsData: any = await auditLogsRes.json();
    const actions = auditLogsData.data.map((log: any) => log.action);
    const hasModule2Logs =
      actions.includes('LEARNING_PROGRAM_CREATED') &&
      actions.includes('STUDENT_CREATED') &&
      actions.includes('ENROLLMENT_CREATED') &&
      actions.includes('ATTENDANCE_RECORDED') &&
      actions.includes('ASSESSMENT_RECORDED');
    assert(hasModule2Logs, 'Governance audit logs accurately recorded state-changing Module 2 events');
  } catch (error) {
    console.error('[Test Error]:', error);
    failed++;
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log(`\n=== Module 2 Integration Test Summary: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runModule2Tests();
