import { PrismaClient, OrganizationType, OrganizationStatus, UserStatus, RetentionAction } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- [DropSafe V1 Seeder] Starting database seeding ---');

  // ==========================================
  // 1. BASELINE PERMISSIONS
  // ==========================================
  const permissionsData = [
    // Students
    { code: 'student:create', resource: 'student', action: 'create', description: 'Create student profiles' },
    { code: 'student:update', resource: 'student', action: 'update', description: 'Update student profiles' },
    { code: 'student:view', resource: 'student', action: 'view', description: 'View student profiles' },
    // Academic Structure
    { code: 'academic:create', resource: 'academic', action: 'create', description: 'Create academic programs, levels, periods, and components' },
    { code: 'academic:update', resource: 'academic', action: 'update', description: 'Update academic structure and status' },
    { code: 'academic:view', resource: 'academic', action: 'view', description: 'View academic structure' },
    // Attendance
    { code: 'attendance:create', resource: 'attendance', action: 'create', description: 'Record student attendance' },
    { code: 'attendance:update', resource: 'attendance', action: 'update', description: 'Update student attendance' },
    { code: 'attendance:view', resource: 'attendance', action: 'view', description: 'View student attendance records' },
    // Assessments
    { code: 'assessment:create', resource: 'assessment', action: 'create', description: 'Record assessment marks' },
    { code: 'assessment:update', resource: 'assessment', action: 'update', description: 'Update assessment marks' },
    { code: 'assessment:view', resource: 'assessment', action: 'view', description: 'View assessment records' },
    // Predictions
    { code: 'prediction:generate', resource: 'prediction', action: 'generate', description: 'Trigger AI risk predictions' },
    { code: 'prediction:view', resource: 'prediction', action: 'view', description: 'View AI risk predictions' },
    { code: 'prediction:history', resource: 'prediction', action: 'history', description: 'View historical predictions' },
    // Counseling & Interventions
    { code: 'counseling:create', resource: 'counseling', action: 'create', description: 'Schedule counseling sessions' },
    { code: 'counseling:update', resource: 'counseling', action: 'update', description: 'Update counseling session notes' },
    { code: 'counseling:view', resource: 'counseling', action: 'view', description: 'View counseling sessions' },
    { code: 'mentor:assign', resource: 'mentor', action: 'assign', description: 'Assign mentors to interventions' },
    // Imports
    { code: 'import:create', resource: 'import', action: 'create', description: 'Upload and execute data imports' },
    { code: 'import:view', resource: 'import', action: 'view', description: 'View import sessions and files' },
    { code: 'import:history', resource: 'import', action: 'history', description: 'View import reports and history' },
    // Reports
    { code: 'report:view', resource: 'report', action: 'view', description: 'View aggregate academic and risk reports' },
    { code: 'report:export', resource: 'report', action: 'export', description: 'Export institutional reports' },
    // Administration & Users
    { code: 'organization:update', resource: 'organization', action: 'update', description: 'Configure organization settings' },
    { code: 'user:create', resource: 'user', action: 'create', description: 'Create user accounts' },
    { code: 'user:update', resource: 'user', action: 'update', description: 'Update user accounts and statuses' },
    { code: 'user:view', resource: 'user', action: 'view', description: 'List and view user accounts' },
    { code: 'role:create', resource: 'role', action: 'create', description: 'Define custom organizational roles' },
    { code: 'role:update', resource: 'role', action: 'update', description: 'Update roles and permission mappings' },
    { code: 'role:view', resource: 'role', action: 'view', description: 'View role definitions' },
    // Governance
    { code: 'audit:view', resource: 'audit', action: 'view', description: 'View immutable system audit logs' },
    { code: 'access:view', resource: 'access', action: 'view', description: 'View security access logs' },
  ];

  const permissionsMap = new Map<string, string>();

  for (const perm of permissionsData) {
    const created = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description, resource: perm.resource, action: perm.action },
      create: perm,
    });
    permissionsMap.set(perm.code, created.id);
  }
  console.log(`[Seed] Seeded ${permissionsMap.size} baseline permissions.`);

  // ==========================================
  // 2. DEFAULT PERMISSION GROUPS
  // ==========================================
  const permissionGroupsData = [
    {
      name: 'Academic Management',
      description: 'Permissions required for managing academic structure, students, attendance, and assessments',
      is_system: true,
      permissions: [
        'academic:create',
        'academic:update',
        'academic:view',
        'student:create',
        'student:update',
        'student:view',
        'attendance:create',
        'attendance:update',
        'attendance:view',
        'assessment:create',
        'assessment:update',
        'assessment:view',
      ],
    },
    {
      name: 'Prediction Management',
      description: 'Permissions for triggering and analyzing AI risk models and predictions',
      is_system: true,
      permissions: ['prediction:generate', 'prediction:view', 'prediction:history'],
    },
    {
      name: 'Counseling Management',
      description: 'Permissions for conducting counseling sessions and mentor interventions',
      is_system: true,
      permissions: ['counseling:create', 'counseling:update', 'counseling:view', 'mentor:assign'],
    },
    {
      name: 'Import Management',
      description: 'Permissions for running batch file uploads and reviewing import reports',
      is_system: true,
      permissions: ['import:create', 'import:view', 'import:history'],
    },
    {
      name: 'Reporting',
      description: 'Permissions for generating and exporting student and institutional reports',
      is_system: true,
      permissions: ['report:view', 'report:export'],
    },
    {
      name: 'System Administration',
      description: 'Full administrative control over settings, users, roles, and governance logs',
      is_system: true,
      permissions: [
        'organization:update',
        'user:create',
        'user:update',
        'user:view',
        'role:create',
        'role:update',
        'role:view',
        'audit:view',
        'access:view',
      ],
    },
  ];

  const groupsMap = new Map<string, string>();

  for (const groupDef of permissionGroupsData) {
    const group = await prisma.permissionGroup.upsert({
      where: { name: groupDef.name },
      update: { description: groupDef.description, is_system: groupDef.is_system },
      create: {
        name: groupDef.name,
        description: groupDef.description,
        is_system: groupDef.is_system,
      },
    });

    groupsMap.set(groupDef.name, group.id);

    // Map permissions into group
    for (const permCode of groupDef.permissions) {
      const permId = permissionsMap.get(permCode);
      if (permId) {
        await prisma.permissionGroupPermission.upsert({
          where: {
            permission_group_id_permission_id: {
              permission_group_id: group.id,
              permission_id: permId,
            },
          },
          update: {},
          create: {
            permission_group_id: group.id,
            permission_id: permId,
          },
        });
      }
    }
  }
  console.log(`[Seed] Seeded ${groupsMap.size} default permission groups.`);

  // ==========================================
  // 3. STANDARD SYSTEM ROLES
  // ==========================================
  const systemRolesData = [
    {
      name: 'Organization Admin',
      description: 'Root institution administrator with comprehensive organizational privileges',
      is_system: true,
      groups: [
        'Academic Management',
        'Prediction Management',
        'Counseling Management',
        'Import Management',
        'Reporting',
        'System Administration',
      ],
    },
    {
      name: 'Teacher',
      description: 'Academic instructor managing attendance, assessments, and viewing student profiles',
      is_system: true,
      groups: ['Academic Management', 'Import Management', 'Reporting'],
    },
    {
      name: 'Mentor',
      description: 'Designated counselor conducting interventions, follow-ups, and viewing approved predictions',
      is_system: true,
      groups: ['Counseling Management', 'Prediction Management'],
    },
  ];

  const rolesMap = new Map<string, string>();

  for (const roleDef of systemRolesData) {
    let role = await prisma.role.findFirst({
      where: {
        name: roleDef.name,
        is_system: true,
        organization_id: null,
      },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleDef.name,
          description: roleDef.description,
          is_system: true,
          organization_id: null,
        },
      });
    } else {
      role = await prisma.role.update({
        where: { id: role.id },
        data: { description: roleDef.description, is_system: true },
      });
    }

    rolesMap.set(roleDef.name, role.id);

    for (const groupName of roleDef.groups) {
      const groupId = groupsMap.get(groupName);
      if (groupId) {
        await prisma.rolePermissionGroup.upsert({
          where: {
            role_id_permission_group_id: {
              role_id: role.id,
              permission_group_id: groupId,
            },
          },
          update: {},
          create: {
            role_id: role.id,
            permission_group_id: groupId,
          },
        });
      }
    }
  }
  console.log(`[Seed] Seeded ${rolesMap.size} standard system roles.`);

  // ==========================================
  // 4. BOOTSTRAP INITIAL TENANT & SUPER ADMIN
  // ==========================================
  const demoOrg = await prisma.organization.upsert({
    where: { code: 'DROPSAFE-DEMO-01' },
    update: {},
    create: {
      name: 'DropSafe Demonstration Academy',
      code: 'DROPSAFE-DEMO-01',
      type: OrganizationType.COLLEGE,
      status: OrganizationStatus.ACTIVE,
    },
  });

  await prisma.organizationSettings.upsert({
    where: { organization_id: demoOrg.id },
    update: {},
    create: {
      organization_id: demoOrg.id,
      student_identifier_label: 'Roll Number',
      academic_calendar_type: 'SEMESTER',
      default_upload_frequency: 'WEEKLY',
      chatbot_enabled: true,
      prediction_enabled: true,
      counseling_enabled: true,
      graduated_student_retention_months: 36,
      retention_action: RetentionAction.ARCHIVE,
    },
  });

  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('Admin@DropSafe2026!', saltRounds);

  const adminUser = await prisma.user.upsert({
    where: {
      organization_id_email: {
        organization_id: demoOrg.id,
        email: 'admin@dropsafe.demo',
      },
    },
    update: {
      password_hash: adminPasswordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      organization_id: demoOrg.id,
      first_name: 'System',
      last_name: 'Administrator',
      email: 'admin@dropsafe.demo',
      password_hash: adminPasswordHash,
      status: UserStatus.ACTIVE,
      created_by: null,
    },
  });

  const adminRoleId = rolesMap.get('Organization Admin');
  if (adminRoleId) {
    await prisma.userRole.upsert({
      where: {
        user_id_role_id: {
          user_id: adminUser.id,
          role_id: adminRoleId,
        },
      },
      update: {},
      create: {
        user_id: adminUser.id,
        role_id: adminRoleId,
      },
    });
  }

  console.log('[Seed] Super-Admin bootstrapped:');
  console.log(`       Organization: ${demoOrg.name} (${demoOrg.code})`);
  console.log(`       Admin Email : ${adminUser.email}`);
  console.log('       Password    : Admin@DropSafe2026!');
  console.log('--- [DropSafe V1 Seeder] Seeding finished successfully ---');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
