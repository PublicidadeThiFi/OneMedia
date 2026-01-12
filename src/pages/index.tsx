import { useNavigation } from '../App';
import { ArrowRight, Check, AlertTriangle, CheckCircle2, Zap, Eye, Rocket, Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';
import imgOnemediaLogo from '../assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';
import imgImage1 from '../assets/0622760ec539e74e0a9554dceb8a7a9549b2d826.png';
import imgImage2 from '../assets/a650fd3251a7c56702fe8a07a33be4a6b676ce4a.png';
import imgLogotipoOutdoorBr from '../assets/b772fcca664e51771498ee420b09d2bb7a1c5fed.png';
import imgCeoOutdoor from '../assets/b410819dec3dab15947c18ed6baae2284d619ffd.png';

// Module type definition
type ModuleKey = 'inventario' | 'propostas' | 'campanhas' | 'financeiro' | 'ocupacao' | 'clientes' | 'proprietarios' | 'relatorios' | 'outros';
type SolutionTab = 'inventario' | 'propostas' | 'campanhas' | 'financeiro' | 'midiakit' | 'dashboard';

// Mock images for each module (will be replaced with real screenshots later)
const moduleImages = {
  inventario: {
    image1: imgImage1, // Using original inventory image
    image2: imgImage2
  },
  propostas: {
    image1: 'https://images.unsplash.com/photo-1644329771977-0a8c6e3928ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9wb3NhbCUyMGRvY3VtZW50fGVufDF8fHx8MTc2ODIyMjg4OXww&ixlib=rb-4.1.0&q=80&w=1080',
    image2: 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHJlcG9ydHxlbnwxfHx8fDE3NjgyMjI4OTN8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  campanhas: {
    image1: 'https://images.unsplash.com/photo-1758592299816-435971bf5d44?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYW1wYWlnbiUyMG1hbmFnZW1lbnR8ZW58MXx8fHwxNzY4MjIyODg5fDA&ixlib=rb-4.1.0&q=80&w=1080',
    image2: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXNoYm9hcmQlMjBhbmFseXRpY3N8ZW58MXx8fHwxNzY4MjA4MTQ0fDA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  financeiro: {
    image1: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5hbmNpYWwlMjBjaGFydHxlbnwxfHx8fDE3NjgxNjMwOTR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    image2: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXNoYm9hcmQlMjBhbmFseXRpY3N8ZW58MXx8fHwxNzY4MjA4MTQ0fDA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  ocupacao: {
    image1: 'https://images.unsplash.com/photo-1642489069222-3b8f36c0e89e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxlbmRhciUyMHNjaGVkdWxlfGVufDF8fHx8MTc2ODE1MzIyOXww&ixlib=rb-4.1.0&q=80&w=1080',
    image2: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXNoYm9hcmQlMjBhbmFseXRpY3N8ZW58MXx8fHwxNzY4MjA4MTQ0fDA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  clientes: {
    image1: 'https://images.unsplash.com/photo-1676862916149-02bc4a021ab6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGllbnQlMjBtYW5hZ2VtZW50fGVufDF8fHx8MTc2ODIyMjg4OXww&ixlib=rb-4.1.0&q=80&w=1080',
    image2: 'https://images.unsplash.com/photo-1644329771977-0a8c6e3928ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9wb3NhbCUyMGRvY3VtZW50fGVufDF8fHx8MTc2ODIyMjg4OXww&ixlib=rb-4.1.0&q=80&w=1080'
  },
  proprietarios: {
    image1: 'https://images.unsplash.com/photo-1676862916149-02bc4a021ab6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGllbnQlMjBtYW5hZ2VtZW50fGVufDF8fHx8MTc2ODIyMjg4OXww&ixlib=rb-4.1.0&q=80&w=1080',
    image2: 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHJlcG9ydHxlbnwxfHx8fDE3NjgyMjI4OTN8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  relatorios: {
    image1: 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHJlcG9ydHxlbnwxfHx8fDE3NjgyMjI4OTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    image2: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXNoYm9hcmQlMjBhbmFseXRpY3N8ZW58MXx8fHwxNzY4MjA4MTQ0fDA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  outros: {
    image1: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXNoYm9hcmQlMjBhbmFseXRpY3N8ZW58MXx8fHwxNzY4MjA4MTQ0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    image2: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5hbmNpYWwlMjBjaGFydHxlbnwxfHx8fDE3NjgxNjMwOTR8MA&ixlib=rb-4.1.0&q=80&w=1080'
  }
};

// Solution content for each tab
const solutionContent = {
  inventario: {
    title: 'Organize seu patrimônio com precisão militar',
    description: 'Cadastre pontos, faces e proprietários com geolocalização automática e controle de status em tempo real.',
    statLogo: imgOnemediaLogo,
    statText: 'Redução de 70%',
    statSubtext: 'no tempo de organização',
    testimonial: {
      quote: '"O inventário inteligente nos deu a organização que precisávamos. Agora sabemos exatamente onde cada ponto está localizado e seu status em tempo real, acabou a bagunça no controle do patrimônio."',
      name: 'Carlos Mendes',
      role: 'Diretor Comercial, OutdoorBR',
      avatar: imgCeoOutdoor
    }
  },
  propostas: {
    title: 'Crie propostas comerciais em minutos',
    description: 'Monte propostas profissionais com templates personalizáveis, cálculos automáticos de valores e aprovação digital integrada.',
    statLogo: imgOnemediaLogo,
    statText: 'Aumento de 85%',
    statSubtext: 'na taxa de conversão',
    testimonial: {
      quote: '"Com a automação de propostas, nosso time comercial triplicou a quantidade de orçamentos enviados. Os templates prontos economizam horas de trabalho e impressionam os clientes."',
      name: 'Mariana Silva',
      role: 'Gerente de Vendas, MediaPlus',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'
    }
  },
  campanhas: {
    title: 'Gerencie todas as campanhas em um só lugar',
    description: 'Acompanhe veiculações, monitore performance e controle prazos com calendário visual integrado ao inventário disponível.',
    statLogo: imgOnemediaLogo,
    statText: 'Redução de 60%',
    statSubtext: 'em conflitos de veiculação',
    testimonial: {
      quote: '"O controle de campanhas centralizado acabou com os problemas de sobreposição. Agora visualizamos tudo em tempo real e nunca mais perdemos um prazo de veiculação."',
      name: 'Roberto Alves',
      role: 'Coordenador de Operações, UrbanMedia',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400'
    }
  },
  financeiro: {
    title: 'Controle financeiro completo e automático',
    description: 'Gestão de cobranças, recebimentos e despesas com alertas inteligentes e integração direta às campanhas ativas.',
    statLogo: imgOnemediaLogo,
    statText: 'Redução de 78%',
    statSubtext: 'em inadimplência',
    testimonial: {
      quote: '"Os alertas automáticos de pagamento transformaram nosso fluxo de caixa. Antes perdíamos muito tempo perseguindo clientes, agora o sistema cuida disso automaticamente."',
      name: 'Paula Ferreira',
      role: 'Diretora Financeira, VisionOut',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'
    }
  },
  midiakit: {
    title: 'Mídia kit digital que vende sozinho',
    description: 'Apresente seu inventário com mapas interativos, fotos em alta resolução e dados de audiência que impressionam clientes.',
    statLogo: imgOnemediaLogo,
    statText: 'Aumento de 92%',
    statSubtext: 'em engajamento de clientes',
    testimonial: {
      quote: '"O mídia kit digital é nossa melhor ferramenta de vendas. Os clientes navegam pelo mapa, veem fotos reais dos pontos e já fecham negócio na primeira reunião."',
      name: 'Fernando Costa',
      role: 'Diretor Comercial, MegaOut',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'
    }
  },
  dashboard: {
    title: 'Inteligência de dados para decisões rápidas',
    description: 'Dashboards em tempo real com indicadores de ocupação, faturamento, performance comercial e análises preditivas.',
    statLogo: imgOnemediaLogo,
    statText: 'Aumento de 110%',
    statSubtext: 'na velocidade de decisão',
    testimonial: {
      quote: '"Ter todos os indicadores em um dashboard único mudou completamente nossa gestão. Identificamos oportunidades e problemas em segundos, não mais em semanas."',
      name: 'Juliana Martins',
      role: 'CEO, StreetMedia Group',
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400'
    }
  }
};

export default function Home() {
  const navigate = useNavigation();
  const [selectedModule, setSelectedModule] = useState<ModuleKey>('inventario');
  const [selectedSolution, setSelectedSolution] = useState<SolutionTab>('inventario');
  const [selectedAutomation, setSelectedAutomation] = useState<string>('ocupacao');
  const [showContactModal, setShowContactModal] = useState(false);

  // Automation content for each feature
  const automationContent = {
    ocupacao: {
      title: 'Automação de ocupação',
      description: 'O sistema calcula automaticamente a taxa de ocupação de cada ponto de mídia em tempo real. Monitora campanhas ativas, períodos disponíveis e gera alertas quando um ponto fica livre para maximizar sua receita sem esforço manual.'
    },
    relatorios: {
      title: 'Gerador de relatórios',
      description: 'Crie relatórios completos de performance, faturamento e ocupação em segundos. Escolha entre dezenas de templates prontos ou personalize suas próprias análises. Exporte em PDF, Excel ou compartilhe diretamente com sua equipe.'
    },
    financeira: {
      title: 'Automação financeira',
      description: 'Cobranças automáticas vinculadas às campanhas, envio de boletos programados e alertas de inadimplência. O sistema monitora pagamentos, gera segunda via e notifica clientes automaticamente, reduzindo drasticamente sua inadimplência.'
    },
    propostas: {
      title: 'Automação de propostas',
      description: 'Monte propostas comerciais profissionais em minutos com templates inteligentes. O sistema preenche automaticamente valores, disponibilidade, fotos dos pontos e envia para aprovação digital do cliente com tracking em tempo real.'
    },
    midiakit: {
      title: 'Automação do mídia kit',
      description: 'Seu mídia kit digital se atualiza automaticamente com novos pontos, fotos, dados de audiência e localização. Clientes podem navegar pelo mapa interativo, filtrar por características e solicitar orçamentos sem sua intervenção.'
    },
    dashboard: {
      title: 'Automaço de dashboard',
      description: 'Dashboards inteligentes que consolidam dados de todos os módulos automaticamente. KPIs atualizados em tempo real, gráficos interativos, comparativos de performance e alertas preditivos para antecipar problemas antes que aconteçam.'
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={imgOnemediaLogo} alt="OneMedia" className="h-12" />
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#produtos" className="text-gray-700 hover:text-blue-600 transition-colors">Produtos</a>
            <a href="#solucoes" className="text-gray-700 hover:text-blue-600 transition-colors">Soluções</a>
            <a href="#recursos" className="text-gray-700 hover:text-blue-600 transition-colors">Recursos</a>
            <button onClick={() => navigate('/planos')} className="text-gray-700 hover:text-blue-600 transition-colors">Preços</button>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Iniciar sessão
            </button>
            <button
              onClick={() => navigate('/cadastro')}
              className="hidden md:flex items-center gap-2 px-6 py-2.5 border border-blue-600 text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
            >
              Ver demonstração
            </button>
            <button
              onClick={() => navigate('/cadastro')}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-full hover:shadow-lg transition-all"
            >
              Teste Grátis 30 dias
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="produtos" className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-blue-500/5 rounded-[55px] px-8 md:px-16 py-20 relative overflow-hidden">
            {/* Hero Content */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extralight text-gray-900 mb-8 leading-tight">
                A plataforma completa para
                <br />
                dominar sua mídia OOH/DOOH
              </h1>
              <p className="text-xl md:text-2xl font-extralight text-gray-700 max-w-4xl mx-auto mb-12">
                Centralize inventário, propostas, campanhas e financeiro em uma única suíte inteligente.
                <br />
                Elimine planilhas desatualizadas e multiplique suas vendas.
              </p>
              
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={() => navigate('/cadastro')}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-700 text-white text-xl rounded-full hover:shadow-xl transition-all"
                >
                  Teste Grátis 30 dias
                  <ArrowRight className="w-6 h-6" />
                </button>
                <p className="text-gray-600">Não é necessário cartão de crédito</p>
              </div>
            </div>

            {/* Hero Images */}
            <div className="relative max-w-5xl mx-auto mt-16">
              <div className="grid md:grid-cols-2 gap-4 transition-all duration-500">
                <img 
                  src={moduleImages[selectedModule].image1} 
                  alt={`${selectedModule} - Vista 1`} 
                  className="rounded-2xl shadow-2xl transition-all duration-500" 
                />
                <img 
                  src={moduleImages[selectedModule].image2} 
                  alt={`${selectedModule} - Vista 2`} 
                  className="rounded-2xl shadow-2xl transition-all duration-500" 
                />
              </div>

              {/* Floating Module Card */}
              <div className="absolute -right-8 top-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl p-8 w-96 hidden lg:block">
                <p className="text-center text-gray-900 mb-6">O que você gostaria de gerenciar hoje?</p>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Inventário', key: 'inventario' },
                    { label: 'Propostas', key: 'propostas' },
                    { label: 'Campanhas', key: 'campanhas' },
                    { label: 'Financeiro', key: 'financeiro' },
                    { label: 'Ocupação', key: 'ocupacao' },
                    { label: 'Clientes', key: 'clientes' },
                    { label: 'Proprietários', key: 'proprietarios' },
                    { label: 'Relatórios', key: 'relatorios' },
                    { label: 'Outros...', key: 'outros' }
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedModule(item.key as ModuleKey)}
                      className={`border rounded-xl p-4 text-center transition-all cursor-pointer ${
                        selectedModule === item.key 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className={`w-4 h-4 border rounded mb-2 mx-auto transition-all ${
                        selectedModule === item.key 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {selectedModule === item.key && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <p className="text-xs text-gray-700">{item.label}</p>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => navigate('/cadastro')}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-full hover:shadow-lg transition-all"
                >
                  Teste Grátis 30 dias
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solucoes" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-medium text-gray-900 text-center mb-16">
            Soluções para todos os negócios.
            <br />
            Uma única plataforma.
          </h2>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-16 p-2 border border-gray-900 rounded-full max-w-6xl mx-auto">
            {[
              { label: 'Inventário', key: 'inventario' },
              { label: 'Propostas', key: 'propostas' },
              { label: 'Campanhas', key: 'campanhas' },
              { label: 'Financeiro', key: 'financeiro' },
              { label: 'Mídia Kit', key: 'midiakit' },
              { label: 'Dashboard', key: 'dashboard' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedSolution(tab.key as SolutionTab)}
                className={`px-8 py-3 rounded-full text-lg font-medium transition-all ${
                  selectedSolution === tab.key
                    ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Card - Dynamic based on selected solution */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-[34px] p-12 text-white">
              <h3 className="text-4xl font-semibold mb-6 leading-tight">
                {solutionContent[selectedSolution].title}
              </h3>
              <p className="text-xl mb-8 opacity-95 leading-relaxed">
                {solutionContent[selectedSolution].description}
              </p>
              <button
                onClick={() => navigate('/cadastro')}
                className="flex items-center gap-3 px-8 py-4 bg-white text-blue-700 text-xl rounded-full hover:shadow-xl transition-all"
              >
                Teste Grátis 30 dias
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-100 rounded-3xl p-8">
                <div className="flex justify-center mb-6">
                  <img src={solutionContent[selectedSolution].statLogo} alt="Logo" className="h-12" />
                </div>
                <p className="text-3xl">
                  <span className="font-semibold">{solutionContent[selectedSolution].statText}</span> {solutionContent[selectedSolution].statSubtext}
                </p>
              </div>

              <div className="bg-gray-100 rounded-3xl p-8">
                <p className="text-xl text-gray-800 mb-6 italic">
                  {solutionContent[selectedSolution].testimonial.quote}
                </p>
                <hr className="border-gray-400 mb-6" />
                <div className="flex items-center gap-4">
                  <img 
                    src={solutionContent[selectedSolution].testimonial.avatar} 
                    alt={solutionContent[selectedSolution].testimonial.name} 
                    className="w-14 h-14 rounded-full object-cover" 
                  />
                  <div>
                    <p className="font-bold text-gray-900">{solutionContent[selectedSolution].testimonial.name}</p>
                    <p className="text-gray-600">{solutionContent[selectedSolution].testimonial.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Efficiency Section - Black Background */}
      <section id="recursos" className="bg-black py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block mb-8">
              <Zap className="w-24 h-24 text-blue-400" />
            </div>
            <h2 className="text-5xl md:text-6xl font-medium text-white mb-4">
              Mais eficiência.
              <br />
              Multiplicada por automação.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Left - Automation Features */}
            <div className="space-y-4">
              {[
                { icon: '🔵', label: 'Automação de ocupação', color: 'bg-blue-600', key: 'ocupacao' },
                { icon: '🔴', label: 'Gerador de relatórios', color: 'bg-red-600', key: 'relatorios' },
                { icon: '🟡', label: 'Automação financeira', color: 'bg-yellow-500', key: 'financeira' },
                { icon: '🟢', label: 'Automação de propostas', color: 'bg-green-600', key: 'propostas' },
                { icon: '🔵', label: 'Automação do mídia kit', color: 'bg-blue-700', key: 'midiakit' },
                { icon: '🔴', label: 'Automação de dashboard', color: 'bg-red-600', key: 'dashboard' }
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAutomation(item.key)}
                  className={`w-full flex items-center gap-4 rounded-full px-6 py-4 transition-all cursor-pointer ${
                    selectedAutomation === item.key 
                      ? 'bg-gray-700 ring-2 ring-white scale-105' 
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className={`w-12 h-12 ${item.color} rounded-full flex items-center justify-center text-2xl shrink-0`}>
                    {item.icon}
                  </div>
                  <p className="text-white text-xl font-medium text-left">{item.label}</p>
                </button>
              ))}
            </div>

            {/* Right - Dynamic Description */}
            <div className="text-white">
              <h3 className="text-5xl font-bold italic mb-8">
                {automationContent[selectedAutomation as keyof typeof automationContent].title}
              </h3>
              <p className="text-3xl leading-relaxed">
                {automationContent[selectedAutomation as keyof typeof automationContent].description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-medium text-gray-900 text-center mb-20">
            O diferencial da onemedia.com
          </h2>

          <div className="space-y-6">
            {/* Benefit 1 */}
            <div className="bg-gray-100 rounded-[40px] py-4 px-3">
              <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
                <div className="bg-blue-600 rounded-2xl p-8 text-white">
                  <h3 className="text-2xl font-semibold mb-3">
                    80% menos tempo
                    <br />
                    em planilhas
                  </h3>
                  <p className="text-base opacity-95">
                    Automação que elimina retrabalho e multiplica sua produtividade operacional diariamente.
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="bg-white rounded-2xl p-10">
                    <Zap className="w-32 h-32 text-yellow-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="bg-gray-100 rounded-[40px] py-4 px-3">
              <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
                <div className="flex justify-center order-2 md:order-1">
                  <div className="bg-white rounded-2xl p-10">
                    <Eye className="w-32 h-32 text-gray-600" />
                  </div>
                </div>
                <div className="bg-red-500 rounded-2xl p-8 text-white order-1 md:order-2">
                  <h3 className="text-2xl font-semibold mb-3">
                    Visibilidade total
                    <br />
                    em tempo real
                  </h3>
                  <p className="text-base opacity-95">
                    Decisões estratégicas baseadas em dados precisos, não em suposições arriscadas.
                  </p>
                </div>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="bg-gray-100 rounded-[40px] py-4 px-3">
              <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
                <div className="bg-yellow-400 rounded-2xl p-8 text-gray-900">
                  <h3 className="text-2xl font-semibold mb-3">
                    Implementação
                    <br />
                    em minutos
                  </h3>
                  <p className="text-base">
                    Configure rapidamente e comece a ver resultados transformadores ainda hoje.
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="bg-white rounded-2xl p-10">
                    <Rocket className="w-32 h-32 text-orange-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Benefit 4 */}
            <div className="bg-gray-100 rounded-[40px] py-4 px-3">
              <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
                <div className="flex justify-center order-2 md:order-1">
                  <div className="bg-white rounded-2xl p-10">
                    <LinkIcon className="w-32 h-32 text-blue-400" />
                  </div>
                </div>
                <div className="bg-green-600 rounded-2xl p-8 text-white order-1 md:order-2">
                  <h3 className="text-2xl font-semibold mb-3">
                    Integração completa
                    <br />
                    e inteligente
                  </h3>
                  <p className="text-base opacity-95">
                    Todos os módulos conectados para fluxo de trabalho perfeito e eficiente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Comparison Section */}
      <section id="precos" className="py-20 px-6 bg-blue-500/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-medium text-gray-900 text-center mb-8">
            Quanto você gasta hoje
            <br />
            para gerenciar seu inventário?
          </h2>
          <p className="text-2xl font-extralight text-gray-700 text-center mb-16 max-w-4xl mx-auto">
            Compare o custo real de manter planilhas e processos manuais vs. usar a <span className="font-medium">One Media!</span>
          </p>

          <div className="max-w-6xl mx-auto">
            {/* Headers */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-14 h-14 text-red-600" />
                <h3 className="text-4xl text-gray-900">Gestão manual</h3>
              </div>
              <div className="flex items-center gap-4">
                <CheckCircle2 className="w-14 h-14 text-green-600" />
                <h3 className="text-4xl text-gray-900">Com a OneMedia</h3>
              </div>
            </div>

            {/* Row 1 */}
            <div className="grid lg:grid-cols-2 gap-8 mb-4">
              <div className="bg-red-50 rounded-2xl p-6 flex justify-between items-center">
                <p className="text-xl text-gray-900">Atualizar planilhas de inventário</p>
                <p className="text-3xl font-semibold text-red-800">15h/mês</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-6 flex items-center">
                <p className="text-xl text-gray-900">Inventário centralizado e sempre atualizado</p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid lg:grid-cols-2 gap-8 mb-4">
              <div className="bg-red-50 rounded-2xl p-6 flex justify-between items-center">
                <p className="text-xl text-gray-900">Montar propostas e recalcular valores</p>
                <p className="text-3xl font-semibold text-red-800">20h/mês</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-6 flex items-center">
                <p className="text-xl text-gray-900">Propostas em poucos cliques, com templates</p>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid lg:grid-cols-2 gap-8 mb-4">
              <div className="bg-red-50 rounded-2xl p-6 flex justify-between items-center">
                <p className="text-xl text-gray-900">Conferir faturas e recebimentos</p>
                <p className="text-3xl font-semibold text-red-800">12h/mês</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-6 flex items-center">
                <p className="text-xl text-gray-900">Cobranças ligadas às campanhas, com alertas</p>
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid lg:grid-cols-2 gap-8 mb-4">
              <div className="bg-red-50 rounded-2xl p-6 flex justify-between items-center">
                <p className="text-xl text-gray-900">Retrabalho por erros de comunicação</p>
                <p className="text-3xl font-semibold text-red-800">18h/mês</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-6 flex items-center">
                <p className="text-xl text-gray-900">Mídia kit e mapa integrados para vender mais</p>
              </div>
            </div>

            {/* Bottom Cards */}
            <div className="grid lg:grid-cols-2 gap-8 mt-8">
              <div className="bg-red-700 rounded-2xl p-8 text-white border-l-4 border-white">
                <p className="text-3xl font-semibold mb-2">Total: ~65h/mês desperdiçadas</p>
                <p className="text-xl">em tarefas repetitivas</p>
              </div>
              <div className="bg-green-700 rounded-2xl p-8 text-white border-l-4 border-white">
                <p className="text-xl mb-2">Investimento mensal:</p>
                <p className="text-sm opacity-90 mb-4">*Exemplo com 50 unidades de inventário</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-base">A partir de:</span>
                  <span className="text-6xl font-semibold">R$ 299</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/cadastro')}
              className="flex items-center gap-4 px-12 py-6 bg-gradient-to-r from-blue-500 to-blue-700 text-white text-3xl rounded-full hover:shadow-2xl transition-all mx-auto mb-6"
            >
              Teste Grátis 30 dias
              <ArrowRight className="w-8 h-8" />
            </button>
            <button 
              onClick={() => navigate('/planos')} 
              className="text-xl text-gray-900 underline hover:text-blue-600 transition-colors cursor-pointer"
            >
              Conheça os nossos planos.
            </button>
          </div>
        </div>
      </section>

      {/* Security Section - Black Background */}
      <section className="bg-black py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-12">
            <div className="inline-block p-6 bg-white/10 rounded-full mb-8">
              <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <h2 className="text-5xl md:text-6xl font-medium text-white mb-16">
            Segurança e Confiabilidade
          </h2>

          <div className="max-w-4xl mx-auto mb-12">
            <h3 className="text-4xl font-bold italic text-white mb-8">Proteção total dos seus dados:</h3>
            <div className="space-y-4 text-3xl text-white">
              <p>🔐 Criptografia SSL</p>
              <p>☁️ Backup automático</p>
              <p>🛡️ Conformidade LGPD</p>
              <p>📱 Acesso seguro multi-dispositivo</p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <h3 className="text-4xl font-bold italic text-white mb-6">Suporte que funciona:</h3>
            <p className="text-3xl text-white">📧 E-mail prioritário</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-16 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Logo and Info */}
            <div>
              <img src={imgOnemediaLogo} alt="OneMedia" className="h-10 mb-6" />
              <div className="space-y-2 text-gray-600">
                <p onClick={() => navigate('/planos')} className="cursor-pointer hover:text-blue-600 transition-colors">Preços</p>
                <p onClick={() => setShowContactModal(true)} className="cursor-pointer hover:text-blue-600 transition-colors">Entre em contato conosco</p>
              </div>
            </div>

            {/* Produtos */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Produtos</h4>
              <div className="space-y-2 text-gray-600">
                <a href="#solucoes" onClick={() => setSelectedSolution('inventario')} className="block cursor-pointer hover:text-blue-600 transition-colors">Inventário</a>
                <a href="#solucoes" onClick={() => setSelectedSolution('propostas')} className="block cursor-pointer hover:text-blue-600 transition-colors">Propostas</a>
                <a href="#solucoes" onClick={() => setSelectedSolution('campanhas')} className="block cursor-pointer hover:text-blue-600 transition-colors">Campanhas</a>
                <a href="#solucoes" onClick={() => setSelectedSolution('financeiro')} className="block cursor-pointer hover:text-blue-600 transition-colors">Financeiro</a>
                <a href="#solucoes" onClick={() => setSelectedSolution('midiakit')} className="block cursor-pointer hover:text-blue-600 transition-colors">Mídia Kit</a>
                <a href="#solucoes" onClick={() => setSelectedSolution('dashboard')} className="block cursor-pointer hover:text-blue-600 transition-colors">Dashboard</a>
              </div>
            </div>

            {/* Soluções */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Soluções</h4>
              <div className="space-y-2 text-gray-600">
                <a href="#solucoes" className="block cursor-pointer hover:text-blue-600 transition-colors">Para Agências</a>
                <a href="#solucoes" className="block cursor-pointer hover:text-blue-600 transition-colors">Para Veículos</a>
                <a href="#solucoes" className="block cursor-pointer hover:text-blue-600 transition-colors">Para Proprietários</a>
              </div>
            </div>

            {/* Recursos */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Recursos</h4>
              <div className="space-y-2 text-gray-600">
                <a href="#recursos" className="block cursor-pointer hover:text-blue-600 transition-colors">Blog</a>
                <a href="#recursos" className="block cursor-pointer hover:text-blue-600 transition-colors">Documentação</a>
                <a href="#recursos" className="block cursor-pointer hover:text-blue-600 transition-colors">Suporte</a>
                <p onClick={() => navigate('/contato')} className="cursor-pointer hover:text-blue-600 transition-colors">Contato</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600">© 2026 OneMedia. Todos os direitos reservados.</p>
            <div className="flex gap-6 text-gray-600">
              <a href="https://onemedia.com/privacidade" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Privacidade</a>
              <a href="https://onemedia.com/termos" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Termos</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowContactModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Entre em contato</h3>
            <p className="text-gray-600 mb-6">Escolha como prefere falar conosco:</p>
            
            <div className="space-y-4">
              {/* WhatsApp */}
              <a
                href="https://wa.me/5511999999999?text=Olá!%20Gostaria%20de%20conhecer%20mais%20sobre%20a%20plataforma%20OneMedia%20para%20gestão%20de%20mídia%20OOH/DOOH.%20Poderia%20me%20ajudar?"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-2xl hover:border-blue-600 hover:shadow-lg transition-all group"
              >
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-600 transition-colors">
                  <svg className="w-8 h-8 text-green-600 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">WhatsApp</p>
                  <p className="text-sm text-gray-600">Resposta rápida</p>
                </div>
              </a>

              {/* Email */}
              <a
                href="mailto:contato@onemedia.com?subject=Interesse%20na%20plataforma%20OneMedia&body=Olá!%0A%0AGostaria%20de%20conhecer%20mais%20sobre%20a%20plataforma%20OneMedia%20para%20gestão%20de%20mídia%20OOH/DOOH.%0A%0APoderia%20me%20enviar%20mais%20informações?%0A%0AObrigado!"
                className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-2xl hover:border-blue-600 hover:shadow-lg transition-all group"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <svg className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">E-mail</p>
                  <p className="text-sm text-gray-600">contato@onemedia.com</p>
                </div>
              </a>
            </div>

            <button
              onClick={() => setShowContactModal(false)}
              className="w-full mt-6 px-6 py-3 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}