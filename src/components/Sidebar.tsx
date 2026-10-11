import {
  Activity,
  BarChart3,
  Calendar,
  CalendarClock,
  FileText,
  FolderOpen,
  Globe,
  House,
  Inbox,
  LayoutDashboard,
  Map,
  MapPin,
  Megaphone,
  MessageSquare,
  MonitorPlay,
  Package,
  Settings as SettingsIcon,
  Shield,
  Store,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import type { Page } from "../types/app-page";
import { useCompany } from "../contexts/CompanyContext";
import { getMultiOwnerLabel } from "../lib/plans";
import type { PlatformModule } from "../lib/platformAccess";
import {
  DOOH_SECTION_LABELS,
  type DoohFoundationSection,
} from "../lib/productNavigation";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isSuperAdmin: boolean;
  isMobile?: boolean;
  activeModule: PlatformModule;
  availableModules: PlatformModule[];
  onModuleChange: (module: PlatformModule) => void;
  currentDoohSection?: DoohFoundationSection;
  onDoohNavigate?: (section: DoohFoundationSection) => void;
}

const oohMenuItems = [
  { id: "home", label: "Página Inicial", icon: House },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "inventory", label: "Inventário", icon: MapPin },
  { id: "mediamap", label: "Mídia Map", icon: Map },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "products", label: "Produtos/Serviços", icon: Package },
  { id: "proposals", label: "Propostas", icon: FileText },
  { id: "campaigns", label: "Campanhas", icon: Megaphone },
  { id: "reservations", label: "Reservas", icon: Calendar },
  { id: "financial", label: "Financeiro", icon: Wallet },
  { id: "messages", label: "Mensagens", icon: MessageSquare },
  {
    id: "marketplace-inquiries",
    label: "Solicitações Marketplace",
    icon: Inbox,
  },
  {
    id: "marketplace-management",
    label: "Gestão Marketplace",
    icon: Store,
  },
  { id: "mediakit", label: "Mídia Kit", icon: Globe },
  { id: "promotions", label: "Promoções", icon: Tag },
  { id: "activities", label: "Atividades", icon: Activity },
  { id: "settings", label: "Configurações", icon: SettingsIcon },
] as const;

const doohMenuItems: Array<{
  id: DoohFoundationSection;
  label: string;
  icon: typeof House;
}> = [
  { id: "home", label: DOOH_SECTION_LABELS.home, icon: House },
  { id: "screens", label: DOOH_SECTION_LABELS.screens, icon: MonitorPlay },
  { id: "library", label: DOOH_SECTION_LABELS.library, icon: FolderOpen },
  { id: "scheduling", label: DOOH_SECTION_LABELS.scheduling, icon: CalendarClock },
  { id: "reports", label: DOOH_SECTION_LABELS.reports, icon: BarChart3 },
];

export function Sidebar({
  currentPage,
  onNavigate,
  isSuperAdmin,
  activeModule,
  availableModules,
  onModuleChange,
  currentDoohSection = "home",
  onDoohNavigate,
}: SidebarProps) {
  const { subscription, pointsLimit, daysRemainingInTrial } = useCompany();
  const canSwitchProducts = availableModules.length > 1;

  return (
    <div className="w-64 md:w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-indigo-600">OneMedia</h1>
        <p className="text-gray-500 text-sm mt-1">
          {activeModule === "OOH" ? "Gestão de Mídia Exterior" : "Digital Signage / DOOH"}
        </p>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-1">
          <div className="grid grid-cols-2 gap-1">
            {(["OOH", "DOOH"] as PlatformModule[]).map((module) => {
              const granted = availableModules.includes(module);
              const selected = activeModule === module;

              return (
                <button
                  key={module}
                  type="button"
                  disabled={!granted || (!canSwitchProducts && !selected)}
                  onClick={() => onModuleChange(module)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    selected
                      ? "bg-white text-indigo-700 shadow-sm"
                      : granted
                        ? "text-gray-600 hover:bg-white hover:text-gray-900"
                        : "cursor-not-allowed text-gray-300"
                  }`}
                  aria-pressed={selected}
                  title={granted ? `Abrir ${module}` : `${module} não contratado`}
                >
                  {module}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <nav
        className="flex-1 p-4 space-y-1 overflow-y-auto"
        data-tour="home-sidebar-navigation"
      >
        {activeModule === "OOH"
          ? oohMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id as Page)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-left">{item.label}</span>
                </button>
              );
            })
          : doohMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentDoohSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onDoohNavigate?.(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-left">{item.label}</span>
                </button>
              );
            })}

        {isSuperAdmin && activeModule === "OOH" && (
          <>
            <div className="my-4 border-t border-gray-200" />
            <button
              onClick={() => onNavigate("superadmin")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === "superadmin"
                  ? "bg-red-50 text-red-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Shield className="w-5 h-5 flex-shrink-0" />
              <span className="text-left">Super Admin</span>
            </button>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        {activeModule === "OOH" ? (
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
        ) : (
          <div className="rounded-lg bg-indigo-50 p-4">
            <p className="text-sm font-medium text-indigo-900">Módulo DOOH</p>
            <p className="mt-1 text-xs leading-5 text-indigo-700">
              Navegação e controle de acesso habilitados. Operação de Digital Signage entra nas próximas fases.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
