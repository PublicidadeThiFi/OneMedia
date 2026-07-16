import { useNavigation } from '../../contexts/NavigationContext';

const logoSrc = '/figma-assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

export function MarketplaceFooter() {
  const navigate = useNavigation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="marketplace-footer">
      <div className="marketplace-container marketplace-footer__grid">
        <div className="marketplace-footer__brand-block">
          <button type="button" className="marketplace-footer__brand" onClick={() => navigate('/')}>
            <img src={logoSrc} alt="OneMedia" />
          </button>
          <p>Encontre espaços OOH e DOOH para colocar sua marca em evidência.</p>
        </div>

        <div className="marketplace-footer__links" aria-label="Marketplace">
          <strong>Marketplace</strong>
          <button type="button" onClick={() => navigate('/buscar')}>Explorar pontos</button>
          <button type="button" onClick={() => navigate('/buscar?type=OOH')}>OOH estático</button>
          <button type="button" onClick={() => navigate('/buscar?type=DOOH')}>DOOH digital</button>
        </div>

        <div className="marketplace-footer__links" aria-label="Para empresas">
          <strong>Para empresas</strong>
          <button type="button" onClick={() => navigate('/home')}>Conheça a OneMedia</button>
          <button type="button" onClick={() => navigate('/login')}>Acesso empresarial</button>
          <button type="button" onClick={() => navigate('/contato')}>Contato</button>
        </div>

        <div className="marketplace-footer__links" aria-label="Conta do anunciante">
          <strong>Sua conta</strong>
          <button type="button" onClick={() => navigate('/marketplace/entrar')}>Entrar</button>
          <button type="button" onClick={() => navigate('/marketplace/cadastro')}>Criar conta</button>
          <button type="button" onClick={() => navigate('/marketplace/solicitacoes')}>Solicitações</button>
        </div>
      </div>

      <div className="marketplace-container marketplace-footer__bottom">
        <span>© {currentYear} OneMedia. Todos os direitos reservados.</span>
        <div>
          <button type="button" onClick={() => navigate('/privacidade')}>Privacidade</button>
          <button type="button" onClick={() => navigate('/termos')}>Termos de uso</button>
        </div>
      </div>
    </footer>
  );
}
