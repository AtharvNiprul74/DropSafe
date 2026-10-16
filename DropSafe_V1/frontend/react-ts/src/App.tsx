import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, RequirePermission } from './auth/guards';
import { AppShell } from './layout/AppShell';
import { P } from './lib/permissions';

import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import OrganizationPage from './pages/admin/OrganizationPage';
import UsersPage from './pages/admin/UsersPage';
import RolesPage from './pages/admin/RolesPage';
import MentorAccessPage from './pages/admin/MentorAccessPage';
import StructurePage from './pages/academic/StructurePage';
import StudentsPage from './pages/academic/StudentsPage';
import StudentDetailPage from './pages/academic/StudentDetailPage';
import RecordsPage from './pages/academic/RecordsPage';
import ImportsPage from './pages/imports/ImportsPage';
import ImportDetailPage from './pages/imports/ImportDetailPage';
import RiskBoardPage from './pages/risk/RiskBoardPage';
import ModelsPage from './pages/risk/ModelsPage';
import InterventionsPage from './pages/counseling/InterventionsPage';
import InterventionDetailPage from './pages/counseling/InterventionDetailPage';
import FollowUpsPage from './pages/counseling/FollowUpsPage';
import MyStudentsPage from './pages/mentor/MyStudentsPage';
import AuditLogsPage from './pages/governance/AuditLogsPage';
import AccessLogsPage from './pages/governance/AccessLogsPage';
import NotificationsPage from './pages/governance/NotificationsPage';
import ReportsPage from './pages/reports/ReportsPage';
import { ForbiddenPage, NotFoundPage } from './pages/misc/ErrorPages';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Administration */}
        <Route path="admin/organization" element={<RequirePermission anyOf={[P.organizationUpdate, P.userView]}><OrganizationPage /></RequirePermission>} />
        <Route path="admin/users" element={<RequirePermission anyOf={[P.userView]}><UsersPage /></RequirePermission>} />
        <Route path="admin/roles" element={<RequirePermission anyOf={[P.roleView]}><RolesPage /></RequirePermission>} />
        <Route path="admin/mentor-access" element={<RequirePermission anyOf={[P.mentorAssign]}><MentorAccessPage /></RequirePermission>} />

        {/* Academic */}
        <Route path="academic/structure" element={<RequirePermission anyOf={[P.studentView, P.attendanceView, P.assessmentView]}><StructurePage /></RequirePermission>} />
        <Route path="academic/students" element={<RequirePermission anyOf={[P.studentView]}><StudentsPage /></RequirePermission>} />
        <Route path="academic/students/:id" element={<RequirePermission anyOf={[P.studentView]}><StudentDetailPage /></RequirePermission>} />
        <Route path="academic/records" element={<RequirePermission anyOf={[P.attendanceCreate, P.attendanceUpdate, P.assessmentCreate, P.assessmentUpdate]}><RecordsPage /></RequirePermission>} />

        {/* Imports */}
        <Route path="imports" element={<RequirePermission anyOf={[P.importView, P.importCreate, P.importHistory]}><ImportsPage /></RequirePermission>} />
        <Route path="imports/:id" element={<RequirePermission anyOf={[P.importView, P.importCreate, P.importHistory]}><ImportDetailPage /></RequirePermission>} />

        {/* AI & risk */}
        <Route path="risk" element={<RequirePermission anyOf={[P.predictionView]}><RiskBoardPage /></RequirePermission>} />
        <Route path="risk/models" element={<RequirePermission anyOf={[P.predictionView]}><ModelsPage /></RequirePermission>} />

        {/* Counseling */}
        <Route path="counseling/interventions" element={<RequirePermission anyOf={[P.counselingView]}><InterventionsPage /></RequirePermission>} />
        <Route path="counseling/interventions/:id" element={<RequirePermission anyOf={[P.counselingView]}><InterventionDetailPage /></RequirePermission>} />
        <Route path="counseling/follow-ups" element={<RequirePermission anyOf={[P.counselingView]}><FollowUpsPage /></RequirePermission>} />

        {/* Mentor */}
        <Route path="mentor/students" element={<RequirePermission anyOf={[P.studentView]}><MyStudentsPage /></RequirePermission>} />

        {/* Governance */}
        <Route path="governance/audit-logs" element={<RequirePermission anyOf={[P.governanceView]}><AuditLogsPage /></RequirePermission>} />
        <Route path="governance/access-logs" element={<RequirePermission anyOf={[P.governanceView]}><AccessLogsPage /></RequirePermission>} />
        <Route path="governance/notifications" element={<RequirePermission anyOf={[P.governanceView]}><NotificationsPage /></RequirePermission>} />

        {/* Reports */}
        <Route path="reports" element={<RequirePermission anyOf={[P.reportView]}><ReportsPage /></RequirePermission>} />

        <Route path="403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
