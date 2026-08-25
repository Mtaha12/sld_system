import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { UserProvider } from './contexts/UserContext'
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
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
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
              <Route path="/cases/new" element={<Navigate to="/manage-cases/add" replace />} />
              <Route path="/manage-notifications" element={<ManageNotificationsPage />} />
              <Route path="/manage-notifications/add" element={<AddNotificationPage />} />
              <Route path="/notifications/new" element={<Navigate to="/manage-notifications/add" replace />} />
              <Route path="/manage-statutes" element={<ManageStatutesPage />} />
              <Route path="/manage-statutes/add" element={<AddStatutePage />} />
              <Route path="/statutes/new" element={<Navigate to="/manage-statutes/add" replace />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </UserProvider>
    </ThemeProvider>
  )
}

export default App
