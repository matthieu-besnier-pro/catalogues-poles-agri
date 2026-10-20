import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import StudioLayout from '@/components/studio/StudioLayout';
import StudioHome from '@/pages/StudioHome';
import ImportWizard from '@/pages/ImportWizard';
import CatalogueDetail from '@/pages/CatalogueDetail';
import StatsDashboard from '@/pages/StatsDashboard';
import PolesManager from '@/pages/PolesManager';
import PublicViewer from '@/pages/PublicViewer';
import EmbedViewer from '@/pages/EmbedViewer';

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
        <Route path="/nouveau" element={<ImportWizard />} />
        <Route path="/catalogue/:id" element={<CatalogueDetail />} />
        <Route path="/statistiques" element={<StatsDashboard />} />
        <Route path="/poles" element={<PolesManager />} />
      </Route>
      <Route path="/c/:slug" element={<PublicViewer />} />
      <Route path="/c/:slug/embed" element={<EmbedViewer />} />
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