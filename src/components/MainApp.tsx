/**
 * MainApp - Internal application shell
 * Renders the sidebar and main content area for the OneMedia application
 * This is the authenticated user's main interface after login
 */

import { useEffect, useState, useMemo, Component, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { Inventory } from './Inventory';
import { MediaMap } from './MediaMap';
import { Clients } from './Clients';
import { Products } from './Products';
import { Proposals } from './Proposals';
import { Campaigns } from './Campaigns';
import { Reservations } from './Reservations';
import { Financial } from './Financial';
import { Messages } from './Messages';
import { MediaKit } from './MediaKit';
import { Activities } from './Activities';
import { Settings } from './Settings';
import { SuperAdmin } from './SuperAdmin';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { useNavigation } from '../App';

// Define all possible pages in the application
export type Page =
  | 'dashboard'
  | 'inventory'
  | 'mediamap'
  | 'clients'
  | 'products'
  | 'proposals'
  | 'campaigns'
  | 'reservations'
  | 'financial'
  | 'messages'
  | 'mediakit'
  | 'activities'
  | 'settings'
  | 'superadmin';

interface MainAppProps {
  initialPage?: Page;
}

class AppErrorBoundary extends Component<{ children: ReactNode; onReset?: () => void }, { hasError: boolean; error?: unknown }> {
  state = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    // Log to console for diagnostics
    // eslint-disable-next-line no-console
    console.error('Error in page render:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="border border-red-200 rounded-lg bg-red-50 p-6">
            <p className="text-red-700 font-medium mb-2">Ocorreu um erro ao abrir esta página.</p>
            <p className="text-sm text-red-700 mb-4">Abra o console (F12) para ver detalhes.</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                this.props.onReset?.();
              }}
              className="px-3 py-2 rounded bg-white border"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children as ReactNode;
  }
}

export function MainApp({ initialPage = 'dashboard' }: MainAppProps) {
  const [currentPage, setCurrentPage] = useState<Page>(initialPage);

  // Sync with URL-based navigation (e.g. /app/settings?tab=subscription)
  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync URL-based initial page changes (e.g., navigate('/app/settings?...'))
  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);
  const { user, logout, authReady } = useAuth();
  const navigate = useNavigation();

  const { isBlocked, blockMessage, isTrialEndingSoon, daysRemainingInTrial, subscription } = useCompany();

  // IMPORTANT: On a full page reload (F5), the AuthProvider needs a moment
  // to bootstrap /auth/me using tokens from localStorage.
  // While authReady=false we must NOT redirect yet.
  useEffect(() => {
    if (authReady && !user) {
      navigate('/login');
    }
  }, [authReady, user, navigate]);

  if (!authReady) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    // Never render a blank screen: show a minimal fallback and a safe way back to login.
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-gray-900 mb-2">Sua sessão expirou.</p>
          <p className="text-sm text-gray-600 mb-4">Você precisa entrar novamente para continuar.</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full px-4 py-2 rounded-lg bg-[#4F46E5] text-white hover:opacity-95"
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  const pastDueGraceDaysLeft = useMemo(() => {
    if (isBlocked) return null;
    if (!subscription) return null;
    if (String(subscription.status) !== 'EM_ATRASO') return null;
    if (!subscription.currentPeriodEnd) return null;
    const due = new Date(subscription.currentPeriodEnd as any);
    if (Number.isNaN(due.getTime())) return null;
    const dayMs = 24 * 60 * 60 * 1000;
    const graceEnd = due.getTime() + 3 * dayMs;
    const leftMs = graceEnd - Date.now();
    if (leftMs <= 0) return 0;
    return Math.ceil(leftMs / dayMs);
  }, [isBlocked, subscription?.status, subscription?.currentPeriodEnd]);

  const goToSubscriptionSettings = () => {
    setCurrentPage('settings');
    setIsMobileMenuOpen(false);
    navigate('/app/settings?tab=subscription');
  };

  // Close mobile menu when navigating
  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
  };

  // Render the current page content
    // Render the current page content
  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;

      case 'inventory':
        return <Inventory />;

      case 'mediamap':
        return <MediaMap />;

      case 'clients':
        return <Clients />;

      case 'products':
        return <Products />;

      case 'proposals':
        return <Proposals onNavigate={handleNavigate} />;

      case 'campaigns':
        return <Campaigns />;

      case 'reservations':
        return <Reservations />;

      case 'financial':
        return <Financial />;

      case 'messages':
        return <Messages />;

      case 'mediakit':
        return <MediaKit />;

      case 'activities':
        return <Activities />;

      case 'settings':
        return <Settings />;

      case 'superadmin':
        return <SuperAdmin />;

      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };


  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          isSuperAdmin={user.isSuperAdmin}
        />
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative h-full">
          {/* Close Button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 text-gray-600 hover:bg-gray-100 rounded-lg z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <Sidebar
            currentPage={currentPage}
            onNavigate={handleNavigate}
            isSuperAdmin={user.isSuperAdmin}
            isMobile={true}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Button & Logo */}
            <div className="flex items-center gap-3 md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">OOH</span>
                </div>
                <span className="text-lg text-gray-900">OneMedia</span>
              </div>
            </div>

            {/* Desktop - Empty space */}
            <div className="hidden md:block flex-1" />

            {/* User Info & Logout */}
            <div className="flex items-center gap-2 md:gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 hidden md:block">
                  {user.email}
                </p>
              </div>
              <button
                onClick={logout}
                className="px-3 md:px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        {(isBlocked || isTrialEndingSoon || (pastDueGraceDaysLeft !== null && pastDueGraceDaysLeft > 0)) && (
          <div
            className={
              'px-4 md:px-8 py-3 border-b ' +
              (isBlocked
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200')
            }
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="text-sm">
                {isBlocked ? (
                  <span className="text-red-700">{blockMessage ?? 'Sua conta está com acesso restrito.'}</span>
                ) : pastDueGraceDaysLeft !== null && pastDueGraceDaysLeft > 0 ? (
                  <span className="text-amber-800">
                    Não identificamos o pagamento da renovação. Você tem {pastDueGraceDaysLeft} dia(s) para regularizar antes do bloqueio total.
                  </span>
                ) : (
                  <span className="text-amber-800">
                    Seu período de teste termina em {daysRemainingInTrial ?? 0} dia(s). Assine um plano para não ser bloqueado.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToSubscriptionSettings}
                  className={
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors ' +
                    (isBlocked
                      ? 'bg-red-600 text-white hover:opacity-95'
                      : 'bg-amber-600 text-white hover:opacity-95')
                  }
                >
                  {isBlocked ? 'Regularizar assinatura' : 'Ver planos'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <AppErrorBoundary onReset={() => window.dispatchEvent(new Event('app:navigation'))}>
            {renderContent()}
          </AppErrorBoundary>
        </main>
      </div>
    </div>
  );
}