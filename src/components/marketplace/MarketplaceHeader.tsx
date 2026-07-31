import { ChevronDown, CircleUserRound, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMarketplaceAuth } from '../../contexts/MarketplaceAuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { buildMarketplaceLoginPath, buildMarketplaceSignupPath } from '../../lib/marketplaceReturnUrl';

const logoSrc = '/figma-assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

export function MarketplaceHeader() {
  const navigate = useNavigation();
  const { account, isLoading } = useMarketplaceAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const accountButtonRef = useRef<HTMLButtonElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const closeMobileMenu = (restoreFocus = false) => {
    setMobileMenuOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  };

  const closeAccountMenu = (restoreFocus = false) => {
    setAccountMenuOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => accountButtonRef.current?.focus());
    }
  };

  const goTo = (path: string) => {
    closeMobileMenu();
    closeAccountMenu();
    navigate(path);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const menu = mobileMenuRef.current;
    const controls = Array.from(
      menu?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') ?? [],
    );
    controls[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileMenu(true);
        return;
      }
      if (event.key !== 'Tab' || controls.length < 2) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        !accountMenuRef.current?.contains(target) &&
        !accountButtonRef.current?.contains(target)
      ) {
        closeAccountMenu();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAccountMenu(true);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountMenuOpen]);

  return (
    <header className="marketplace-header">
      <div className="marketplace-container marketplace-header__inner">
        <button
          type="button"
          className="marketplace-header__brand"
          onClick={() => goTo('/')}
          aria-label="Ir para o início do Marketplace OneMedia"
        >
          <img src={logoSrc} alt="OneMedia" className="marketplace-header__logo" width="174" height="43" />
        </button>

        <nav className="marketplace-header__categories" aria-label="Categorias do marketplace">
          <button type="button" onClick={() => goTo('/buscar')}>Todos os pontos</button>
          <button type="button" onClick={() => goTo('/buscar?type=OOH')}>OOH Estático</button>
          <button type="button" onClick={() => goTo('/buscar?type=DOOH')}>DOOH Digital</button>
        </nav>

        <div className="marketplace-header__actions">
          <button
            type="button"
            className="marketplace-header__advertise-link"
            onClick={() => goTo('/home')}
          >
            Anuncie seu ponto na OneMedia
          </button>

          {!isLoading ? (
            <button
              ref={accountButtonRef}
              type="button"
              className="marketplace-header__account-button"
              onClick={() => {
                if (!account) {
                  goTo(buildMarketplaceLoginPath());
                  return;
                }
                closeMobileMenu();
                setAccountMenuOpen((open) => !open);
              }}
              aria-label={account ? 'Abrir menu da minha conta de anunciante' : 'Entrar no marketplace'}
              aria-expanded={account ? accountMenuOpen : undefined}
              aria-haspopup={account ? 'menu' : undefined}
              aria-controls={account ? 'marketplace-account-menu' : undefined}
            >
              <CircleUserRound aria-hidden="true" />
              <span>{account ? account.name.split(' ')[0] : 'Entrar'}</span>
              {account ? <ChevronDown className="marketplace-header__account-chevron" aria-hidden="true" /> : null}
            </button>
          ) : null}

          {account && accountMenuOpen ? (
            <div
              ref={accountMenuRef}
              id="marketplace-account-menu"
              className="marketplace-header__account-menu"
              role="menu"
              aria-label="Menu da conta"
            >
              <button type="button" role="menuitem" onClick={() => goTo('/buscar')}>Todos os pontos</button>
              <button type="button" role="menuitem" onClick={() => goTo('/buscar?type=OOH')}>OOH Estático</button>
              <button type="button" role="menuitem" onClick={() => goTo('/buscar?type=DOOH')}>DOOH Digital</button>
              <span className="marketplace-header__account-menu-separator" role="separator" />
              <button type="button" role="menuitem" onClick={() => goTo('/marketplace/solicitacoes')}>Minha conta</button>
              <button type="button" role="menuitem" onClick={() => goTo('/marketplace/perfil')}>Meu perfil</button>
              <button type="button" role="menuitem" onClick={() => goTo('/home')}>Anuncie seu ponto</button>
            </div>
          ) : null}

          <button
            ref={menuButtonRef}
            type="button"
            className="marketplace-header__menu-button"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="marketplace-mobile-menu"
            onClick={() => {
              closeAccountMenu();
              setMobileMenuOpen((open) => !open);
            }}
          >
            {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          id="marketplace-mobile-menu"
          className="marketplace-header__mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu do marketplace"
        >
          <div className="marketplace-container marketplace-header__mobile-menu-inner">
            <button type="button" onClick={() => goTo('/buscar')}>Todos os pontos</button>
            <button type="button" onClick={() => goTo('/buscar?type=OOH')}>OOH Estático</button>
            <button type="button" onClick={() => goTo('/buscar?type=DOOH')}>DOOH Digital</button>
            <button type="button" onClick={() => goTo(account ? '/marketplace/solicitacoes' : buildMarketplaceLoginPath())}>
              {account ? 'Minha conta' : 'Entrar no marketplace'}
            </button>
            {account ? <button type="button" onClick={() => goTo('/marketplace/perfil')}>Meu perfil</button> : <button type="button" onClick={() => goTo(buildMarketplaceSignupPath())}>Criar conta</button>}
            <button type="button" className="marketplace-button marketplace-button--primary" onClick={() => goTo('/home')}>
              Anuncie seu ponto
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
