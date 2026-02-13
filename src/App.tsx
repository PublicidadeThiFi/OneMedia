import { useState, useEffect, Component, ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { WaitlistProvider } from './contexts/WaitlistContext';

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
import MenuHome from './pages/menu';
import MenuSelectUF from './pages/menu-uf';
import MenuSelectCity from './pages/menu-cidades';
import MenuPontosPlaceholder from './pages/menu-pontos';
import MenuDetalhe from './pages/menu-detalhe';
import MenuFaces from './pages/menu-faces';
import MenuCarrinho from './pages/menu-carrinho';
import MenuCheckout from './pages/menu-checkout';
import MenuEnviado from './pages/menu-enviado';
import MenuAcompanhar from './pages/menu-acompanhar';
import MenuProposta from './pages/menu-proposta';
import MenuDonoWorkspace from './pages/menu-dono-workspace';
import MenuDonoEnviada from './pages/menu-dono-enviada';
import MenuDonoRevisao from './pages/menu-dono-revisao';
import MenuDonoAprovada from './pages/menu-dono-aprovada';

// Internal App
import { MainApp } from './components/MainApp';

import { NavigationContext, NavigateFunction } from './contexts/NavigationContext';

// Backward-compatible re-exports (many components import these from "../App")
export { useNavigation } from './contexts/NavigationContext';
export type { NavigateFunction } from './contexts/NavigationContext';

// Re-export Page type for components
export type { Page } from './components/MainApp';

class RootErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }>{
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return { hasError: true, message: msg };
  }

  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.error('Root render crashed:', err);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white px-6">
        <div className="max-w-lg w-full rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Algo deu errado ao carregar o app</h1>
          <p className="mt-2 text-sm text-gray-600">
            Isso pode acontecer após uma atualização quando o navegador/CDN entrega arquivos em cache.
          </p>
          <p className="mt-3 text-xs text-gray-500 break-words">{this.state.message}</p>

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <button
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Recarregar
            </button>
            <button
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              onClick={() => (window.location.href = '/?clearcache=1')}
            >
              Limpar cache e abrir o site
            </button>
          </div>
        </div>
      </div>
    );
  }
}

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

    // PUBLIC MENU (CARDÁPIO) ROUTES (prototype)
    // /menu?token=<publicToken>
    // /menu/uf?token=<publicToken>
    // /menu/cidades?token=<publicToken>&uf=XX
    // /menu/pontos?token=<publicToken>&uf=XX&city=YYY
    // /menu/detalhe?token=<publicToken>&id=<pointId>
    // /menu/faces?token=<publicToken>&id=<pointId>
    // /menu/carrinho?token=<publicToken>
    // /menu/checkout?token=<publicToken>
    // /menu/enviado?token=<publicToken>&rid=<requestId>
    // /menu/acompanhar?token=<publicToken>&rid=<requestId>
    if (cleanPath === '/menu') return <MenuHome />;
    if (cleanPath === '/menu/uf') return <MenuSelectUF />;
    if (cleanPath === '/menu/cidades') return <MenuSelectCity />;
    if (cleanPath === '/menu/pontos') return <MenuPontosPlaceholder />;
    if (cleanPath === '/menu/detalhe') return <MenuDetalhe />;
    if (cleanPath === '/menu/faces') return <MenuFaces />;
    if (cleanPath === '/menu/carrinho') return <MenuCarrinho />;
    if (cleanPath === '/menu/checkout') return <MenuCheckout />;
    if (cleanPath === '/menu/enviado') return <MenuEnviado />;
    if (cleanPath === '/menu/acompanhar') return <MenuAcompanhar />;
  if (cleanPath === '/menu/proposta') return <MenuProposta />;

  if (cleanPath === '/menu/dono') return <MenuDonoWorkspace />;
  if (cleanPath === '/menu/dono/enviada') return <MenuDonoEnviada />;
  if (cleanPath === '/menu/dono/revisao') return <MenuDonoRevisao />;
  if (cleanPath === '/menu/dono/aprovada') return <MenuDonoAprovada />;

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
    <RootErrorBoundary>
      <NavigationContext.Provider value={navigate}>
        <AuthProvider>
          <CompanyProvider>
            <WaitlistProvider>
              {renderRoute()}
              <Toaster richColors position="top-right" />
            </WaitlistProvider>
          </CompanyProvider>
        </AuthProvider>
      </NavigationContext.Provider>
    </RootErrorBoundary>
  );
}
