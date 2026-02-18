import { ArrowRight, Play, ShieldCheck, Sparkles, Check } from 'lucide-react';
import { useNavigation } from '../../../App';
import { useWaitlist } from '../../../contexts/WaitlistContext';
import imgOnemediaLogo from 'figma:asset/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';
import imgRelatorios from 'figma:asset/24be53fa98cb70de89bcd6b3013fd88d5eff019e.png';
import imgLogotipoOutdoorBr from 'figma:asset/b772fcca664e51771498ee420b09d2bb7a1c5fed.png';

const highlights = [
  { label: 'Inventário e faces', value: 'Organize tudo em minutos' },
  { label: 'Propostas e reservas', value: 'Envie e feche rápido' },
  { label: 'Financeiro automático', value: 'Cobrança e alertas' },
];

const brands = ['Clear Channel', 'JCDecaux', 'Kallas', 'MediaOut', 'OutdoorBR'];

export function MobileHero() {
  const navigate = useNavigation();
  const { openWaitlist } = useWaitlist();

  return (
    <section className="pt-28 pb-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-5 space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Sparkles className="h-4 w-4" />
          Nova experiência mobile
        </div>

        <h1 className="text-3xl font-semibold text-gray-900 leading-snug">
          Tudo que seu time precisa para vender mídia OOH/DOOH sem planilhas.
        </h1>

        <p className="text-base text-gray-600">
          Capture leads, organize inventário, envie propostas e cobre automaticamente com a mesma
          plataforma que você já usa no desktop.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => openWaitlist('mobile-landing:hero:trial-30-days')}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-white font-semibold shadow-md hover:bg-blue-700"
          >
            Testar grátis 30 dias
            <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => openWaitlist('mobile-landing:hero:talk-to-sales')}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-900 hover:border-blue-200"
          >
            Falar com vendas
            <Play className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 space-y-4">
          <div className="flex items-center gap-2">
            <img src={imgOnemediaLogo} alt="OneMedia" className="h-8" />
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-500">SLA e suporte humano</span>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 p-3">
            <img src={imgRelatorios} alt="Dashboard" className="w-full rounded-lg shadow" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {highlights.map((item) => (
              <div key={item.label} className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-sm text-gray-900 font-semibold">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confiado por equipes de mídia</p>
          <div className="flex flex-wrap gap-3">
            {brands.map((brand) => (
              <span
                key={brand}
                className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm"
              >
                {brand}
              </span>
            ))}
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm">
              <img src={imgLogotipoOutdoorBr} alt="OutdoorBR" className="h-4" />
              OutdoorBR
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
