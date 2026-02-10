import { useNavigation } from '../App';
import { 
  ArrowRight, Check, AlertTriangle, CheckCircle2, 
  Zap, Eye, Rocket, Link as LinkIcon, Settings,
  Sparkles, Upload, MapPin, FileText, Map, BarChart3
} from 'lucide-react';

import { JSX, useState } from 'react';
import imgOnemediaLogo from "figma:asset/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png";
import imgImage1 from "figma:asset/0622760ec539e74e0a9554dceb8a7a9549b2d826.png";
import imgImage2 from "figma:asset/a650fd3251a7c56702fe8a07a33be4a6b676ce4a.png";
import imgLogotipoOutdoorBr from "figma:asset/b772fcca664e51771498ee420b09d2bb7a1c5fed.png";
import imgCeoOutdoor from "figma:asset/b410819dec3dab15947c18ed6baae2284d619ffd.png";
import imgAutomationIcon from "figma:asset/4927f4005fdcb4cee75f7c6be5a84c437632a666.png";
import imgSecurityIcon from "figma:asset/6798ffea025a808956ca89ea6da0e04d0cee19d8.png";




// Import real module screenshots from Figma
import imgInventario from "figma:asset/6278c812688036c294627847a92c37d9fdd135d8.png";
import imgInventario2 from "figma:asset/bdc94cbddf5660b338a9b0459df94874d600a7f6.png";
import imgPropostas from "figma:asset/8c102002d56706280ee26142532d5a1c15f2e0da.png";
import imgPropostas2 from "figma:asset/c111a3e573ecc1de8c1b8bded684b67ff2234cd6.png";
import imgCampanhas from "figma:asset/15a28e63418d28c9ec12a06d0df66c23e5e7edac.png";
import imgCampanhas2 from "figma:asset/18abb66ce6b22f670cd4116722de8d5e72ec0e1e.png";
import imgFinanceiro from "figma:asset/ea092394ba26ae8e99aec4c2c652c109f797a8ef.png";
import imgFinanceiro2 from "figma:asset/e4aae58e61f032bc98c383fa6c9fea846a8a8c06.png";
import imgReservas from "figma:asset/02d010d4d626ef6df76355ef463372b4764a1d53.png";
import imgReservas2 from "figma:asset/7d302fdd327d35135083ec1233df4d38236c20f7.png";
import imgClientes from "figma:asset/ede0d250980b265fcc69c78bbcfc2cf1766ad469.png";
import imgClientes2 from "figma:asset/cd83b92791eb35af88ec6625a90b444217be6c1b.png";
import imgProprietarios from "figma:asset/bc4c41825d562aa00505148f9c2cf7776c1dda25.png";
import imgProprietarios2 from "figma:asset/bbbe5dc0a7da7fae50e76241d183ed958b85d959.png";
import imgRelatorios from "figma:asset/24be53fa98cb70de89bcd6b3013fd88d5eff019e.png";
import imgRelatorios2 from "figma:asset/ea58b2fcd4a9774626acfd9e0441683b3d91eced.png";
import imgOutros1 from "figma:asset/2e890f0b983e67f4196361f257d7f43fc5fe006a.png";
import imgOutros2 from "figma:asset/1896d19035e48bc6bce4326ab159c9231b61df91.png";

type SolutionBadgePos = 'topRight' | 'bottomLeft' | 'bottomRight';
type SolutionBadge = { label: string; icon: JSX.Element; position: SolutionBadgePos };

const badgePositionClass: Record<SolutionBadgePos, string> = {
  topRight: 'solutions-badge--topRight',
  bottomLeft: 'solutions-badge--bottomLeft',
  bottomRight: 'solutions-badge--bottomRight',
};

function GifOrFallback({
  name,
  fallback,
  className = '',
  alt = ''
}: {
  name: string;
  fallback: JSX.Element;
  className?: string;
  alt?: string;
}) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const [src, setSrc] = useState(`/gifs/${name}.gif`);
  const [failed, setFailed] = useState(false);

  if (failed) return <div className={className}>{fallback}</div>;

  return (
    <img
      src={src}
      alt={alt || name}
      className={className}
      onError={() => {
        if (src === `/gifs/${name}.gif` && normalized !== name) setSrc(`/gifs/${normalized}.gif`);
        else setFailed(true);
      }}
    />
  );
}


// Module type definition
type ModuleKey = 'inventario' | 'propostas' | 'campanhas' | 'financeiro' | 'reservas' | 'clientes' | 'proprietarios' | 'relatorios' | 'outros';
type SolutionTab = 'inventario' | 'propostas' | 'campanhas' | 'financeiro' | 'midiakit' | 'dashboard';

// Real module screenshots from Figma
const moduleImages = {
  inventario: {
    image1: imgInventario,
    image2: imgInventario2
  },
  propostas: {
    image1: imgPropostas,
    image2: imgPropostas2
  },
  campanhas: {
    image1: imgCampanhas,
    image2: imgCampanhas2
  },
  financeiro: {
    image1: imgFinanceiro,
    image2: imgFinanceiro2
  },
  reservas: {
    image1: imgReservas,
    image2: imgReservas2
  },
  clientes: {
    image1: imgClientes,
    image2: imgClientes2
  },
  proprietarios: {
    image1: imgProprietarios,
    image2: imgProprietarios2
  },
  relatorios: {
    image1: imgRelatorios,
    image2: imgRelatorios2
  },
  outros: {
    image1: imgOutros1,
    image2: imgOutros2
  }
};

// Solution content for each tab
const solutionContent = {
  inventario: {
  title: 'Organize seu patrimônio com precisão militar',
  description: 'Cadastre pontos, faces e proprietários com geolocalização automática e controle de status em tempo real.',
  screenshot: imgInventario,
  badges: [
    { label: 'Cadastro Automático', icon: <Sparkles className="w-4 h-4" />, position: 'topRight' },
    { label: 'Upload de Fotos', icon: <Upload className="w-4 h-4" />, position: 'bottomLeft' },
    { label: 'Geolocalização Ativa', icon: <MapPin className="w-4 h-4" />, position: 'bottomRight' },
  ] as SolutionBadge[],
  statLogo: imgLogotipoOutdoorBr,
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
  screenshot: imgPropostas,
  badges: [
    { label: 'Templates Prontos', icon: <FileText className="w-4 h-4" />, position: 'topRight' },
    { label: 'Aprovação Digital', icon: <CheckCircle2 className="w-4 h-4" />, position: 'bottomLeft' },
    { label: 'Envio em PDF', icon: <FileText className="w-4 h-4" />, position: 'bottomRight' },
  ] as SolutionBadge[],
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
  screenshot: imgCampanhas,
  badges: [
    { label: 'Status em Tempo Real', icon: <BarChart3 className="w-4 h-4" />, position: 'topRight' },
    { label: 'Calendário Visual', icon: <Check className="w-4 h-4" />, position: 'bottomLeft' },
    { label: 'Prazos & Alertas', icon: <AlertTriangle className="w-4 h-4" />, position: 'bottomRight' },
  ] as SolutionBadge[],
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
  screenshot: imgFinanceiro,
  badges: [
    { label: 'Cobrança Automática', icon: <Sparkles className="w-4 h-4" />, position: 'topRight' },
    { label: 'Alertas de Pagamento', icon: <AlertTriangle className="w-4 h-4" />, position: 'bottomLeft' },
    { label: 'Relatórios', icon: <BarChart3 className="w-4 h-4" />, position: 'bottomRight' },
  ] as SolutionBadge[],
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
  screenshot: imgRelatorios2,
  badges: [
    { label: 'Mapa Interativo', icon: <Map className="w-4 h-4" />, position: 'topRight' },
    { label: 'Fotos HD', icon: <Upload className="w-4 h-4" />, position: 'bottomLeft' },
    { label: 'Solicitação Rápida', icon: <Sparkles className="w-4 h-4" />, position: 'bottomRight' },
  ] as SolutionBadge[],
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
  screenshot: imgRelatorios2,
  badges: [
    { label: 'KPIs em Tempo Real', icon: <BarChart3 className="w-4 h-4" />, position: 'topRight' },
    { label: 'Insights', icon: <Sparkles className="w-4 h-4" />, position: 'bottomLeft' },
    { label: 'Config. Inteligente', icon: <Settings className="w-4 h-4" />, position: 'bottomRight' },
  ] as SolutionBadge[],
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
  const [previousModule, setPreviousModule] = useState<ModuleKey | null>(null);
  const [exitedModules, setExitedModules] = useState<Set<ModuleKey>>(new Set());
  const [selectedSolution, setSelectedSolution] = useState<SolutionTab>('inventario');
  const [selectedAutomation, setSelectedAutomation] = useState<string>('reservas');
  const [showContactModal, setShowContactModal] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle module selection with dedicated module sets
  const handleModuleSelect = (module: ModuleKey) => {
    if (module !== selectedModule && !isTransitioning) {
      // If the selected module has exited before, reset its position INSTANTLY to the right
      if (exitedModules.has(module)) {
        setExitedModules(prev => {
          const newSet = new Set(prev);
          newSet.delete(module); // Remove from exited so it can enter from right
          return newSet;
        });
      }
      
      setPreviousModule(selectedModule);
      setIsTransitioning(true);
      
      // Small delay to ensure position reset happens before animation starts
      setTimeout(() => {
        setSelectedModule(module);
      }, 10);
      
      // Complete transition - do NOT reset position of exited modules
      setTimeout(() => {
        setIsTransitioning(false);
        // Mark the previous module as exited (stays left permanently)
        setExitedModules(prev => new Set(prev).add(selectedModule));
        setPreviousModule(null);
      }, 360);
    }
  };

  // Automation content for each feature
  const automationContent = {
    reservas: {
      title: 'Automação de reservas',
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
      title: 'Automação de dashboard',
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
      {/*
        O header é fixed. Quando o usuário navega pelos links (hash) do menu,
        o browser pode alinhar a seção por baixo do header e cortar o topo.
        O scroll-mt adiciona o offset necessário para manter o conteúdo visível.
      */}
      <section
        id="produtos"
        className="landing-hero-section landing-anchor pb-20 px-6 bg-gradient-to-b from-gray-50 to-white overflow-hidden"
      >
        <div className="max-w-7xl mx-auto">
          <div className="bg-blue-500/5 rounded-[55px] hero-shell">
            {/* Hero Content */}
            <div className="text-center mb-8 hero-content">
              <h1 className="hero-title text-gray-900 mb-5">
                A plataforma completa para
                <br />
                dominar sua mídia OOH/DOOH
              </h1>
              <p className="hero-subtitle text-gray-700 max-w-4xl mx-auto mb-8">
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

            {/* Hero Images - Overlapped with Depth + Clip Container */}
            <div className="hero-stage max-w-5xl mx-auto">
              {/*
                PreviewViewport: usamos uma classe dedicada para evitar depender
                de utilitários do Tailwind que podem não estar presentes no CSS
                gerado/exportado.
              */}
              <div className="hero-preview-viewport">
                
                {/* DEDICATED MODULE SETS - Each module has its own permanent pair of images */}
                {Object.keys(moduleImages).map((moduleKey) => {
                  const module = moduleKey as ModuleKey;
                  const isActive = module === selectedModule && !isTransitioning;
                  const isExiting = module === previousModule && isTransitioning;
                  const isEntering = module === selectedModule && isTransitioning;
                  const hasExited = exitedModules.has(module);
                  
                  // Position logic with CONSISTENT right-side entry:
                  // - Active: X=0 (center, visible)
                  // - Exiting: X=0 → -130% (leaving left)
                  // - Entering: X=130% → 0 (coming from right, ALWAYS)
                  // - Has exited: X=-130% (invisible, left side)
                  // - Never used: X=130% (invisible, right side)
                  
                  let positionX = '130%'; // Default: waiting on right (never used)
                  let opacity = 0;
                  let transitionStyle = 'opacity 0s'; // Default: instant
                  
                  if (isActive) {
                    // Current active module - visible in center
                    positionX = '0';
                    opacity = 1;
                    transitionStyle = 'opacity 0s'; // No transition when staying active
                  } else if (isExiting) {
                    // Module leaving to the left
                    positionX = '-130%';
                    opacity = 0.92;
                    transitionStyle = 'all 340ms ease-in-out';
                  } else if (isEntering) {
                    // Module entering from right - ALWAYS starts from right
                    positionX = '0';
                    opacity = 1;
                    transitionStyle = 'all 340ms ease-in-out';
                  } else if (hasExited) {
                    // Previously exited - stays left invisibly until selected again
                    positionX = '-130%';
                    opacity = 0;
                    transitionStyle = 'opacity 0s';
                  }
                  // else: default positionX='130%', opacity=0 (never used, waiting right)
                  
                  return (
                    <div
                      key={module}
                      className="absolute inset-0"
                      style={{
                        transform: `translateX(${positionX})`,
                        opacity: opacity,
                        transition: transitionStyle,
                        pointerEvents: isActive ? 'auto' : 'none',
                        zIndex: isExiting ? 5 : isEntering ? 10 : isActive ? 15 : 0
                      }}
                    >
                      {/* Background Image - Module Dedicated */}
                      <div
                        className="hero-img-back"
                        style={{
                          animation: isActive ? 'float-secondary 3.2s ease-in-out infinite' : 'none',
                          animationDelay: '0.5s'
                        }}
                      >
                        <img 
                          src={moduleImages[module].image2} 
                          alt={`${module} - Vista 2`} 
                          onClick={() => isActive && setExpandedImage(moduleImages[module].image2)}
                          className="hero-img"
                          style={{
                            transform: 'rotate(-1.5deg) scale(0.88)',
                            transformOrigin: 'center center'
                          }}
                        />
                      </div>

                      {/* Foreground Image - Module Dedicated */}
                      <div
                        className="hero-img-front"
                        style={{
                          animation: isActive ? 'float-primary 2.8s ease-in-out infinite' : 'none',
                          zIndex: 10
                        }}
                      >
                        <img 
                          src={moduleImages[module].image1} 
                          alt={`${module} - Vista 1`} 
                          onClick={() => isActive && setExpandedImage(moduleImages[module].image1)}
                          className="hero-img hero-img--front"
                          style={{
                            transform: 'rotate(1.2deg)',
                            transformOrigin: 'center center'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Floating Module Card - More Centered */}
            {/*
              Mantém o card 100% dentro do container arredondado (sem ultrapassar).
              Antes ele tinha right negativo, o que gerava corte/overflow e fazia o
              posicionamento parecer "acima" quando a seção é acessada via hash.
            */}
            <div className="hero-module-card hidden lg:block">
              <p className="text-center text-gray-900 mb-6">O que você gostaria de gerenciar hoje?</p>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Inventário', key: 'inventario' },
                  { label: 'Propostas', key: 'propostas' },
                  { label: 'Campanhas', key: 'campanhas' },
                  { label: 'Financeiro', key: 'financeiro' },
                  { label: 'Reservas', key: 'reservas' },
                  { label: 'Clientes', key: 'clientes' },
                  { label: 'Proprietários', key: 'proprietarios' },
                  { label: 'Relatórios', key: 'relatorios' },
                  { label: 'Outros...', key: 'outros' }
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleModuleSelect(item.key as ModuleKey)}
                    className={`border rounded-xl p-4 text-center transition-all cursor-pointer ${
                      selectedModule === item.key 
                        ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
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
      </section>

{/* Solutions Section */}
<section id="solucoes" className="landing-anchor py-16 px-6">
  <div className="max-w-7xl mx-auto">
    <h2 className="text-4xl md:text-5xl font-medium text-gray-900 text-center mb-10">
      Soluções para todos os negócios.
      <br />
      Uma única plataforma.
    </h2>

    {/* Tabs */}
    <div className="solutions-tabs">
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
          className={`solutions-tab ${selectedSolution === tab.key ? 'solutions-tab--active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>

    {/* Layout */}
    <div className="solutions-layout">
      {/* Left big card */}
      <div className="solutions-left-card bg-gradient-to-r from-blue-500 to-blue-700">
        <div className="solutions-left-inner">
          <div className="solutions-left-text">
            <h3 className="solutions-left-title">
              {solutionContent[selectedSolution].title}
            </h3>
            <p className="solutions-left-desc">
              {solutionContent[selectedSolution].description}
            </p>
            <button
              onClick={() => navigate('/cadastro')}
              className="solutions-left-cta"
            >
              Teste Grátis 30 dias
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="solutions-left-preview">
            {/* badges are positioned relative to the preview (as in the mock) */}
            {solutionContent[selectedSolution].badges?.map((b: SolutionBadge) => (
              <div key={b.label} className={`solutions-badge ${badgePositionClass[b.position]}`}>
                {b.icon}
                <span>{b.label}</span>
              </div>
            ))}

            <div className="solutions-preview-surface">
              <div className="solutions-preview-frame">
                <img
                  src={solutionContent[selectedSolution].screenshot}
                  alt="Preview do módulo"
                  className="solutions-preview-img"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right column (two cards like the mock) */}
      <div className="solutions-right">
        <div className="solutions-right-statCard">
          <img src={solutionContent[selectedSolution].statLogo} alt="Logo" className="solutions-stat-logo" />
          <p className="solutions-stat">
            <span className="solutions-stat-strong">{solutionContent[selectedSolution].statText}</span>{' '}
            {solutionContent[selectedSolution].statSubtext}
          </p>
        </div>

        <div className="solutions-right-testimonialCard">
          <p className="solutions-quote">{solutionContent[selectedSolution].testimonial.quote}</p>
          <div className="solutions-divider" />
          <div className="solutions-person">
            <img
              src={solutionContent[selectedSolution].testimonial.avatar}
              alt={solutionContent[selectedSolution].testimonial.name}
              className="solutions-avatar"
            />
            <div className="solutions-person-text">
              <p className="solutions-person-name">{solutionContent[selectedSolution].testimonial.name}</p>
              <p className="solutions-person-role">{solutionContent[selectedSolution].testimonial.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* Efficiency Section - Black Background */}
<section id="recursos" className="landing-anchor efficiency-section">
  <div className="efficiency-wrap">
    <div className="efficiency-header">
      <div className="efficiency-iconWrap">
        <img src={imgAutomationIcon} alt="Automação" />
      </div>
      <h2 className="efficiency-heading">
        Mais eficiência.
        <br />
        Multiplicada por automação.
      </h2>
    </div>

    <div className="efficiency-grid">
      <div className="efficiency-menu">
        {[
          { label: 'Automação de reservas', dot: 'blue', key: 'reservas' },
          { label: 'Gerador de relatórios', dot: 'red', key: 'relatorios' },
          { label: 'Automação financeira', dot: 'yellow', key: 'financeira' },
          { label: 'Automação de propostas', dot: 'green', key: 'propostas' },
          { label: 'Automação do mídia kit', dot: 'blue2', key: 'midiakit' },
          { label: 'Automação de dashboard', dot: 'red2', key: 'dashboard' }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setSelectedAutomation(item.key)}
            className={`efficiency-item ${selectedAutomation === item.key ? 'efficiency-item--active' : ''}`}
            type="button"
          >
            <span className={`efficiency-dot efficiency-dot--${item.dot}`} aria-hidden="true" />
            <span className="efficiency-itemLabel">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="efficiency-content">
        <h3 className="efficiency-content-title">
          {automationContent[selectedAutomation as keyof typeof automationContent].title}
        </h3>
        <p className="efficiency-content-desc">
          {automationContent[selectedAutomation as keyof typeof automationContent].description}
        </p>
      </div>
    </div>
  </div>
</section>


{/* Benefits / Differential Section */}
<section className="diff-section">
  <div className="diff-container">
    <h2 className="diff-title">
      O diferencial da onemedia.com
    </h2>

    {[
      {
        key: 'planilhas',
        front: {
          color: 'diff-theme-blue',
          title: 'Gestão centralizada do seu inventário',
          desc: 'Automação que elimina retrabalho e multiplica sua produtividade operacional diariamente.',
          fallback: <Zap className="w-20 h-20 text-blue-600" />
        },
        back: {
          statColor: 'diff-theme-blue',
          statMain: '80%',
          statSub: 'menos tempo\nem planilhas',
          quote:
            '"A automação transformou nossa rotina. O que levava horas em planilhas agora é feito em minutos, sem erros. Ganhamos uma agilidade impressionante."'
        }
      },
      {
        key: 'visibilidade',
        front: {
          color: 'diff-theme-red',
          title: 'Visibilidade total em tempo real',
          desc: 'Decisões estratégicas baseadas em dados precisos, não em suposições arriscadas.',
          fallback: <Eye className="w-20 h-20 text-gray-500" />
        },
        back: {
          statColor: 'diff-theme-red',
          statMain: '100%',
          statSub: 'de visibilidade\nsobre o inventário',
          quote:
            '"Agora tomamos decisões estratégicas em minutos, com base em dados reais, não em palpites. A visibilidade é total."'
        }
      },
      {
        key: 'resultados',
        front: {
          color: 'diff-theme-yellow',
          title: 'Implementação em minutos',
          desc: 'Configure rapidamente e comece a ver resultados transformadores ainda hoje.',
          fallback: <Rocket className="w-20 h-20 text-orange-500" />
        },
        back: {
          statColor: 'diff-theme-yellow',
          statMain: '15min',
          statSub: 'tempo médio\nde configuração',
          quote:
            '"Conectamos nossas telas, importamos o inventário e começamos a rodar campanhas no mesmo dia. Foi plug-and-play."'
        }
      },
      {
        key: 'integracao',
        front: {
          color: 'diff-theme-green',
          title: 'Integração completa e inteligente',
          desc: 'Todos os módulos conectados para fluxo de trabalho perfeito e eficiente.',
          fallback: <Settings className="w-20 h-20 text-gray-600" />
        },
        back: {
          statColor: 'diff-theme-green',
          statMain: '3x',
          statSub: 'mais propostas\naprovadas',
          quote:
            '"Agora, uma proposta aprovada gera automaticamente o contrato e a ordem de serviço. Nossa equipe parou de bater cabeça."'
        }
      }
    ].map((row: any, idx: number) => {
      const reverse = idx % 2 === 1;

      const IconCard = (
        <div className="diff-card diff-surface diff-iconCard">
          <GifOrFallback
            name={row.key === 'integracao' ? 'integração' : row.key} // plug-and-play conforme seu padrão
            fallback={row.front.fallback}
            className="w-24 h-24 object-contain"
            alt={row.key}
          />
        </div>
      );

      const FrontTextCard = (
        <div
          className={`diff-card diff-textCard ${row.key === 'planilhas' ? 'diff-textCard--blue' : ''} ${row.key === 'visibilidade' ? 'diff-textCard--red' : ''} ${row.key === 'resultados' ? 'diff-textCard--yellow' : ''} ${row.key === 'integracao' ? 'diff-textCard--green' : ''}`}
        >
          <h3 className="diff-textTitle">
            {row.front.title}
          </h3>
          <p className="diff-textDesc">
            {row.front.desc}
          </p>
        </div>
      );

      const StatCard = (
        <div
          className={`diff-card diff-statCard ${row.key === 'planilhas' ? 'diff-statCard--blue' : ''} ${row.key === 'visibilidade' ? 'diff-statCard--red' : ''} ${row.key === 'resultados' ? 'diff-statCard--yellow' : ''} ${row.key === 'integracao' ? 'diff-statCard--green' : ''}`}
        >
          <div className="diff-statMain">
            {row.back.statMain}
          </div>
          <div className="diff-statSub">
            {String(row.back.statSub)
              .split('\n')
              .map((line: string, i: number) => (
                <span key={i}>
                  {line}
                  {i < String(row.back.statSub).split('\n').length - 1 ? <br /> : null}
                </span>
              ))}
          </div>
        </div>
      );

      const Testimonial = (
        <div className="diff-card diff-surface diff-testimonial">
          <div className="diff-testimonial-header">
            <div className="diff-testimonial-person">
              <img src={imgCeoOutdoor} className="diff-avatar" alt="Carlos Mendes" />
              <div className="diff-person-meta">
                <p className="diff-person-name">Carlos Mendes</p>
                <p className="diff-person-role">Diretor Comercial, OutdoorBR</p>
              </div>
            </div>
            <img src={imgLogotipoOutdoorBr} alt="OutdoorBR" className="diff-brand" />
          </div>

          <p className="diff-quote">
            {row.back.quote}
          </p>
        </div>
      );

      return (
        <div key={row.key} className="differential-flip diff-row">
          <div className="differential-flip-inner">
            {/* Front */}
            <div className="differential-face differential-front">
              <div className={`diff-pair ${reverse ? 'diff-pair--reverse' : ''}`}>
                {reverse ? (
                  <>
                    {FrontTextCard}
                    {IconCard}
                  </>
                ) : (
                  <>
                    {IconCard}
                    {FrontTextCard}
                  </>
                )}
              </div>
            </div>

            {/* Back */}
            <div className="differential-face differential-back">
              <div className={`diff-pair ${reverse ? 'diff-pair--reverse' : ''}`}>
                {reverse ? (
                  <>
                    {Testimonial}
                    {StatCard}
                  </>
                ) : (
                  <>
                    {StatCard}
                    {Testimonial}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
</section>


      {/* Pricing Comparison Section */}
      <section id="precos" className="landing-anchor py-12 px-6 bg-blue-500/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-medium text-gray-900 text-center mb-3 leading-tight">
            Quanto você gasta hoje
            <br />
            para gerenciar seu inventário?
          </h2>
          <p className="text-xl md:text-2xl font-extralight text-gray-700 text-center mb-10 max-w-3xl mx-auto leading-snug">
            Compare o custo real de manter planilhas e processos manuais vs. usar a <span className="font-medium">One Media!</span>
          </p>

          <div className="max-w-6xl mx-auto">
            {/* Headers */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-10 h-10 text-red-600" />
                <h3 className="text-3xl text-gray-900">Gestão manual</h3>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
                <h3 className="text-3xl text-gray-900">Com a OneMedia</h3>
              </div>
            </div>

            {/* Row 1 */}
            <div className="grid lg:grid-cols-2 gap-6 mb-3">
              <div className="bg-red-50 rounded-2xl px-5 py-4 flex justify-between items-center">
                <p className="text-lg text-gray-900 leading-tight">Atualizar planilhas de inventário</p>
                <p className="text-2xl font-semibold text-red-800 shrink-0 ml-3">15h/mês</p>
              </div>
              <div className="bg-green-50 rounded-2xl px-5 py-4 flex items-center">
                <p className="text-lg text-gray-900 leading-tight">Inventário centralizado e sempre atualizado</p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid lg:grid-cols-2 gap-6 mb-3">
              <div className="bg-red-50 rounded-2xl px-5 py-4 flex justify-between items-center">
                <p className="text-lg text-gray-900 leading-tight">Montar propostas e recalcular valores</p>
                <p className="text-2xl font-semibold text-red-800 shrink-0 ml-3">20h/mês</p>
              </div>
              <div className="bg-green-50 rounded-2xl px-5 py-4 flex items-center">
                <p className="text-lg text-gray-900 leading-tight">Propostas em poucos cliques, com templates</p>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid lg:grid-cols-2 gap-6 mb-3">
              <div className="bg-red-50 rounded-2xl px-5 py-4 flex justify-between items-center">
                <p className="text-lg text-gray-900 leading-tight">Conferir faturas e recebimentos</p>
                <p className="text-2xl font-semibold text-red-800 shrink-0 ml-3">12h/mês</p>
              </div>
              <div className="bg-green-50 rounded-2xl px-5 py-4 flex items-center">
                <p className="text-lg text-gray-900 leading-tight">Cobranças ligadas às campanhas, com alertas</p>
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid lg:grid-cols-2 gap-6 mb-3">
              <div className="bg-red-50 rounded-2xl px-5 py-4 flex justify-between items-center">
                <p className="text-lg text-gray-900 leading-tight">Retrabalho por erros de comunicação</p>
                <p className="text-2xl font-semibold text-red-800 shrink-0 ml-3">18h/mês</p>
              </div>
              <div className="bg-green-50 rounded-2xl px-5 py-4 flex items-center">
                <p className="text-lg text-gray-900 leading-tight">Mídia kit e mapa integrados para vender mais</p>
              </div>
            </div>

            {/* Bottom Cards */}
            <div className="grid lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-red-700 rounded-2xl px-6 py-5 text-white border-l-4 border-white">
                <p className="text-2xl font-semibold mb-1 leading-tight">Total: ~65h/mês desperdiçadas</p>
                <p className="text-lg leading-tight">em tarefas repetitivas</p>
              </div>
              <div className="bg-green-700 rounded-2xl px-6 py-5 text-white border-l-4 border-white">
                <p className="text-lg mb-1 leading-tight">Investimento mensal:</p>
                <p className="text-xs opacity-90 mb-3">*Exemplo com 50 unidades de inventário</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm">A partir de:</span>
                  <span className="text-5xl font-semibold leading-none">R$ 299</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/cadastro')}
              className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-500 to-blue-700 text-white text-2xl rounded-full hover:shadow-2xl transition-all mx-auto mb-4"
            >
              Teste Grátis 30 dias
              <ArrowRight className="w-7 h-7" />
            </button>
            <button 
              onClick={() => navigate('/planos')} 
              className="text-lg text-gray-900 underline hover:text-blue-600 transition-colors cursor-pointer"
            >
              Conheça os nossos planos.
            </button>
          </div>
        </div>
      </section>

{/* Security Section */}
<section className="security-section">
  <div className="security-wrap">
    <div className="security-iconWrap" aria-hidden="true">
      <img src={imgSecurityIcon} alt="" className="security-icon" />
    </div>

    <h2 className="security-title">Segurança e Confiabilidade</h2>

    <div className="security-block">
      <h3 className="security-heading">Proteção total dos seus dados:</h3>
      <ul className="security-list">
        <li className="security-item"><span className="security-emoji">🔐</span><span>Criptografia SSL</span></li>
        <li className="security-item"><span className="security-emoji">☁️</span><span>Backup automático</span></li>
        <li className="security-item"><span className="security-emoji">🛡️</span><span>Conformidade LGPD</span></li>
        <li className="security-item"><span className="security-emoji">📱</span><span>Acesso seguro multi-dispositivo</span></li>
      </ul>
    </div>

    <div className="security-block security-block--support">
      <h3 className="security-heading">Suporte que funciona:</h3>
      <ul className="security-list">
        <li className="security-item"><span className="security-emoji">📧</span><span>E-mail prioritário</span></li>
      </ul>
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

      {/* Image Lightbox Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-4 backdrop-blur-sm"
          onClick={() => setExpandedImage(null)}
        >
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all group"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="max-w-7xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img 
              src={expandedImage} 
              alt="Screenshot expandido" 
              className="w-full h-full object-contain rounded-2xl shadow-2xl"
              style={{ imageRendering: 'crisp-edges' }}
            />
            <p className="text-white text-center mt-4 text-sm opacity-75">Clique fora da imagem ou no X para fechar</p>
          </div>
        </div>
      )}
    </div>
  );
}