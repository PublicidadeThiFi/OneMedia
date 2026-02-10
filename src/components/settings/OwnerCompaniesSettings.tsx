import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { OwnerCompany } from '../../types';
import { useOwnerCompanies } from '../../hooks/useOwnerCompanies';
import { Plus, Pencil, Trash2, RefreshCcw } from 'lucide-react';

/**
 * Configurações > Empresa > Empresas Proprietárias
 *
 * Observação: a empresa principal (isPrimary) é automaticamente sincronizada com
 * os dados do tenant (Configurações > Dados da Empresa).
 */
export function OwnerCompaniesSettings() {
  const {
    ownerCompanies,
    loading,
    error,
    refetch,
    createOwnerCompany,
    updateOwnerCompany,
    deleteOwnerCompany,
  } = useOwnerCompanies(true);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<OwnerCompany | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ownerCompanies;
    return ownerCompanies.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        (c.document ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
      );
    });
  }, [ownerCompanies, query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Empresas Proprietárias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          Cadastre empresas proprietárias para vincular aos pontos do inventário.
          <br />
          A empresa marcada como <b>Empresa própria</b> é atualizada automaticamente quando você altera os dados da empresa acima.
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Buscar por nome, documento, e-mail ou telefone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-md"
          />

          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>

          <Button
            onClick={() => {
              setEditing(null);
              setIsOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova empresa
          </Button>
        </div>

        {error && <div className="text-sm text-red-600">{String(error)}</div>}
        {loading && <div className="text-sm text-gray-500">Carregando...</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-sm text-gray-500">Nenhuma empresa encontrada.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className={c.isPrimary ? 'border-indigo-200 bg-indigo-50/40' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      {c.isPrimary && <Badge variant="secondary">Empresa própria</Badge>}
                    </div>
                    <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                      {c.document && <span>Doc: {c.document}</span>}
                      {c.email && <span>E-mail: {c.email}</span>}
                      {c.phone && <span>Tel: {c.phone}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(c);
                        setIsOpen(true);
                      }}
                      disabled={c.isPrimary}
                      title={c.isPrimary ? 'Edite a empresa principal acima' : 'Editar'}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (c.isPrimary) return;
                        if (!confirm(`Excluir a empresa "${c.name}"?`)) return;
                        try {
                          await deleteOwnerCompany(c.id);
                        } catch (e: any) {
                          alert(e?.response?.data?.message || 'Erro ao excluir.');
                        }
                      }}
                      disabled={c.isPrimary}
                      title={c.isPrimary ? 'A empresa principal não pode ser excluída' : 'Excluir'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <OwnerCompanyDialog
          open={isOpen}
          onOpenChange={(o) => setIsOpen(o)}
          editing={editing}
          onSubmit={async (payload) => {
            try {
              if (editing) {
                await updateOwnerCompany(editing.id, payload);
              } else {
                await createOwnerCompany(payload);
              }
              setIsOpen(false);
              setEditing(null);
            } catch (e: any) {
              alert(e?.response?.data?.message || 'Erro ao salvar.');
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

function OwnerCompanyDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: OwnerCompany | null;
  onSubmit: (payload: Partial<OwnerCompany>) => Promise<void>;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [document, setDocument] = useState(editing?.document ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setDocument(editing?.document ?? '');
    setEmail(editing?.email ?? '');
    setPhone(editing?.phone ?? '');
  }, [open, editing]);

  const canSave = name.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar empresa proprietária' : 'Nova empresa proprietária'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Prefeitura de ..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Documento</Label>
              <Input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="CNPJ/CPF" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                onSubmit({
                  name: name.trim(),
                  document: document.trim() || undefined,
                  email: email.trim() || undefined,
                  phone: phone.trim() || undefined,
                })
              }
              disabled={!canSave}
            >
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
