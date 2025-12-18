import { useEffect, useMemo, useState } from 'react';
import { Upload, Download, Eye, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ClientDocument } from '../../types';
import apiClient from '../../lib/apiClient';
import { toast } from 'sonner';
import { useClientOwners } from '../../hooks/useClientOwners';

interface ClientDocumentsSectionProps {
  clientId: string;
  onDocumentAdded?: (document: ClientDocument) => void;
}

export function ClientDocumentsSection({
  clientId,
  onDocumentAdded,
}: ClientDocumentsSectionProps) {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFormData, setUploadFormData] = useState<{
    documentType: string;
    file: File | null;
  }>({
    documentType: '',
    file: null,
  });

  const { ownersById } = useClientOwners();

  const uploaderName = useMemo(() => {
    return (userId?: string) => {
      if (!userId) return '—';
      return ownersById.get(userId)?.name || userId;
    };
  }, [ownersById]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<ClientDocument[]>(`/clients/${clientId}/documents`);
      setDocuments(res.data ?? []);
    } catch (err: any) {
      toast.error('Erro ao carregar documentos do cliente');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleFileChange = (file: File | null) => {
    setUploadFormData((prev) => ({ ...prev, file }));
  };

  const handleUpload = async () => {
    try {
      if (!uploadFormData.file) {
        toast.error('Selecione um arquivo para upload');
        return;
      }

      const formData = new FormData();
      formData.append('file', uploadFormData.file);
      formData.append(
        'documentType',
        (uploadFormData.documentType || 'OUTRO').toString(),
      );

      const res = await apiClient.post<ClientDocument>(
        `/clients/${clientId}/documents`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      const doc = res.data;
      toast.success('Documento enviado!');
      setUploadDialogOpen(false);
      setUploadFormData({ documentType: '', file: null });
      if (doc) {
        setDocuments((prev) => [doc, ...prev]);
        onDocumentAdded?.(doc);
      } else {
        await fetchDocuments();
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Erro ao enviar documento';
      toast.error(message);
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'documento';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownload = async (document: ClientDocument) => {
    try {
      const res = await apiClient.get(
        `/clients/${clientId}/documents/${document.id}/download`,
        { responseType: 'blob' as any },
      );
      downloadBlob(res.data as Blob, document.fileName);
    } catch {
      toast.error('Erro ao baixar documento');
    }
  };

  const handleView = async (document: ClientDocument) => {
    try {
      const res = await apiClient.get(
        `/clients/${clientId}/documents/${document.id}/download`,
        { responseType: 'blob' as any },
      );
      const blobUrl = window.URL.createObjectURL(res.data as Blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      // não revoga imediatamente para não quebrar o preview
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      toast.error('Erro ao visualizar documento');
    }
  };

  const formatDate = (date: any) => {
    const d = new Date(date);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-gray-900">Documentos</h3>
          <p className="text-gray-600 text-sm">Gerencie contratos, propostas e outros documentos</p>
        </div>

        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Documento
        </Button>
      </div>

      {/* Lista de documentos */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-gray-900">Documentos Anexados</h4>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Carregando documentos...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum documento anexado</p>
            <p className="text-sm mt-1">Faça upload de documentos relacionados a este cliente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600 text-sm">Arquivo</th>
                  <th className="px-4 py-3 text-left text-gray-600 text-sm">Tipo</th>
                  <th className="px-4 py-3 text-left text-gray-600 text-sm">Upload por</th>
                  <th className="px-4 py-3 text-left text-gray-600 text-sm">Data</th>
                  <th className="px-4 py-3 text-left text-gray-600 text-sm">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{doc.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{doc.documentType}</td>
                    <td className="px-4 py-3 text-gray-600">{uploaderName(doc.uploadedByUserId)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(doc.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(doc)}
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          title="Baixar"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog Upload */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload de Documento</DialogTitle>
            <DialogDescription>
              Adicione um documento relacionado a este cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="documentType">Tipo de Documento</Label>
              <Input
                id="documentType"
                value={uploadFormData.documentType}
                onChange={(e) =>
                  setUploadFormData((prev) => ({
                    ...prev,
                    documentType: e.target.value,
                  }))
                }
                placeholder="Ex: Contrato, Proposta, CNPJ, etc"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Arquivo</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              />
              <p className="text-xs text-gray-500">
                Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpload}>Enviar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
