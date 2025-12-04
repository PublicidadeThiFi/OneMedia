import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { MediaType } from '../../types';

interface MediaUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaPointId: string;
  mediaPointName: string;
  mediaPointType: MediaType;
}

export function MediaUnitsDialog({
  open,
  onOpenChange,
  mediaPointId,
  mediaPointName,
  mediaPointType,
}: MediaUnitsDialogProps) {
  // TODO: Implementar gestão completa de MediaUnit
  // Este é um stub/placeholder para a funcionalidade futura

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Gerenciar Unidades (MediaUnit) - {mediaPointName}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {mediaPointType === MediaType.OOH
              ? 'Gerencie as faces (FACE) deste ponto OOH'
              : 'Gerencie as telas (SCREEN) deste ponto DOOH'}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info sobre MediaUnit */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <h3 className="text-blue-900 mb-3">
                💡 Sobre Unidades de Mídia (MediaUnit)
              </h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p>
                  <strong>MediaUnit</strong> representa cada face (OOH) ou tela (DOOH) dentro 
                  de um ponto de mídia.
                </p>
                <p className="mt-2"><strong>Campos principais:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><code>unitType</code>: FACE (OOH) ou SCREEN (DOOH)</li>
                  <li><code>label</code>: Ex: "Face 1 - Fluxo", "Tela 2"</li>
                  <li><code>orientation</code> (OOH): FLUXO ou CONTRA_FLUXO</li>
                  <li><code>widthM, heightM</code> (OOH): Dimensões em metros</li>
                  <li><code>insertionsPerDay</code> (DOOH): Inserções por dia</li>
                  <li><code>resolutionWidthPx, resolutionHeightPx</code> (DOOH): Resolução</li>
                  <li><code>priceMonth, priceWeek, priceDay</code>: Preços específicos da unidade</li>
                  <li><code>isActive</code>: Se a unidade está ativa/licenciada</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Estrutura da tela futura */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="text-gray-900 mb-4">
                {mediaPointType === MediaType.OOH ? 'Faces OOH' : 'Telas DOOH'}
              </h4>
              
              <div className="text-center py-12">
                <p className="text-gray-500 mb-2">
                  🚧 Funcionalidade em desenvolvimento
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  Esta tela permitirá:
                </p>
                <ul className="text-sm text-gray-600 text-left max-w-md mx-auto space-y-2">
                  <li>✓ Adicionar novas unidades (faces/telas)</li>
                  <li>✓ Editar características de cada unidade</li>
                  <li>✓ Definir preços individuais por unidade</li>
                  <li>✓ Ativar/desativar unidades</li>
                  <li>✓ Ver status de ocupação por unidade</li>
                  {mediaPointType === MediaType.OOH && (
                    <>
                      <li>✓ Configurar orientação (fluxo/contra-fluxo)</li>
                      <li>✓ Definir dimensões (largura x altura em metros)</li>
                    </>
                  )}
                  {mediaPointType === MediaType.DOOH && (
                    <>
                      <li>✓ Configurar inserções por dia</li>
                      <li>✓ Definir resolução da tela</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg mt-6">
                <p className="text-xs text-gray-600">
                  <strong>TODO:</strong> Implementar CRUD completo de MediaUnit com formulário específico 
                  para OOH (orientation, widthM, heightM) e DOOH (insertionsPerDay, resolution).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
