import { Linkedin, Instagram, Mail, MessageCircle } from 'lucide-react';
import { useNavigation } from '../../App';

export function Footer() {
  const navigate = useNavigation();

  const footerSections = [
    {
      title: 'Soluções',
      links: [
        { label: 'Para veículos OOH/DOOH', href: '#' },
        { label: 'Para redes digitais', href: '#' },
      ],
    },
    {
      title: 'Recursos',
      links: [
        { label: 'API (em breve)', href: '#' },
        { label: 'Integrações', href: '#' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Política de Privacidade', href: '/privacidade', isRoute: true },
        { label: 'Termos de Uso', href: '/termos', isRoute: true },
      ],
    },
  ];

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">OOH</span>
              </div>
              <span className="text-lg text-gray-900">OOH Manager</span>
            </div>
            <p className="text-sm text-gray-600">
              Gestão de Mídia Exterior — Inventário, propostas, campanhas e financeiro em uma só plataforma.
            </p>
          </div>

          {/* Footer Sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-gray-900 mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {(link as any).isRoute ? (
                      <button
                        onClick={() => navigate(link.href)}
                        className="text-sm text-gray-600 hover:text-[#4F46E5] transition-colors"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-gray-600 hover:text-[#4F46E5] transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} OOH Manager. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-4">
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-[#4F46E5] transition-colors"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-[#4F46E5] transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="mailto:contato@oohmanager.com"
              className="text-gray-600 hover:text-[#4F46E5] transition-colors"
            >
              <Mail className="w-5 h-5" />
            </a>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-[#4F46E5] transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}