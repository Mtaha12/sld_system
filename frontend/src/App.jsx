import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthLayout from './layouts/AuthLayout'
import AdminLayout from './layouts/AdminLayout'
import Spinner from './components/ui/Spinner'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ManageCasesPage = lazy(() => import('./pages/ManageCasesPage'))
const AddCaseLawPage = lazy(() => import('./pages/AddCaseLawPage'))

const ManageNotificationsPage = lazy(() => import('./pages/ManageNotificationsPage'))
const AddNotificationPage = lazy(() => import('./pages/AddNotificationPage'))

const ManageStatutesPage = lazy(() => import('./pages/ManageStatutesPage'))
const AddStatutePage = lazy(() => import('./pages/AddStatutePage'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-brand-dark flex items-center justify-center"><Spinner size="lg" /></div>}>
        <Routes>
          {/* Public Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
          
          {/* Protected Admin Routes */}
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/manage-cases" element={<ManageCasesPage />} />
            <Route path="/manage-cases/add" element={<AddCaseLawPage />} />
            <Route path="/manage-notifications" element={<ManageNotificationsPage />} />
            <Route path="/manage-notifications/add" element={<AddNotificationPage />} />
            <Route path="/manage-statutes" element={<ManageStatutesPage />} />
            <Route path="/manage-statutes/add" element={<AddStatutePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
