import { CheckCircle2, MapPin, Star } from 'lucide-react';
import { useState } from 'react';
import { useNavigation } from '../../../App';
import { useWaitlist } from '../../../contexts/WaitlistContext';
import { displayPlans, formatBRL, proSliderConfig, sharedFeatures, useProSliderPrice } from '../pricingData';

const CARD_W = 300;

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

export function MobilePricing() {
  const navigate = useNavigation();
  const { openWaitlist } = useWaitlist();
  const [sliderPoints, setSliderPoints] = useState(proSliderConfig.minPoints);
  const sliderPrice = useProSliderPrice(sliderPoints);

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
      <ul className="space-y-1.5 text-xs text-gray-600">
        {sharedFeatures.map((item) => (
          <li key={item} className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{item}
          </li>
        ))}
      </ul>
    </>
  );

  const cardInner = (planKey: string, children: React.ReactNode, featured = false) => (
    <div
      key={planKey}
      style={{ width: CARD_W, minWidth: CARD_W, maxWidth: CARD_W }}
      className={`relative flex-shrink-0 snap-start bg-white rounded-2xl flex flex-col shadow-sm ${featured ? 'border-2 border-blue-600' : 'border border-gray-200'}`}
    >
      <div className="p-5 flex flex-col gap-3">{children}</div>
    </div>
  );

  return (
    <section id="planos" className="py-12 bg-white overflow-hidden">
      <div className="text-center px-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-1">Teste gratis</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Planos com 1 mes gratuito</h2>
        <p className="text-sm text-gray-500">Sem cartao de credito. Cancele quando quiser.</p>
      </div>

      <div
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4"
        style={{ paddingLeft: 16, paddingRight: 16, scrollbarWidth: 'none' }}
      >
        {displayPlans.map((plan) =>
          cardInner(
            plan.id,
            <>
              {plan.tag && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-blue-100">
                    <Star className="w-2.5 h-2.5" />{plan.tag}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
              </div>
              <div>
                {plan.strikePrice && <p><StrikeX text={plan.strikePrice} /></p>}
                <p className="text-3xl font-extrabold text-gray-900">R$ 0,00</p>
                <p className="text-sm text-gray-600">no primeiro mes</p>
                <p className="text-xs text-gray-400">Depois {plan.monthlyPrice}</p>
              </div>
              <hr className="border-gray-100" />
              <p className="text-xs text-gray-500 leading-relaxed">{plan.description}</p>
              <hr className="border-gray-100" />
              {limites(plan.points)}
              <hr className="border-gray-100" />
              {featureList()}
              <button onClick={() => openWaitlist('mobile-pricing:comecar-gratis')} className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
                Comecar gratis
              </button>
            </>,
            false
          )
        )}

        {/* Pro slider card */}
        {cardInner(
          'pro-2000',
          <>
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                <Star className="w-2.5 h-2.5" />Escalavel
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex-shrink-0" />
              <h3 className="text-base font-bold text-gray-900">{proSliderConfig.name}</h3>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900">R$ 0,00</p>
              <p className="text-sm text-gray-600">no primeiro mes</p>
              <p className="text-xs text-gray-400">Depois {formatBRL(sliderPrice)}/mes</p>
            </div>
            <hr className="border-gray-100" />
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
            {limites(sliderPoints)}
            <hr className="border-gray-100" />
            {featureList()}
            <button onClick={() => navigate('/contato')} className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
              Falar com vendas
            </button>
          </>,
          true
        )}
      </div>

      {/* dot indicators */}
      <div className="flex justify-center gap-1.5 mt-2">
        {[...displayPlans, { id: 'pro-slider' }].map((p) => (
          <div key={p.id} style={{ width: 6, height: 6, borderRadius: '50%', background: '#d1d5db' }} />
        ))}
      </div>
    </section>
  );
}
