import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  FileText, 
  Megaphone, 
  Calendar,
  DollarSign,
  Mail,
  FileBox,
  Activity,
  Settings,
  LogOut
} from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigation();

  if (!user) {
    // Redirect to login if not authenticated
    navigate('/login');
    return null;
  }

  const modules = [
    { icon: LayoutDashboard, name: 'Dashboard', path: '/dashboard', disabled: false },
    { icon: Package, name: 'Inventário', path: '/inventario', disabled: true },
    { icon: Users, name: 'Clientes', path: '/clientes', disabled: true },
    { icon: FileText, name: 'Propostas', path: '/propostas', disabled: true },
    { icon: Megaphone, name: 'Campanhas', path: '/campanhas', disabled: true },
    { icon: Calendar, name: 'Reservas', path: '/reservas', disabled: true },
    { icon: DollarSign, name: 'Financeiro', path: '/financeiro', disabled: true },
    { icon: Mail, name: 'Mensagens', path: '/mensagens', disabled: true },
    { icon: FileBox, name: 'Mídia Kit', path: '/midiakit', disabled: true },
    { icon: Activity, name: 'Atividades', path: '/atividades', disabled: true },
    { icon: Settings, name: 'Configurações', path: '/configuracoes', disabled: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">OOH</span>
            </div>
            <span className="text-lg text-gray-900">OneMedia</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">
            Bem-vindo, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-gray-600">
            Você está autenticado no sistema OOH Manager
          </p>
          
          {user.twoFactorEnabled && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              <span>🔒</span>
              2FA Ativado ({user.twoFactorType})
            </div>
          )}
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <button
              key={module.path}
              onClick={() => !module.disabled && navigate(module.path)}
              disabled={module.disabled}
              className={`p-6 bg-white rounded-xl border-2 transition-all text-left ${
                module.disabled
                  ? 'border-gray-200 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 hover:border-[#4F46E5] hover:shadow-md cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  module.disabled ? 'bg-gray-100' : 'bg-[#4F46E5]/10'
                }`}>
                  <module.icon className={`w-6 h-6 ${
                    module.disabled ? 'text-gray-400' : 'text-[#4F46E5]'
                  }`} />
                </div>
                <div>
                  <h3 className="text-gray-900 mb-1">{module.name}</h3>
                  <p className="text-sm text-gray-500">
                    {module.disabled ? 'Em desenvolvimento' : 'Acessar módulo'}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-blue-900 mb-2">🎉 Login realizado com sucesso!</h3>
          <p className="text-sm text-blue-800 mb-4">
            Esta é uma interface de demonstração. Os módulos do sistema estão sendo desenvolvidos e 
            serão habilitados em breve.
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-blue-900 font-semibold mb-1">Dados do usuário:</p>
              <ul className="text-blue-800 space-y-1">
                <li>• ID: {user.id}</li>
                <li>• Company ID: {user.companyId}</li>
                <li>• Status: {user.status}</li>
                <li>• Super Admin: {user.isSuperAdmin ? 'Sim' : 'Não'}</li>
              </ul>
            </div>
            <div>
              <p className="text-blue-900 font-semibold mb-1">Credenciais de teste:</p>
              <ul className="text-blue-800 space-y-1">
                <li>• Com 2FA: carlos.mendes@outdoorbrasil.com.br</li>
                <li>• Sem 2FA: ana.silva@outdoorbrasil.com.br</li>
                <li>• Senha: senha123</li>
                <li>• Código 2FA: 123456</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}