import { lazy, Suspense, useState, useEffect, Component, ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { WaitlistProvider } from './contexts/WaitlistContext';
import { NavigationContext, NavigateFunction } from './contexts/NavigationContext';
import { UploadQueueProvider } from './contexts/UploadQueueContext';
import { TutorialProvider } from './contexts/TutorialContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';

const Home = lazy(() => import('./pages/index'));
const Cadastro = lazy(() => import('./pages/cadastro'));
const Login = lazy(() => import('./pages/login'));
const VerifyEmail = lazy(() => import('./pages/verify-email'));
const ForgotPassword = lazy(() => import('./pages/forgot-password'));
const ResetPassword = lazy(() => import('./pages/reset-password'));
const Dashboard = lazy(() => import('./pages/dashboard'));
const Contato = lazy(() => import('./pages/contato'));
const Termos = lazy(() => import('./pages/termos'));
const Privacidade = lazy(() => import('./pages/privacidade'));
const MobileLandingPage = lazy(() => import('./pages/landing-mobile'));
const Planos = lazy(() => import('./pages/planos'));
const PropostaPublica = lazy(() => import('./pages/proposta-publica'));
const MidiaKitPublico = lazy(() => import('./pages/midia-kit-publico'));
const MenuHome = lazy(() => import('./pages/menu'));
const MenuSelectUF = lazy(() => import('./pages/menu-uf'));
const MenuSelectCity = lazy(() => import('./pages/menu-cidades'));
const MenuPontosPlaceholder = lazy(() => import('./pages/menu-pontos'));
const MenuDetalhe = lazy(() => import('./pages/menu-detalhe'));
const MenuFaces = lazy(() => import('./pages/menu-faces'));
const MenuCarrinho = lazy(() => import('./pages/menu-carrinho'));
const MenuCheckout = lazy(() => import('./pages/menu-checkout'));
const MenuEnviado = lazy(() => import('./pages/menu-enviado'));
const MenuAcompanhar = lazy(() => import('./pages/menu-acompanhar'));
const MenuProposta = lazy(() => import('./pages/menu-proposta'));
const MenuDonoWorkspace = lazy(() => import('./pages/menu-dono-workspace'));
const MenuDonoEnviada = lazy(() => import('./pages/menu-dono-enviada'));
const MenuDonoRevisao = lazy(() => import('./pages/menu-dono-revisao'));
const MenuDonoAprovada = lazy(() => import('./pages/menu-dono-aprovada'));
const OAuthCallback = lazy(() => import('./pages/oauth-callback'));
const AdminLoginPage = lazy(() => import('./pages/admin-login'));
const AdminDashboardPage = lazy(() => import('./pages/admin-dashboard'));
const AdminNewsEditorPage = lazy(() => import('./pages/admin-news-editor'));
const NewsDetailPage = lazy(() => import('./pages/news-detail'));
const MainApp = lazy(() => import('./components/MainApp').then((m) => ({ default: m.MainApp })));

class RootErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }>{
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return { hasError: true, message: msg };
  }

  componentDidCatch(err: unknown) {
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
            <button className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" onClick={() => window.location.reload()}>
              Recarregar
            </button>
            <button className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50" onClick={() => (window.location.href = '/?clearcache=1')}>
              Limpar cache e abrir o site
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function AppRouteFallback() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white px-6">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 p-6 shadow-sm">
        <p className="text-sm text-gray-600">Carregando aplicativo…</p>
      </div>
    </div>
  );
}

function Suspended({ children }: { children: ReactNode }) {
  return <Suspense fallback={<AppRouteFallback />}>{children}</Suspense>;
}

function MarketingShell({ children }: { children: ReactNode }) {
  return <WaitlistProvider>{children}</WaitlistProvider>;
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <WaitlistProvider>{children}</WaitlistProvider>
    </AuthProvider>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}

function InternalAppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CompanyProvider>
        <UploadQueueProvider>
          <TutorialProvider>{children}</TutorialProvider>
        </UploadQueueProvider>
      </CompanyProvider>
    </AuthProvider>
  );
}

function wrap(shell: 'marketing' | 'auth' | 'admin' | 'internal' | 'none', children: ReactNode) {
  switch (shell) {
    case 'marketing':
      return <MarketingShell>{children}</MarketingShell>;
    case 'auth':
      return <AuthShell>{children}</AuthShell>;
    case 'admin':
      return <AdminShell>{children}</AdminShell>;
    case 'internal':
      return <InternalAppShell>{children}</InternalAppShell>;
    default:
      return children;
  }
}

export default function App() {
  const getCurrentPath = () => window.location.pathname + window.location.search;
  const [currentPath, setCurrentPath] = useState(getCurrentPath());

  const isMobileDevice = () => {
    const width = window.innerWidth || document.documentElement.clientWidth;
    const ua = navigator.userAgent || (navigator as any).vendor;
    return width <= 768 || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry/i.test(ua);
  };

  useEffect(() => {
    const handlePopState = () => setCurrentPath(getCurrentPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate: NavigateFunction = (path: string) => {
    if (getCurrentPath() === path) return;
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const cleanPath = getCurrentPath().split('?')[0].replace(/\/$/, '') || '/';
    if (cleanPath === '/' && isMobileDevice()) {
      navigate('/landing-mobile');
    }
  }, [currentPath]);

  const renderRoute = () => {
    const cleanPath = currentPath.split('?')[0].replace(/\/$/, '') || '/';

    if (cleanPath.startsWith('/p/')) {
      return wrap('none', <Suspended><PropostaPublica /></Suspended>);
    }
    if (cleanPath === '/mk') {
      return wrap('none', <Suspended><MidiaKitPublico /></Suspended>);
    }

    if (cleanPath === '/menu') return wrap('none', <Suspended><MenuHome /></Suspended>);
    if (cleanPath === '/menu/uf') return wrap('none', <Suspended><MenuSelectUF /></Suspended>);
    if (cleanPath === '/menu/cidades') return wrap('none', <Suspended><MenuSelectCity /></Suspended>);
    if (cleanPath === '/menu/pontos') return wrap('none', <Suspended><MenuPontosPlaceholder /></Suspended>);
    if (cleanPath === '/menu/detalhe') return wrap('none', <Suspended><MenuDetalhe /></Suspended>);
    if (cleanPath === '/menu/faces') return wrap('none', <Suspended><MenuFaces /></Suspended>);
    if (cleanPath === '/menu/carrinho') return wrap('none', <Suspended><MenuCarrinho /></Suspended>);
    if (cleanPath === '/menu/checkout') return wrap('none', <Suspended><MenuCheckout /></Suspended>);
    if (cleanPath === '/menu/enviado') return wrap('none', <Suspended><MenuEnviado /></Suspended>);
    if (cleanPath === '/menu/acompanhar') return wrap('none', <Suspended><MenuAcompanhar /></Suspended>);
    if (cleanPath === '/menu/proposta') return wrap('none', <Suspended><MenuProposta /></Suspended>);
    if (cleanPath === '/menu/dono') return wrap('none', <Suspended><MenuDonoWorkspace /></Suspended>);
    if (cleanPath === '/menu/dono/enviada') return wrap('none', <Suspended><MenuDonoEnviada /></Suspended>);
    if (cleanPath === '/menu/dono/revisao') return wrap('none', <Suspended><MenuDonoRevisao /></Suspended>);
    if (cleanPath === '/menu/dono/aprovada') return wrap('none', <Suspended><MenuDonoAprovada /></Suspended>);

    const newsDetailMatch = cleanPath.match(/^\/noticias\/([^/]+)$/);
    if (newsDetailMatch) {
      return wrap('none', <Suspended><NewsDetailPage slug={decodeURIComponent(newsDetailMatch[1])} /></Suspended>);
    }

    if (cleanPath === '/admin') {
      return wrap('admin', <Suspended><AdminLoginPage /></Suspended>);
    }
    if (cleanPath === '/admin/dashboard') {
      return wrap('admin', <Suspended><AdminDashboardPage /></Suspended>);
    }
    if (cleanPath === '/admin/materias/nova') {
      return wrap('admin', <Suspended><AdminNewsEditorPage /></Suspended>);
    }
    const adminNewsEditMatch = cleanPath.match(/^\/admin\/materias\/([^/]+)\/editar$/);
    if (adminNewsEditMatch) {
      return wrap('admin', <Suspended><AdminNewsEditorPage articleId={decodeURIComponent(adminNewsEditMatch[1])} /></Suspended>);
    }

    if (cleanPath.startsWith('/app')) {
      const pagePath = cleanPath.replace('/app/', '').replace('/app', '');
      const initialPage = (!pagePath || pagePath === '') ? 'home' : (pagePath as any);
      return wrap('internal', <Suspended><MainApp key={cleanPath} initialPage={initialPage} /></Suspended>);
    }

    switch (cleanPath) {
      case '/':
        return wrap('marketing', <Suspended><Home /></Suspended>);
      case '/signup':
      case '/cadastro':
        return wrap('marketing', <Suspended><Cadastro /></Suspended>);
      case '/planos':
        return wrap('marketing', <Suspended><Planos /></Suspended>);
      case '/landing-mobile':
        return wrap('marketing', <Suspended><MobileLandingPage /></Suspended>);
      case '/login':
        return wrap('auth', <Suspended><Login /></Suspended>);
      case '/forgot-password':
        return wrap('auth', <Suspended><ForgotPassword /></Suspended>);
      case '/reset-password':
        return wrap('auth', <Suspended><ResetPassword /></Suspended>);
      case '/verify-email':
        return wrap('auth', <Suspended><VerifyEmail /></Suspended>);
      case '/oauth-callback':
        return wrap('auth', <Suspended><OAuthCallback /></Suspended>);
      case '/dashboard':
        return wrap('auth', <Suspended><Dashboard /></Suspended>);
      case '/contato':
        return wrap('marketing', <Suspended><Contato /></Suspended>);
      case '/termos':
        return wrap('marketing', <Suspended><Termos /></Suspended>);
      case '/privacidade':
        return wrap('marketing', <Suspended><Privacidade /></Suspended>);
      default:
        navigate('/');
        return wrap('marketing', <Suspended><Home /></Suspended>);
    }
  };

  return (
    <RootErrorBoundary>
      <NavigationContext.Provider value={navigate}>
        {renderRoute()}
        <Toaster richColors position="top-right" />
      </NavigationContext.Provider>
    </RootErrorBoundary>
  );
}
