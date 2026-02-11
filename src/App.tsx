import { useState, useEffect, createContext, useContext } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';

// Pages
import Home from './pages/index';
import Cadastro from './pages/cadastro';
import Login from './pages/login';
import VerifyEmail from './pages/verify-email';
import ForgotPassword from './pages/forgot-password';
import ResetPassword from './pages/reset-password';
import Dashboard from './pages/dashboard';
import Contato from './pages/contato';
import Termos from './pages/termos';
import Privacidade from './pages/privacidade';
import Planos from './pages/planos';
import PropostaPublica from './pages/proposta-publica';
import MidiaKitPublico from './pages/midia-kit-publico';

// Internal App
import { MainApp } from './components/MainApp';

// Re-export Page type for components
export type { Page } from './components/MainApp';

// Navigation Context
type NavigateFunction = (path: string) => void;
const NavigationContext = createContext<NavigateFunction>(() => { });

export const useNavigation = () => useContext(NavigationContext);

export default function App() {
  const getCurrentPath = () => window.location.pathname + window.location.search;
  const [currentPath, setCurrentPath] = useState(getCurrentPath());

  // Listen to browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getCurrentPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation function
  const navigate: NavigateFunction = (path: string) => {
    if (getCurrentPath() === path) return;
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0); // Scroll to top on navigation
  };

  // Route component based on current path
  const renderRoute = () => {
    // Remove trailing slash and query params for matching
    const cleanPath = currentPath.split('?')[0].replace(/\/$/, '') || '/';

    // PUBLIC PROPOSAL ROUTE
    // /p/<publicHash> (optional query string ?t=<decisionToken>)
    if (cleanPath.startsWith('/p/')) {
      return <PropostaPublica />;
    }


    // PUBLIC MEDIA KIT ROUTE
    // /mk?token=<publicToken>
    if (cleanPath === '/mk') {
      return <MidiaKitPublico />;
    }

    // INTERNAL APPLICATION ROUTES (updated 02/12/2024)
    // All /app/* routes render the MainApp component with sidebar and modules
    // This is the authenticated user's main interface
    if (cleanPath.startsWith('/app')) {
      // Extract page from path like /app/dashboard, /app/inventory, etc.
      const pagePath = cleanPath.replace('/app/', '').replace('/app', '');

      // If just /app, default to dashboard
      if (!pagePath || pagePath === '') {
        return <MainApp initialPage="dashboard" />;
      }

      // Map path to page
      // Valid pages: dashboard, inventory, clients, products, proposals, campaigns,
      // reservations, financial, messages, mediakit, activities, settings, superadmin
      return <MainApp initialPage={pagePath as any} />;
    }

    switch (cleanPath) {
      case '/':
        return <Home />;
      case '/signup':
      case '/cadastro':
        return <Cadastro />;
      case '/planos':
        return <Planos />;
      case '/login':
        return <Login />;
      case '/forgot-password':
        return <ForgotPassword />;
      case '/reset-password':
        return <ResetPassword />;
      case '/verify-email':
        return <VerifyEmail />;
      case '/dashboard':
        return <Dashboard />;
      case '/contato':
        return <Contato />;
      case '/termos':
        return <Termos />;
      case '/privacidade':
        return <Privacidade />;
      default:
        // 404 - redirect to home
        navigate('/');
        return <Home />;
    }
  };

  return (
    <NavigationContext.Provider value={navigate}>
      <AuthProvider>
        <CompanyProvider>
          {renderRoute()}
          <Toaster richColors position="top-right" />
        </CompanyProvider>
      </AuthProvider>
    </NavigationContext.Provider>
  );
}
