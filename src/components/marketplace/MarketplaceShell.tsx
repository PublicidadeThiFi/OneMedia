import { ReactNode, useEffect, useRef } from 'react';
import { MarketplaceFooter } from './MarketplaceFooter';
import { MarketplaceHeader } from './MarketplaceHeader';
import '../../styles/marketplace.css';

type MarketplaceShellProps = {
  children: ReactNode;
  pageTitle?: string;
  hideFooter?: boolean;
};

export function MarketplaceShell({ children, pageTitle, hideFooter = false }: MarketplaceShellProps) {
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const title = pageTitle ? `${pageTitle} | OneMedia` : 'Marketplace OneMedia';
    document.title = title;

    const frame = window.requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pageTitle]);

  return (
    <div className="marketplace-root">
      <a className="marketplace-skip-link" href="#marketplace-main-content">
        Pular para o conteúdo principal
      </a>
      <MarketplaceHeader />
      <main
        ref={mainRef}
        id="marketplace-main-content"
        className="marketplace-main"
        tabIndex={-1}
      >
        {children}
      </main>
      {!hideFooter && <MarketplaceFooter />}
    </div>
  );
}
