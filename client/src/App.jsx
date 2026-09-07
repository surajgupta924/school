import { Navigate, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardHome from './pages/DashboardHome';
import AdminZoneDashboard from './pages/AdminZoneDashboard';
import TeacherZoneDashboard from './pages/TeacherZoneDashboard';
import AccountantZoneDashboard from './pages/AccountantZoneDashboard';
import StudentZoneDashboard from './pages/StudentZoneDashboard';
import ParentZoneDashboard from './pages/ParentZoneDashboard';
import AdminModulePage from './pages/AdminModulePage';
import StudentsPage from './pages/StudentsPage';
import TeachersPage from './pages/TeachersPage';
import ParentsPage from './pages/ParentsPage';
import StaffPage from './pages/StaffPage';
import ClassesPage from './pages/ClassesPage';
import AttendancePage from './pages/AttendancePage';
import QrScannerPage from './pages/QrScannerPage';
import IdCardPage from './pages/IdCardPage';
import FeesPage from './pages/FeesPage';
import FeesDashboardPage from './pages/fees/FeesDashboardPage';
import CollectFeesPage from './pages/fees/CollectFeesPage';
import {
  AssignFeesPage,
  DueSlipHistoryPage,
  FeeChallansPage,
  FeeDiscountsPage,
  FeeGroupsPage,
  FeeTransactionsPage,
  FeeTypesPage,
  FeesCarryForwardPage,
  GenerateDueSlipPage,
  SearchDueFeesPage,
} from './pages/fees/FeeOpsPages';
import TransportPage from './pages/TransportPage';
import LiveTrackPage from './pages/LiveTrackPage';
import DriverConsolePage from './pages/DriverConsolePage';
import ExamsPage from './pages/ExamsPage';
import HomeworkPage from './pages/HomeworkPage';
import LeavesPage from './pages/LeavesPage';
import NoticesPage from './pages/NoticesPage';
import InboxPage from './pages/InboxPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import { flattenAdminRoutes } from './config/adminNav';
import { flattenTeacherRoutes } from './config/teacherNav';
import { flattenAccountantRoutes } from './config/accountantNav';
import { flattenStudentRoutes } from './config/studentNav';
import { flattenParentRoutes } from './config/parentNav';
import { selectUser } from './features/auth/authSlice';

function HomeRouter() {
  const user = useSelector(selectUser);
  if (user?.role === 'admin') return <AdminZoneDashboard />;
  if (user?.role === 'teacher') return <TeacherZoneDashboard />;
  if (user?.role === 'accountant') return <AccountantZoneDashboard />;
  if (user?.role === 'student') return <StudentZoneDashboard />;
  if (user?.role === 'parent') return <ParentZoneDashboard />;
  return <DashboardHome />;
}

function FeesEntry() {
  const user = useSelector(selectUser);
  if (['admin', 'accountant'].includes(user?.role)) return <CollectFeesPage />;
  return <FeesPage />;
}

const adminModuleRoutes = flattenAdminRoutes();
const teacherModuleRoutes = flattenTeacherRoutes();
const accountantModuleRoutes = flattenAccountantRoutes();
const studentModuleRoutes = flattenStudentRoutes();
const parentModuleRoutes = flattenParentRoutes();

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<HomeRouter />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="notices" element={<NoticesPage />} />

          {/* Full Admin Zone module pages from sidebar sub-menus */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="admin/students/list" element={<StudentsPage />} />
            <Route path="admin/academics/classes" element={<ClassesPage />} />
            <Route path="admin/fees/dashboard" element={<FeesDashboardPage />} />
            <Route path="admin/fees/collect" element={<CollectFeesPage />} />
            <Route path="admin/fees/collect/:studentId" element={<CollectFeesPage />} />
            <Route path="admin/fees/due" element={<SearchDueFeesPage />} />
            <Route path="admin/fees/transactions" element={<FeeTransactionsPage />} />
            <Route path="admin/fees/online" element={<FeeTransactionsPage onlineOnly />} />
            <Route path="admin/fees/challans" element={<FeeChallansPage />} />
            <Route path="admin/fees/assign" element={<AssignFeesPage />} />
            <Route path="admin/fees/carry-forward" element={<FeesCarryForwardPage />} />
            <Route path="admin/fees/groups" element={<FeeGroupsPage />} />
            <Route path="admin/fees/discounts" element={<FeeDiscountsPage />} />
            <Route path="admin/fees/types" element={<FeeTypesPage />} />
            <Route path="admin/fees/due-slip" element={<GenerateDueSlipPage />} />
            <Route path="admin/fees/due-slip-history" element={<DueSlipHistoryPage />} />
            <Route path="admin/hr/staff" element={<StaffPage />} />
            <Route path="admin/exams/offline/manage" element={<ExamsPage />} />
            {adminModuleRoutes
              .filter(
                (r) =>
                  ![
                    '/admin/students/list',
                    '/admin/academics/classes',
                    '/admin/fees/dashboard',
                    '/admin/fees/collect',
                    '/admin/fees/due',
                    '/admin/fees/transactions',
                    '/admin/fees/online',
                    '/admin/fees/challans',
                    '/admin/fees/assign',
                    '/admin/fees/carry-forward',
                    '/admin/fees/groups',
                    '/admin/fees/discounts',
                    '/admin/fees/types',
                    '/admin/fees/due-slip',
                    '/admin/fees/due-slip-history',
                    '/admin/hr/staff',
                    '/admin/exams/offline/manage',
                  ].includes(r.path)
              )
              .map((r) => (
                <Route key={r.path} path={r.path.replace(/^\//, '')} element={<AdminModulePage />} />
              ))}
          </Route>

          {/* Parent Zone module pages */}
          <Route element={<ProtectedRoute roles={['parent', 'admin']} />}>
            {parentModuleRoutes.map((r) => (
              <Route key={r.path} path={r.path.replace(/^\//, '')} element={<AdminModulePage />} />
            ))}
          </Route>

          {/* Student Zone module pages */}
          <Route element={<ProtectedRoute roles={['student', 'admin']} />}>
            {studentModuleRoutes.map((r) => (
              <Route key={r.path} path={r.path.replace(/^\//, '')} element={<AdminModulePage />} />
            ))}
          </Route>

          {/* Accountant Zone — real finance pages + remaining placeholders */}
          <Route element={<ProtectedRoute roles={['accountant', 'admin']} />}>
            <Route path="accountant/fees/dashboard" element={<FeesDashboardPage />} />
            <Route path="accountant/fees/collect" element={<CollectFeesPage />} />
            <Route path="accountant/fees/collect/:studentId" element={<CollectFeesPage />} />
            <Route path="accountant/fees/due" element={<SearchDueFeesPage />} />
            <Route path="accountant/fees/assign" element={<AssignFeesPage />} />
            <Route path="accountant/fees/groups" element={<FeeGroupsPage />} />
            <Route path="accountant/fees/types" element={<FeeTypesPage />} />
            <Route path="accountant/fees/transactions" element={<FeeTransactionsPage />} />
            <Route path="accountant/fees/challans" element={<FeeChallansPage />} />
            <Route path="accountant/fees/discounts" element={<FeeDiscountsPage />} />
            {accountantModuleRoutes
              .filter(
                (r) =>
                  ![
                    '/accountant/fees/dashboard',
                    '/accountant/fees/collect',
                    '/accountant/fees/due',
                    '/accountant/fees/assign',
                    '/accountant/fees/groups',
                    '/accountant/fees/types',
                    '/accountant/fees/transactions',
                    '/accountant/fees/challans',
                    '/accountant/fees/discounts',
                  ].includes(r.path)
              )
              .map((r) => (
                <Route key={r.path} path={r.path.replace(/^\//, '')} element={<AdminModulePage />} />
              ))}
          </Route>

          {/* Teacher Zone module pages */}
          <Route element={<ProtectedRoute roles={['teacher', 'admin']} />}>
            {teacherModuleRoutes.map((r) => (
              <Route key={r.path} path={r.path.replace(/^\//, '')} element={<AdminModulePage />} />
            ))}
          </Route>

          <Route element={<ProtectedRoute roles={['admin', 'teacher', 'accountant']} />}>
            <Route path="students" element={<StudentsPage />} />
            <Route path="classes" element={<ClassesPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin', 'accountant']} />}>
            <Route path="teachers" element={<TeachersPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="parents" element={<ParentsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="attendance" element={<AttendancePage />} />
          <Route element={<ProtectedRoute roles={['admin', 'teacher']} />}>
            <Route path="attendance/scan" element={<QrScannerPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']} />}>
            <Route path="id-card" element={<IdCardPage />} />
            <Route path="id-card/:studentId" element={<IdCardPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin', 'accountant', 'student', 'parent']} />}>
            <Route path="fees" element={<FeesEntry />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin', 'accountant']} />}>
            <Route path="fees/:studentId" element={<CollectFeesPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin', 'accountant']} />}>
            <Route path="transport" element={<TransportPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin', 'accountant', 'parent', 'student']} />}>
            <Route path="transport/live" element={<LiveTrackPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['driver', 'admin']} />}>
            <Route path="driver" element={<DriverConsolePage />} />
          </Route>

          <Route path="exams" element={<ExamsPage />} />
          <Route path="homework" element={<HomeworkPage />} />
          <Route path="leaves" element={<LeavesPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
