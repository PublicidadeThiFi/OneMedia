import { ArrowLeft, Mail, MessageCircle } from 'lucide-react';

export default function Contato() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">OOH</span>
            </div>
            <span className="text-lg text-gray-900">OneMedia</span>
          </a>
          <a
            href="/"
            className="text-sm text-gray-600 hover:text-[#4F46E5] transition-colors"
          >
            Voltar ao site
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-gray-900 mb-4">Fale com nosso time comercial</h1>
          <p className="text-xl text-gray-600">
            Interessado no plano Enterprise ou tem dúvidas? Entre em contato conosco.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Email */}
          <a
            href="mailto:contato@oohmanager.com"
            className="bg-white rounded-xl p-8 border-2 border-gray-200 hover:border-[#4F46E5] transition-all hover:shadow-lg group"
          >
            <div className="w-12 h-12 bg-[#4F46E5]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#4F46E5] transition-colors">
              <Mail className="w-6 h-6 text-[#4F46E5] group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-gray-900 mb-2">E-mail</h3>
            <p className="text-gray-600 mb-4">Envie um e-mail para nossa equipe comercial</p>
            <p className="text-[#4F46E5]">contato@oohmanager.com</p>
          </a>

          {/* WhatsApp */}
          <a
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-xl p-8 border-2 border-gray-200 hover:border-[#4F46E5] transition-all hover:shadow-lg group"
          >
            <div className="w-12 h-12 bg-[#4F46E5]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#4F46E5] transition-colors">
              <MessageCircle className="w-6 h-6 text-[#4F46E5] group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-gray-900 mb-2">WhatsApp</h3>
            <p className="text-gray-600 mb-4">Fale diretamente com nosso time</p>
            <p className="text-[#4F46E5]">(11) 99999-9999</p>
          </a>
        </div>

        <div className="mt-12 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#4F46E5] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o site
          </a>
        </div>
      </main>
    </div>
  );
}
