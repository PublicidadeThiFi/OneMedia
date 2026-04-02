# Ambiente Público do Frontend

## Variáveis permitidas no bundle
- `VITE_API_URL`
- `VITE_APP_URL`
- `VITE_TURNSTILE_SITE_KEY`
- `VITE_MERCADO_PAGO_PUBLIC_KEY`
- `URL_ONE_MEDIA`

## Variáveis proibidas no bundle
Não use `VITE_*` para:
- secrets
- passwords
- JWTs
- access/refresh tokens
- webhooks privados
- access keys privadas

## Waitlist
O frontend não deve mais conhecer o webhook externo da waitlist.

Fluxo correto:
1. frontend envia para `POST /api/public/waitlist/submit`
2. backend lê `WAITLIST_WEBHOOK_URL`
3. backend encaminha ao destino externo

## Build
O script `npm run validate:public-env` falha o build quando detectar uma variável pública com cara de segredo.
