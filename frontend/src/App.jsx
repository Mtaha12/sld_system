import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { UserProvider } from './contexts/UserContext'
import AuthLayout from './layouts/AuthLayout'
import AdminLayout from './layouts/AdminLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Spinner from './components/ui/Spinner'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const PaymentInstructionsPage = lazy(() => import('./pages/PaymentInstructionsPage'))
const PaymentReviewApprovePage = lazy(() => import('./pages/PaymentReviewApprovePage'))
const PaymentReviewRejectPage = lazy(() => import('./pages/PaymentReviewRejectPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ManageCasesPage = lazy(() => import('./pages/ManageCasesPage'))
const AddCaseLawPage = lazy(() => import('./pages/AddCaseLawPage'))

const ManageNotificationsPage = lazy(() => import('./pages/ManageNotificationsPage'))
const AddNotificationPage = lazy(() => import('./pages/AddNotificationPage'))

const ManageStatutesPage = lazy(() => import('./pages/ManageStatutesPage'))
const AddStatutePage = lazy(() => import('./pages/AddStatutePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const NewsPage = lazy(() => import('./pages/NewsPage'))
const WhatsappUpdatesPage = lazy(() => import('./pages/WhatsappUpdatesPage'))
const UpdatesPage = lazy(() => import('./pages/UpdatesPage'))
const DownloadsPage = lazy(() => import('./pages/DownloadsPage'))
const YoutubeUpdatesPage = lazy(() => import('./pages/YoutubeUpdatesPage'))
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'))
const SearchCaseLawPage = lazy(() => import('./pages/SearchCaseLawPage'))
const CaseViewPage = lazy(() => import('./pages/CaseViewPage'))
const ManageCitiesPage = lazy(() => import('./pages/setting/ManageCitiesPage'))
const ManagePrincipleOfLawsPage = lazy(() => import('./pages/setting/ManagePrincipleOfLawsPage'))
const ManageLawsPage = lazy(() => import('./pages/setting/ManageLawsPage'))
const ManageUsersPage = lazy(() => import('./pages/ManageUsersPage'))
const CaseActivityPage = lazy(() => import('./pages/activity/CaseActivityPage'))
const NotificationActivityPage = lazy(() => import('./pages/activity/NotificationActivityPage'))
const StatuteActivityPage = lazy(() => import('./pages/activity/StatuteActivityPage'))
const ManageMagazinesPage = lazy(() => import('./pages/setting/ManageMagazinesPage'))
const ManageCourtsPage = lazy(() => import('./pages/setting/ManageCourtsPage'))
const ManageIpBlockPage = lazy(() => import('./pages/setting/ManageIpBlockPage'))
const ReplacementPage = lazy(() => import('./pages/ReplacementPage'))
const ManageAdminsPage = lazy(() => import('./pages/ManageAdminsPage'))
const ManageTaxCardsPage = lazy(() => import('./pages/ManageTaxCardsPage'))
const ManageDictionaryPage = lazy(() => import('./pages/ManageDictionaryPage'))
import ErrorBoundary from './components/common/ErrorBoundary'

const ManageNewslettersPage = lazy(() => import('./pages/ManageNewslettersPage'))
const ManageCustomTariffsPage = lazy(() => import('./pages/ManageCustomTariffsPage'))
const ManageInvoicesPage = lazy(() => import('./pages/ManageInvoicesPage'))
const OtherCaseLawsPage = lazy(() => import('./pages/OtherCaseLawsPage'))


function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<div className="min-h-screen bg-brand-dark flex items-center justify-center"><Spinner size="lg" /></div>}>
              <Routes>
            {/* Public Auth & Verification Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/payment-instructions" element={<PaymentInstructionsPage />} />
              <Route path="/payment-review/approve/:token" element={<PaymentReviewApprovePage />} />
              <Route path="/payment-review/reject/:token" element={<PaymentReviewRejectPage />} />
            </Route>
            
                        {/* Standalone Document Views */}
            <Route element={<ProtectedRoute />}>
              <Route path="/cases/view/:id" element={<CaseViewPage />} />
            </Route>

            {/* Protected Admin Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/ai-assistant" element={<AIAssistantPage />} />
                <Route path="/ai-chat" element={<AIAssistantPage />} />
                <Route path="/news" element={<NewsPage />} />
                <Route path="/manage-news" element={<NewsPage />} />
                <Route path="/whatsapp-updates" element={<WhatsappUpdatesPage />} />
                <Route path="/manage-whatsapp" element={<WhatsappUpdatesPage />} />
                <Route path="/updates" element={<UpdatesPage />} />
                <Route path="/manage-updates" element={<UpdatesPage />} />
                <Route path="/downloads" element={<DownloadsPage />} />
                <Route path="/manage-downloads" element={<DownloadsPage />} />
                <Route path="/youtube-updates" element={<YoutubeUpdatesPage />} />
                <Route path="/manage-youtube" element={<YoutubeUpdatesPage />} />
                <Route path="/search-case-law" element={<SearchCaseLawPage />} />
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
                <Route path="/setting/cities" element={<ManageCitiesPage />} />
                <Route path="/settings/cities" element={<Navigate to="/setting/cities" replace />} />
                <Route path="/setting/principles" element={<ManagePrincipleOfLawsPage />} />
                <Route path="/settings/principles" element={<Navigate to="/setting/principles" replace />} />
                <Route path="/setting/laws" element={<ManageLawsPage />} />
                <Route path="/settings/laws" element={<Navigate to="/setting/laws" replace />} />
                <Route path="/manage-users" element={<ManageUsersPage />} />
                <Route path="/users" element={<Navigate to="/manage-users" replace />} />
                <Route path="/activity/cases" element={<CaseActivityPage />} />
                <Route path="/activity/notifications" element={<NotificationActivityPage />} />
                <Route path="/activity/statutes" element={<StatuteActivityPage />} />
                <Route path="/users-activity" element={<Navigate to="/activity/cases" replace />} />
                <Route path="/users-activity/cases" element={<Navigate to="/activity/cases" replace />} />
                <Route path="/users-activity/notifications" element={<Navigate to="/activity/notifications" replace />} />
                <Route path="/users-activity/statutes" element={<Navigate to="/activity/statutes" replace />} />
                <Route path="/setting/magazines" element={<ManageMagazinesPage />} />
                <Route path="/manage-magazines" element={<Navigate to="/setting/magazines" replace />} />
                <Route path="/setting/courts" element={<ManageCourtsPage />} />
                <Route path="/manage-courts" element={<Navigate to="/setting/courts" replace />} />
                <Route path="/setting/ip-blocks" element={<ManageIpBlockPage />} />
                <Route path="/manage-ip-blocks" element={<Navigate to="/setting/ip-blocks" replace />} />
                <Route path="/replacement" element={<ReplacementPage />} />
                <Route path="/manage-replacement" element={<Navigate to="/replacement" replace />} />
                <Route path="/manage-admins" element={<ManageAdminsPage />} />
                <Route path="/admins" element={<Navigate to="/manage-admins" replace />} />
                <Route path="/manage-tax-cards" element={<ManageTaxCardsPage />} />
                <Route path="/tax-cards" element={<Navigate to="/manage-tax-cards" replace />} />
                <Route path="/manage-dictionary" element={<ManageDictionaryPage />} />
                <Route path="/dictionary" element={<Navigate to="/manage-dictionary" replace />} />
                <Route path="/manage-newsletters" element={<ManageNewslettersPage />} />
                <Route path="/newsletters" element={<Navigate to="/manage-newsletters" replace />} />
                <Route path="/manage-custom-tariffs" element={<ManageCustomTariffsPage />} />
                <Route path="/manage-custom-tariff" element={<Navigate to="/manage-custom-tariffs" replace />} />
                <Route path="/custom-tariffs" element={<Navigate to="/manage-custom-tariffs" replace />} />
                <Route path="/custom-tariff" element={<Navigate to="/manage-custom-tariffs" replace />} />
                <Route path="/manage-invoices" element={<ManageInvoicesPage />} />
                <Route path="/invoices" element={<Navigate to="/manage-invoices" replace />} />
                <Route path="/other-caselaws" element={<OtherCaseLawsPage />} />
                <Route path="/manage-other-cases" element={<Navigate to="/other-caselaws" replace />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </UserProvider>
    </ThemeProvider>
  )
}

export default App

