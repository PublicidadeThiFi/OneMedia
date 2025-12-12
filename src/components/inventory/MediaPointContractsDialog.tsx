import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { FileText, Download, Trash2, Upload } from 'lucide-react';
import { MediaPointContract } from '../../types';
import { getContractsForPoint } from '../../lib/mockData';

interface MediaPointContractsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaPointId: string;
  mediaPointName: string;
}

export function MediaPointContractsDialog({
  open,
  onOpenChange,
  mediaPointId,
  mediaPointName,
}: MediaPointContractsDialogProps) {
  // TODO: Integrar com API real e S3
  const [contracts, setContracts] = useState<MediaPointContract[]>(
    getContractsForPoint(mediaPointId)
  );
  const [isAdding, setIsAdding] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contratos do Ponto - {mediaPointName}</DialogTitle>
          <p className="text-sm text-gray-600">
            Gerencie contratos de locação/propriedade (MediaPointContract)
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900 mb-1">
              📄 Upload de Contratos
            </p>
            <p className="text-sm text-blue-700">
              Faça upload de PDFs dos contratos. Os arquivos serão armazenados com segurança
              no S3 e associados a este ponto de mídia.
            </p>
          </div>

          {/* Lista de contratos */}
          <div className="space-y-3">
            {contracts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">
                    Nenhum contrato cadastrado para este ponto
                  </p>
                  <Button onClick={() => setIsAdding(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Adicionar Primeiro Contrato
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {contracts.map((contract) => (
                  <Card key={contract.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <FileText className="w-8 h-8 text-indigo-600 mt-1" />
                          <div className="flex-1">
                            <h4 className="text-gray-900 mb-2">{contract.fileName}</h4>

                            <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                              {contract.signedAt && (
                                <div>
                                  <span className="text-gray-600">Assinado em: </span>
                                  <span className="text-gray-900">
                                    {new Date(contract.signedAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              )}
                              {contract.expiresAt && (
                                <div>
                                  <span className="text-gray-600">Expira em: </span>
                                  <span className="text-gray-900">
                                    {new Date(contract.expiresAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              )}
                            </div>

                            <p className="text-xs text-gray-500 font-mono">
                              S3 Key: {contract.s3Key}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Implementar download do S3
                              console.log('Download:', contract.s3Key);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Confirmar exclusão
                              setContracts(prev => prev.filter(c => c.id !== contract.id));
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsAdding(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Adicionar Novo Contrato
                </Button>
              </>
            )}
          </div>

          {/* Formulário de adição */}
          {isAdding && (
            <ContractForm
              mediaPointId={mediaPointId}
              onSave={(data) => {
                const newContract: MediaPointContract = {
                  id: `mpc${Date.now()}`,
                  companyId: 'c1',
                  mediaPointId,
                  fileName: data.fileName!,   // garantido pelo form
                  s3Key: data.s3Key!,         // garantido pelo form
                  signedAt: data.signedAt ?? null,
                  expiresAt: data.expiresAt ?? null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };

                setContracts((prev: MediaPointContract[]) => [...prev, newContract]);
                setIsAdding(false);
              }}

              onCancel={() => setIsAdding(false)}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ContractFormProps {
  mediaPointId: string;
  onSave: (data: Partial<MediaPointContract>) => void;
  onCancel: () => void;
}

function ContractForm({ mediaPointId, onSave, onCancel }: ContractFormProps) {
  const [formData, setFormData] = useState<Partial<MediaPointContract>>({
    fileName: '',
    s3Key: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const updateField = (field: keyof MediaPointContract, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      updateField('fileName', file.name);
      // TODO: Gerar s3Key real após upload
      updateField('s3Key', `contracts/c1/${mediaPointId}/${file.name}`);
    }
  };

  const handleSave = () => {
    if (!formData.fileName || !formData.s3Key) {
      alert('Selecione um arquivo PDF');
      return;
    }

    // TODO: Fazer upload real para S3
    onSave(formData);
  };

  return (
    <Card className="border-2 border-indigo-200">
      <CardContent className="pt-6 space-y-4">
        <h4 className="text-gray-900 mb-4">Novo Contrato</h4>

        <div className="space-y-2">
          <Label>Arquivo do Contrato (PDF) *</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="flex-1"
            />
            {selectedFile && (
              <span className="text-sm text-green-600">✓ {selectedFile.name}</span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {/* TODO: integrar upload real via S3 */}
            Formatos aceitos: PDF. Tamanho máximo: 10MB
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data de Assinatura</Label>
            <Input
              type="date"
              value={
                formData.signedAt
                  ? new Date(formData.signedAt).toISOString().split('T')[0]
                  : ''
              }
              onChange={(e) =>
                updateField('signedAt', e.target.value ? new Date(e.target.value) : null)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Data de Expiração</Label>
            <Input
              type="date"
              value={
                formData.expiresAt
                  ? new Date(formData.expiresAt).toISOString().split('T')[0]
                  : ''
              }
              onChange={(e) =>
                updateField('expiresAt', e.target.value ? new Date(e.target.value) : null)
              }
            />
          </div>
        </div>

        {formData.s3Key && (
          <div className="p-3 bg-gray-50 rounded text-xs">
            <p className="text-gray-600 mb-1">Chave S3 (gerada automaticamente):</p>
            <p className="font-mono text-gray-900">{formData.s3Key}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!selectedFile}>
            Salvar Contrato
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
