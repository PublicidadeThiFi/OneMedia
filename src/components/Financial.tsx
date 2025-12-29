import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { FinancialCharges } from './financial/FinancialCharges';
import { CashFlow } from './financial/CashFlow';
import { FinancialReports } from './financial/FinancialReports';

export function Financial() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Financeiro</h1>
        <p className="text-gray-600">Gerencie cobranças e fluxo de caixa</p>
      </div>

      <Tabs defaultValue="charges" className="space-y-6">
        <TabsList>
          <TabsTrigger value="charges">Cobranças</TabsTrigger>
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="charges">
          <FinancialCharges />
        </TabsContent>

        <TabsContent value="cashflow">
          <CashFlow />
        </TabsContent>

        <TabsContent value="reports">
          <FinancialReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
