import { useState } from 'react';
import { Upload, Download, Eye, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { getDocumentsForClient, getUserById, ClientDocument } from '../../lib/mockData';

interface ClientDocumentsSectionProps {
  clientId: string;
  onDocumentAdded?: (document: ClientDocument) => void;
}

export function ClientDocumentsSection({ clientId, onDocumentAdded }: ClientDocumentsSectionProps) {
  const [documents, setDocuments] = useState<ClientDocument[]>(getDocumentsForClient(clientId));
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    fileName: '',
    documentType: '',
    file: null as File | null,
  });

  const handleUpload = () => {
    if (!uploadFormData.fileName || !uploadFormData.documentType) {
      alert('Preencha todos os campos');
      return;
    }

    // Mock de upload - apenas simula
    const newDocument: ClientDocument = {
      id: `cd${Date.now()}`,
      companyId: 'c1',
      clientId,
      fileName: uploadFormData.fileName,
      s3Key: `documents/c1/${clientId}/${uploadFormData.fileName}`,
      documentType: uploadFormData.documentType,
      uploadedByUserId: 'u1', // Mock user
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setDocuments(prev => [...prev, newDocument]);
    if (onDocumentAdded) onDocumentAdded(newDocument);
    
    setUploadDialogOpen(false);
    setUploadFormData({ fileName: '', documentType: '', file: null });
  };

  const handleDownload = (document: ClientDocument) => {
    // TODO: Implementar download real via S3
    console.log('Download documento:', document.fileName);
    alert(`Download de "${document.fileName}" será implementado com integração S3`);
  };

  const handleView = (document: ClientDocument) => {
    // TODO: Implementar visualização de documento
    console.log('Visualizar documento:', document.fileName);
    alert(`Visualização de "${document.fileName}" será implementada`);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900">Documentos do Cliente</h3>
        <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Adicionar Documento
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum documento cadastrado</p>
          <p className="text-sm">Clique em "Adicionar Documento" para enviar arquivos</p>
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
              {documents.map((doc) => {
                const uploader = getUserById(doc.uploadedByUserId);
                
                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 text-sm">{doc.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {doc.documentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {uploader?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleView(doc)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Documento</DialogTitle>
            <DialogDescription>Envie arquivos para o cliente</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Arquivo</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadFormData(prev => ({
                      ...prev,
                      file,
                      fileName: file.name,
                    }));
                  }
                }}
              />
              {uploadFormData.file && (
                <p className="text-sm text-green-600">✓ {uploadFormData.file.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">Tipo de Documento</Label>
              <Input
                id="documentType"
                value={uploadFormData.documentType}
                onChange={(e) => setUploadFormData(prev => ({
                  ...prev,
                  documentType: e.target.value.toUpperCase(),
                }))}
                placeholder="CONTRATO, BRIEFING, LOGO, etc."
              />
              <p className="text-xs text-gray-500">
                Exemplos: CONTRATO, BRIEFING, LOGO, APRESENTACAO, NF, OUTROS
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpload}>
                Enviar Documento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}