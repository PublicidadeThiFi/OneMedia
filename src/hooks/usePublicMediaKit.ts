import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPublicMediaKit, PublicMediaKitResponse } from '../lib/publicMediaKit';
import { normalizeMenuFlow } from '../lib/menuFlow';

function isRequestCanceled(err: any): boolean {
  return Boolean(
    err?.code === 'ERR_CANCELED' ||
      err?.name === 'CanceledError' ||
      err?.__CANCEL__ === true ||
      (typeof err?.message === 'string' && /cancel/i.test(err.message))
  );
}

export type UsePublicMediaKitState = {
  data: PublicMediaKitResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function usePublicMediaKit(params: {
  token: string;
  ownerCompanyId?: string | null;
  flow?: string | null;
}): UsePublicMediaKitState {
  const token = useMemo(() => String(params.token ?? '').trim(), [params.token]);
  const ownerCompanyId = params.ownerCompanyId ?? null;
  const flow = useMemo(() => normalizeMenuFlow(params.flow), [params.flow]);

  const [data, setData] = useState<PublicMediaKitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((x) => x + 1), []);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!token) {
        setData(null);
        setError('Token ausente. Abra o Cardápio a partir do link compartilhado.');
        return;
      }
 
      try {
        setLoading(true);
        setError(null);
        const resp = await fetchPublicMediaKit({ token, ownerCompanyId, flow, force: nonce > 0 });
        if (!alive) return;
        setData(resp);
      } catch (err: any) {
        if (!alive) return;
        const status = err?.response?.status;
        const msg =
          status === 401
            ? 'Você não tem permissão para acessar este Cardápio.'
            : isRequestCanceled(err)
              ? 'Requisição cancelada.'
              : err?.message || 'Não foi possível carregar o Cardápio.';
        setData(null);
        setError(msg);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [token, ownerCompanyId, flow, nonce]);

  return { data, loading, error, reload };
}
