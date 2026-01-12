import { ArrowLeft, Mail, MessageCircle } from 'lucide-react';
import { useNavigation } from '../App';
import imgOnemediaLogo from '../assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

export default function Contato() {
  const navigate = useNavigation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <img src={imgOnemediaLogo} alt="OneMedia" className="h-12" />
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-gray-700 hover:text-blue-600 transition-colors"
          >
            Voltar ao site
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 mb-5">Fale com nosso time comercial</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Interessado no plano Enterprise ou tem dúvidas? Entre em contato conosco.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Email */}
          <a
            href="mailto:contato@oohmanager.com"
            className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-600 transition-all hover:shadow-xl group"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-blue-700 transition-all shadow-lg shadow-transparent group-hover:shadow-blue-500/30">
              <Mail className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">E-mail</h3>
            <p className="text-gray-600 mb-4">Envie um e-mail para nossa equipe comercial</p>
            <p className="text-blue-600 font-medium group-hover:text-blue-700">contato@oohmanager.com</p>
          </a>

          {/* WhatsApp */}
          <a
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-600 transition-all hover:shadow-xl group"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-blue-700 transition-all shadow-lg shadow-transparent group-hover:shadow-blue-500/30">
              <MessageCircle className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">WhatsApp</h3>
            <p className="text-gray-600 mb-4">Fale diretamente com nosso time</p>
            <p className="text-blue-600 font-medium group-hover:text-blue-700">(11) 99999-9999</p>
          </a>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o site
          </button>
        </div>
      </main>
    </div>
  );
}