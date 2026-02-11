export type WaitlistLeadPayload = {
  nomeCompleto: string;
  empresa: string;
  email: string;
  whatsapp: string;
  qtdPontosMidia: string;
  origem: string;
};

type SubmitResult = { ok: true } | { ok: false; error: string };

/**
 * Envia um lead para o webhook do Make (Google Sheets).
 *
 * Observações importantes:
 * - Em Vite, variáveis precisam começar com VITE_.
 * - Caso você tenha habilitado "API Key authentication" no webhook do Make,
 *   configure VITE_WAITLIST_API_KEY. Isso adiciona o header x-make-apikey.
 * - Se o navegador bloquear por CORS, a alternativa mais confiável é remover a
 *   autenticação por header no Make (o próprio link do webhook já é secreto)
 *   OU usar um proxy/server para encaminhar.
 */
export async function submitWaitlistLead(payload: WaitlistLeadPayload): Promise<SubmitResult> {
  const webhookUrl = (import.meta as any).env?.VITE_WAITLIST_WEBHOOK_URL as string | undefined;
  const apiKey = (import.meta as any).env?.VITE_WAITLIST_API_KEY as string | undefined;

  if (!webhookUrl || !webhookUrl.trim()) {
    return { ok: false, error: 'VITE_WAITLIST_WEBHOOK_URL não configurada.' };
  }

  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey && apiKey.trim()) {
    headers['x-make-apikey'] = apiKey.trim();
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { ok: false, error: `Falha ao enviar (${res.status}).` };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Falha de rede/CORS ao enviar.' };
  }
}
