import { CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, MapPin, Star } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { displayPlans, formatBRL, proSliderConfig, sharedFeatures, useProSliderPrice } from '../landing/pricingData';
import { SignupPlanStep, PlanRange } from '../../types/signup';

// Map display plan id → signup PlanRange + platformId
const PLAN_MAP: Record<string, { range: PlanRange; platformId: string }> = {
  solo:       { range: '0-50',    platformId: '9606a2fb-e7a9-4c77-b834-e566b87cdc0b' },
  core:       { range: '50-100',  platformId: '1be52bed-89e1-4543-b833-8195afadd3be' },
  start:      { range: '101-150', platformId: '890bdd79-075b-4ff0-9684-e2fdff6ac74f' },
  pro:        { range: '151-200', platformId: '092ab0d7-0a88-49c5-a174-50633c37263d' },
  'pro-2000': { range: '401-plus', platformId: '8f155086-63fb-459c-9f97-7b7fd2880861' },
};

const CARD_W = 300;
const CARD_STYLE: React.CSSProperties = {
  width: 'min(300px, calc(100vw - 48px))',
  minWidth: 'min(300px, calc(100vw - 48px))',
  maxWidth: CARD_W,
};

function StrikeX({ text }: { text: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', color: '#9ca3af', fontSize: '0.875rem', fontWeight: 500 }}>
      {text}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="0" x2="100" y2="100" stroke="#ef4444" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="#ef4444" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

type Step1PlanProps = {
  data: SignupPlanStep;
  onChange: (data: SignupPlanStep) => void;
  onNext: () => void;
  error: string | null;
};

export function Step1Plan({ data, onChange, onNext, error }: Step1PlanProps) {
  const [sliderPoints, setSliderPoints] = useState(proSliderConfig.minPoints);
  const sliderPrice = useProSliderPrice(sliderPoints);
  const sliderAfter = useMemo(() => formatBRL(sliderPrice), [sliderPrice]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const selectedKey = useMemo(() => {
    if (!data.selectedPlatformPlanId) return null;
    return Object.entries(PLAN_MAP).find(([, v]) => v.platformId === data.selectedPlatformPlanId)?.[0] ?? null;
  }, [data.selectedPlatformPlanId]);

  const select = (key: string) => {
    const mapped = PLAN_MAP[key];
    if (!mapped) return;
    onChange({ ...data, selectedPlanRange: mapped.range, selectedPlatformPlanId: mapped.platformId });
  };

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -(CARD_W + 20) : CARD_W + 20, behavior: 'smooth' });
  };

  const cardBody = (children: React.ReactNode) => (
    <div className="p-5 flex flex-col flex-1 gap-3">{children}</div>
  );

  const limites = (points: number | string) => (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Limites</p>
      <div className="space-y-1.5">
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

  const radioStyle = (key: string): React.CSSProperties => ({
    width: 16, height: 16, borderRadius: '50%', flexShrink: 0, background: 'white', transition: 'border 0.15s',
    border: selectedKey === key ? '5px solid #2563eb' : '2px solid #d1d5db',
  });

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-semibold text-gray-900 mb-3">Comece seu teste grátis em 3 passos</h2>
        <p className="text-gray-600">Escolha o volume de pontos que você pretende gerenciar. Você pode mudar o plano depois.</p>
      </div>

      {/* Nav arrows */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">Arraste ou use as setas para ver os planos</span>
        <div className="flex gap-2">
          <button onClick={() => scroll('left')} className="p-2 rounded-full border border-gray-200 bg-white hover:border-blue-500 hover:text-blue-600 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => scroll('right')} className="p-2 rounded-full border border-gray-200 bg-white hover:border-blue-500 hover:text-blue-600 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div ref={scrollRef} className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-6" style={{ scrollbarWidth: 'none' }}>

        {displayPlans.map((plan) => {
          const isSelected = selectedKey === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => select(plan.id)}
              style={CARD_STYLE}
              className={`relative text-left flex-shrink-0 snap-start bg-white rounded-2xl flex flex-col transition-all duration-200 ${
                isSelected ? 'border-2 border-blue-600 shadow-lg' : 'border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md'
              }`}
            >
              {plan.tag && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-blue-100">
                    <Star className="w-2.5 h-2.5" />{plan.tag}
                  </span>
                </div>
              )}
              {cardBody(
                <>
                  <div className="flex items-center gap-2">
                    <div style={radioStyle(plan.id)} />
                    <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                  </div>
                  <div>
                    {plan.strikePrice && <p><StrikeX text={plan.strikePrice} /></p>}
                    <p className="text-3xl font-extrabold text-gray-900">R$ 0,00</p>
                    <p className="text-sm text-gray-600">no primeiro mês</p>
                    <p className="text-xs text-gray-400">Depois {plan.monthlyPrice}</p>
                  </div>
                  <hr className="border-gray-100" />
                  <p className="text-xs text-gray-500 leading-relaxed">{plan.description}</p>
                  <hr className="border-gray-100" />
                  {limites(plan.points)}
                  <hr className="border-gray-100" />
                  {featureList()}
                  <div className={`mt-auto w-full py-2.5 rounded-xl text-center text-sm font-semibold transition-colors ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isSelected ? 'Selecionado ✓' : 'Selecionar plano'}
                  </div>
                </>
              )}
            </button>
          );
        })}

        {/* Pro 2000 slider */}
        {(() => {
          const isSelected = selectedKey === 'pro-2000';
          return (
            <button
              onClick={() => select('pro-2000')}
              style={CARD_STYLE}
              className={`relative text-left flex-shrink-0 snap-start bg-white rounded-2xl flex flex-col transition-all duration-200 ${
                isSelected ? 'border-2 border-blue-600 shadow-lg' : 'border-2 border-blue-200 shadow-sm hover:border-blue-400 hover:shadow-md'
              }`}
            >
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  <Star className="w-2.5 h-2.5" />Escalável
                </span>
              </div>
              {cardBody(
                <>
                  <div className="flex items-center gap-2">
                    <div style={radioStyle('pro-2000')} />
                    <h3 className="text-base font-bold text-gray-900">{proSliderConfig.name}</h3>
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold text-gray-900">R$ 0,00</p>
                    <p className="text-sm text-gray-600">no primeiro mês</p>
                    <p className="text-xs text-gray-400">Depois {sliderAfter}/mês</p>
                  </div>
                  <hr className="border-gray-100" />
                  <div className="bg-blue-50 rounded-xl p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-800">
                      <span>Pontos</span><span>{sliderPoints} pts</span>
                    </div>
                    <input type="range"
                      min={proSliderConfig.minPoints} max={proSliderConfig.maxPoints} step={proSliderConfig.step}
                      value={sliderPoints} onChange={(e) => setSliderPoints(Number(e.target.value))}
                      className="w-full accent-blue-600" />
                    <p className="text-[10px] text-gray-500">Arraste para ajustar pontos e ver o preço.</p>
                  </div>
                  <hr className="border-gray-100" />
                  {limites(sliderPoints)}
                  <hr className="border-gray-100" />
                  {featureList()}
                  <div className={`mt-auto w-full py-2.5 rounded-xl text-center text-sm font-semibold transition-colors ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isSelected ? 'Selecionado ✓' : 'Selecionar plano'}
                  </div>
                </>
              )}
            </button>
          );
        })()}
      </div>

      {/* Multi-Proprietários */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900 mb-1">Multi-Proprietários</h3>
            <p className="text-xs text-gray-500 mb-4">Permite cadastrar até 4 proprietários por ponto de mídia. Por padrão, todos os planos incluem 1 proprietário por ponto.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { qty: '1', value: 'Incluso', color: 'text-green-600', bg: 'bg-gray-50 border-gray-200' },
                { qty: '2', value: 'R$ 99/mês', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                { qty: '3', value: 'R$ 113,85/mês', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                { qty: '4', value: 'R$ 128,70/mês', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
              ].map(({ qty, value, color, bg }) => (
                <div key={qty} className={`rounded-xl ${bg} border px-3 py-4 text-center flex flex-col items-center gap-1.5`}>
                  <div className="text-xl font-bold text-gray-800 leading-none">{qty}</div>
                  <div className="text-xs text-gray-500 leading-tight">proprietário{qty !== '1' ? 's' : ''}</div>
                  <div className={`text-xs font-semibold ${color} leading-tight`}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-gray-400" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-10 w-64 bg-white rounded-xl shadow-xl p-4 border border-gray-200 z-10 text-xs text-gray-600">
                O add-on Multi-Proprietários permite associar mais de um proprietário por ponto de mídia, facilitando a gestão de receitas e comissões por proprietário.
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 font-medium"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
