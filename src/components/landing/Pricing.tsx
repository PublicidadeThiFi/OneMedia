import { CheckCircle2, HelpCircle, MapPin, Users, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigation } from '../../App';
import { displayPlans, formatBRL, proSliderConfig, sharedFeatures, useProSliderPrice } from './pricingData';

const CARD_W = 340;

function StrikeX({ text }: { text: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', color: '#9ca3af', fontSize: '0.875rem', fontWeight: 500 }}>
      {text}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="0" y1="0" x2="100" y2="100" stroke="#ef4444" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="#ef4444" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

function PlanCard({ children, featured = false }: { children: React.ReactNode; featured?: boolean }) {
  return (
    <div
      style={{ width: CARD_W, minWidth: CARD_W, maxWidth: CARD_W }}
      className={`relative flex-shrink-0 snap-start bg-white rounded-2xl flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200 ${featured ? 'border-2 border-blue-600' : 'border border-gray-200'}`}
    >
      {children}
    </div>
  );
}

export function Pricing() {
  const navigate = useNavigation();
  const [showAddonTooltip, setShowAddonTooltip] = useState(false);
  const [sliderPoints, setSliderPoints] = useState(proSliderConfig.minPoints);
  const sliderPrice = useProSliderPrice(sliderPoints);
  const sliderAfter = useMemo(() => formatBRL(sliderPrice), [sliderPrice]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: 'left' | 'right') => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollBy({ left: dir === 'left' ? -(CARD_W + 20) : (CARD_W + 20), behavior: 'smooth' });
  };

  const cardBody = (children: React.ReactNode) => (
    <div className="p-5 flex flex-col flex-1 gap-3">{children}</div>
  );

  const limites = (users: number | string, points: number | string) => (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Limites</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-700">
          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gray-400" />Usuarios</span>
          <span className="font-semibold text-gray-900">{users}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-700">
          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />Pontos</span>
          <span className="font-semibold text-gray-900">{points}</span>
        </div>
      </div>
    </>
  );

  const featureList = () => (
    <>
      <p className="text-xs font-semibold text-gray-700">Todos os Recursos no Marketplace e mais:</p>
      <ul className="space-y-1.5 text-xs text-gray-600 flex-1">
        {sharedFeatures.map((item) => (
          <li key={item} className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{item}
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <section id="planos" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-2">Teste gratis</p>
          <h2 className="text-4xl font-semibold text-gray-900 mb-3">Planos com 1 mes gratuito</h2>
          <p className="text-base text-gray-500 max-w-xl mx-auto">Sem cartao de credito. Cancele quando quiser.</p>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">Arraste ou use as setas para ver os planos</span>
          <div className="flex gap-2">
            <button aria-label="Anterior" onClick={() => scroll('left')} className="p-2 rounded-full border border-gray-200 bg-white hover:border-blue-500 hover:text-blue-600 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button aria-label="Proximo" onClick={() => scroll('right')} className="p-2 rounded-full border border-gray-200 bg-white hover:border-blue-500 hover:text-blue-600 transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scroll container */}
        <div ref={scrollRef} className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-6" style={{ scrollbarWidth: 'none' }}>

          {displayPlans.map((plan) => (
            <PlanCard key={plan.id}>
              {/* Badge */}
              {plan.tag && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-blue-100">
                    <Star className="w-2.5 h-2.5" />{plan.tag}
                  </span>
                </div>
              )}
              {cardBody(
                <>
                  {/* Name */}
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                  </div>

                  {/* Price */}
                  <div>
                    {plan.strikePrice && <p><StrikeX text={plan.strikePrice} /></p>}
                    <p className="text-3xl font-extrabold text-gray-900">R$ 0,00</p>
                    <p className="text-sm text-gray-600">no primeiro mes</p>
                    <p className="text-xs text-gray-400">Depois {plan.monthlyPrice}</p>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Description */}
                  <p className="text-xs text-gray-500 leading-relaxed">{plan.description}</p>

                  <hr className="border-gray-100" />

                  {limites(plan.users, plan.points)}

                  <hr className="border-gray-100" />

                  {featureList()}

                  <button onClick={() => navigate('/cadastro')} className="mt-auto w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
                    Comecar gratis
                  </button>
                </>
              )}
            </PlanCard>
          ))}

          {/* Pro 2000 */}
          <PlanCard featured>
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                <Star className="w-2.5 h-2.5" />Escalavel
              </span>
            </div>
            {cardBody(
              <>
                {/* Name */}
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex-shrink-0" />
                  <h3 className="text-base font-bold text-gray-900">{proSliderConfig.name}</h3>
                </div>

                {/* Price */}
                <div>
                  <p className="text-3xl font-extrabold text-gray-900">R$ 0,00</p>
                  <p className="text-sm text-gray-600">no primeiro mes</p>
                  <p className="text-xs text-gray-400">Depois {sliderAfter}/mes</p>
                </div>

                <hr className="border-gray-100" />

                {/* Slider */}
                <div className="bg-blue-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-800">
                    <span>Pontos</span><span>{sliderPoints} pts</span>
                  </div>
                  <input type="range"
                    min={proSliderConfig.minPoints} max={proSliderConfig.maxPoints} step={proSliderConfig.step}
                    value={sliderPoints} onChange={(e) => setSliderPoints(Number(e.target.value))}
                    className="w-full accent-blue-600" />
                  <p className="text-[10px] text-gray-500">Arraste para ajustar pontos e ver o preco.</p>
                </div>

                <hr className="border-gray-100" />

                {limites(proSliderConfig.users, sliderPoints)}

                <hr className="border-gray-100" />

                {featureList()}

                <button onClick={() => navigate('/contato')} className="mt-auto w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
                  Falar com vendas
                </button>
              </>
            )}
          </PlanCard>
        </div>

        {/* Multi-Proprietarios */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mt-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 mb-1">Multi-Proprietarios</h3>
              <p className="text-xs text-gray-500 mb-4">Permite cadastrar ate 4 proprietarios por ponto de midia. Por padrao, todos os planos incluem 1 proprietario por ponto.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: '1 proprietario', value: 'Incluso', color: 'text-green-600', bg: 'bg-gray-50 border-gray-200' },
                  { label: '2 proprietarios', value: 'R$ 99/mes', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                  { label: '3 proprietarios', value: 'R$ 113,85/mes', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                  { label: '4 proprietarios', value: 'R$ 128,70/mes', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`rounded-xl ${bg} border px-3 py-2.5 text-center`}>
                    <div className="text-[11px] text-gray-500 mb-0.5">{label}</div>
                    <div className={`text-xs font-semibold ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <button onMouseEnter={() => setShowAddonTooltip(true)} onMouseLeave={() => setShowAddonTooltip(false)}
                onClick={() => setShowAddonTooltip(!showAddonTooltip)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <HelpCircle className="w-5 h-5 text-gray-400" />
              </button>
              {showAddonTooltip && (
                <div className="absolute right-0 top-10 w-72 bg-white rounded-xl shadow-xl p-4 border border-gray-200 z-10 text-xs text-gray-600">
                  <p className="font-semibold text-gray-900 mb-1">Quando preciso de multiplos proprietarios?</p>
                  Se voce gerencia pontos que pertencem a varios proprietarios diferentes, ou precisa dividir repasses entre multiplas empresas por ponto.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
