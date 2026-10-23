import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import RequireAdmin from '@/components/RequireAdmin';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import StudioLayout from '@/components/studio/StudioLayout';
import StudioHome from '@/pages/StudioHome';
import ImportWizard from '@/pages/ImportWizard';
import BulkImportWizard from '@/pages/BulkImportWizard';
import CatalogueDetail from '@/pages/CatalogueDetail';
import StatsDashboard from '@/pages/StatsDashboard';
import PolesManager from '@/pages/PolesManager';
import UsersManager from '@/pages/UsersManager';
import PublicViewer from '@/pages/PublicViewer';
import EmbedViewer from '@/pages/EmbedViewer';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<StudioLayout />}>
        <Route path="/" element={<StudioHome />} />
      </Route>
      <Route
        element={
          <RequireAdmin>
            <StudioLayout />
          </RequireAdmin>
        }
      >
        <Route path="/nouveau" element={<ImportWizard />} />
        <Route path="/nouveau/masse" element={<BulkImportWizard />} />
        <Route path="/catalogue/:id" element={<CatalogueDetail />} />
        <Route path="/statistiques" element={<StatsDashboard />} />
        <Route path="/poles" element={<PolesManager />} />
        <Route path="/utilisateurs" element={<UsersManager />} />
      </Route>
      <Route path="/c/:slug" element={<PublicViewer />} />
      <Route path="/c/:slug/embed" element={<EmbedViewer />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App