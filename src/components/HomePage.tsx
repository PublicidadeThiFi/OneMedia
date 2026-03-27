import { Newspaper, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function HomePage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-2" data-tour="home-welcome">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          <Sparkles className="h-4 w-4" />
          Página Inicial
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Bem-vindo à Página Inicial</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600 md:text-base">
            Este novo módulo será a porta de entrada do aplicativo após o login e futuramente reunirá novidades,
            comunicados e destaques importantes do sistema.
          </p>
        </div>
      </div>

      <Card className="border-dashed border-indigo-200 bg-white/90 shadow-sm" data-tour="home-news-center">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <Newspaper className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900">Central de notícias</CardTitle>
              <p className="mt-1 text-sm text-gray-500">Placeholder inicial definido no escopo da Etapa 1.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center" data-tour="home-get-started">
            <p className="text-lg font-medium text-gray-900">Aqui será uma central de notícias</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
