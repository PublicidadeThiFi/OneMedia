import { publicApiClient } from './apiClient';

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
 * Encaminha o lead para o backend, que por sua vez integra com o webhook externo.
 * Assim o URL do webhook não vai para o bundle público.
 */
export async function submitWaitlistLead(payload: WaitlistLeadPayload): Promise<SubmitResult> {
  try {
    const res = await publicApiClient.post('/public/waitlist/submit', payload);
    return res?.data?.ok ? { ok: true } : { ok: false, error: 'Não foi possível enviar.' };
  } catch (error: any) {
    const message = error?.response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return { ok: false, error: message.trim() };
    }
    return { ok: false, error: 'Falha ao enviar.' };
  }
}
