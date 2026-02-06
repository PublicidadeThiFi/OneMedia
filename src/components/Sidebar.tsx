import { 
  LayoutDashboard, 
  Map,
  MapPin, 
  Users, 
  Package,
  FileText, 
  Megaphone, 
  Calendar, 
  Wallet, 
  MessageSquare, 
  Globe, 
  Activity, 
  Settings as SettingsIcon,
  Shield
} from 'lucide-react';
import type { Page } from '../App';
import { useCompany } from '../contexts/CompanyContext';
import { getMultiOwnerLabel } from '../lib/plans';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isSuperAdmin: boolean;
  isMobile?: boolean;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventário', icon: MapPin },
  { id: 'mediamap', label: 'Mídia Map', icon: Map },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'products', label: 'Produtos/Serviços', icon: Package },
  { id: 'proposals', label: 'Propostas', icon: FileText },
  { id: 'campaigns', label: 'Campanhas', icon: Megaphone },
  { id: 'reservations', label: 'Reservas', icon: Calendar },
  { id: 'financial', label: 'Financeiro', icon: Wallet },
  { id: 'messages', label: 'Mensagens', icon: MessageSquare },
  { id: 'mediakit', label: 'Mídia Kit', icon: Globe },
  { id: 'activities', label: 'Atividades', icon: Activity },
  { id: 'settings', label: 'Configurações', icon: SettingsIcon },
] as const;

export function Sidebar({ currentPage, onNavigate, isSuperAdmin, isMobile = false }: SidebarProps) {
  // Use CompanyContext as single source of truth
  const { company, subscription, pointsLimit, daysRemainingInTrial } = useCompany();

  return (
    <div className="w-64 md:w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-indigo-600">OneMedia</h1>
        <p className="text-gray-500 text-sm mt-1">Gestão de Mídia Exterior</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as Page)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-left">{item.label}</span>
            </button>
          );
        })}
        
        {isSuperAdmin && (
          <>
            <div className="my-4 border-t border-gray-200" />
            <button
              onClick={() => onNavigate('superadmin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === 'superadmin'
                  ? 'bg-red-50 text-red-600' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Shield className="w-5 h-5 flex-shrink-0" />
              <span className="text-left">Super Admin</span>
            </button>
          </>
        )}
      </nav>
      
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="bg-indigo-50 p-4 rounded-lg">
          <p className="text-indigo-900 text-sm">Plano Atual</p>
          <p className="text-indigo-600 mt-1">Até {pointsLimit} pontos</p>
          {daysRemainingInTrial !== null && (
            <p className="text-gray-600 text-xs mt-2">
              {daysRemainingInTrial} dias de teste restantes
            </p>
          )}
          {subscription && (
            <p className="text-gray-600 text-xs mt-1">
              {getMultiOwnerLabel(subscription.maxOwnersPerMediaPoint)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}