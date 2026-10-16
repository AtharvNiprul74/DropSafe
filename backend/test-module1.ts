import { createApp } from './src/app';
import { prisma } from './src/config/database';
import http from 'http';

async function runTests() {
  console.log('=== [DropSafe V1 Module 1 Integration Test Suite] ===\n');

  const app = createApp();
  const server = http.createServer(app);
  const port = 4999;

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
    // TEST 1: Health check
    // ----------------------------------------------------
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData: any = await healthRes.json();
    assert(healthRes.status === 200 && healthData.success, 'Health endpoint responds 200 OK');

    // ----------------------------------------------------
    // TEST 2: Deep health check (Database connectivity)
    // ----------------------------------------------------
    const deepHealthRes = await fetch(`${baseUrl}/api/v1/health`);
    const deepHealthData: any = await deepHealthRes.json();
    assert(
      deepHealthRes.status === 200 && deepHealthData.data.database === 'connected',
      'Deep health check confirms database is connected'
    );

    // ----------------------------------------------------
    // TEST 3: Login with Super Admin credentials
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
    assert(loginRes.status === 200 && !!loginData.data.accessToken, 'Super Admin login successfully returns JWT tokens');
    const adminToken = loginData.data.accessToken;
    const adminRefreshToken = loginData.data.refreshToken;
    const adminOrgId = loginData.data.user.organizationId;

    // ----------------------------------------------------
    // TEST 4: Get Profile /me with Bearer token
    // ----------------------------------------------------
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meData: any = await meRes.json();
    assert(
      meRes.status === 200 && meData.data.email === 'admin@dropsafe.demo',
      'Protected /api/v1/auth/me returns authenticated user'
    );
    assert(
      meData.data.roles.includes('Organization Admin') && meData.data.permissions.includes('organization:update'),
      'User context includes effective permissions via User -> Role -> Permission Group -> Permission'
    );

    // ----------------------------------------------------
    // TEST 5: Token Refresh
    // ----------------------------------------------------
    const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: adminRefreshToken }),
    });
    const refreshData: any = await refreshRes.json();
    assert(
      refreshRes.status === 200 && !!refreshData.data.accessToken,
      'Token refresh endpoint returns renewed access token'
    );

    // ----------------------------------------------------
    // TEST 6: Multi-Tenant Isolation Middleware (Scoped Access)
    // ----------------------------------------------------
    const settingsRes = await fetch(`${baseUrl}/api/v1/organization/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const settingsData: any = await settingsRes.json();
    assert(
      settingsRes.status === 200 && settingsData.data.organization_id === adminOrgId,
      'Organization settings returned within tenant scope'
    );

    // ----------------------------------------------------
    // TEST 7: Multi-Tenant Violation Blocked
    // ----------------------------------------------------
    const spoofedOrgId = '00000000-0000-0000-0000-000000000000';
    const crossTenantRes = await fetch(`${baseUrl}/api/v1/organization/settings?organizationId=${spoofedOrgId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const crossTenantData: any = await crossTenantRes.json();
    assert(
      crossTenantRes.status === 403 && crossTenantData.error.code === 'TENANT_SCOPE_VIOLATION',
      'Cross-organization query parameter is strictly rejected with TENANT_SCOPE_VIOLATION'
    );

    // ----------------------------------------------------
    // TEST 8: Create a restricted user (Mentor) and test RBAC
    // ----------------------------------------------------
    const mentorEmail = `mentor_${Date.now()}@dropsafe.demo`;
    const createMentorRes = await fetch(`${baseUrl}/api/v1/organization/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'Alex',
        lastName: 'Mentor',
        email: mentorEmail,
        password: 'Password@12345!',
        roleNames: ['Mentor'],
      }),
    });
    const createMentorData: any = await createMentorRes.json();
    assert(createMentorRes.status === 201 && createMentorData.success, 'Created new user with Mentor role');

    // Login as Mentor
    const mentorLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: mentorEmail,
        password: 'Password@12345!',
      }),
    });
    const mentorLoginData: any = await mentorLoginRes.json();
    const mentorToken = mentorLoginData.data.accessToken;

    // Mentor attempts an admin-only operation (updating organization settings)
    const mentorForbiddenRes = await fetch(`${baseUrl}/api/v1/organization/settings`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${mentorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        defaultUploadFrequency: 'DAILY',
      }),
    });
    const mentorForbiddenData: any = await mentorForbiddenRes.json();
    assert(
      mentorForbiddenRes.status === 403 && mentorForbiddenData.error.code === 'FORBIDDEN',
      'RBAC middleware strictly blocks unauthorized operation (Mentor lacks organization:update)'
    );

    // ----------------------------------------------------
    // TEST 9: Governance Logging Verification
    // ----------------------------------------------------
    // Check access logs for the recorded denial
    const accessLogsRes = await fetch(`${baseUrl}/api/v1/governance/access-logs?outcome=DENIED`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const accessLogsData: any = await accessLogsRes.json();
    assert(
      accessLogsRes.status === 200 && accessLogsData.data.length > 0,
      'Governance access logs recorded the RBAC denial event with outcome=DENIED'
    );

    // Check audit logs for the user creation and settings operations
    const auditLogsRes = await fetch(`${baseUrl}/api/v1/governance/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditLogsData: any = await auditLogsRes.json();
    assert(
      auditLogsRes.status === 200 && auditLogsData.data.length > 0,
      'Governance audit logs recorded state-changing operations'
    );

    console.log(`\n=== Integration Test Summary: ${passed} Passed, ${failed} Failed ===`);
    if (failed > 0) process.exit(1);
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
