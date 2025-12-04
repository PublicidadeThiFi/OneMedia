import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useNavigation } from '../../App';

export function Header() {
  const navigate = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { label: 'Soluções', href: '#solucoes' },
    { label: 'Funcionalidades', href: '#funcionalidades' },
    { label: 'Economia', href: '#economia' },
    { label: 'Planos', href: '#planos' },
    { label: 'Depoimentos', href: '#depoimentos' },
    { label: 'FAQ', href: '#faq' },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">OOH</span>
              </div>
              <span className="text-lg text-gray-900">OOH Manager</span>
            </button>
          </div>

          {/* Desktop Menu */}
          <nav className="hidden lg:flex items-center gap-8">
            {menuItems.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollToSection(item.href)}
                className="text-gray-600 hover:text-[#4F46E5] transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="text-gray-600 hover:text-[#4F46E5] transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => navigate('/cadastro')}
              className="bg-[#4F46E5] text-white px-6 py-2 rounded-lg hover:bg-[#4338CA] transition-colors"
            >
              Começar teste grátis
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-white z-40 overflow-y-auto">
          <div className="px-4 py-6 space-y-4">
            {menuItems.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollToSection(item.href)}
                className="block w-full text-left text-gray-600 hover:text-[#4F46E5] py-2 transition-colors"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="block w-full text-center text-gray-600 hover:text-[#4F46E5] py-2 transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => navigate('/cadastro')}
                className="block w-full text-center bg-[#4F46E5] text-white px-6 py-3 rounded-lg hover:bg-[#4338CA] transition-colors"
              >
                Começar teste grátis
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
