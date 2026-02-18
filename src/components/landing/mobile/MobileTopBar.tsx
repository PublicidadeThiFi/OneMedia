import { Menu, ArrowRight } from 'lucide-react';
import { useNavigation } from '../../../App';
import { useWaitlist } from '../../../contexts/WaitlistContext';
import imgOnemediaLogo from 'figma:asset/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

export function MobileTopBar() {
  const navigate = useNavigation();
  const { openWaitlist } = useWaitlist();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-5 py-2 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <img src={imgOnemediaLogo} alt="OneMedia" className="h-8 w-auto" />
          <span className="hidden sm:inline text-xs text-gray-600 whitespace-nowrap">Suite OOH/DOOH</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => navigate('/login')}
            className="text-xs sm:text-sm text-gray-700 hover:text-blue-600 whitespace-nowrap"
          >
            Entrar
          </button>
          <button
            onClick={() => openWaitlist('mobile-topbar:teste-gratis')}
            className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-700 whitespace-nowrap"
          >
            Teste grátis
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            aria-label="Menu"
            className="p-2 text-gray-700 hover:text-blue-600 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
