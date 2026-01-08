import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { FileText, Download, Trash2, Upload } from 'lucide-react';
import apiClient from '../../lib/apiClient';
import { MediaPointContract } from '../../types';

interface MediaPointContractsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaPointId: string;
  mediaPointName: string;
}

type ContractApi = MediaPointContract & { url?: string };

export function MediaPointContractsDialog({
  open,
  onOpenChange,
  mediaPointId,
  mediaPointName,
}: MediaPointContractsDialogProps) {
  const [contracts, setContracts] = useState<ContractApi[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContracts = async () => {
    if (!mediaPointId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<ContractApi[]>(`/media-points/${mediaPointId}/contracts`);
      setContracts(res.data ?? []);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || 'Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadContracts();
    } else {
      setIsAdding(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mediaPointId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contratos do Ponto - {mediaPointName}</DialogTitle>
          <p className="text-gray-600">
            Upload e gerenciamento dos contratos deste ponto.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lista de contratos */}
          <div className="space-y-3">
            {loading ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-600">Carregando...</CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="py-6 text-center">
                  <p className="text-red-600 mb-2">Erro ao carregar contratos</p>
                  <p className="text-sm text-gray-600">{error}</p>
                  <div className="mt-4">
                    <Button variant="outline" onClick={loadContracts}>
                      Tentar novamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : contracts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500 mb-4">Nenhum contrato cadastrado</p>
                  <Button onClick={() => setIsAdding(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Contrato
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {contracts.map((contract) => (
                  <Card key={contract.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-3">
                            <FileText className="w-5 h-5 text-red-600 mt-0.5" />
                            <div>
                              <h4 className="text-gray-900">{contract.fileName}</h4>
                              <p className="text-sm text-gray-600">ID: {contract.id}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {contract.signedAt && (
                              <div>
                                <span className="text-gray-600">Assinado em: </span>
                                <span className="text-gray-900">
                                  {new Date(contract.signedAt as any).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            )}
                            {contract.expiresAt && (
                              <div>
                                <span className="text-gray-600">Vence em: </span>
                                <span className="text-gray-900">
                                  {new Date(contract.expiresAt as any).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            )}
                          </div>

                          {contract.url && (
                            <div className="mt-3 text-xs text-gray-500 break-all">
                              URL: {contract.url}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const res = await apiClient.get<Blob>(
                                  `/media-point-contracts/${contract.id}/download`,
                                  { responseType: 'blob' }
                                );

                                const blobUrl = window.URL.createObjectURL(res.data);
                                const a = document.createElement('a');
                                a.href = blobUrl;
                                a.download = contract.fileName || 'contrato';
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                window.URL.revokeObjectURL(blobUrl);
} catch (e) {
                                console.error(e);
                                alert('Erro ao obter link de download.');
                              }
                            }}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const ok = window.confirm('Excluir este contrato?');
                              if (!ok) return;

                              try {
                                await apiClient.delete(`/media-point-contracts/${contract.id}`);
                                setContracts((prev) => prev.filter((c) => c.id !== contract.id));
                              } catch (e) {
                                console.error(e);
                                alert('Erro ao excluir contrato.');
                              }
                            }}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Contrato
                </Button>
              </>
            )}
          </div>

          {/* Formulário de upload */}
          {isAdding && (
            <ContractForm
              onSave={async ({ file, signedAt, expiresAt }) => {
                try {
                  const form = new FormData();
                  form.append('file', file);

                  if (signedAt) form.append('signedAt', signedAt);
                  if (expiresAt) form.append('expiresAt', expiresAt);

                  const res = await apiClient.post<ContractApi>(
                    `/media-points/${mediaPointId}/contracts`,
                    form,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                  );

                  setContracts((prev) => [...prev, res.data]);
                  setIsAdding(false);
                } catch (e) {
                  console.error(e);
                  alert('Erro ao enviar contrato.');
                }
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
  onSave: (data: { file: File; signedAt?: string; expiresAt?: string }) => void;
  onCancel: () => void;
}

function ContractForm({ onSave, onCancel }: ContractFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [signedAt, setSignedAt] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  return (
    <Card className="border-2 border-red-100 bg-red-50/30">
      <CardContent className="pt-6 space-y-4">
        <h4 className="text-gray-900 mb-2">Upload de Contrato</h4>

        <div className="space-y-2">
          <Label>Arquivo PDF *</Label>
          <Input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-gray-500">Somente PDF.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data de assinatura</Label>
            <Input type="date" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Data de vencimento</Label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!file) {
                alert('Selecione um arquivo PDF.');
                return;
              }
              onSave({
                file,
                signedAt: signedAt || undefined,
                expiresAt: expiresAt || undefined,
              });
            }}
          >
            Enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
