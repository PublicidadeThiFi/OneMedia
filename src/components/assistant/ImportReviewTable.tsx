import { useMemo, useState } from "react";
import type {
  AssistantImportRow,
  AssistantImportSession,
} from "../../types/assistant";

const badge: Record<string, string> = {
  valid: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  invalid: "bg-red-100 text-red-700",
  possible_duplicate: "bg-orange-100 text-orange-700",
  confirmed_duplicate: "bg-red-100 text-red-700",
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

const fieldLabels: Record<string, string> = {
  contactName: "Nome do contato",
  companyName: "Empresa",
  email: "E-mail",
  phone: "Telefone",
  cnpj: "CNPJ",
  role: "Cargo",
  addressCity: "Cidade",
  addressState: "Estado (UF)",
  status: "Status",
  name: "Nome do ponto",
  type: "Tipo de mídia",
  subcategory: "Subcategoria",
  addressStreet: "Logradouro",
  addressNumber: "Número",
  addressComplement: "Complemento",
  addressDistrict: "Bairro",
  addressZipcode: "CEP",
  latitude: "Latitude",
  longitude: "Longitude",
  dailyImpressions: "Impactos diários",
  showInMediaKit: "Exibir no mídia kit",
  basePriceDay: "Preço diário",
  basePriceWeek: "Preço semanal",
  basePriceMonth: "Preço mensal",
  label: "Nome da unidade",
  unitType: "Tipo da unidade",
  orientation: "Orientação",
  widthM: "Largura (m)",
  heightM: "Altura (m)",
  resolutionWidthPx: "Resolução horizontal (px)",
  resolutionHeightPx: "Resolução vertical (px)",
  insertionsPerDay: "Inserções por dia",
  priceDay: "Preço diário",
  priceWeek: "Preço semanal",
  priceMonth: "Preço mensal",
};

const editableFieldsByImportType: Record<
  AssistantImportSession["importType"],
  ReadonlySet<string>
> = {
  clients: new Set([
    "contactName",
    "companyName",
    "email",
    "phone",
    "cnpj",
    "role",
    "addressCity",
    "addressState",
    "status",
  ]),
  products: new Set(["name", "type", "priceType", "basePrice"]),
  media_points: new Set([
    "name",
    "type",
    "subcategory",
    "addressStreet",
    "addressNumber",
    "addressComplement",
    "addressDistrict",
    "addressCity",
    "addressState",
    "addressZipcode",
    "latitude",
    "longitude",
    "dailyImpressions",
    "showInMediaKit",
    "basePriceDay",
    "basePriceWeek",
    "basePriceMonth",
  ]),
  media_units: new Set([
    "label",
    "unitType",
    "orientation",
    "widthM",
    "heightM",
    "resolutionWidthPx",
    "resolutionHeightPx",
    "insertionsPerDay",
    "priceDay",
    "priceWeek",
    "priceMonth",
  ]),
  media_unit_occupancies: new Set(["occupancyType", "startDate", "endDate"]),
};

function fieldLabel(field: string) {
  return fieldLabels[field] ?? field;
}

export function ImportFieldStatus({
  row,
  importType,
}: {
  row: AssistantImportRow;
  importType: AssistantImportSession["importType"];
}) {
  const allowedFields = editableFieldsByImportType[importType];
  const issues = row.fieldResults.filter(
    (field) => field.status !== "valid" && allowedFields.has(field.field),
  );
  return (
    <div className="mt-1 space-y-1">
      {issues.slice(0, 5).map((field) => (
        <div key={field.field} className="text-[11px] text-slate-600">
          <b>{fieldLabel(field.field)}:</b> {field.message || field.status}
        </div>
      ))}
    </div>
  );
}

export function ImportDuplicateCandidates({
  row,
}: {
  row: AssistantImportRow;
}) {
  if (!row.duplicateCandidates.length) return null;
  return (
    <details className="mt-2 text-[11px]">
      <summary>
        Candidatos a duplicidade ({row.duplicateCandidates.length})
      </summary>
      {row.duplicateCandidates.map((candidate) => (
        <div
          key={candidate.candidateReference}
          className="mt-1 rounded bg-orange-50 p-2"
        >
          {candidate.label} · {Math.round(candidate.confidence * 100)}%
          <br />
          {candidate.reason}
        </div>
      ))}
    </details>
  );
}

export function ImportReviewRow({
  row,
  importType,
  showMissingFieldInputs,
  onSelect,
  onEdit,
  onRemove,
}: {
  row: AssistantImportRow;
  importType: AssistantImportSession["importType"];
  showMissingFieldInputs: boolean;
  onSelect: (value: boolean) => void;
  onEdit: (field: string, value: unknown) => void;
  onRemove: (value: boolean) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const label = String(
    row.normalizedData.contactName ||
      row.normalizedData.name ||
      row.normalizedData.label ||
      `Linha ${row.sourceIndex + 1}`,
  );
  const reviewFields = new Set(
    row.fieldResults
      .filter(
        (result) =>
          ["missing", "invalid"].includes(result.status) &&
          editableFieldsByImportType[importType].has(result.field),
      )
      .map((result) => result.field),
  );
  const editableFields = Array.from(
    new Set(
      [...Object.keys(row.normalizedData), ...reviewFields].filter((field) =>
        editableFieldsByImportType[importType].has(field),
      ),
    ),
  ).slice(0, 16);

  if (row.deleted)
    return (
      <div className="flex justify-between rounded border p-2 text-xs text-slate-400">
        <span>Registro removido</span>
        <button onClick={() => onRemove(false)}>Restaurar</button>
      </div>
    );

  return (
    <div className="rounded-lg border border-slate-200 p-2 text-xs">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={row.selected}
          disabled={row.status === "invalid" || row.status === "success"}
          onChange={(event) => onSelect(event.target.checked)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-2">
            <b className="truncate">{label}</b>
            <span
              className={`rounded px-1.5 py-0.5 ${badge[row.status] || "bg-slate-100"}`}
            >
              {row.status}
            </span>
          </div>
          <ImportFieldStatus row={row} importType={importType} />
          <ImportDuplicateCandidates row={row} />
          <details
            className="mt-2"
            open={showMissingFieldInputs && reviewFields.size > 0}
          >
            <summary>
              {reviewFields.size > 0
                ? `Preencher dados pendentes (${reviewFields.size})`
                : "Valores originais e normalizados"}
            </summary>
            {editableFields.map((field) => {
              const value = row.normalizedData[field];
              const needsReview = reviewFields.has(field);
              const showInput =
                (showMissingFieldInputs && needsReview) || editing === field;
              return (
                <label
                  key={field}
                  className="mt-2 grid grid-cols-[110px_1fr_auto] items-center gap-1"
                >
                  <span>{fieldLabel(field)}</span>
                  {showInput ? (
                    <input
                      className="min-w-0 rounded border px-2 py-1"
                      data-import-field-needs-review={needsReview || undefined}
                      aria-label={`Preencher ${fieldLabel(field)}`}
                      defaultValue={String(value ?? "")}
                      onBlur={(event) => {
                        onEdit(field, event.target.value);
                        setEditing(null);
                      }}
                      autoFocus={editing === field}
                    />
                  ) : (
                    <span
                      className="truncate"
                      title={String(row.originalData[field] ?? "")}
                    >
                      {value === undefined || value === ""
                        ? "Campo ausente."
                        : String(value)}
                    </span>
                  )}
                  {!needsReview && (
                    <button
                      type="button"
                      aria-label="Editar"
                      disabled={row.status === "success"}
                      onClick={() => setEditing(field)}
                    >
                      Editar
                    </button>
                  )}
                </label>
              );
            })}
          </details>
          {row.executionResult && (
            <div className="mt-2 rounded bg-slate-50 p-2">
              {row.executionResult.message}
            </div>
          )}
        </div>
        <button
          type="button"
          className="text-red-500"
          disabled={row.status === "success"}
          onClick={() => onRemove(true)}
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

export function ImportValidationFilters({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="rounded border px-2 py-1 text-xs"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="all">Todos</option>
      <option value="valid">Válidos</option>
      <option value="invalid">Inválidos</option>
      <option value="duplicate">Duplicidades</option>
      <option value="failed">Falhas</option>
    </select>
  );
}

export function ImportReviewTable({
  session,
  showMissingFieldInputs = true,
  onSelect,
  onEdit,
  onRemove,
}: {
  session: AssistantImportSession;
  showMissingFieldInputs?: boolean;
  onSelect: (rowIds: string[], selected: boolean) => void;
  onEdit: (rowId: string, field: string, value: unknown) => void;
  onRemove: (rowId: string, deleted: boolean) => void;
}) {
  const [filter, setFilter] = useState("all");
  const rows = useMemo(
    () =>
      session.rows.filter(
        (row) =>
          filter === "all" ||
          row.status === filter ||
          (filter === "duplicate" && row.status.includes("duplicate")),
      ),
    [session.rows, filter],
  );
  const valid = session.rows
    .filter(
      (row) =>
        !row.deleted &&
        !["invalid", "confirmed_duplicate", "success"].includes(row.status),
    )
    .map((row) => row.rowId);

  return (
    <div className="mt-3 space-y-2">
      <div className="flex justify-between">
        <ImportValidationFilters value={filter} onChange={setFilter} />
        <button
          type="button"
          className="text-xs text-indigo-600"
          onClick={() => onSelect(valid, true)}
        >
          Selecionar todos os válidos
        </button>
      </div>
      {rows.map((row) => (
        <ImportReviewRow
          key={row.rowId}
          row={row}
          importType={session.importType}
          showMissingFieldInputs={showMissingFieldInputs}
          onSelect={(value) => onSelect([row.rowId], value)}
          onEdit={(field, value) => onEdit(row.rowId, field, value)}
          onRemove={(value) => onRemove(row.rowId, value)}
        />
      ))}
    </div>
  );
}
