import { createApp } from './src/app';
import { prisma } from './src/config/database';
import http from 'http';

async function runModule5Tests() {
  console.log('=== [DropSafe V1 Module 5: Counseling & Human Intervention Domain Integration Test Suite] ===\n');

  const app = createApp();
  const server = http.createServer(app);
  const port = 5004;

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
    const timestamp = Date.now();

    // ----------------------------------------------------
    // 1. AUTHENTICATION & SETUP: Super Admin, Mentor, and Teacher logins
    // ----------------------------------------------------
    const adminLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@dropsafe.demo',
        password: 'Admin@DropSafe2026!',
        organizationCode: 'DROPSAFE-DEMO-01',
      }),
    });
    const adminLoginData: any = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && !!adminLoginData.data.accessToken, 'Super Admin logs in successfully');
    const adminToken = adminLoginData.data.accessToken;
    const orgId = adminLoginData.data.user.organizationId;
    const adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    };

    // Provision & Login Mentor
    const mentorEmail = `counselor.${timestamp}@dropsafe.demo`;
    const mentorCreateRes = await fetch(`${baseUrl}/api/v1/organization/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        firstName: 'Elena',
        lastName: 'Counselor',
        email: mentorEmail,
        password: 'Password@12345!',
        roleNames: ['Mentor'],
      }),
    });
    const mentorCreateData: any = await mentorCreateRes.json();
    const mentorUserId = mentorCreateData.data.id;

    const mentorLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: mentorEmail,
        password: 'Password@12345!',
      }),
    });
    const mentorLoginData: any = await mentorLoginRes.json();
    assert(mentorLoginRes.status === 200 && !!mentorLoginData.data.accessToken, 'Designated Mentor logs in successfully');
    const mentorToken = mentorLoginData.data.accessToken;
    const mentorHeaders = {
      Authorization: `Bearer ${mentorToken}`,
      'Content-Type': 'application/json',
    };

    // Provision & Login Teacher (lacks counseling permissions)
    const teacherEmail = `instructor.${timestamp}@dropsafe.demo`;
    await fetch(`${baseUrl}/api/v1/organization/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        firstName: 'Marcus',
        lastName: 'Teacher',
        email: teacherEmail,
        password: 'Password@12345!',
        roleNames: ['Teacher'],
      }),
    });

    const teacherLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: teacherEmail,
        password: 'Password@12345!',
      }),
    });
    const teacherLoginData: any = await teacherLoginRes.json();
    assert(teacherLoginRes.status === 200 && !!teacherLoginData.data.accessToken, 'Teacher logs in successfully');
    const teacherToken = teacherLoginData.data.accessToken;
    const teacherHeaders = {
      Authorization: `Bearer ${teacherToken}`,
      'Content-Type': 'application/json',
    };

    // ----------------------------------------------------
    // SETUP: Academic Hierarchy, Student, Snapshot & Prediction
    // ----------------------------------------------------
    const studentRes = await fetch(`${baseUrl}/api/v1/students`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        first_name: 'Dev',
        last_name: 'Patel',
        email: `dev.patel.${timestamp}@dropsafe.demo`,
        phone: `+9197${String(timestamp).slice(-8)}`,
        identifier_type: 'PRN',
        identifier_value: `PRN-M5-${timestamp}`,
      }),
    });
    const studentData: any = await studentRes.json();
    const studentId = studentData.data.id;

    // Academic Program & Period
    const prgRes = await fetch(`${baseUrl}/api/v1/academic/programs`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        program_code: `ENG-M5-${timestamp}`,
        name: `Engineering ${timestamp}`,
      }),
    });
    const prgData: any = await prgRes.json();

    const lvlRes = await fetch(`${baseUrl}/api/v1/academic/levels`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        learning_program_id: prgData.data.id,
        level_number: 1,
        name: 'Year 1',
      }),
    });
    const lvlData: any = await lvlRes.json();

    const perRes = await fetch(`${baseUrl}/api/v1/academic/periods`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        learning_level_id: lvlData.data.id,
        period_code: `SEM1-M5-${timestamp}`,
        name: 'Fall 2026',
        start_date: '2026-08-01T00:00:00.000Z',
        end_date: '2026-12-31T00:00:00.000Z',
      }),
    });
    const perData: any = await perRes.json();

    // Enrollment
    const enrollRes = await fetch(`${baseUrl}/api/v1/students/${studentId}/enrollments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        academic_period_id: perData.data.id,
        status: 'ACTIVE',
      }),
    });
    const enrollData: any = await enrollRes.json();
    const enrollmentId = enrollData.data.id;

    // Snapshot & Prediction
    const snapRes = await fetch(`${baseUrl}/api/v1/ai/snapshots/generate`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ enrollment_id: enrollmentId }),
    });
    const snapData: any = await snapRes.json();
    const snapshotId = snapData.data[0].id;

    const predRes = await fetch(`${baseUrl}/api/v1/ai/predictions/predict/${snapshotId}`, {
      method: 'POST',
      headers: adminHeaders,
    });
    const predData: any = await predRes.json();
    const predictionId = predData.data.id;

    // ----------------------------------------------------
    // TEST 1: Create Intervention with Prediction Link
    // ----------------------------------------------------
    const createInterventionRes = await fetch(`${baseUrl}/api/v1/counseling/interventions`, {
      method: 'POST',
      headers: mentorHeaders,
      body: JSON.stringify({
        student_id: studentId,
        prediction_id: predictionId,
        responsible_user_id: mentorUserId,
        intervention_type: 'ACADEMIC',
        priority: 'HIGH',
        title: 'Calculus Intensive Tutoring & Weekly Check-in',
        description: 'Provide 1-on-1 tutoring sessions and monitor attendance drop.',
        planned_start_date: '2026-10-20T10:00:00.000Z',
      }),
    });
    const createInterventionData: any = await createInterventionRes.json();
    assert(
      createInterventionRes.status === 201 &&
        createInterventionData.data.status === 'PLANNED' &&
        createInterventionData.data.student_id === studentId &&
        createInterventionData.data.responsible_user_id === mentorUserId,
      'Intervention created successfully in PLANNED status linked to AI prediction'
    );
    const intervention1Id = createInterventionData.data.id;

    // ----------------------------------------------------
    // TEST 2: Validation Rule — Responsible User Must Belong to Same Organization
    // ----------------------------------------------------
    const badUserRes = await fetch(`${baseUrl}/api/v1/counseling/interventions`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        student_id: studentId,
        responsible_user_id: '00000000-0000-0000-0000-000000000000',
        intervention_type: 'BEHAVIOURAL',
        title: 'Invalid User Test',
      }),
    });
    assert(
      badUserRes.status === 400,
      'Intervention creation rejected when responsible user does not belong to organization (400 ValidationError)'
    );

    // ----------------------------------------------------
    // TEST 3: Validation Rule — Prediction Must Belong to the Same Student/Org
    // ----------------------------------------------------
    const badPredRes = await fetch(`${baseUrl}/api/v1/counseling/interventions`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        student_id: studentId,
        prediction_id: '00000000-0000-0000-0000-000000000000',
        responsible_user_id: mentorUserId,
        intervention_type: 'BEHAVIOURAL',
        title: 'Invalid Prediction Test',
      }),
    });
    assert(
      badPredRes.status === 400,
      'Intervention creation rejected with non-existent/cross-student prediction_id (400)'
    );

    // ----------------------------------------------------
    // TEST 4: RBAC Enforcement — Teacher Lacks Counseling Create Permission
    // ----------------------------------------------------
    const teacherCreateRes = await fetch(`${baseUrl}/api/v1/counseling/interventions`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        student_id: studentId,
        responsible_user_id: mentorUserId,
        intervention_type: 'ACADEMIC',
        title: 'Teacher Unauthorized Intervention',
      }),
    });
    assert(
      teacherCreateRes.status === 403,
      'RBAC Enforcement: Teacher without counseling:create permission blocked with 403 Forbidden'
    );

    // ----------------------------------------------------
    // TEST 5: Get Intervention by ID
    // ----------------------------------------------------
    const getInterventionRes = await fetch(`${baseUrl}/api/v1/counseling/interventions/${intervention1Id}`, {
      headers: mentorHeaders,
    });
    const getInterventionData: any = await getInterventionRes.json();
    assert(
      getInterventionRes.status === 200 &&
        getInterventionData.data.id === intervention1Id &&
        !!getInterventionData.data.prediction,
      'Intervention retrieved with student, mentor, and prediction relations'
    );

    // ----------------------------------------------------
    // TEST 6: Update Intervention Details
    // ----------------------------------------------------
    const updateInterventionRes = await fetch(`${baseUrl}/api/v1/counseling/interventions/${intervention1Id}`, {
      method: 'PUT',
      headers: mentorHeaders,
      body: JSON.stringify({
        title: 'Calculus Intensive Tutoring — Revised',
        priority: 'URGENT',
      }),
    });
    const updateInterventionData: any = await updateInterventionRes.json();
    assert(
      updateInterventionRes.status === 200 &&
        updateInterventionData.data.title === 'Calculus Intensive Tutoring — Revised' &&
        updateInterventionData.data.priority === 'URGENT',
      'Intervention details and priority updated successfully'
    );

    // ----------------------------------------------------
    // TEST 7: Intervention Lifecycle: Transition PLANNED -> IN_PROGRESS
    // ----------------------------------------------------
    const inProgressRes = await fetch(`${baseUrl}/api/v1/counseling/interventions/${intervention1Id}/status`, {
      method: 'PATCH',
      headers: mentorHeaders,
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    const inProgressData: any = await inProgressRes.json();
    assert(
      inProgressRes.status === 200 && inProgressData.data.status === 'IN_PROGRESS',
      'Intervention lifecycle: Successfully transitioned PLANNED -> IN_PROGRESS'
    );

    // ----------------------------------------------------
    // TEST 8: Counseling Session Scheduling
    // ----------------------------------------------------
    const scheduledDate = new Date(Date.now() + 86400000).toISOString();
    const createSessionRes = await fetch(`${baseUrl}/api/v1/counseling/sessions`, {
      method: 'POST',
      headers: mentorHeaders,
      body: JSON.stringify({
        intervention_id: intervention1Id,
        student_id: studentId,
        responsible_mentor_id: mentorUserId,
        session_type: 'IN_PERSON',
        scheduled_at: scheduledDate,
        session_notes: 'Initial counseling check-in for mathematics assessment review.',
      }),
    });
    const createSessionData: any = await createSessionRes.json();
    assert(
      createSessionRes.status === 201 &&
        createSessionData.data.status === 'SCHEDULED' &&
        createSessionData.data.intervention_id === intervention1Id,
      'Counseling session scheduled successfully in SCHEDULED status'
    );
    const sessionId = createSessionData.data.id;

    // ----------------------------------------------------
    // TEST 9: Student ID Mismatch on Session Rejected
    // ----------------------------------------------------
    const badStudentSessionRes = await fetch(`${baseUrl}/api/v1/counseling/sessions`, {
      method: 'POST',
      headers: mentorHeaders,
      body: JSON.stringify({
        intervention_id: intervention1Id,
        student_id: '00000000-0000-0000-0000-000000000000',
        scheduled_at: scheduledDate,
      }),
    });
    assert(
      badStudentSessionRes.status === 400,
      'Session scheduling rejected when student_id does not match intervention student (400)'
    );

    // ----------------------------------------------------
    // TEST 10: Timestamp Validation — ended_at cannot precede started_at
    // ----------------------------------------------------
    const badTimestampRes = await fetch(`${baseUrl}/api/v1/counseling/sessions/${sessionId}/status`, {
      method: 'PATCH',
      headers: mentorHeaders,
      body: JSON.stringify({
        status: 'COMPLETED',
        started_at: '2026-10-21T11:00:00.000Z',
        ended_at: '2026-10-21T10:00:00.000Z', // 1 hour BEFORE started_at!
      }),
    });
    assert(
      badTimestampRes.status === 400,
      'Session completion rejected with 400 when ended_at precedes started_at'
    );

    // ----------------------------------------------------
    // TEST 11: Timestamp Validation — COMPLETED session requires started_at and ended_at
    // ----------------------------------------------------
    const missingTimestampsRes = await fetch(`${baseUrl}/api/v1/counseling/sessions/${sessionId}/status`, {
      method: 'PATCH',
      headers: mentorHeaders,
      body: JSON.stringify({
        status: 'COMPLETED',
      }),
    });
    assert(
      missingTimestampsRes.status === 400,
      'Session completion rejected when started_at/ended_at are missing (400)'
    );

    // ----------------------------------------------------
    // TEST 12: Complete Counseling Session with Valid Timestamps & Outcomes
    // ----------------------------------------------------
    const completeSessionRes = await fetch(`${baseUrl}/api/v1/counseling/sessions/${sessionId}/status`, {
      method: 'PATCH',
      headers: mentorHeaders,
      body: JSON.stringify({
        status: 'COMPLETED',
        started_at: '2026-10-21T10:00:00.000Z',
        ended_at: '2026-10-21T11:00:00.000Z',
        session_notes: 'Student attended on time. Addressed anxiety regarding weekly problem sets.',
        outcome: 'Student agreed to submit practice assignments every Tuesday.',
      }),
    });
    const completeSessionData: any = await completeSessionRes.json();
    assert(
      completeSessionRes.status === 200 &&
        completeSessionData.data.status === 'COMPLETED' &&
        !!completeSessionData.data.started_at &&
        !!completeSessionData.data.ended_at,
      'Counseling session completed successfully with valid timestamps and recorded outcome'
    );

    // ----------------------------------------------------
    // TEST 13: Terminal State Protection — Cannot modify COMPLETED session
    // ----------------------------------------------------
    const modifyCompletedSessionRes = await fetch(`${baseUrl}/api/v1/counseling/sessions/${sessionId}/status`, {
      method: 'PATCH',
      headers: mentorHeaders,
      body: JSON.stringify({ status: 'SCHEDULED' }),
    });
    assert(
      modifyCompletedSessionRes.status === 400,
      'Terminal State Protection: Modifying a completed session rejected with 400 ValidationError'
    );

    // ----------------------------------------------------
    // TEST 14: Follow-Ups Engine — Pending Follow-up Must NOT have completed_at
    // ----------------------------------------------------
    const followUpDate = new Date(Date.now() + 172800000).toISOString();
    const badFollowUpRes = await fetch(`${baseUrl}/api/v1/counseling/follow-ups`, {
      method: 'POST',
      headers: mentorHeaders,
      body: JSON.stringify({
        intervention_id: intervention1Id,
        counseling_session_id: sessionId,
        follow_up_type: 'CHECK_IN',
        scheduled_date: followUpDate,
        completed_at: new Date().toISOString(), // FORBIDDEN ON PENDING!
      }),
    });
    assert(
      badFollowUpRes.status === 400,
      'Follow-up rule: Creation rejected when pending follow-up contains completed_at timestamp (400)'
    );

    // ----------------------------------------------------
    // TEST 15: Create Valid Follow-Up in PENDING status
    // ----------------------------------------------------
    const createFollowUpRes = await fetch(`${baseUrl}/api/v1/counseling/follow-ups`, {
      method: 'POST',
      headers: mentorHeaders,
      body: JSON.stringify({
        intervention_id: intervention1Id,
        counseling_session_id: sessionId,
        responsible_user_id: mentorUserId,
        follow_up_type: 'CHECK_IN',
        scheduled_date: followUpDate,
        notes: 'Check submission of practice assignment 1.',
      }),
    });
    const createFollowUpData: any = await createFollowUpRes.json();
    assert(
      createFollowUpRes.status === 201 &&
        createFollowUpData.data.status === 'PENDING' &&
        createFollowUpData.data.intervention_id === intervention1Id,
      'Follow-up created successfully in PENDING status linked to session'
    );
    const followUp1Id = createFollowUpData.data.id;

    // ----------------------------------------------------
    // TEST 16: Complete Follow-Up (PENDING -> COMPLETED)
    // ----------------------------------------------------
    const completeFollowUpRes = await fetch(`${baseUrl}/api/v1/counseling/follow-ups/${followUp1Id}/status`, {
      method: 'PATCH',
      headers: mentorHeaders,
      body: JSON.stringify({
        status: 'COMPLETED',
        outcome: 'Student submitted assignment and scored 80%.',
      }),
    });
    const completeFollowUpData: any = await completeFollowUpRes.json();
    assert(
      completeFollowUpRes.status === 200 &&
        completeFollowUpData.data.status === 'COMPLETED' &&
        !!completeFollowUpData.data.completed_at,
      'Follow-up successfully transitioned PENDING -> COMPLETED with automatically populated completed_at'
    );

    // ----------------------------------------------------
    // TEST 17: Cancelled Follow-Up Terminal Rule — Cannot later be marked completed!
    // ----------------------------------------------------
    // Create follow-up 2
    const followUp2Res = await fetch(`${baseUrl}/api/v1/counseling/follow-ups`, {
      method: 'POST',
      headers: mentorHeaders,
      body: JSON.stringify({
        intervention_id: intervention1Id,
        follow_up_type: 'REVIEW',
        scheduled_date: followUpDate,
      }),
    });
    const followUp2Data: any = await followUp2Res.json();
    const followUp2Id = followUp2Data.data.id;

    // Cancel follow-up 2
    const cancelFollowUpRes = await fetch(`${baseUrl}/api/v1/counseling/follow-ups/${followUp2Id}/status`, {
      method: 'PATCH',
      headers: mentorHeaders,
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    assert(cancelFollowUpRes.status === 200, 'Follow-up transitioned to CANCELLED status');

    // Attempt to mark cancelled follow-up as COMPLETED
    const reviveFollowUpRes = await fetch(`${baseUrl}/api/v1/counseling/follow-ups/${followUp2Id}/status`, {
      method: 'PATCH',
      headers: mentorHeaders,
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    assert(
      reviveFollowUpRes.status === 400,
      'Follow-up rule: Cancelled follow-ups cannot later be marked completed (rejected with 400)'
    );

    // ----------------------------------------------------
    // TEST 18: Transition Intervention to COMPLETED
    // ----------------------------------------------------
    const completeInterventionRes = await fetch(`${baseUrl}/api/v1/counseling/interventions/${intervention1Id}/status`, {
      method: 'PATCH',
      headers: mentorHeaders,
      body: JSON.stringify({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      }),
    });
    const completeInterventionData: any = await completeInterventionRes.json();
    assert(
      completeInterventionRes.status === 200 &&
        completeInterventionData.data.status === 'COMPLETED' &&
        !!completeInterventionData.data.completed_at,
      'Intervention successfully transitioned IN_PROGRESS -> COMPLETED with completed_at timestamp'
    );

    // ----------------------------------------------------
    // TEST 19: Cannot Schedule Session Under COMPLETED Intervention
    // ----------------------------------------------------
    const sessionUnderClosedRes = await fetch(`${baseUrl}/api/v1/counseling/sessions`, {
      method: 'POST',
      headers: mentorHeaders,
      body: JSON.stringify({
        intervention_id: intervention1Id,
        student_id: studentId,
        scheduled_at: scheduledDate,
      }),
    });
    assert(
      sessionUnderClosedRes.status === 400,
      'Scheduling session under COMPLETED intervention rejected with 400'
    );

    // ----------------------------------------------------
    // TEST 20: Cannot Modify Status of COMPLETED Intervention
    // ----------------------------------------------------
    const reopenInterventionRes = await fetch(`${baseUrl}/api/v1/counseling/interventions/${intervention1Id}/status`, {
      method: 'PATCH',
      headers: mentorHeaders,
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    assert(
      reopenInterventionRes.status === 400,
      'Terminal State Protection: Reopening a COMPLETED intervention rejected with 400'
    );

    // ----------------------------------------------------
    // TEST 21: Intervention Cancellation Lifecycle (PLANNED -> CANCELLED)
    // ----------------------------------------------------
    const cancelInterventionCreateRes = await fetch(`${baseUrl}/api/v1/counseling/interventions`, {
      method: 'POST',
      headers: mentorHeaders,
      body: JSON.stringify({
        student_id: studentId,
        responsible_user_id: mentorUserId,
        intervention_type: 'OTHER',
        title: 'Intervention to be cancelled',
      }),
    });
    const cancelInterventionCreateData: any = await cancelInterventionCreateRes.json();
    const cancelInterventionId = cancelInterventionCreateData.data.id;

    const cancelStatusRes = await fetch(`${baseUrl}/api/v1/counseling/interventions/${cancelInterventionId}/status`, {
      method: 'PATCH',
      headers: mentorHeaders,
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    const cancelStatusData: any = await cancelStatusRes.json();
    assert(
      cancelStatusRes.status === 200 &&
        cancelStatusData.data.status === 'CANCELLED' &&
        !!cancelStatusData.data.cancelled_at,
      'Intervention lifecycle: Successfully transitioned PLANNED -> CANCELLED with cancelled_at timestamp'
    );

    // ----------------------------------------------------
    // TEST 22: Cannot Transition CANCELLED Intervention to COMPLETED
    // ----------------------------------------------------
    const reviveInterventionRes = await fetch(`${baseUrl}/api/v1/counseling/interventions/${cancelInterventionId}/status`, {
      method: 'PATCH',
      headers: mentorHeaders,
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    assert(
      reviveInterventionRes.status === 400,
      'Terminal State Protection: Transitioning CANCELLED intervention to COMPLETED rejected with 400'
    );

    // ----------------------------------------------------
    // TEST 23: List Interventions with Multi-Tenant Filtering & Counts
    // ----------------------------------------------------
    const listInterventionsRes = await fetch(
      `${baseUrl}/api/v1/counseling/interventions?student_id=${studentId}&status=COMPLETED`,
      { headers: mentorHeaders }
    );
    const listInterventionsData: any = await listInterventionsRes.json();
    assert(
      listInterventionsRes.status === 200 &&
        listInterventionsData.data.length >= 1 &&
        listInterventionsData.data[0].id === intervention1Id &&
        listInterventionsData.data[0]._count.counseling_sessions >= 1,
      'List interventions filters accurately and includes relation counts'
    );

    // ----------------------------------------------------
    // TEST 24: List Counseling Sessions with Filters
    // ----------------------------------------------------
    const listSessionsRes = await fetch(
      `${baseUrl}/api/v1/counseling/sessions?intervention_id=${intervention1Id}`,
      { headers: mentorHeaders }
    );
    const listSessionsData: any = await listSessionsRes.json();
    assert(
      listSessionsRes.status === 200 &&
        listSessionsData.data.length >= 1 &&
        listSessionsData.data[0].id === sessionId,
      'List counseling sessions filters accurately by intervention_id'
    );

    // ----------------------------------------------------
    // TEST 25: List Follow-Ups with Filters
    // ----------------------------------------------------
    const listFollowUpsRes = await fetch(
      `${baseUrl}/api/v1/counseling/follow-ups?intervention_id=${intervention1Id}&status=COMPLETED`,
      { headers: mentorHeaders }
    );
    const listFollowUpsData: any = await listFollowUpsRes.json();
    assert(
      listFollowUpsRes.status === 200 &&
        listFollowUpsData.data.length >= 1 &&
        listFollowUpsData.data[0].id === followUp1Id,
      'List follow-ups filters accurately by intervention_id and status'
    );

    // ----------------------------------------------------
    // TEST 26: Notification History Tracking
    // Verifies MENTOR_ALERT and FOLLOW_UP_REMINDER records
    // ----------------------------------------------------
    const notifsRes = await fetch(`${baseUrl}/api/v1/counseling/notifications?recipient_user_id=${mentorUserId}`, {
      headers: mentorHeaders,
    });
    const notifsData: any = await notifsRes.json();
    const hasMentorAlert = notifsData.data.some((n: any) => n.notification_type === 'MENTOR_ALERT');
    const hasFollowUpReminder = notifsData.data.some((n: any) => n.notification_type === 'FOLLOW_UP_REMINDER');
    assert(
      notifsRes.status === 200 && hasMentorAlert && hasFollowUpReminder,
      'Governance Integration: Notification History captured MENTOR_ALERT and FOLLOW_UP_REMINDER records'
    );

    // ----------------------------------------------------
    // TEST 27: Governance Audit Logging on Counseling Operations
    // ----------------------------------------------------
    const auditRes = await fetch(`${baseUrl}/api/v1/governance/audit-logs?entityType=intervention`, {
      headers: adminHeaders,
    });
    const auditData: any = await auditRes.json();
    assert(
      auditRes.status === 200 && auditData.data.length >= 2,
      'Governance Integration: Immutable audit logs recorded intervention lifecycle operations'
    );

    // ----------------------------------------------------
    // TEST 28: Multi-Tenant Boundary Enforcement
    // Cross-tenant access is blocked with 403 TENANT_SCOPE_VIOLATION
    // ----------------------------------------------------
    const crossTenantRes = await fetch(
      `${baseUrl}/api/v1/counseling/interventions/${intervention1Id}?organizationId=00000000-0000-0000-0000-000000000000`,
      { headers: adminHeaders }
    );
    assert(
      crossTenantRes.status === 403,
      'Multi-Tenancy: Cross-tenant intervention payload rejected with 403 TENANT_SCOPE_VIOLATION'
    );

  } catch (err: any) {
    console.error('Unexpected error during Module 5 test execution:', err);
    failed++;
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log(`\n=== Module 5 Integration Test Summary: ${passed} Passed, ${failed} Failed ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runModule5Tests();
