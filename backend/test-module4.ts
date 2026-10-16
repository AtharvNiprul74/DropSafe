import { createApp } from './src/app';
import { prisma } from './src/config/database';
import http from 'http';

async function runModule4Tests() {
  console.log('=== [DropSafe V1 Module 4: Behaviour Domain & AI Integration Engine Integration Test Suite] ===\n');

  const app = createApp();
  const server = http.createServer(app);
  const port = 5003;

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
    // AUTHENTICATION: Super Admin, Mentor, and Teacher logins
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
    const mentorEmail = `mentor.${timestamp}@dropsafe.demo`;
    await fetch(`${baseUrl}/api/v1/organization/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        firstName: 'Alex',
        lastName: 'Mentor',
        email: mentorEmail,
        password: 'Password@12345!',
        roleNames: ['Mentor'],
      }),
    });

    const mentorLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: mentorEmail,
        password: 'Password@12345!',
      }),
    });
    const mentorLoginData: any = await mentorLoginRes.json();
    assert(mentorLoginRes.status === 200 && !!mentorLoginData.data.accessToken, 'Mentor logs in successfully');
    const mentorToken = mentorLoginData.data.accessToken;
    const mentorHeaders = {
      Authorization: `Bearer ${mentorToken}`,
      'Content-Type': 'application/json',
    };

    // Provision & Login Teacher
    const teacherEmail = `teacher.${timestamp}@dropsafe.demo`;
    await fetch(`${baseUrl}/api/v1/organization/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        firstName: 'Sarah',
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
    // SETUP: Student Profile with Phone & PRN
    // ----------------------------------------------------
    const studentPhone = `+9198${String(timestamp).slice(-8)}`;
    const studentPrn = `PRN-M4-${timestamp}`;
    const createStudentRes = await fetch(`${baseUrl}/api/v1/students`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        first_name: 'Anika',
        last_name: 'Sen',
        email: `anika.${timestamp}@dropsafe.demo`,
        phone: studentPhone,
        identifier_type: 'PRN',
        identifier_value: studentPrn,
      }),
    });
    const createStudentData: any = await createStudentRes.json();
    assert(createStudentRes.status === 201, 'Student created for behaviour & AI testing');
    const studentId = createStudentData.data.id;

    // ----------------------------------------------------
    // TEST 1: WhatsApp Ingestion Webhook (Student Message)
    // Resolves student by phone / PRN and creates active conversation
    // ----------------------------------------------------
    const webhookRes1 = await fetch(`${baseUrl}/api/v1/behaviour/webhook/whatsapp`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        phone: studentPhone,
        message_text: 'Hello, I am feeling overwhelmed with my mathematics assignment.',
        sender_type: 'STUDENT',
        source: 'WHATSAPP',
      }),
    });
    const webhookData1: any = await webhookRes1.json();
    assert(
      webhookRes1.status === 201 &&
        webhookData1.data.student_id === studentId &&
        !!webhookData1.data.conversation_id,
      'WhatsApp webhook resolved student by phone and initiated active conversation'
    );
    const conversationId = webhookData1.data.conversation_id;

    // ----------------------------------------------------
    // TEST 2: Ingest Bot Response into Conversation
    // ----------------------------------------------------
    const botMsgRes = await fetch(`${baseUrl}/api/v1/behaviour/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        sender_type: 'BOT',
        message_text: 'I understand. Would you like to schedule a quick tutoring session or view past lecture notes?',
      }),
    });
    const botMsgData: any = await botMsgRes.json();
    assert(
      botMsgRes.status === 201 && botMsgData.data.sender_type === 'BOT',
      'Bot response message appended immutably to conversation'
    );

    // ----------------------------------------------------
    // TEST 3: List Conversations (Privacy-Preserving Metadata & Counts Only)
    // ----------------------------------------------------
    const listConvRes = await fetch(`${baseUrl}/api/v1/behaviour/conversations?student_id=${studentId}`, {
      headers: adminHeaders,
    });
    const listConvData: any = await listConvRes.json();
    assert(
      listConvRes.status === 200 &&
        listConvData.data.length > 0 &&
        listConvData.data[0]._count.messages >= 2 &&
        listConvData.data[0].messages === undefined,
      'Conversations list returns metadata and message count without exposing raw message texts'
    );

    // ----------------------------------------------------
    // TEST 4: Get Conversation Metadata by ID
    // ----------------------------------------------------
    const getConvRes = await fetch(`${baseUrl}/api/v1/behaviour/conversations/${conversationId}`, {
      headers: adminHeaders,
    });
    const getConvData: any = await getConvRes.json();
    assert(
      getConvRes.status === 200 && getConvData.data.status === 'ACTIVE',
      'Conversation metadata retrieved successfully'
    );

    // ----------------------------------------------------
    // TEST 5: STRICT PRIVACY RULE ENFORCEMENT
    // Mentors and Organization Admins MUST NOT be able to read raw message text!
    // ----------------------------------------------------
    // A. Organization Admin attempt to read raw messages -> 403 Forbidden
    const adminReadMsgRes = await fetch(`${baseUrl}/api/v1/behaviour/conversations/${conversationId}/messages`, {
      headers: adminHeaders,
    });
    assert(
      adminReadMsgRes.status === 403,
      'Privacy Rule Enforcement: Organization Admin blocked from reading raw student chatbot messages (403)'
    );

    // B. Mentor attempt to read raw messages -> 403 Forbidden
    const mentorReadMsgRes = await fetch(`${baseUrl}/api/v1/behaviour/conversations/${conversationId}/messages`, {
      headers: mentorHeaders,
    });
    assert(
      mentorReadMsgRes.status === 403,
      'Privacy Rule Enforcement: Mentor blocked from reading raw student chatbot messages (403)'
    );

    // C. Non-admin, non-mentor role (Teacher) can access messages
    const teacherReadMsgRes = await fetch(`${baseUrl}/api/v1/behaviour/conversations/${conversationId}/messages`, {
      headers: teacherHeaders,
    });
    assert(
      teacherReadMsgRes.status === 200,
      'Authorized non-mentor/non-admin role can access raw messages for audit'
    );

    // ----------------------------------------------------
    // TEST 6: Conversation Status Transition (ACTIVE -> COMPLETED)
    // ----------------------------------------------------
    const completeConvRes = await fetch(`${baseUrl}/api/v1/behaviour/conversations/${conversationId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const completeConvData: any = await completeConvRes.json();
    assert(
      completeConvRes.status === 200 && completeConvData.data.status === 'COMPLETED',
      'Conversation status transitioned ACTIVE -> COMPLETED'
    );

    // ----------------------------------------------------
    // TEST 7: Cannot Append Messages to COMPLETED Conversation
    // ----------------------------------------------------
    const appendClosedRes = await fetch(`${baseUrl}/api/v1/behaviour/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        sender_type: 'STUDENT',
        message_text: 'Are you there?',
      }),
    });
    assert(
      appendClosedRes.status === 400,
      'Appending message to COMPLETED conversation rejected with 400 ValidationError'
    );

    // ----------------------------------------------------
    // SETUP: Academic Hierarchy, Enrollment, Attendance & Assessment for Snapshot
    // ----------------------------------------------------
    const programRes = await fetch(`${baseUrl}/api/v1/academic/programs`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        program_code: `PRG-M4-${timestamp}`,
        name: `AI Science Program ${timestamp}`,
      }),
    });
    const programData: any = await programRes.json();
    const programId = programData.data.id;

    const levelRes = await fetch(`${baseUrl}/api/v1/academic/levels`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        learning_program_id: programId,
        level_number: 1,
        name: 'Freshman Year',
      }),
    });
    const levelData: any = await levelRes.json();
    const levelId = levelData.data.id;

    const periodCode = `SEM-M4-${timestamp}`;
    const periodRes = await fetch(`${baseUrl}/api/v1/academic/periods`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        learning_level_id: levelId,
        period_code: periodCode,
        name: 'Fall 2026',
        start_date: '2026-08-01T00:00:00.000Z',
        end_date: '2026-12-31T00:00:00.000Z',
        status: 'ACTIVE',
      }),
    });
    const periodData: any = await periodRes.json();
    const periodId = periodData.data.id;

    // Component 1: CS101 (pass 40, max 100)
    const comp1Res = await fetch(`${baseUrl}/api/v1/academic/components`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        academic_period_id: periodId,
        component_code: `CS101-M4-${timestamp}`,
        name: 'Algorithms',
        maximum_marks: 100,
        passing_marks: 40,
      }),
    });
    const comp1Data: any = await comp1Res.json();
    const comp1Id = comp1Data.data.id;

    // Component 2: MATH101 (pass 50, max 100)
    const comp2Res = await fetch(`${baseUrl}/api/v1/academic/components`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        academic_period_id: periodId,
        component_code: `MATH101-M4-${timestamp}`,
        name: 'Discrete Math',
        maximum_marks: 100,
        passing_marks: 50,
      }),
    });
    const comp2Data: any = await comp2Res.json();
    const comp2Id = comp2Data.data.id;

    // Enroll student
    const enrollRes = await fetch(`${baseUrl}/api/v1/students/${studentId}/enrollments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        academic_period_id: periodId,
        status: 'ACTIVE',
      }),
    });
    const enrollData: any = await enrollRes.json();
    const enrollmentId = enrollData.data.id;
    const academicRecordId = enrollData.data.academic_record.id;

    // Record Attendance: 16 out of 20 sessions (80.00%)
    await fetch(`${baseUrl}/api/v1/students/academic-records/${academicRecordId}/attendance`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        learning_component_id: comp1Id,
        attended_sessions: 16,
        total_sessions: 20,
      }),
    });

    // Record Assessment 1: CS101 (85 / 100, PASS)
    await fetch(`${baseUrl}/api/v1/students/academic-records/${academicRecordId}/assessments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        learning_component_id: comp1Id,
        obtained_marks: 85,
        maximum_marks: 100,
      }),
    });

    // Record Assessment 2: MATH101 (35 / 100, FAIL, passing is 50)
    await fetch(`${baseUrl}/api/v1/students/academic-records/${academicRecordId}/assessments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        learning_component_id: comp2Id,
        obtained_marks: 35,
        maximum_marks: 100,
      }),
    });

    // ----------------------------------------------------
    // TEST 8: Student Snapshot Engine — Aggregation Accuracy
    // ----------------------------------------------------
    const snapshotGenRes = await fetch(`${baseUrl}/api/v1/ai/snapshots/generate`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ enrollment_id: enrollmentId }),
    });
    const snapshotGenData: any = await snapshotGenRes.json();
    assert(
      snapshotGenRes.status === 201 && snapshotGenData.data.length > 0,
      'Student snapshot generated successfully'
    );
    const snap1 = snapshotGenData.data[0];
    const snapshot1Id = snap1.id;

    assert(
      Number(snap1.attendance_percentage) === 80,
      'Snapshot correctly aggregated overall attendance percentage (80.00%)'
    );
    assert(
      Number(snap1.overall_marks_percentage) === 60,
      'Snapshot correctly aggregated overall marks percentage ((85+35)/200 = 60.00%)'
    );
    assert(
      snap1.failed_learning_components === 1,
      'Snapshot correctly identified 1 failed learning component (MATH101)'
    );
    assert(
      snap1.status === 'GENERATED',
      'Snapshot created in initial GENERATED status'
    );

    // ----------------------------------------------------
    // TEST 9: Snapshot Lifecycle State Machine (GENERATED -> SUPERSEDED)
    // Generating a new snapshot for same enrollment supersedes the previous one
    // ----------------------------------------------------
    const snapshot2GenRes = await fetch(`${baseUrl}/api/v1/ai/snapshots/generate`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ enrollment_id: enrollmentId }),
    });
    const snapshot2GenData: any = await snapshot2GenRes.json();
    const snapshot2Id = snapshot2GenData.data[0].id;

    // Check old snapshot is now SUPERSEDED
    const oldSnapCheck = await fetch(`${baseUrl}/api/v1/ai/snapshots/${snapshot1Id}`, {
      headers: adminHeaders,
    });
    const oldSnapCheckData: any = await oldSnapCheck.json();
    assert(
      oldSnapCheckData.data.status === 'SUPERSEDED',
      'Snapshot lifecycle: Existing snapshot transitioned to SUPERSEDED upon new snapshot generation'
    );
    assert(
      snapshot2GenData.data[0].status === 'GENERATED',
      'Newest snapshot created in GENERATED status'
    );

    // ----------------------------------------------------
    // TEST 10: List Snapshots with Filters
    // ----------------------------------------------------
    const listSnapsRes = await fetch(
      `${baseUrl}/api/v1/ai/snapshots?student_id=${studentId}&status=GENERATED`,
      { headers: adminHeaders }
    );
    const listSnapsData: any = await listSnapsRes.json();
    assert(
      listSnapsRes.status === 200 &&
        listSnapsData.data.length === 1 &&
        listSnapsData.data[0].id === snapshot2Id,
      'List snapshots filters accurately by student_id and status'
    );

    // ----------------------------------------------------
    // TEST 11: AI Model Metadata Registration & Uniqueness
    // ----------------------------------------------------
    const modelVersion = `xgboost-risk-v1.${timestamp}`;
    const regModelRes = await fetch(`${baseUrl}/api/v1/ai/models`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        model_name: 'DropSafe Gradient Boosted Early Risk Model',
        model_version: modelVersion,
        algorithm: 'XGBoost',
        feature_version: 'v1.4',
        training_dataset_version: 'ds-academic-2026-q1',
        status: 'ACTIVE',
      }),
    });
    const regModelData: any = await regModelRes.json();
    assert(
      regModelRes.status === 201 && regModelData.data.model_version === modelVersion,
      'AI model metadata registered in ACTIVE status'
    );

    // Duplicate version rejected
    const dupModelRes = await fetch(`${baseUrl}/api/v1/ai/models`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        model_name: 'Duplicate Version Model',
        model_version: modelVersion,
        algorithm: 'RandomForest',
        feature_version: 'v1.0',
        training_dataset_version: 'ds-2026',
      }),
    });
    assert(
      dupModelRes.status === 409,
      'Duplicate AI model_version rejected with 409 Conflict'
    );

    // ----------------------------------------------------
    // TEST 12: AI Model Status Transition & Retirement Enforcement
    // ----------------------------------------------------
    const retireModelRes = await fetch(`${baseUrl}/api/v1/ai/models/${modelVersion}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'RETIRED' }),
    });
    assert(retireModelRes.status === 200, 'AI model status transitioned ACTIVE -> RETIRED');

    // Attempting to ingest predictions with a RETIRED model is rejected
    const badModelPredRes = await fetch(`${baseUrl}/api/v1/ai/predictions`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        student_snapshot_id: snapshot2Id,
        ai_model_version: modelVersion,
        risk_label: 'MEDIUM',
        prediction_score: 75.0,
      }),
    });
    assert(
      badModelPredRes.status === 400,
      'Prediction rejected when using a RETIRED AI model'
    );

    // Reactivate model
    await fetch(`${baseUrl}/api/v1/ai/models/${modelVersion}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'ACTIVE' }),
    });

    // ----------------------------------------------------
    // TEST 13: Prediction Ingestion & Snapshot State Flow (GENERATED -> PREDICTED)
    // ----------------------------------------------------
    const ingestPredRes = await fetch(`${baseUrl}/api/v1/ai/predictions`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        student_snapshot_id: snapshot2Id,
        ai_model_version: modelVersion,
        risk_label: 'MEDIUM',
        prediction_score: 82.5,
      }),
    });
    const ingestPredData: any = await ingestPredRes.json();
    assert(
      ingestPredRes.status === 201 &&
        ingestPredData.data.risk_label === 'MEDIUM' &&
        Number(ingestPredData.data.prediction_score) === 82.5,
      'Prediction ingested and linked to student snapshot'
    );
    const predictionId = ingestPredData.data.id;

    // Verify snapshot status transitioned GENERATED -> PREDICTED
    const snapCheckAfterPred = await fetch(`${baseUrl}/api/v1/ai/snapshots/${snapshot2Id}`, {
      headers: adminHeaders,
    });
    const snapCheckAfterPredData: any = await snapCheckAfterPred.json();
    assert(
      snapCheckAfterPredData.data.status === 'PREDICTED',
      'Snapshot status transitioned GENERATED -> PREDICTED upon prediction ingestion'
    );

    // ----------------------------------------------------
    // TEST 14: Automatic Append to PredictionHistory Table
    // ----------------------------------------------------
    const predHistoryRes = await fetch(
      `${baseUrl}/api/v1/ai/predictions/history?student_id=${studentId}`,
      { headers: adminHeaders }
    );
    const predHistoryData: any = await predHistoryRes.json();
    assert(
      predHistoryRes.status === 200 &&
        predHistoryData.data.length > 0 &&
        predHistoryData.data[0].risk_label === 'MEDIUM',
      'Prediction was automatically appended to immutable prediction_history audit table'
    );

    // ----------------------------------------------------
    // TEST 15: Cannot Attach Prediction to SUPERSEDED Snapshot
    // ----------------------------------------------------
    const predOnSupersededRes = await fetch(`${baseUrl}/api/v1/ai/predictions`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        student_snapshot_id: snapshot1Id, // SUPERSEDED!
        ai_model_version: modelVersion,
        risk_label: 'LOW',
        prediction_score: 90.0,
      }),
    });
    assert(
      predOnSupersededRes.status === 400,
      'Attaching prediction to a SUPERSEDED snapshot rejected with 400 ValidationError'
    );

    // ----------------------------------------------------
    // TEST 16: Behaviour Summary Ingestion & Educator Insight
    // ----------------------------------------------------
    const summaryRes = await fetch(`${baseUrl}/api/v1/ai/behaviour-summaries`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        student_snapshot_id: snapshot2Id,
        summary: 'Student is actively asking questions about course workload and responding positively to study schedule suggestions.',
        dominant_sentiment: 'POSITIVE',
        confidence_score: 87.0,
        ai_model_version: modelVersion,
      }),
    });
    const summaryData: any = await summaryRes.json();
    assert(
      summaryRes.status === 201 &&
        summaryData.data.dominant_sentiment === 'POSITIVE' &&
        Number(summaryData.data.confidence_score) === 87,
      'Behaviour Summary generated and attached to snapshot'
    );

    // Mentors CAN read BehaviourSummary (Privacy-preserving aggregate)
    const mentorReadSummaryRes = await fetch(`${baseUrl}/api/v1/ai/behaviour-summaries/${snapshot2Id}`, {
      headers: mentorHeaders,
    });
    const mentorReadSummaryData: any = await mentorReadSummaryRes.json();
    assert(
      mentorReadSummaryRes.status === 200 &&
        mentorReadSummaryData.data.dominant_sentiment === 'POSITIVE',
      'Mentors can safely read privacy-preserving BehaviourSummary'
    );

    // ----------------------------------------------------
    // TEST 17: Automated Risk Inference Trigger API
    // Evaluates multi-factor academic & attendance metrics
    // ----------------------------------------------------
    // Generate a fresh 3rd snapshot
    const snap3Gen = await fetch(`${baseUrl}/api/v1/ai/snapshots/generate`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ enrollment_id: enrollmentId }),
    });
    const snap3Data: any = await snap3Gen.json();
    const snap3Id = snap3Data.data[0].id;

    // Trigger inference
    const inferRes = await fetch(`${baseUrl}/api/v1/ai/predictions/predict/${snap3Id}`, {
      method: 'POST',
      headers: adminHeaders,
    });
    const inferData: any = await inferRes.json();
    assert(
      inferRes.status === 201 && !!inferData.data.risk_label,
      'Automated multi-factor risk inference executed and prediction created'
    );

    // ----------------------------------------------------
    // TEST 18: Multi-Tenant Isolation
    // Cross-tenant snapshot access is strictly blocked
    // ----------------------------------------------------
    const crossTenantRes = await fetch(
      `${baseUrl}/api/v1/ai/snapshots/${snapshot2Id}?organizationId=00000000-0000-0000-0000-000000000000`,
      { headers: adminHeaders }
    );
    assert(
      crossTenantRes.status === 403,
      'Cross-tenant snapshot payload blocked with 403 TENANT_SCOPE_VIOLATION'
    );

    // ----------------------------------------------------
    // TEST 19: Governance Audit Logging
    // ----------------------------------------------------
    const auditRes = await fetch(`${baseUrl}/api/v1/governance/audit-logs?entityType=prediction`, {
      headers: adminHeaders,
    });
    const auditData: any = await auditRes.json();
    assert(
      auditRes.status === 200 && auditData.data.length > 0,
      'Governance audit logs recorded prediction operations'
    );

  } catch (err: any) {
    console.error('Unexpected error during Module 4 test execution:', err);
    failed++;
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log(`\n=== Module 4 Integration Test Summary: ${passed} Passed, ${failed} Failed ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runModule4Tests();
