import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, FileText, Sparkles, Paperclip, FileImage, FileSpreadsheet } from 'lucide-react';
import apiClient from '../lib/apiClient';
import { useNavigation } from '../contexts/NavigationContext';
import { ENVIRONMENTS, OOH_SUBCATEGORIES, DOOH_SUBCATEGORIES } from '../lib/mockData';

interface InlineFieldSpec {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'file-image';
  options?: string[];
  placeholder?: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  actions?: AssistantActionSuggestion[];
  dataPoints?: AssistantDataPoint[];
  source?: string;
  dedupeKey?: string;
  /** Botões de resposta rápida, exibidos como pills abaixo do conteúdo */
  quickReplies?: Array<{ label: string; value: string }>;
  /** Campos de formulário inline para preenchimento diretamente no balão */
  inlineFields?: InlineFieldSpec[];
  /** Quando true, exibe os botões de modo de cadastro de inventário ("Um por um" / "Tudo") */
  showInventoryButtons?: boolean;
  /** Tipo do ponto para exibir botões de face step ('OOH' | 'DOOH' | 'OOH_CONTRA_FLUXO'), ou undefined */
  faceStepButtons?: 'OOH' | 'DOOH' | 'OOH_CONTRA_FLUXO';
  /** Seleção pendente de confirmação no face step */
  faceStepSelection?: 'fluxo' | 'contra-fluxo' | 'ambas' | 'tela-principal' | 'pular' | null;
}

interface AssistantDataPoint {
  id?: string;
  label?: string;
  value?: string;
  description?: string;
  tone?: 'info' | 'success' | 'warning' | 'error' | 'neutral';
}

interface AssistantActionSuggestion {
  id: string;
  key: string;
  type: 'execute' | 'navigate';
  kind: 'read' | 'write';
  label: string;
  description?: string;
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationMessage?: string;
  targetModule?: string;
  targetPath?: string;
  autoExecute?: boolean;
  payload?: Record<string, unknown>;
}

interface ParsedOutdoorRecord {
  id?: string;
  nome?: string;
  name?: string;
  label?: string;
  tipo?: string;
  type?: string;
  subcategoria?: string;
  subcategory?: string;
  cidade?: string;
  addressCity?: string;
  estado?: string;
  addressState?: string;
  impactosDia?: number | string;
  dailyImpressions?: number | string;
  precoMensal?: number | string;
  basePriceMonth?: number | string;
  midiaKit?: boolean | string;
  showInMediaKit?: boolean | string;
  latitude?: number | string;
  longitude?: number | string;
  endereco?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressDistrict?: string;
  addressZipcode?: string;
  addressCountry?: string;
  environment?: string;
  precoSemanal?: number | string;
  basePriceWeek?: number | string;
  precoDiario?: number | string;
  basePriceDay?: number | string;
  faceLabel?: string;
  orientation?: string;
  widthM?: number | string;
  heightM?: number | string;
  insertionsPerDay?: number | string;
  resolutionWidthPx?: number | string;
  resolutionHeightPx?: number | string;
  socialClasses?: string[];
}

interface ParsedClientRecord {
  contactName?: string | null;
  companyName?: string | null;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressStreet?: string | null;
  addressZipcode?: string | null;
  status?: string | null;
}

type UploadSourceType = 'pdf' | 'spreadsheet' | 'image' | 'text';

interface AssistantDocumentContext {
  sourceType?: UploadSourceType;
  totalRecords?: number;
  remainingRecords?: number;
  activeRecord?: ParsedOutdoorRecord | null;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  /** Quando definido, é enviado automaticamente ao assistente ao abrir o painel. Limpo após o envio. */
  pendingMessage?: string;
  /** ID do usuário autenticado — usado para isolar a conversa por conta no localStorage. */
  userId?: string;
}

interface PendingAssistedUploadContext {
  sourceType: UploadSourceType | null;
  activeRecord: ParsedOutdoorRecord;
  totalRecords: number;
}

interface SendMessageOptions {
  silentUserMessage?: boolean;
  overridePendingOutdoors?: ParsedOutdoorRecord[];
  forceUploadContext?: boolean;
  isBulkAutoRun?: boolean;
}

interface ExecuteAssistantActionOptions {
  userMessage?: string;
  skipConfirmDialog?: boolean;
  queueSnapshot?: ParsedOutdoorRecord[];
}

interface AssistantExternalMessageDetail {
  source?: string;
  content?: string;
  dataPoints?: AssistantDataPoint[];
  dedupeKey?: string;
}

interface OutdoorCompletionAuditEntry {
  outdoorLabel: string;
  missingFields: string[];
}

interface AwaitingFaceStep {
  mediaPointId: string;
  mediaPointName: string;
  mediaPointType: 'OOH' | 'DOOH' | string;
  /** se true, continua a fila de pontos após cadastrar a face */
  continueQueueAfter: boolean;
}

interface ActionExecutionMeta {
  entityType?: string;
  entityId?: string;
  entityName?: string;
  created?: boolean;
  reused?: boolean;
}

interface InventoryExtractionAnalysis {
  totalPoints?: number;
  detectedContentTypes?: string[];
  typeBreakdown?: {
    outdoor?: number;
    led?: number;
    frontLight?: number;
    other?: number;
  };
  extracted?: {
    withName?: number;
    withType?: number;
    withCity?: number;
    withState?: number;
    withCoordinates?: number;
    withImpacts?: number;
    withMonthlyPrice?: number;
    withMediaKit?: number;
  };
  missingHighlights?: string[];
  nextAction?: string;
  overview?: string;
}

const SUPPORTED_UPLOAD_EXTENSIONS = ['pdf', 'csv', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'webp', 'heic', 'heif', 'docx', 'doc', 'txt', 'json'] as const;

const BRAZILIAN_STATE_ALIASES: Record<string, string> = {
  ac: 'AC',
  acre: 'AC',
  al: 'AL',
  alagoas: 'AL',
  ap: 'AP',
  amapa: 'AP',
  am: 'AM',
  amazonas: 'AM',
  ba: 'BA',
  bahia: 'BA',
  ce: 'CE',
  ceara: 'CE',
  df: 'DF',
  'distrito federal': 'DF',
  distritofederal: 'DF',
  es: 'ES',
  'espirito santo': 'ES',
  espiritosanto: 'ES',
  go: 'GO',
  goias: 'GO',
  ma: 'MA',
  maranhao: 'MA',
  mt: 'MT',
  'mato grosso': 'MT',
  matogrosso: 'MT',
  ms: 'MS',
  'mato grosso do sul': 'MS',
  matogrossodosul: 'MS',
  mg: 'MG',
  'minas gerais': 'MG',
  minasgerais: 'MG',
  pa: 'PA',
  para: 'PA',
  pb: 'PB',
  paraiba: 'PB',
  pr: 'PR',
  parana: 'PR',
  pe: 'PE',
  pernambuco: 'PE',
  pi: 'PI',
  piaui: 'PI',
  rj: 'RJ',
  'rio de janeiro': 'RJ',
  riodejaneiro: 'RJ',
  rn: 'RN',
  'rio grande do norte': 'RN',
  riograndedonorte: 'RN',
  rs: 'RS',
  'rio grande do sul': 'RS',
  riograndedosul: 'RS',
  ro: 'RO',
  rondonia: 'RO',
  rr: 'RR',
  roraima: 'RR',
  sc: 'SC',
  'santa catarina': 'SC',
  santacatarina: 'SC',
  sp: 'SP',
  'sao paulo': 'SP',
  saopaulo: 'SP',
  se: 'SE',
  sergipe: 'SE',
  to: 'TO',
  tocantins: 'TO',
};

function getFileExtension(fileName: string): string {
  const parts = String(fileName || '').toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function inferUploadKindFromFile(file: File): 'pdf' | 'spreadsheet' | 'image' | 'text' | 'other' {
  const ext = getFileExtension(file?.name || '');
  const mime = String(file?.type || '').toLowerCase();

  if (ext === 'pdf' || mime.includes('pdf')) return 'pdf';
  if (['csv', 'xlsx', 'xls'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
    return 'spreadsheet';
  }
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif'].includes(ext)) {
    return 'image';
  }
  if (['docx', 'doc', 'txt', 'json', 'md'].includes(ext) || mime.includes('wordprocessingml') || mime.includes('msword') || mime.includes('text/') || mime.includes('json')) {
    return 'text';
  }

  return 'other';
}

function isSupportedUploadFile(file: File): boolean {
  const ext = getFileExtension(file?.name || '');
  const kind = inferUploadKindFromFile(file);
  return SUPPORTED_UPLOAD_EXTENSIONS.includes(ext as any) || kind !== 'other';
}

function uploadKindLabel(kind: string): string {
  const normalized = String(kind || '').toLowerCase();
  if (normalized === 'spreadsheet') return 'Planilha';
  if (normalized === 'image') return 'Imagem';
  if (normalized === 'pdf') return 'PDF';
  if (normalized === 'text') return 'Arquivo de texto';
  return 'Arquivo';
}

function isAutoGeneratedUploadInput(content: string, fileName: string): boolean {
  const text = String(content || '').trim();
  if (!text) return false;

  const normalizedText = normalizeText(text);
  const normalizedFileName = String(fileName || '').trim().toLowerCase();
  const hasFileName = !!normalizedFileName && text.toLowerCase().includes(normalizedFileName);

  const startsWithAutoPrefix = /^(?:enviar|upload|anexar)\s+(?:pdf|planilha|imagem|arquivo)/.test(normalizedText);
  if (hasFileName && startsWithAutoPrefix) {
    return true;
  }

  if (hasFileName && /^arquivo\s+enviado/.test(normalizedText)) {
    return true;
  }

  if (hasFileName && text.length <= normalizedFileName.length + 8) {
    return true;
  }

  return false;
}

const ROUTE_TO_MODULE: Record<string, string> = {
  home: 'home',
  dashboard: 'dashboard',
  ai: 'inventory',
  inventory: 'inventory',
  inventario: 'inventory',
  mediamap: 'mediamap',
  clients: 'clients',
  clientes: 'clients',
  products: 'products',
  produtos: 'products',
  proposals: 'proposals',
  propostas: 'proposals',
  campaigns: 'campaigns',
  campanhas: 'campaigns',
  reservations: 'reservations',
  reservas: 'reservations',
  financial: 'financial',
  financeiro: 'financial',
  messages: 'messages',
  mensagens: 'messages',
  mediakit: 'mediakit',
  promotions: 'promotions',
  promocoes: 'promotions',
  activities: 'activities',
  atividades: 'activities',
  settings: 'settings',
  configuracoes: 'settings',
  superadmin: 'superadmin',
};

function inferCurrentModule(pathname: string): string {
  const parts = String(pathname || '').split('/').filter(Boolean);
  if (parts[0] !== 'app') return 'home';
  const routeKey = (parts[1] || 'home').toLowerCase();
  return ROUTE_TO_MODULE[routeKey] || 'home';
}

function normalizeText(input?: string | null): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function sanitizeCoordinateText(input?: string | null): string {
  return String(input || '').replace(/[\u2212\u2012\u2013\u2014]/g, '-');
}

function isAffirmativeMessage(message: string): boolean {
  const normalized = normalizeText(message);
  if (!normalized) return false;

  return [
    'sim',
    'quero',
    'ok',
    'pode',
    'confirmo',
    'confirmado',
    'isso',
    'beleza',
    'manda',
    'vai',
    'seguir',
    'continue',
  ].includes(normalized);
}

function isContinuePdfContextMessage(message: string): boolean {
  const normalized = normalizeText(message);
  if (!normalized) return false;

  return [
    'proximo',
    'próximo',
    'continuar',
    'continue',
    'seguir',
    'pode seguir',
    'vai para o proximo',
    'vai para o próximo',
  ].some((pattern) => normalized.includes(pattern));
}

function shouldUsePendingPdfContext(message: string, pendingOutdoors: ParsedOutdoorRecord[]): boolean {
  const normalized = normalizeText(message);
  if (!normalized || !pendingOutdoors.length) return false;

  if (isAffirmativeMessage(message)) return true;

  if (isCancelPdfContextMessage(message)) return false;

  if (extractCoordinatesFromMessage(message).latitude != null || extractCoordinatesFromMessage(message).longitude != null) {
    return true;
  }

  if (extractCityStateFromMessage(message).city || extractCityStateFromMessage(message).state) {
    return true;
  }

  const hasCadastroHint = [
    'pdf',
    'outdoor',
    'cadastro',
    'cadastrar',
    'cadastre',
    'criar',
    'crie',
    'faca',
    'faça',
    'ponto',
    'midia',
    'mídia',
  ].some((pattern) => normalized.includes(pattern));

  if (hasCadastroHint) return true;

  // Keep registration flow active while PDF context exists unless the user clears it.
  return true;
}

function isBulkAllMessage(message: string): boolean {
  const n = normalizeText(message);
  return (
    n === 'todos' ||
    n.includes('sim para todos') ||
    n.includes('cadastrar todos') ||
    n.includes('pode todos') ||
    n.includes('registrar todos') ||
    n.includes('quero todos') ||
    n.includes('todos de uma vez')
  );
}

/** Interpreta a resposta do usuário no passo de face (OOH) */
function parseFaceInstruction(
  message: string,
): 'fluxo' | 'contra-fluxo' | 'ambas' | 'pular' | null {
  const n = normalizeText(message);
  if (
    n.includes('ambas') ||
    n.includes('as duas') ||
    n.includes('ambos') ||
    n === 'sim' ||
    n === 'ok'
  )
    return 'ambas';
  if (n.includes('contra') || n.includes('contrafluxo')) return 'contra-fluxo';
  if (n === 'fluxo' || n.includes('so fluxo') || n.includes('apenas fluxo')) return 'fluxo';
  if (
    n.includes('pular') ||
    n.includes('skip') ||
    n === 'nao' ||
    n === 'não' ||
    n.includes('sem face') ||
    n.includes('depois')
  )
    return 'pular';
  return null;
}

function isCancelPdfContextMessage(message: string): boolean {
  const normalized = normalizeText(message);
  if (!normalized) return false;

  return [
    'cancelar contexto',
    'limpar contexto',
    'ignorar pdf',
    'descartar pdf',
    'resetar contexto',
  ].some((pattern) => normalized.includes(pattern));
}

function buildCreateClientActionFromRecord(rec: ParsedClientRecord, index: number): AssistantActionSuggestion {
  const label = rec.contactName || rec.companyName || `Cliente ${index + 1}`;
  return {
    id: `create-client-batch-${Date.now()}-${index}`,
    key: 'create_client',
    type: 'execute',
    kind: 'write',
    label: `Criar cliente – ${label}`,
    description: 'Cria o cliente a partir dos dados extraídos do arquivo.',
    requiresConfirmation: false,
    payload: {
      moduleKey: 'clients',
      createDto: {
        contactName: rec.contactName || undefined,
        companyName: rec.companyName || undefined,
        cnpj: rec.cnpj || undefined,
        email: rec.email || undefined,
        phone: rec.phone || undefined,
        addressCity: rec.addressCity || undefined,
        addressState: rec.addressState || undefined,
        addressStreet: rec.addressStreet || undefined,
        addressZipcode: rec.addressZipcode || undefined,
        status: rec.status || 'PROSPECT',
        origin: 'Importação PDF/planilha',
      },
    },
  };
}

function toOptionalString(value: unknown): string | null {
  const text = String(value || '').trim();
  return text || null;
}

function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const raw = sanitizeCoordinateText(String(value)).trim().replace(/[^\d,.-]/g, '');
  if (!raw) return null;

  let normalized = raw;
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = normalized.replace(',', '.');
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function hasPriceData(record: ParsedOutdoorRecord): boolean {
  return (
    toOptionalNumber(record.precoMensal ?? record.basePriceMonth) != null ||
    toOptionalNumber(record.precoSemanal ?? record.basePriceWeek) != null ||
    toOptionalNumber(record.precoDiario ?? record.basePriceDay) != null
  );
}

function countOutdoorsWithoutPrice(records: ParsedOutdoorRecord[]): number {
  return records.filter((record) => !hasPriceData(record)).length;
}

function resolveCommercialType(record: ParsedOutdoorRecord): 'Outdoor' | 'LED' | 'Front Light' | 'Outro' {
  const source = String(
    record.subcategoria || record.subcategory || record.tipo || record.type || record.nome || record.name || '',
  );
  const normalized = normalizeText(source).replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const compact = normalized.replace(/\s+/g, '');

  if (
    normalized.includes('front light') ||
    compact.includes('frontlight') ||
    compact.includes('frontlite') ||
    compact === 'front'
  ) {
    return 'Front Light';
  }

  if (
    compact.includes('outdoor') ||
    compact.includes('outdfoor') ||
    compact.includes('outdor') ||
    compact.includes('outdooor')
  ) {
    return 'Outdoor';
  }

  if (compact.includes('led') || compact.includes('paineldigital') || compact.includes('digital') || compact === 'dooh') {
    return 'LED';
  }

  if (compact === 'ooh') {
    return 'Outdoor';
  }

  return 'Outro';
}

function buildTypeBreakdownFromRecords(records: ParsedOutdoorRecord[]): {
  outdoor: number;
  led: number;
  frontLight: number;
  other: number;
} {
  const breakdown = {
    outdoor: 0,
    led: 0,
    frontLight: 0,
    other: 0,
  };

  for (const record of records) {
    const type = resolveCommercialType(record);
    if (type === 'Outdoor') breakdown.outdoor += 1;
    else if (type === 'LED') breakdown.led += 1;
    else if (type === 'Front Light') breakdown.frontLight += 1;
    else breakdown.other += 1;
  }

  return breakdown;
}

function buildFallbackExtractionMetrics(records: ParsedOutdoorRecord[]) {
  return {
    withName: records.filter((record) => !!toOptionalString(record.nome || record.name || record.label)).length,
    withType: records.filter((record) => resolveCommercialType(record) !== 'Outro').length,
    withCity: records.filter((record) => !!toOptionalString(record.cidade || record.addressCity)).length,
    withState: records.filter((record) => !!normalizeStateCode(record.estado || record.addressState)).length,
    withCoordinates: records.filter(
      (record) => toOptionalNumber(record.latitude) != null && toOptionalNumber(record.longitude) != null,
    ).length,
    withImpacts: records.filter((record) => toOptionalNumber(record.impactosDia ?? record.dailyImpressions) != null).length,
    withMonthlyPrice: records.filter((record) => toOptionalNumber(record.precoMensal ?? record.basePriceMonth) != null).length,
    withMediaKit: records.filter((record) => {
      const raw = record.midiaKit ?? record.showInMediaKit;
      if (typeof raw === 'boolean') return raw;
      return ['sim', 'true', '1', 'yes'].includes(normalizeText(String(raw || '')));
    }).length,
  };
}

function formatTypeDistribution(typeBreakdown: {
  outdoor?: number;
  led?: number;
  frontLight?: number;
  other?: number;
}): string {
  const parts = [
    Number(typeBreakdown.frontLight || 0) > 0 ? `${typeBreakdown.frontLight} Front Light` : null,
    Number(typeBreakdown.outdoor || 0) > 0 ? `${typeBreakdown.outdoor} Outdoor` : null,
    Number(typeBreakdown.led || 0) > 0 ? `${typeBreakdown.led} LED` : null,
    Number(typeBreakdown.other || 0) > 0 ? `${typeBreakdown.other} outros` : null,
  ].filter(Boolean) as string[];

  return parts.join(', ');
}

function buildFallbackMissingHighlights(records: ParsedOutdoorRecord[]): string[] {
  const total = records.length;
  if (total === 0) {
    return ['Nenhum ponto confiável foi extraído automaticamente.'];
  }

  const missing: string[] = [];
  const withoutPrice = countOutdoorsWithoutPrice(records);
  if (withoutPrice === total) {
    missing.push('Nenhum preço mensal foi encontrado.');
  } else if (withoutPrice > 0) {
    missing.push(`${withoutPrice} ponto(s) sem preço mensal.`);
  }

  const withoutCoordinates = records.filter(
    (record) => toOptionalNumber(record.latitude) == null || toOptionalNumber(record.longitude) == null,
  ).length;
  if (withoutCoordinates > 0) {
    missing.push(`${withoutCoordinates} ponto(s) sem coordenadas completas.`);
  }

  const withoutCity = records.filter((record) => !toOptionalString(record.cidade || record.addressCity)).length;
  if (withoutCity > 0) {
    missing.push(`${withoutCity} ponto(s) sem cidade identificada.`);
  }

  return missing.length ? missing : ['Sem pendências críticas nos campos obrigatórios.'];
}

function buildUploadAnalysisMessage(params: {
  analysis?: InventoryExtractionAnalysis | null;
  records: ParsedOutdoorRecord[];
  warning?: string | null;
}): string {
  const records = Array.isArray(params.records) ? params.records : [];
  const fallbackMetrics = buildFallbackExtractionMetrics(records);
  const total = Number.isFinite(Number(params.analysis?.totalPoints))
    ? Number(params.analysis?.totalPoints)
    : records.length;

  const typeBreakdown = params.analysis?.typeBreakdown || buildTypeBreakdownFromRecords(records);
  const extracted = params.analysis?.extracted || fallbackMetrics;
  const missingHighlights = Array.isArray(params.analysis?.missingHighlights) && params.analysis?.missingHighlights.length
    ? params.analysis?.missingHighlights
    : buildFallbackMissingHighlights(records);

  const contentTypes = Array.isArray(params.analysis?.detectedContentTypes)
    ? params.analysis?.detectedContentTypes.filter((item) => !!String(item || '').trim())
    : [];

  const distribution = formatTypeDistribution(typeBreakdown);
  const overview = String(params.analysis?.overview || '').trim();
  const extractedSummary = [
    `${extracted.withName ?? 0}/${total} com nome`,
    `${extracted.withType ?? 0}/${total} com tipo`,
    `${extracted.withCity ?? 0}/${total} com cidade`,
    `${extracted.withState ?? 0}/${total} com UF`,
    `${extracted.withCoordinates ?? 0}/${total} com latitude/longitude`,
    `${extracted.withMonthlyPrice ?? 0}/${total} com preço mensal`,
    `${extracted.withImpacts ?? 0}/${total} com impactos/dia`,
    `${extracted.withMediaKit ?? 0}/${total} com mídia kit`,
  ].join('; ');

  const nextAction = String(params.analysis?.nextAction || '').trim() ||
    (total > 0
      ? 'Diga **"quero"** para cadastrar um por um (você pode completar campos faltantes em cada etapa), ou **"sim para todos"** para cadastrar todos automaticamente em lote.'
      : 'Envie Nome, Cidade/UF, Latitude e Longitude (ou tabela) para eu montar o cadastro assistido.');

  return [
    overview || `Extraí ${total} ponto(s)${distribution ? ` (${distribution})` : ''}.`,
    `Quantidade de pontos encontrados: ${total}${distribution ? ` (${distribution})` : ''}.`,
    `O que foi possível extrair: ${extractedSummary}.${contentTypes.length ? ` Tipos de conteúdo detectados: ${contentTypes.join(', ')}.` : ''}`,
    `O que está faltando: ${missingHighlights.join(' ')}`,
    `Próxima ação sugerida: ${nextAction}`,
    params.warning ? `Observação técnica: ${String(params.warning).trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function hasDefinedMediaKitPreference(record: ParsedOutdoorRecord): boolean {
  const raw = record.midiaKit ?? record.showInMediaKit;
  if (typeof raw === 'boolean') return true;
  const normalized = normalizeText(String(raw ?? ''));
  return ['sim', 'nao', 'não', 'true', 'false', '1', '0', 'yes', 'no'].includes(normalized);
}

function extractOutdoorMissingDetails(record: ParsedOutdoorRecord): string[] {
  const missing: string[] = [];

  if (!toOptionalString(record.nome || record.name || record.label)) {
    missing.push('nome');
  }

  if (!toOptionalString(record.tipo || record.type)) {
    missing.push('tipo');
  }

  if (!toOptionalString(record.subcategoria || record.subcategory)) {
    missing.push('subcategoria');
  }

  if (!toOptionalString(record.cidade || record.addressCity)) {
    missing.push('cidade');
  }

  if (!normalizeStateCode(record.estado || record.addressState)) {
    missing.push('UF');
  }

  if (toOptionalNumber(record.latitude) == null || toOptionalNumber(record.longitude) == null) {
    missing.push('latitude/longitude');
  }

  if (!toOptionalString(record.endereco || record.addressStreet)) {
    missing.push('endereco');
  }

  if (toOptionalNumber(record.impactosDia ?? record.dailyImpressions) == null) {
    missing.push('impactos por dia');
  }

  const hasAnyPrice =
    toOptionalNumber(record.precoMensal ?? record.basePriceMonth) != null ||
    toOptionalNumber(record.precoSemanal ?? record.basePriceWeek) != null ||
    toOptionalNumber(record.precoDiario ?? record.basePriceDay) != null;

  if (!hasAnyPrice) {
    missing.push('preco (mensal/semanal/diario)');
  }

  if (!hasDefinedMediaKitPreference(record)) {
    missing.push('exibir no midia kit');
  }

  if (!toOptionalString(record.environment)) {
    missing.push('ambiente');
  }

  if (!Array.isArray(record.socialClasses) || record.socialClasses.length === 0) {
    missing.push('classes sociais');
  }

  return missing;
}

function resolveOutdoorLabel(record: ParsedOutdoorRecord, fallbackIndex: number): string {
  const directName = toOptionalString(record.nome || record.name || record.label);
  if (directName) return directName;

  const city = toOptionalString(record.cidade || record.addressCity);
  const state = normalizeStateCode(record.estado || record.addressState);

  if (city && state) {
    return `Item ${fallbackIndex} (${city}/${state})`;
  }

  return `Item ${fallbackIndex}`;
}

function buildBulkCompletionReport(entries: OutdoorCompletionAuditEntry[], expectedTotal: number): string {
  const processedCount = entries.length;
  const total = expectedTotal > 0 ? expectedTotal : processedCount;
  const header = `Relatorio final do cadastro: ${processedCount}/${total} item(ns) processados.`;

  if (!processedCount) {
    return `${header}\nNenhum item foi confirmado nesta execucao.`;
  }

  const withMissing = entries.filter((entry) => entry.missingFields.length > 0);
  const withoutMissing = processedCount - withMissing.length;

  const maxLines = 40;
  const lines = entries
    .slice(0, maxLines)
    .map((entry) =>
      entry.missingFields.length
        ? `- ${entry.outdoorLabel}: faltou ${entry.missingFields.join(', ')}`
        : `- ${entry.outdoorLabel}: sem pendencias`,
    );

  const overflow =
    entries.length > maxLines
      ? `\n- ... e mais ${entries.length - maxLines} item(ns).`
      : '';

  return [
    header,
    `Resumo: ${withoutMissing} item(ns) completos e ${withMissing.length} com pendencias.`,
    'Detalhes por outdoor:',
    `${lines.join('\n')}${overflow}`,
  ].join('\n');
}

function readActionExecutionMeta(data: any): ActionExecutionMeta | null {
  const raw = data?.actionExecution?.meta;
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  return raw as ActionExecutionMeta;
}

function normalizeStateCode(value?: string | null): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const normalized = normalizeText(raw).replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  if (BRAZILIAN_STATE_ALIASES[normalized]) {
    return BRAZILIAN_STATE_ALIASES[normalized];
  }

  const lettersOnly = normalized.replace(/[^a-z]/g, '');
  if (BRAZILIAN_STATE_ALIASES[lettersOnly]) {
    return BRAZILIAN_STATE_ALIASES[lettersOnly];
  }

  return /^[a-z]{2}$/.test(lettersOnly) ? lettersOnly.toUpperCase() : null;
}

function extractStateFromMessage(message: string): string | null {
  const sanitized = sanitizeCoordinateText(message);
  const explicit = message.match(
    /\b(?:estado|uf)\s*[:=-]?\s*([A-Za-zÀ-ÿ.\s]{2,40}?)(?=$|\s*(?:[,;])|\s+(?:lat|lng|lon|long|latitude|longitude|com|para|tipo)\b)/i,
  );
  const explicitCode = normalizeStateCode(explicit?.[1]);
  if (explicitCode) {
    return explicitCode;
  }

  const leadingBeforeCoordinates = sanitized.match(
    /^\s*([A-Za-zÀ-ÿ.\s]{2,40})(?=\s+-?\d{1,2}(?:[\.,]\d+)?\s*[,;]\s*-?\d{1,3}(?:[\.,]\d+)?\b)/i,
  );
  const leadingCode = normalizeStateCode(leadingBeforeCoordinates?.[1]);
  if (leadingCode) {
    return leadingCode;
  }

  const wholeMessageCode = normalizeStateCode(message);
  if (wholeMessageCode) {
    return wholeMessageCode;
  }

  const tokenMatch = message.match(/\b([A-Za-z]{2})\b/);
  return normalizeStateCode(tokenMatch?.[1]);
}

function extractCoordinatesFromMessage(message: string): { latitude: number | null; longitude: number | null } {
  const sanitized = sanitizeCoordinateText(message);
  const latitudeLabeled = sanitized.match(/(?:lat(?:itude)?)\s*[:=-]?\s*(-?\d{1,2}(?:[\.,]\d+)?)/i);
  const longitudeLabeled = sanitized.match(/(?:lng|lon(?:gitude)?|long)\s*[:=-]?\s*(-?\d{1,3}(?:[\.,]\d+)?)/i);

  let latitude = toOptionalNumber(latitudeLabeled?.[1]);
  let longitude = toOptionalNumber(longitudeLabeled?.[1]);

  if (latitude == null || longitude == null) {
    const pairMatch = sanitized.match(/(-?\d{1,2}(?:[\.,]\d+)?)\s*[,;]\s*(-?\d{1,3}(?:[\.,]\d+)?)/);
    if (pairMatch) {
      latitude = latitude ?? toOptionalNumber(pairMatch[1]);
      longitude = longitude ?? toOptionalNumber(pairMatch[2]);
    }
  }

  if (latitude != null && (latitude < -90 || latitude > 90)) latitude = null;
  if (longitude != null && (longitude < -180 || longitude > 180)) longitude = null;

  return { latitude, longitude };
}

function extractCityStateFromMessage(message: string): { city: string | null; state: string | null } {
  const normalizedMessage = String(message || '').trim();
  const namedSlashMatch = message.match(/\b(?:em|na cidade de|cidade)\s+([A-Za-zÀ-ÿ\s]{2,80})\s*\/\s*([A-Za-zÀ-ÿ.\s]{2,40})\b/i);
  if (namedSlashMatch) {
    return {
      city: toOptionalString(namedSlashMatch[1]),
      state: normalizeStateCode(namedSlashMatch[2]),
    };
  }

  const namedCommaMatch = message.match(/\b(?:em|na cidade de|cidade)\s+([A-Za-zÀ-ÿ\s]{2,80})\s*,\s*([A-Za-zÀ-ÿ.\s]{2,40})\b/i);
  if (namedCommaMatch) {
    return {
      city: toOptionalString(namedCommaMatch[1]),
      state: normalizeStateCode(namedCommaMatch[2]),
    };
  }

  const slashMatch = message.match(/^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{1,80})\s*\/\s*([A-Za-zÀ-ÿ.\s]{2,40})\b/i);
  if (slashMatch) {
    return {
      city: toOptionalString(slashMatch[1]),
      state: normalizeStateCode(slashMatch[2]),
    };
  }

  const commaMatch = message.match(/^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{1,80})\s*,\s*([A-Za-zÀ-ÿ.\s]{2,40})\b/i);
  if (commaMatch) {
    return {
      city: toOptionalString(commaMatch[1]),
      state: normalizeStateCode(commaMatch[2]),
    };
  }

  const cityBeforeCoordinatesMatch = normalizedMessage.match(
    /^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'\-\s]{1,80}?)\s*(?:-|–|—|,|;)\s*[\-\u2212\u2012\u2013\u2014]?\d{1,2}(?:[\.,]\d+)?\s*[,;]\s*[\-\u2212\u2012\u2013\u2014]?\d{1,3}(?:[\.,]\d+)?\s*$/i,
  );
  if (cityBeforeCoordinatesMatch) {
    return {
      city: toOptionalString(cityBeforeCoordinatesMatch[1]),
      state: extractStateFromMessage(message),
    };
  }

  const explicitCityMatch = message.match(/\b(?:cidade|municipio|município)\s*[:=-]\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'\-\s]{1,80})(?=$|\s+(?:uf|estado|lat|lng|lon|long|latitude|longitude)\b)/i);
  if (explicitCityMatch) {
    return {
      city: toOptionalString(explicitCityMatch[1]),
      state: extractStateFromMessage(message),
    };
  }

  const cityNamed = message.match(/\b(?:cidade|em|na cidade de)\s+([A-Za-zÀ-ÿ\s]{2,80})(?=$|\s+(?:com|para|tipo|lat|lng|lon|long|latitude|longitude)\b)/i);

  if (cityNamed) {
    return {
      city: toOptionalString(cityNamed?.[1]),
      state: extractStateFromMessage(message),
    };
  }

  const standaloneCityMatch = normalizedMessage.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'\-\s]{1,80})$/i);
  const normalizedStandalone = normalizeText(standaloneCityMatch?.[1] || '');
  const isAffirmationOrControl = [
    'sim',
    'nao',
    'não',
    'ok',
    'okay',
    'certo',
    'beleza',
    'blz',
    'perfeito',
    'entendi',
    'obrigado',
    'valeu',
    'confirmar',
    'confirmo',
    'cancelar',
    'continuar',
    'continue',
    'quero',
    'proximo',
    'próximo',
  ].includes(normalizedStandalone);
  const isStateOnly = !!normalizeStateCode(normalizedMessage);
  if (standaloneCityMatch && !isAffirmationOrControl && !isStateOnly) {
    return {
      city: toOptionalString(standaloneCityMatch[1]),
      state: extractStateFromMessage(message),
    };
  }

  return {
    city: null,
    state: extractStateFromMessage(message),
  };
}

function mergePendingOutdoorContextWithUserInput(outdoor: ParsedOutdoorRecord, userMessage: string): ParsedOutdoorRecord {
  const cityState = extractCityStateFromMessage(userMessage);
  const coordinates = extractCoordinatesFromMessage(userMessage);

  const merged: ParsedOutdoorRecord = { ...outdoor };

  if (cityState.city) {
    merged.cidade = cityState.city;
    merged.addressCity = cityState.city;
  }

  if (cityState.state) {
    merged.estado = cityState.state;
    merged.addressState = cityState.state;
  }

  if (coordinates.latitude != null) {
    merged.latitude = coordinates.latitude;
  }

  if (coordinates.longitude != null) {
    merged.longitude = coordinates.longitude;
  }

  return merged;
}

function buildAssistantDocumentContext(
  sourceType: UploadSourceType | null,
  pendingOutdoors: ParsedOutdoorRecord[],
  totalRecords: number,
): AssistantDocumentContext | null {
  const activeRecord = pendingOutdoors[0] || null;
  if (!activeRecord) return null;

  return {
    sourceType: sourceType || undefined,
    totalRecords: totalRecords > 0 ? totalRecords : pendingOutdoors.length,
    remainingRecords: pendingOutdoors.length,
    activeRecord,
  };
}

function getBackendErrorMessage(error: any): string | null {
  if (Array.isArray(error?.response?.data?.message)) {
    return error.response.data.message.join(' ');
  }

  if (typeof error?.response?.data?.message === 'string') {
    return error.response.data.message;
  }

  return null;
}

function shouldRetryAssistantWithoutDocumentContext(error: any): boolean {
  const message = normalizeText(getBackendErrorMessage(error));
  return message.includes('property documentcontext should not exist');
}

function formatLegacyDocumentContextMessage(
  originalMessage: string,
  documentContext: AssistantDocumentContext,
): string {
  const activeRecord = documentContext.activeRecord || {};
  const preferredIntent = isAffirmativeMessage(originalMessage) || isContinuePdfContextMessage(originalMessage)
    ? 'Quero cadastrar automaticamente o item atual do arquivo.'
    : originalMessage.trim();

  const orderedFields: Array<[string, unknown]> = [
    ['Nome', activeRecord.nome || activeRecord.name || activeRecord.label],
    ['Tipo', activeRecord.tipo || activeRecord.type],
    ['Subcategoria', activeRecord.subcategoria || activeRecord.subcategory],
    ['Cidade', activeRecord.cidade || activeRecord.addressCity],
    ['Estado', activeRecord.estado || activeRecord.addressState],
    ['Endereco', activeRecord.endereco || activeRecord.addressStreet],
    ['Numero', activeRecord.addressNumber],
    ['Bairro', activeRecord.addressDistrict],
    ['CEP', activeRecord.addressZipcode],
    ['Pais', activeRecord.addressCountry],
    ['Latitude', activeRecord.latitude],
    ['Longitude', activeRecord.longitude],
    ['Ambiente', activeRecord.environment],
    ['Classes sociais', Array.isArray(activeRecord.socialClasses) ? activeRecord.socialClasses.join(', ') : activeRecord.socialClasses],
    ['Impactos por dia', activeRecord.impactosDia || activeRecord.dailyImpressions],
    ['Preco mensal', activeRecord.precoMensal || activeRecord.basePriceMonth],
    ['Preco semanal', activeRecord.precoSemanal || activeRecord.basePriceWeek],
    ['Preco diario', activeRecord.precoDiario || activeRecord.basePriceDay],
    ['Exibir no midia kit', activeRecord.midiaKit || activeRecord.showInMediaKit],
    ['Face ou tela', activeRecord.faceLabel],
    ['Orientacao', activeRecord.orientation],
    ['Largura em metros', activeRecord.widthM],
    ['Altura em metros', activeRecord.heightM],
    ['Insercoes por dia', activeRecord.insertionsPerDay],
    ['Resolucao largura px', activeRecord.resolutionWidthPx],
    ['Resolucao altura px', activeRecord.resolutionHeightPx],
  ];

  const recordLines = orderedFields
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => `${label}: ${String(value)}`);

  return [
    preferredIntent || 'Quero cadastrar automaticamente o item atual do arquivo.',
    '',
    'Considere este contexto estruturado extraido do arquivo enviado:',
    `Origem do arquivo: ${documentContext.sourceType || 'arquivo'}`,
    documentContext.totalRecords ? `Total de registros no arquivo: ${documentContext.totalRecords}` : null,
    documentContext.remainingRecords ? `Registros restantes na fila: ${documentContext.remainingRecords}` : null,
    ...recordLines,
  ]
    .filter(Boolean)
    .join('\n');
}

function findLatestConfirmableWriteAction(messages: Message[]): AssistantActionSuggestion | null {
  const latestAssistantMessage = [...messages].reverse().find((message) => message.type === 'ai');
  if (!latestAssistantMessage || !Array.isArray(latestAssistantMessage.actions) || !latestAssistantMessage.actions.length) {
    return null;
  }

  return (
    latestAssistantMessage.actions.find((item) => item.kind === 'write' && !!item.requiresConfirmation) || null
  );
}

function dataPointToneClass(tone?: string): string {
  switch (tone) {
    case 'warning':
      return 'text-amber-700';
    case 'success':
      return 'text-emerald-700';
    case 'error':
      return 'text-rose-700';
    case 'neutral':
      return 'text-slate-600';
    default:
      return 'text-gray-600';
  }
}

const NEW_MEDIA_POINTS_STORAGE_KEY = 'ONE_MEDIA_NEW_MEDIA_POINTS_V1';

/** Chave de armazenamento isolada por usuário para evitar contaminação entre contas. */
function getAssistantStorageKey(userId?: string): string {
  const uid = userId && userId !== 'anon' ? userId : (() => {
    try {
      const token = window.localStorage.getItem('access_token');
      if (!token) return 'anon';
      const b64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
      if (!b64) return 'anon';
      const payload = JSON.parse(atob(b64));
      return String(payload?.sub || payload?.id || payload?.userId || 'anon');
    } catch {
      return 'anon';
    }
  })();
  return `onemedia:assistant:messages:v2:${uid}`;
}

function buildDefaultAssistantMessage(): Message {
  return {
    id: '1',
    type: 'ai',
    content:
      'Envie um PDF, CSV ou até texto com seus pontos de mídia. Eu consigo interpretar mesmo que não esteja perfeitamente organizado e posso cadastrar tudo automaticamente para você.',
    timestamp: new Date(),
  };
}

function loadPersistedAssistantMessages(userId?: string): Message[] {
  const fallback = [buildDefaultAssistantMessage()];

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(getAssistantStorageKey(userId));
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return fallback;
    }

    const hydrated = parsed
      .filter((item) => item && (item.type === 'user' || item.type === 'ai') && typeof item.content === 'string')
      .map((item, index) => {
        const timestamp = new Date(item.timestamp);
        const safeTimestamp = Number.isNaN(timestamp.getTime()) ? new Date() : timestamp;

        return {
          id: String(item.id || `restored-${index}`),
          type: item.type,
          content: item.content,
          timestamp: safeTimestamp,
          actions: Array.isArray(item.actions) ? item.actions : undefined,
          dataPoints: Array.isArray(item.dataPoints) ? item.dataPoints : undefined,
          source: item.source ? String(item.source) : undefined,
          dedupeKey: item.dedupeKey ? String(item.dedupeKey) : undefined,
        } as Message;
      });

    return hydrated.length ? hydrated : fallback;
  } catch {
    return fallback;
  }
}

export function AIAssistant({ isOpen, onClose, pendingMessage, userId }: AIAssistantProps) {
  const navigate = useNavigation();
  const [sessionStartedAt] = useState<Date>(() => new Date());
  const [messages, setMessages] = useState<Message[]>(() => loadPersistedAssistantMessages(userId));

  // Quando o userId muda (troca de conta), recarrega o histórico isolado do novo usuário
  const prevUserIdRef = useRef<string | undefined>(userId);
  useEffect(() => {
    if (prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;
    setMessages(loadPersistedAssistantMessages(userId));
  }, [userId]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingPdfOutdoors, setPendingPdfOutdoors] = useState<ParsedOutdoorRecord[]>([]);
  const [pendingAssistedUploadContext, setPendingAssistedUploadContext] =
    useState<PendingAssistedUploadContext | null>(null);
  const [pendingUploadSourceType, setPendingUploadSourceType] = useState<UploadSourceType | null>(null);
  const [pendingUploadTotalCount, setPendingUploadTotalCount] = useState(0);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  // formulário inline por mensagem: messageId → { fieldKey → string | string[] }
  const [messageFormValues, setMessageFormValues] = useState<Record<string, Record<string, string | string[]>>>({});
  // arquivo de foto anexado por mensagem (face step inline image picker)
  const messageFileRefs = useRef<Record<string, File>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkRegisterAllRef = useRef(false);
  const bulkProcessedCountRef = useRef(0);
  const pendingPdfOutdoorsRef = useRef<ParsedOutdoorRecord[]>(pendingPdfOutdoors);
  const bulkCompletionAuditRef = useRef<OutdoorCompletionAuditEntry[]>([]);
  const bulkExpectedTotalRef = useRef(0);

  const [pendingClientRecords, setPendingClientRecords] = useState<ParsedClientRecord[]>([]);
  const pendingClientRecordsRef = useRef<ParsedClientRecord[]>([]);
  const updatePendingClientRecords = (next: ParsedClientRecord[]) => {
    pendingClientRecordsRef.current = next;
    setPendingClientRecords(next);
  };

  // Face step: aguardando label/tipo de face ou imagem para um ponto recém-criado
  const [awaitingFaceStep, setAwaitingFaceStep] = useState<AwaitingFaceStep | null>(null);
  const awaitingFaceStepRef = useRef<AwaitingFaceStep | null>(null);
  const updateAwaitingFaceStep = (next: AwaitingFaceStep | null) => {
    awaitingFaceStepRef.current = next;
    setAwaitingFaceStep(next);
  };

  // Modo bulk‑all: cadastra todos sem pedir confirmação item por item
  const bulkAllClientsRef = useRef(false);
  const bulkAllPointsRef = useRef(false);

  // Foto da face capturada durante o passo de face (enviada junto com a instrução)
  const pendingFaceImageRef = useRef<File | null>(null);

  // Segunda face pendente após cadastrar a primeira (quando escolhe "Ambas")
  const pendingSecondFaceRef = useRef<{ mediaPointId: string; mediaPointName: string; continueQueueAfter: boolean } | null>(null);

  // Modo "Tudo": cadastra sem pausar para face step
  const bulkAllNoFaceRef = useRef(false);

  const updatePendingPdfOutdoors = (nextQueue: ParsedOutdoorRecord[]) => {
    pendingPdfOutdoorsRef.current = nextQueue;
    setPendingPdfOutdoors(nextQueue);
  };

  /** Retorna os campos inline padrão para mensagens de progresso entre pontos. */
  const buildProgressInlineFields = (pointType?: 'OOH' | 'DOOH'): InlineFieldSpec[] => [
    {
      key: 'subcategory',
      label: 'Subcategoria (opcional)',
      type: 'select',
      options: pointType === 'DOOH' ? DOOH_SUBCATEGORIES : OOH_SUBCATEGORIES,
    },
    {
      key: 'environment',
      label: 'Ambiente (opcional)',
      type: 'select',
      options: ENVIRONMENTS,
    },
    {
      key: 'socialClasses',
      label: 'Classes sociais atendidas (opcional)',
      type: 'multiselect',
      options: ['A', 'B', 'C', 'D', 'E'],
    },
  ];

  const resetBulkCompletionAudit = () => {
    bulkCompletionAuditRef.current = [];
    bulkExpectedTotalRef.current = 0;
  };

  const assistantPanelStyle = {
    right: '2rem',
    bottom: 'calc(max(1.5rem, env(safe-area-inset-bottom)) + 4.75rem)',
    zIndex: 2147483646,
    width: 'min(380px, calc(100vw - 1.5rem))',
    height: 'min(560px, 72vh)',
    minHeight: '420px',
  } as const;

  const assistantShellStyle = {
    height: '100%',
    borderRadius: '1rem',
    border: '1px solid #3b82f6',
    backgroundColor: '#f8fafc',
    boxShadow: '0 24px 56px rgba(15, 23, 42, 0.35)',
    overflow: 'hidden',
  } as const;

  const assistantHeaderStyle = {
    background: 'linear-gradient(135deg, #2563eb 0%, #0f172a 100%)',
    color: '#f8fafc',
    borderBottomColor: '#1d4ed8',
  } as const;

  const buildScreenContext = (overrideModule?: string) => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/app/home';
    const currentTitle = typeof document !== 'undefined' ? document.title : undefined;
    const currentModule = overrideModule || inferCurrentModule(pathname);

    return {
      currentModule,
      currentPath: pathname,
      currentTitle,
      selectedEntityType: undefined,
      selectedEntityId: undefined,
      selectedEntityLabel: undefined,
    };
  };

  const executeAssistantAction = async (
    action: AssistantActionSuggestion,
    options?: ExecuteAssistantActionOptions,
  ) => {
    if (action.type === 'navigate' && action.targetPath) {
      if (options?.userMessage) {
        const userMessage: Message = {
          id: Date.now().toString(),
          type: 'user',
          content: options.userMessage,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      navigate(action.targetPath);

      const aiMessage: Message = {
        id: String(Date.now() + 1),
        type: 'ai',
        content: `Abrindo ${action.label.replace(/^Abrir\s+/i, '').trim() || 'módulo solicitado'}.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      return;
    }

    let confirmed = true;

    if (action.requiresConfirmation && !options?.skipConfirmDialog) {
      const title = action.confirmationTitle || 'Confirmar ação';
      const message = action.confirmationMessage || 'Confirma a execução desta ação?';
      confirmed = window.confirm(`${title}\n\n${message}`);
      if (!confirmed) {
        return;
      }
    }

    if (options?.userMessage) {
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: options.userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
    }

    setIsLoading(true);
    setExecutingActionId(action.id);

    try {
      const { data } = await apiClient.post('/assistant/actions/execute', {
        action,
        confirmed,
        screenContext: buildScreenContext(action.targetModule || undefined),
      });

      const reply = data?.reply;

      const aiMessage: Message = {
        id: String(Date.now() + 1),
        type: 'ai',
        content: reply?.content || 'Ação executada.',
        timestamp: new Date(),
        actions: Array.isArray(reply?.actions) ? reply.actions : [],
        dataPoints: Array.isArray(reply?.dataPoints) ? reply.dataPoints : [],
      };

      setMessages((prev) => [...prev, aiMessage]);

      const executionStatus = String(data?.actionExecution?.status || '').toLowerCase();
      const executionMeta = readActionExecutionMeta(data);

      if (action.key === 'create_media_point' && executionStatus === 'completed' && typeof window !== 'undefined') {
        if (executionMeta?.entityType === 'media_point' && executionMeta.created && executionMeta.entityId) {
          try {
            const raw = window.localStorage.getItem(NEW_MEDIA_POINTS_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            const existingIds = Array.isArray(parsed)
              ? parsed.map((value) => String(value || '').trim()).filter(Boolean)
              : [];
            const merged = Array.from(new Set([...existingIds, String(executionMeta.entityId)]));
            window.localStorage.setItem(NEW_MEDIA_POINTS_STORAGE_KEY, JSON.stringify(merged));
          } catch {
            // Ignore localStorage write failures.
          }

          window.dispatchEvent(
            new CustomEvent('assistant:media-point-created', {
              detail: {
                id: executionMeta.entityId,
                name: executionMeta.entityName || null,
              },
            }),
          );
        }

        window.dispatchEvent(new Event('inventory:refresh'));
      }

      if (executionStatus === 'completed') {
        setMessages((prev) =>
          prev.map((message) => {
            if (!Array.isArray(message.actions) || !message.actions.length) {
              return message;
            }

            const filteredActions = message.actions.filter((item) => item.id !== action.id);
            if (filteredActions.length === message.actions.length) {
              return message;
            }

            return {
              ...message,
              actions: filteredActions,
            };
          }),
        );
      }

      if (action.key === 'create_media_point' && executionStatus === 'completed') {
        const activeQueue =
          Array.isArray(options?.queueSnapshot) && options.queueSnapshot.length > 0
            ? options.queueSnapshot
            : pendingPdfOutdoorsRef.current;

        bulkProcessedCountRef.current += 1;

        const processedRecord = activeQueue[0] || null;
        if (processedRecord) {
          bulkCompletionAuditRef.current.push({
            outdoorLabel: resolveOutdoorLabel(processedRecord, bulkProcessedCountRef.current),
            missingFields: extractOutdoorMissingDetails(processedRecord),
          });
        }

        const remaining = activeQueue.slice(1);

        // Determina o tipo do ponto para decidir quais faces oferecer
        const rawType = String(processedRecord?.tipo || processedRecord?.type || 'OOH').toUpperCase();
        const isDooh = rawType === 'DOOH' || rawType.includes('DIGITAL') || rawType === 'LED';
        const pointType: AwaitingFaceStep['mediaPointType'] = isDooh ? 'DOOH' : 'OOH';

        const createdId = executionMeta?.entityId;
        const createdName = executionMeta?.entityName || processedRecord
          ? resolveOutdoorLabel(processedRecord!, bulkProcessedCountRef.current)
          : 'Ponto cadastrado';

        // Pausa o bulk durante o passo de face (retomamos depois)
        const wasBulkAll = bulkAllPointsRef.current;

        if (createdId) {
          // No modo "Tudo" pula o face step e segue direto para o próximo ponto
          if (bulkAllNoFaceRef.current) {
            updatePendingPdfOutdoors(remaining);
            if (remaining.length > 0) {
              await sendMessage('quero', undefined, {
                silentUserMessage: true,
                overridePendingOutdoors: remaining,
                forceUploadContext: true,
                isBulkAutoRun: true,
              });
            } else {
              // último ponto — exibe relatório
              const bulkProcessedCount = bulkProcessedCountRef.current;
              bulkAllPointsRef.current = false;
              bulkAllNoFaceRef.current = false;
              bulkRegisterAllRef.current = false;
              bulkProcessedCountRef.current = 0;
              updatePendingPdfOutdoors([]);
              setPendingAssistedUploadContext(null);
              setPendingUploadSourceType(null);
              setPendingUploadTotalCount(0);

              const summaryMsg: Message = {
                id: String(Date.now() + 2),
                type: 'ai',
                content: `Cadastro em lote concluído. ${bulkProcessedCount} ponto(s) cadastrado(s).`,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, summaryMsg]);

              if (bulkCompletionAuditRef.current.length > 0) {
                const reportMsg: Message = {
                  id: String(Date.now() + 3),
                  type: 'ai',
                  content: buildBulkCompletionReport(
                    bulkCompletionAuditRef.current,
                    bulkExpectedTotalRef.current,
                  ),
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, reportMsg]);
              }
              resetBulkCompletionAudit();
            }
            return;
          }

          // Salva o estado restante mas não avança ainda — o passo de face vai avançar
          updatePendingPdfOutdoors(remaining);
          updateAwaitingFaceStep({
            mediaPointId: createdId,
            mediaPointName: createdName,
            mediaPointType: pointType,
            continueQueueAfter: remaining.length > 0,
          });

          const facePrompt = isDooh
            ? `Ponto **${createdName}** cadastrado! Deseja adicionar a tela principal?`
            : `Ponto **${createdName}** cadastrado! Deseja adicionar as faces?${remaining.length > 0 ? ` Restam **${remaining.length}** ponto(s) na fila.` : ''}`;

          const faceMessage: Message = {
            id: String(Date.now() + 2),
            type: 'ai',
            content: facePrompt,
            timestamp: new Date(),
            faceStepButtons: isDooh ? 'DOOH' : 'OOH',
            inlineFields: [
              { key: 'faceImage', label: 'Foto da face (opcional)', type: 'file-image' },
            ],
          };
          setMessages((prev) => [...prev, faceMessage]);
          return; // não avança a fila — o handler de face fará isso
        }

        // Se não temos entityId, segue o fluxo normalmente sem face step
        if (remaining.length > 0) {
          updatePendingPdfOutdoors(remaining);

          if (wasBulkAll || bulkRegisterAllRef.current) {
            await sendMessage('quero', undefined, {
              silentUserMessage: true,
              overridePendingOutdoors: remaining,
              forceUploadContext: true,
              isBulkAutoRun: true,
            });
            return;
          }

          const progressMessage: Message = {
            id: String(Date.now() + 2),
            type: 'ai',
            content: `Ponto cadastrado! Restam **${remaining.length}** ponto(s) na fila. Informe os campos opcionais abaixo para o próximo ponto e clique em **Próximo ponto**.`,
            timestamp: new Date(),
            quickReplies: [
              { label: '▶ Próximo ponto', value: '__next_with_optional_fields__' },
              { label: '✕ Parar', value: 'cancelar contexto' },
            ],
            inlineFields: buildProgressInlineFields(isDooh ? 'DOOH' : 'OOH'),
          };
          setMessages((prev) => [...prev, progressMessage]);
        } else {
          const finishedBulk = bulkRegisterAllRef.current || wasBulkAll;
          const bulkProcessedCount = bulkProcessedCountRef.current;

          bulkRegisterAllRef.current = false;
          bulkAllPointsRef.current = false;
          bulkProcessedCountRef.current = 0;

          updatePendingPdfOutdoors([]);
          setPendingAssistedUploadContext(null);
          setPendingUploadSourceType(null);
          setPendingUploadTotalCount(0);

          if (finishedBulk && bulkProcessedCount > 0) {
            const summaryMessage: Message = {
              id: String(Date.now() + 3),
              type: 'ai',
              content: `Cadastro em lote concluído. ${bulkProcessedCount} ponto(s) cadastrado(s).`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, summaryMessage]);
          }

          if (bulkCompletionAuditRef.current.length > 0) {
            const reportMessage: Message = {
              id: String(Date.now() + 4),
              type: 'ai',
              content: buildBulkCompletionReport(
                bulkCompletionAuditRef.current,
                bulkExpectedTotalRef.current,
              ),
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, reportMessage]);
          }

          resetBulkCompletionAudit();
        }
      }

      if (action.key === 'create_client' && executionStatus === 'completed') {
        const clientQueue = pendingClientRecordsRef.current;

        if (clientQueue.length > 1) {
          const remaining = clientQueue.slice(1);
          updatePendingClientRecords(remaining);

          if (bulkAllClientsRef.current) {
            // Modo bulk-all: avança automaticamente para o próximo
            const nextAction = buildCreateClientActionFromRecord(remaining[0], 0);
            await executeAssistantAction(nextAction, { skipConfirmDialog: true });
            return;
          }

          const progressMessage: Message = {
            id: String(Date.now() + 2),
            type: 'ai',
            content: `Cliente cadastrado. Restam ${remaining.length} cliente(s).`,
            timestamp: new Date(),
            quickReplies: [
              { label: '▶ Próximo cliente', value: 'quero' },
              { label: '✕ Parar', value: 'cancelar contexto' },
            ],
          };
          setMessages((prev) => [...prev, progressMessage]);
        } else {
          const wasBulkAll = bulkAllClientsRef.current;
          bulkAllClientsRef.current = false;
          updatePendingClientRecords([]);
          const doneMessage: Message = {
            id: String(Date.now() + 2),
            type: 'ai',
            content: wasBulkAll
              ? 'Todos os clientes do arquivo foram cadastrados em lote. Acesse o módulo de Clientes para revisar os registros.'
              : 'Todos os clientes do arquivo foram cadastrados. Acesse o módulo de Clientes para revisar os registros.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, doneMessage]);
        }
      }

      // Após cadastrar uma face/tela: faz upload da foto pendente e continua a fila de pontos
      if (action.key === 'create_media_unit' && executionStatus === 'completed') {
        // Upload da foto se o usuário enviou uma junto com a instrução de face
        if (pendingFaceImageRef.current && executionMeta?.entityId) {
          try {
            const imgForm = new FormData();
            imgForm.append('file', pendingFaceImageRef.current);
            await apiClient.post(`/media-units/${executionMeta.entityId}/image`, imgForm);
          } catch {
            // Ignora falha no upload da foto — a face já foi criada
          }
          pendingFaceImageRef.current = null;
        }

        // Se esta ação veio do passo de face do chat
        if (action.id?.startsWith('face-step-')) {
          // Verifica se há uma segunda face pendente (quando o usuário escolheu "Ambas")
          const secondFace = pendingSecondFaceRef.current;
          if (secondFace) {
            pendingSecondFaceRef.current = null;
            // Registra a 2ª face como awaitingFaceStep (Contra-Fluxo)
            updateAwaitingFaceStep({
              mediaPointId: secondFace.mediaPointId,
              mediaPointName: secondFace.mediaPointName,
              mediaPointType: 'OOH',
              continueQueueAfter: secondFace.continueQueueAfter,
            });
            const secondFaceMsg: Message = {
              id: String(Date.now() + 2),
              type: 'ai',
              content: `Face Fluxo cadastrada! Agora, adicione a **Face Contra-Fluxo** de **${secondFace.mediaPointName}**. Anexe a foto e clique em Cadastrar, ou pule.`,
              timestamp: new Date(),
              faceStepButtons: 'OOH_CONTRA_FLUXO',
              inlineFields: [{ key: 'faceImage', label: 'Foto da Face Contra-Fluxo (opcional)', type: 'file-image' }],
            };
            setMessages((prev) => [...prev, secondFaceMsg]);
            return;
          }

          // Sem segunda face pendente — verifica se há pontos restantes na fila
          const remaining = pendingPdfOutdoorsRef.current;
          if (remaining.length > 0) {
            if (bulkAllPointsRef.current || bulkRegisterAllRef.current) {
              await sendMessage('quero', undefined, {
                silentUserMessage: true,
                overridePendingOutdoors: remaining,
                forceUploadContext: true,
                isBulkAutoRun: true,
              });
            } else {
              const continueMsg: Message = {
                id: String(Date.now() + 2),
                type: 'ai',
                content: `Face cadastrada! Restam **${remaining.length}** ponto(s) na fila.`,
                timestamp: new Date(),
                quickReplies: [
                  { label: '▶ Próximo ponto', value: '__next_with_optional_fields__' },
                  { label: '✕ Parar', value: 'cancelar contexto' },
                ],
                inlineFields: buildProgressInlineFields(),
              };
              setMessages((prev) => [...prev, continueMsg]);
            }
          }
        }
      }
    } catch (error: any) {
      const apiMsg = error?.response?.data?.message;
      const message = Array.isArray(apiMsg)
        ? apiMsg.join(', ')
        : apiMsg || error?.message || 'Não foi possível executar a ação do assistente.';

      const aiMessage: Message = {
        id: String(Date.now() + 1),
        type: 'ai',
        content: `Não consegui executar a ação: ${message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setIsLoading(false);
      setExecutingActionId(null);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    scrollToBottom();
  }, [isOpen]);

  // Auto-envia mensagem programática ao abrir o painel (ex: relatório do balão)
  const pendingMessageSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      // Reseta ao fechar para permitir novo envio na próxima abertura via balão
      pendingMessageSentRef.current = null;
      return;
    }
    if (!pendingMessage) return;
    if (pendingMessageSentRef.current === pendingMessage) return;
    pendingMessageSentRef.current = pendingMessage;
    // Envia silenciosamente — sem mostrar o prompt técnico no chat, só a resposta
    const t = setTimeout(() => { void sendMessage(pendingMessage, undefined, { silentUserMessage: true }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pendingMessage]);

  useEffect(() => {
    pendingPdfOutdoorsRef.current = pendingPdfOutdoors;
  }, [pendingPdfOutdoors]);

  useEffect(() => {
    pendingClientRecordsRef.current = pendingClientRecords;
  }, [pendingClientRecords]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const serialized = messages.map((message) => ({
        ...message,
        timestamp: message.timestamp.toISOString(),
      }));

      window.localStorage.setItem(getAssistantStorageKey(userId), JSON.stringify(serialized));
    } catch {
      // Ignore persistence failures (private mode / storage quota).
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleExternalAssistantMessage = (event: Event) => {
      const detail = (event as CustomEvent<AssistantExternalMessageDetail>)?.detail;
      const content = String(detail?.content || '').trim();
      if (!content) return;

      const dedupeKey = String(detail?.dedupeKey || '').trim() || null;
      const source = String(detail?.source || '').trim() || 'external';
      const dataPoints = Array.isArray(detail?.dataPoints) ? detail.dataPoints : [];

      setMessages((prev) => {
        if (dedupeKey && prev.some((message) => message.dedupeKey === dedupeKey)) {
          return prev;
        }

        return [
          ...prev,
          {
            id: `${Date.now()}-external-${prev.length + 1}`,
            type: 'ai',
            content,
            timestamp: new Date(),
            dataPoints,
            source,
            dedupeKey: dedupeKey || undefined,
          },
        ];
      });
    };

    window.addEventListener('assistant:push-message', handleExternalAssistantMessage as EventListener);

    return () => {
      window.removeEventListener('assistant:push-message', handleExternalAssistantMessage as EventListener);
    };
  }, []);

  const sendMessage = async (content: string, file?: File, options: SendMessageOptions = {}) => {
    if (!content.trim() && !file) return;

    const shouldRenderUserMessage = !options.silentUserMessage;
    const userMessage: Message | null = shouldRenderUserMessage
      ? {
          id: Date.now().toString(),
          type: 'user',
          content: file ? `Arquivo enviado: ${file.name}` : content,
          timestamp: new Date(),
        }
      : null;

    if (userMessage) {
      setMessages(prev => [...prev, userMessage]);
    }

    setIsLoading(true);

    try {
      const syntheticHistoryEntry = {
        role: 'user' as const,
        content: file ? `Arquivo enviado: ${file?.name || 'arquivo'}` : content,
        createdAt: new Date().toISOString(),
      };

      const conversationHistory = [...messages]
        .filter((message) => message.timestamp >= sessionStartedAt)
        .map((message) => ({
          role: message.type === 'ai' ? 'assistant' : 'user',
          content: message.content,
          createdAt: message.timestamp.toISOString(),
        }))
        .concat(content.trim() ? [syntheticHistoryEntry] : [])
        .slice(-20);

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        if (content.trim() && !isAutoGeneratedUploadInput(content, file.name)) {
          formData.append('textoExtraido', content.trim());
        }

        const { data } = await apiClient.post('/ai/upload', formData);

        if (data?.domain === 'clients') {
          const clients: ParsedClientRecord[] = Array.isArray(data?.clients) ? data.clients : [];
          const warning = String(data?.warning || '').trim();

          updatePendingClientRecords(clients);

          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: [
              clients.length > 0
                ? `Encontrei **${clients.length} cliente(s)** no arquivo.`
                : 'Recebi o arquivo de clientes, mas não consegui extrair registros automaticamente.',
              clients.length > 0
                ? `Amostra:\n${clients.slice(0, 3).map((c, i) => `${i + 1}. ${c.contactName || c.companyName || '(sem nome)'} — ${c.email || c.phone || c.cnpj || ''}`).join('\n')}`
                : null,
              warning || null,
              clients.length > 0
                ? 'Diga **"quero"** para cadastrar um por um, ou **"sim para todos"** para cadastrar todos automaticamente em lote.'
                : 'Tente enviar o arquivo em formato CSV ou Excel com colunas como Nome, Empresa, CNPJ, Email e Telefone.',
            ]
              .filter(Boolean)
              .join('\n\n'),
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMessage]);
        } else {
        const outdoors = Array.isArray(data)
          ? data
          : Array.isArray(data?.outdoors)
            ? data.outdoors
            : [];
        const sourceType = String(data?.sourceType || inferUploadKindFromFile(file)).toLowerCase();
        const sourceLabel = uploadKindLabel(sourceType);
        const normalizedSourceType = ['pdf', 'spreadsheet', 'image', 'text'].includes(sourceType)
          ? (sourceType as UploadSourceType)
          : null;
        const warning = String(data?.warning || '').trim();
        const parsedOutdoors = outdoors as ParsedOutdoorRecord[];
        const analysis =
          data?.analysis && typeof data.analysis === 'object'
            ? (data.analysis as InventoryExtractionAnalysis)
            : null;
        const totalDetected = Number.isFinite(Number(analysis?.totalPoints))
          ? Number(analysis?.totalPoints)
          : parsedOutdoors.length;

        bulkCompletionAuditRef.current = [];
        bulkExpectedTotalRef.current = totalDetected > 0 ? totalDetected : parsedOutdoors.length;

        updatePendingPdfOutdoors(outdoors as ParsedOutdoorRecord[]);
        setPendingUploadSourceType(outdoors.length ? normalizedSourceType : null);
        setPendingUploadTotalCount(totalDetected > 0 ? totalDetected : outdoors.length);
        setPendingAssistedUploadContext(
          outdoors.length > 0
            ? null
            : {
                sourceType: normalizedSourceType,
                activeRecord: {},
                totalRecords: 1,
              },
        );

        const preview = outdoors
          .slice(0, 3)
          .map((item: any, index: number) => {
            const nome = item?.nome || item?.name || `Item ${index + 1}`;
            const cidade = item?.cidade || item?.addressCity || '-';
            const estado = item?.estado || item?.addressState || '-';
            const tipo = resolveCommercialType(item as ParsedOutdoorRecord);
            return `${index + 1}. ${nome} (${tipo}) - ${cidade}/${estado}`;
          })
          .join('\n');

        const formattedSummary = buildUploadAnalysisMessage({
          analysis,
          records: parsedOutdoors,
          warning,
        });

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: [
            formattedSummary,
            outdoors.length > 0 ? `Amostra dos itens:\n${preview}` : null,
            outdoors.length > 0
              ? null
              : `${sourceLabel} recebido. Posso continuar no modo assistido e pedir somente os campos pendentes por item.`,
          ]
            .filter(Boolean)
            .join('\n\n'),
          timestamp: new Date(),
          showInventoryButtons: outdoors.length > 0,
        };
        setMessages(prev => [...prev, aiMessage]);
        }
      } else {
        const queueSource = Array.isArray(options.overridePendingOutdoors)
          ? options.overridePendingOutdoors
          : pendingPdfOutdoorsRef.current;

        if ((queueSource.length > 0 || pendingAssistedUploadContext) && isCancelPdfContextMessage(content)) {
          bulkRegisterAllRef.current = false;
          bulkProcessedCountRef.current = 0;
          updatePendingPdfOutdoors([]);
          setPendingAssistedUploadContext(null);
          setPendingUploadSourceType(null);
          setPendingUploadTotalCount(0);
          resetBulkCompletionAudit();
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: 'Contexto do arquivo limpo. Pode enviar outra instrução normalmente.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMessage]);
          return;
        }

        const hasFallbackAssistedContext = !!pendingAssistedUploadContext;
        const shouldInjectPdfContext =
          options.forceUploadContext ??
          (shouldUsePendingPdfContext(content, queueSource) || hasFallbackAssistedContext);
        const firstOutdoor =
          queueSource[0] || pendingAssistedUploadContext?.activeRecord || null;
        const mergedOutdoor =
          shouldInjectPdfContext && firstOutdoor
            ? mergePendingOutdoorContextWithUserInput(firstOutdoor, content)
            : firstOutdoor;
        const effectivePendingOutdoors = shouldInjectPdfContext && mergedOutdoor
          ? [mergedOutdoor, ...queueSource.slice(1)]
          : queueSource;

        if (shouldInjectPdfContext && mergedOutdoor) {
          if (queueSource.length > 0) {
            updatePendingPdfOutdoors([mergedOutdoor, ...queueSource.slice(1)]);
          } else if (pendingAssistedUploadContext) {
            setPendingAssistedUploadContext((prev) =>
              prev
                ? {
                    ...prev,
                    activeRecord: mergedOutdoor,
                  }
                : prev,
            );
          }
        }

        const screenContext = buildScreenContext(shouldInjectPdfContext ? 'inventory' : undefined);
        const documentContext = shouldInjectPdfContext
          ? effectivePendingOutdoors.length > 0
            ? buildAssistantDocumentContext(
                pendingUploadSourceType,
                effectivePendingOutdoors,
                pendingUploadTotalCount || effectivePendingOutdoors.length,
              )
            : pendingAssistedUploadContext
              ? {
                  sourceType: pendingAssistedUploadContext.sourceType || undefined,
                  totalRecords: pendingAssistedUploadContext.totalRecords || 1,
                  remainingRecords: 1,
                  activeRecord: mergedOutdoor || pendingAssistedUploadContext.activeRecord || {},
                }
              : null
          : null;

        let data;

        try {
          ({ data } = await apiClient.post('/assistant/chat', {
            message: content,
            screenContext,
            conversationHistory,
            documentContext,
          }));
        } catch (error: any) {
          if (documentContext && shouldRetryAssistantWithoutDocumentContext(error)) {
            ({ data } = await apiClient.post('/assistant/chat', {
              message: formatLegacyDocumentContextMessage(content, documentContext),
              screenContext,
              conversationHistory,
            }));
          } else {
            throw error;
          }
        }

        const reply = data?.reply;
        const assistantContent = reply?.content || data?.resposta || 'Não consegui gerar resposta agora.';
        const replyActions = Array.isArray(reply?.actions) ? reply.actions : [];
        const replyDataPoints = Array.isArray(reply?.dataPoints) ? reply.dataPoints : [];

        const autoConfirmUploadAction =
          isAffirmativeMessage(content) &&
          shouldInjectPdfContext &&
          replyActions.find(
            (item) => item.kind === 'write' && item.key === 'create_media_point' && !!item.requiresConfirmation,
          );

        if (autoConfirmUploadAction) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: assistantContent,
            timestamp: new Date(),
            dataPoints: replyDataPoints,
          };

          setMessages((prev) => [...prev, aiMessage]);
          await executeAssistantAction(autoConfirmUploadAction, {
            skipConfirmDialog: true,
            queueSnapshot: effectivePendingOutdoors,
          });
          return;
        }

        if (options.isBulkAutoRun && bulkRegisterAllRef.current) {
          bulkRegisterAllRef.current = false;
          const pausedMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'ai',
            content:
              'Pausei o cadastro em lote porque este item precisa de confirmação adicional de dados. Assim que você responder o que faltou, continuo a fila automaticamente.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, pausedMessage]);
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: assistantContent,
          timestamp: new Date(),
          actions: replyActions,
          dataPoints: replyDataPoints,
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error: any) {
      const backendMessage = getBackendErrorMessage(error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: backendMessage
          ? `Desculpe, ocorreu um erro: ${backendMessage}`
          : 'Desculpe, ocorreu um erro. Tente novamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setSelectedFile(null);
    }
  };

  const setMessageFormValue = (messageId: string, key: string, value: string) => {
    setMessageFormValues((prev) => ({
      ...prev,
      [messageId]: { ...(prev[messageId] || {}), [key]: value },
    }));
  };

  const toggleMultiselectValue = (messageId: string, key: string, value: string) => {
    setMessageFormValues((prev) => {
      const current = (prev[messageId]?.[key] as string[] | undefined) || [];
      const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [messageId]: { ...(prev[messageId] || {}), [key]: updated } };
    });
  };

  const handleQuickReply = async (value: string, messageId: string) => {
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, quickReplies: [] } : m));

    if (value === '__next_with_optional_fields__') {
      const formVals = messageFormValues[messageId] || {};
      const currentQueue = pendingPdfOutdoorsRef.current;
      if (currentQueue.length > 0 && Object.keys(formVals).length > 0) {
        const first = { ...currentQueue[0] };
        if (typeof formVals['environment'] === 'string' && formVals['environment']) {
          first.environment = formVals['environment'];
        }
        if (typeof formVals['subcategory'] === 'string' && formVals['subcategory']) {
          first.subcategoria = formVals['subcategory'];
        }
        const sc = formVals['socialClasses'];
        if (Array.isArray(sc) && sc.length > 0) {
          first.socialClasses = sc as string[];
        }
        updatePendingPdfOutdoors([first, ...currentQueue.slice(1)]);
      }
      await sendMessage('quero', undefined, { silentUserMessage: true });
      return;
    }

    await sendMessage(value);
  };

  /** Executa a instrução de face/tela para o ponto aguardando em awaitingFaceStepRef. */
  const executeFaceStep = async (
    resolvedInstruction: ReturnType<typeof parseFaceInstruction>,
    photo: File | null = null,
  ) => {
    const faceStep = awaitingFaceStepRef.current;
    if (!faceStep || !resolvedInstruction) return;

    if (resolvedInstruction === 'pular') {
      updateAwaitingFaceStep(null);
      pendingSecondFaceRef.current = null;
      if (faceStep.continueQueueAfter && pendingPdfOutdoorsRef.current.length > 0) {
        const remaining = pendingPdfOutdoorsRef.current;
        if (bulkAllPointsRef.current || bulkRegisterAllRef.current) {
          await sendMessage('quero', undefined, {
            silentUserMessage: true,
            overridePendingOutdoors: remaining,
            forceUploadContext: true,
            isBulkAutoRun: true,
          });
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now()),
              type: 'ai' as const,
              content: `Face pulada. Restam **${remaining.length}** ponto(s) na fila.`,
              timestamp: new Date(),
              quickReplies: [
                { label: '▶ Próximo ponto', value: '__next_with_optional_fields__' },
                { label: '✕ Parar', value: 'cancelar contexto' },
              ],
              inlineFields: buildProgressInlineFields(),
            },
          ]);
        }
      }
      return;
    }

    if (photo) pendingFaceImageRef.current = photo;

    const isDooh = faceStep.mediaPointType === 'DOOH';
    let createDto: Record<string, unknown>;

    if (isDooh) {
      createDto = { label: 'Tela Principal', unitType: 'SCREEN', orientation: 'FLUXO' };
    } else if (resolvedInstruction === 'ambas') {
      // Cria a Face Fluxo primeiro; a Face Contra-Fluxo será perguntada em seguida
      createDto = { label: 'Face Fluxo', unitType: 'FACE', orientation: 'FLUXO' };
      // Salva contexto da 2ª face para ser executado após o upload da foto da 1ª
      pendingSecondFaceRef.current = {
        mediaPointId: faceStep.mediaPointId,
        mediaPointName: faceStep.mediaPointName,
        continueQueueAfter: faceStep.continueQueueAfter,
      };
    } else if (resolvedInstruction === 'contra-fluxo') {
      createDto = { label: 'Face Contra-Fluxo', unitType: 'FACE', orientation: 'CONTRA_FLUXO' };
    } else {
      createDto = { label: 'Face Fluxo', unitType: 'FACE', orientation: 'FLUXO' };
    }

    const faceAction: AssistantActionSuggestion = {
      id: `face-step-${Date.now()}`,
      key: 'create_media_unit',
      type: 'execute',
      kind: 'write',
      label: isDooh
        ? 'Cadastrar Tela Principal'
        : resolvedInstruction === 'ambas'
          ? 'Cadastrar Face Fluxo'
          : `Cadastrar face ${resolvedInstruction}`,
      requiresConfirmation: false,
      payload: {
        moduleKey: 'inventory',
        mediaPointId: faceStep.mediaPointId,
        mediaPointLabel: faceStep.mediaPointName,
        createDto,
      },
    };

    updateAwaitingFaceStep(null);
    await executeAssistantAction(faceAction, { skipConfirmDialog: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    setInput('');

    // ─── Passo de face: intercepta ANTES do fluxo normal ────────────────────
    if (awaitingFaceStepRef.current) {
      const faceStep = awaitingFaceStepRef.current;
      const hasPhoto = !!selectedFile;
      const faceInstruction = content ? parseFaceInstruction(content) : null;
      const resolvedInstruction = faceInstruction ?? (hasPhoto ? 'ambas' : null);

      if (resolvedInstruction) {
        await executeFaceStep(resolvedInstruction, hasPhoto ? selectedFile : null);
        return;
      }

      // Instrução não reconhecida — pede esclarecimento
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          type: 'ai' as const,
          content: faceStep.mediaPointType === 'DOOH'
            ? 'Não entendi. Use os botões acima ou envie uma foto para cadastrar a tela, ou diga **"pular"** para seguir.'
            : 'Não entendi. Use os botões acima ou envie uma foto para cadastrar a face, ou diga **"pular"** para seguir.',
          timestamp: new Date(),
        },
      ]);
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    if (selectedFile) {
      await sendMessage(content, selectedFile);
      return;
    }

    if (!content) return;

    const hasActiveUploadContext = pendingPdfOutdoors.length > 0 || !!pendingAssistedUploadContext;

    if (pendingClientRecordsRef.current.length > 0 && isCancelPdfContextMessage(content)) {
      updatePendingClientRecords([]);
      const aiMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: 'Fila de clientes limpa. Pode enviar outra instrução normalmente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      return;
    }

    if (
      pendingClientRecordsRef.current.length > 0 &&
      (isAffirmativeMessage(content) || isContinuePdfContextMessage(content))
    ) {
      const queue = pendingClientRecordsRef.current;
      const first = queue[0];
      const action = buildCreateClientActionFromRecord(first, 0);
      await executeAssistantAction(action, {
        userMessage: content,
        skipConfirmDialog: true,
      });
      return;
    }

    // "Sim para todos" — cadastro em lote de CLIENTES
    if (pendingClientRecordsRef.current.length > 0 && isBulkAllMessage(content)) {
      bulkAllClientsRef.current = true;
      const queue = pendingClientRecordsRef.current;
      const action = buildCreateClientActionFromRecord(queue[0], 0);
      await executeAssistantAction(action, { skipConfirmDialog: true });
      return;
    }

    // "Sim para todos" — cadastro em lote de PONTOS
    if ((pendingPdfOutdoorsRef.current.length > 0 || !!pendingAssistedUploadContext) && isBulkAllMessage(content)) {
      bulkAllPointsRef.current = true;
      bulkRegisterAllRef.current = true;
      bulkAllNoFaceRef.current = true;
      bulkProcessedCountRef.current = 0;
      await sendMessage('quero');
      return;
    }

    if (hasActiveUploadContext && isAffirmativeMessage(content)) {
      bulkRegisterAllRef.current = true;
      bulkProcessedCountRef.current = 0;
      await sendMessage(content);
      return;
    }

    if ((pendingPdfOutdoors.length > 0 || pendingAssistedUploadContext) && isContinuePdfContextMessage(content)) {
      await sendMessage(content);
      return;
    }

    const latestConfirmableWriteAction = findLatestConfirmableWriteAction(messages);
    if (latestConfirmableWriteAction && isAffirmativeMessage(content)) {
      await executeAssistantAction(latestConfirmableWriteAction, {
        userMessage: content,
        skipConfirmDialog: true,
        queueSnapshot: pendingPdfOutdoorsRef.current,
      });
      return;
    }

    await sendMessage(content);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isSupportedUploadFile(file)) {
      setSelectedFile(file);
    } else {
      alert('Selecione um arquivo PDF, Excel/CSV ou imagem (PNG/JPG/WEBP/HEIC).');
    }
  };

  if (!isOpen) return null;

  const selectedUploadKind = selectedFile ? inferUploadKindFromFile(selectedFile) : 'other';

  return (
    <div className="fixed" style={assistantPanelStyle}>
      <div className="flex flex-col min-h-0" style={assistantShellStyle}>
        <div className="border-b" style={assistantHeaderStyle}>
          <div className="flex items-center justify-between px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.34)' }}
              >
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold tracking-wide" style={{ color: '#ffffff' }}>Assistente OneMedia</h3>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#dbeafe' }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cadastro inteligente com PDF, Excel/CSV e imagem</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors"
              style={{ color: '#ffffff' }}
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-slate-50/70 p-4 sm:p-5 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex min-w-0 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[92%] sm:max-w-[85%] min-w-0 rounded-2xl px-4 py-3 shadow-sm"
                style={
                  message.type === 'user'
                    ? { background: '#2563eb', color: '#ffffff', border: '1px solid #1d4ed8' }
                    : { background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }
                }
              >
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>

                {message.type === 'ai' && message.showInventoryButtons && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMessages((prev) =>
                          prev.map((m) => m.id === message.id ? { ...m, showInventoryButtons: false } : m),
                        );
                        void sendMessage('quero', undefined, { silentUserMessage: true });
                      }}
                      disabled={isLoading}
                      className="flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' }}
                    >
                      Um por um
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMessages((prev) =>
                          prev.map((m) => m.id === message.id ? { ...m, showInventoryButtons: false } : m),
                        );
                        bulkAllPointsRef.current = true;
                        bulkRegisterAllRef.current = true;
                        bulkAllNoFaceRef.current = true;
                        bulkProcessedCountRef.current = 0;
                        void sendMessage('quero', undefined, { silentUserMessage: true });
                      }}
                      disabled={isLoading}
                      className="flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#15803d' }}
                    >
                      Tudo
                    </button>
                  </div>
                )}

                {message.type === 'ai' && message.faceStepButtons && (
                  <div className="mt-3 space-y-2">
                    {/* Botões de seleção — apenas destacam a escolha, não executam */}
                    <div className="flex flex-wrap gap-2">
                      {message.faceStepButtons === 'DOOH' ? (
                        <>
                          {(['tela-principal', 'pular'] as const).map((opt) => {
                            const selected = message.faceStepSelection === opt;
                            const label = opt === 'tela-principal' ? 'Tela Principal' : 'Pular';
                            const baseStyle = opt === 'pular'
                              ? { backgroundColor: selected ? '#e2e8f0' : '#f8fafc', borderColor: selected ? '#94a3b8' : '#cbd5e1', color: '#475569' }
                              : { backgroundColor: selected ? '#dcfce7' : '#f0fdf4', borderColor: selected ? '#4ade80' : '#86efac', color: '#15803d' };
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setMessages((prev) => prev.map((m) => m.id === message.id ? { ...m, faceStepSelection: opt } : m))}
                                disabled={isLoading}
                                className="flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                                style={{ ...baseStyle, outline: selected ? '2px solid #4ade80' : 'none' }}
                              >
                                {selected ? `✓ ${label}` : label}
                              </button>
                            );
                          })}
                        </>
                      ) : message.faceStepButtons === 'OOH_CONTRA_FLUXO' ? (
                        <>
                          {(['contra-fluxo', 'pular'] as const).map((opt) => {
                            const selected = message.faceStepSelection === opt;
                            const label = opt === 'contra-fluxo' ? 'Cadastrar Contra-Fluxo' : 'Pular';
                            const baseStyle = opt === 'pular'
                              ? { backgroundColor: selected ? '#e2e8f0' : '#f8fafc', borderColor: selected ? '#94a3b8' : '#cbd5e1', color: '#475569' }
                              : { backgroundColor: selected ? '#dbeafe' : '#eff6ff', borderColor: selected ? '#60a5fa' : '#93c5fd', color: '#1d4ed8' };
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setMessages((prev) => prev.map((m) => m.id === message.id ? { ...m, faceStepSelection: opt } : m))}
                                disabled={isLoading}
                                className="flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                                style={{ ...baseStyle, outline: selected ? '2px solid #60a5fa' : 'none' }}
                              >
                                {selected ? `✓ ${label}` : label}
                              </button>
                            );
                          })}
                        </>
                      ) : (
                        <>
                          {(['fluxo', 'contra-fluxo', 'ambas', 'pular'] as const).map((opt) => {
                            const selected = message.faceStepSelection === opt;
                            const labels: Record<string, string> = { fluxo: 'Fluxo', 'contra-fluxo': 'Contra-Fluxo', ambas: 'Ambas', pular: 'Pular' };
                            const baseStyle = opt === 'pular'
                              ? { backgroundColor: selected ? '#e2e8f0' : '#f8fafc', borderColor: selected ? '#94a3b8' : '#cbd5e1', color: '#475569' }
                              : opt === 'ambas'
                              ? { backgroundColor: selected ? '#dcfce7' : '#f0fdf4', borderColor: selected ? '#4ade80' : '#86efac', color: '#15803d' }
                              : { backgroundColor: selected ? '#dbeafe' : '#eff6ff', borderColor: selected ? '#60a5fa' : '#93c5fd', color: '#1d4ed8' };
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setMessages((prev) => prev.map((m) => m.id === message.id ? { ...m, faceStepSelection: opt } : m))}
                                disabled={isLoading}
                                className="rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                                style={{ ...baseStyle, outline: selected ? '2px solid #60a5fa' : 'none' }}
                              >
                                {selected ? `✓ ${labels[opt]}` : labels[opt]}
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Inline form fields */}
                {message.type === 'ai' && message.inlineFields && message.inlineFields.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.inlineFields.map((field) => (
                      <div key={field.key}>
                        <label className="text-xs font-medium text-slate-600 block mb-1">{field.label}</label>

                        {field.type === 'select' && (
                          <select
                            className="w-full text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white text-slate-700"
                            value={(messageFormValues[message.id]?.[field.key] as string) || ''}
                            onChange={(e) => setMessageFormValue(message.id, field.key, e.target.value)}
                          >
                            <option value="">-- selecione --</option>
                            {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        )}

                        {field.type === 'text' && (
                          <input
                            type="text"
                            className="w-full text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white"
                            placeholder={field.placeholder || ''}
                            value={(messageFormValues[message.id]?.[field.key] as string) || ''}
                            onChange={(e) => setMessageFormValue(message.id, field.key, e.target.value)}
                          />
                        )}

                        {field.type === 'multiselect' && (
                          <div className="flex flex-wrap gap-1.5">
                            {field.options?.map((opt) => {
                              const selected = Array.isArray(messageFormValues[message.id]?.[field.key])
                                ? (messageFormValues[message.id][field.key] as string[]).includes(opt)
                                : false;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => toggleMultiselectValue(message.id, field.key, opt)}
                                  className="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                                  style={selected
                                    ? { backgroundColor: '#2563eb', borderColor: '#1d4ed8', color: '#ffffff' }
                                    : { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#475569' }}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {field.type === 'file-image' && (
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id={`face-img-${message.id}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  messageFileRefs.current[message.id] = file;
                                  setMessageFormValue(message.id, field.key, file.name);
                                }
                              }}
                            />
                            <label
                              htmlFor={`face-img-${message.id}`}
                              className="cursor-pointer inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                              style={{ borderColor: '#cbd5e1', backgroundColor: '#f8fafc', color: '#475569' }}
                            >
                              <FileImage className="w-3.5 h-3.5" />
                              {(messageFormValues[message.id]?.[field.key] as string) || 'Selecionar foto'}
                            </label>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Action buttons at the bottom of the form */}
                    {message.quickReplies && message.quickReplies.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-2">
                        {message.quickReplies.map((qr) => (
                          <button
                            key={qr.value}
                            type="button"
                            onClick={() => void handleQuickReply(qr.value, message.id)}
                            disabled={isLoading}
                            className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                            style={qr.value === '__next_with_optional_fields__'
                              ? { backgroundColor: '#1d4ed8', borderColor: '#1e40af', color: '#ffffff' }
                              : { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#475569' }}
                          >
                            {qr.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Botão Próximo — aparece após inlineFields (último item do face step) */}
                {message.type === 'ai' && message.faceStepButtons && (
                  <button
                    type="button"
                    onClick={() => {
                      const sel = message.faceStepSelection;
                      if (!sel) return;
                      const photo = messageFileRefs.current[message.id] || selectedFile;
                      delete messageFileRefs.current[message.id];
                      setSelectedFile(null);
                      setMessages((prev) => prev.map((m) => m.id === message.id ? { ...m, faceStepButtons: undefined, inlineFields: undefined, faceStepSelection: undefined } : m));
                      // Mapeia 'tela-principal' → 'ambas' (DOOH usa o mesmo fluxo de execução)
                      const instruction = sel === 'tela-principal' ? 'ambas' : sel;
                      void executeFaceStep(instruction, sel === 'pular' ? null : (photo || null));
                    }}
                    disabled={isLoading || !message.faceStepSelection}
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-40"
                    style={
                      message.faceStepSelection
                        ? { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8', color: '#fff' }
                        : { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#94a3b8' }
                    }
                  >
                    {message.faceStepSelection ? 'Próximo →' : 'Selecione uma opção acima'}
                  </button>
                )}

                {/* Quick reply buttons (only for messages without inlineFields) */}
                {message.type === 'ai' && message.quickReplies && message.quickReplies.length > 0 && !(message.inlineFields && message.inlineFields.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.quickReplies.map((qr) => (
                      <button
                        key={qr.value}
                        type="button"
                        onClick={() => void handleQuickReply(qr.value, message.id)}
                        disabled={isLoading}
                        className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                        style={{ backgroundColor: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' }}
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                )}

                {message.type === 'ai' && Array.isArray(message.dataPoints) && message.dataPoints.length > 0 && (
                  <div className="mt-3 grid gap-1.5">
                    {message.dataPoints.slice(0, 6).map((point, index) => (
                      <p
                        key={`${point.id || 'point'}-${index}`}
                        className={`text-xs break-words ${dataPointToneClass(point.tone)}`}
                      >
                        {point.label ? `${point.label}: ` : ''}
                        {point.value || 'Não informado'}
                      </p>
                    ))}
                  </div>
                )}

                {message.type === 'ai' && Array.isArray(message.actions) && message.actions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.actions.slice(0, 4).map((action, index) => {
                      const isExecuting = executingActionId === action.id;
                      const isWriteAction = action.kind === 'write';
                      return (
                        <button
                          key={`${action.id || action.key}-${index}`}
                          type="button"
                          onClick={() => executeAssistantAction(action)}
                          disabled={isLoading || isExecuting}
                          className="w-full text-left text-xs break-words px-3 py-2 rounded-lg border transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          style={
                            isWriteAction
                              ? { backgroundColor: '#fff7ed', borderColor: '#fdba74', color: '#9a3412' }
                              : { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#0f172a' }
                          }
                        >
                          {isExecuting ? 'Executando...' : action.label}
                          {action.requiresConfirmation ? ' (confirmação)' : ''}
                        </button>
                      );
                    })}
                  </div>
                )}

                <p
                  className="mt-2 text-[11px]"
                  style={{ color: message.type === 'user' ? '#dbeafe' : '#64748b' }}
                >
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-200 bg-white/95 p-4 sm:p-5">
          {!selectedFile && (pendingPdfOutdoors.length > 0 || pendingAssistedUploadContext) && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
              <FileText className="w-4 h-4 text-indigo-600 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-indigo-900">Contexto de arquivo ativo</p>
                <p className="text-xs text-indigo-700 break-words">
                  {pendingPdfOutdoors.length > 0
                    ? `${pendingPdfOutdoors.length} item(ns) aguardando cadastro. Escreva "quero" para iniciar ou "próximo" para continuar a fila.`
                    : 'Modo assistido ativo para cadastro a partir do arquivo. Você pode responder em partes (ex.: UF, cidade, coordenadas, preço) e eu continuo o fluxo.'}
                </p>
              </div>
              <button
                onClick={() => {
                  updatePendingPdfOutdoors([]);
                  setPendingAssistedUploadContext(null);
                  setPendingUploadSourceType(null);
                  setPendingUploadTotalCount(0);
                  resetBulkCompletionAudit();
                }}
                className="ml-auto rounded-md p-1 hover:bg-indigo-100"
                type="button"
              >
                <X className="w-4 h-4 text-indigo-700" />
              </button>
            </div>
          )}

          {selectedFile && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
              {selectedUploadKind === 'image' ? (
                <FileImage className="w-4 h-4 text-sky-700" />
              ) : selectedUploadKind === 'spreadsheet' ? (
                <FileSpreadsheet className="w-4 h-4 text-sky-700" />
              ) : (
                <FileText className="w-4 h-4 text-sky-700" />
              )}
              <span className="text-sm text-sky-800 break-all">{selectedFile.name}</span>
              <button
                onClick={() => setSelectedFile(null)}
                className="ml-auto rounded-md p-1 hover:bg-sky-100"
                type="button"
              >
                <X className="w-4 h-4 text-sky-700" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div
              className="flex-1 rounded-xl border bg-white transition-colors"
              style={{ borderColor: '#cbd5e1' }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Envie PDF/CSV/imagem ou descreva seus pontos em texto livre..."
                className="w-full rounded-xl bg-transparent px-4 py-3 text-sm focus:outline-none"
                style={{ color: '#0f172a' }}
                disabled={isLoading}
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.xlsx,.xls,image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-11 w-11 rounded-xl border bg-white transition-colors flex items-center justify-center"
              style={{ borderColor: '#cbd5e1', color: '#334155' }}
              disabled={isLoading}
              title="Anexar arquivo"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !selectedFile)}
              className="h-11 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              style={{ backgroundColor: '#2563eb', color: '#ffffff', border: '1px solid #1d4ed8' }}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          <p className="mt-2 text-[11px]" style={{ color: '#64748b' }}>
            Suporte: PDF, Excel/CSV, imagem e texto livre. Mesmo sem formatação perfeita, tento extrair e montar o cadastro assistido.
          </p>
        </div>
      </div>
    </div>
  );
}