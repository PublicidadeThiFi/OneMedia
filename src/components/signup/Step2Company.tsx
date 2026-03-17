import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SignupCompanyStep } from '../../types/signup';
import {
  onlyDigits,
  formatPhoneDisplay,
  handlePhoneInput,
  formatCNPJDisplay,
} from '../../lib/validators';
import {
  BRAZILIAN_STATES,
  searchStates,
} from '../../lib/locations';

type Step2CompanyProps = {
  data: SignupCompanyStep;
  onChange: (data: SignupCompanyStep) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string>;
};

function formatBillingDocumentDisplay(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function formatZipcodeDisplay(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function Step2Company({ data, onChange, onNext, onBack, errors }: Step2CompanyProps) {
  const [phoneDigits, setPhoneDigits] = useState(onlyDigits(data.phone));
  const [billingPhoneDigits, setBillingPhoneDigits] = useState(onlyDigits(data.billingPhone));

  const [stateQuery, setStateQuery] = useState(data.state);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateResults, setStateResults] = useState(BRAZILIAN_STATES);

  useEffect(() => {
    setPhoneDigits(onlyDigits(data.phone));
  }, [data.phone]);

  useEffect(() => {
    setBillingPhoneDigits(onlyDigits(data.billingPhone));
  }, [data.billingPhone]);

  useEffect(() => {
    setStateQuery(data.state);
  }, [data.state]);

  const handleChange = (field: keyof SignupCompanyStep, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleCNPJChange = (value: string) => {
    handleChange('cnpj', formatCNPJDisplay(value));
  };

  const handlePhoneChange = (value: string) => {
    const digits = handlePhoneInput(value);
    setPhoneDigits(digits);
    handleChange('phone', digits);
  };

  const handleBillingPhoneChange = (value: string) => {
    const digits = handlePhoneInput(value);
    setBillingPhoneDigits(digits);
    handleChange('billingPhone', digits);
  };

  const handleBillingDocumentChange = (value: string) => {
    handleChange('billingDocument', onlyDigits(value).slice(0, 14));
  };

  const handleBillingZipcodeChange = (value: string) => {
    handleChange('billingAddressZipcode', onlyDigits(value).slice(0, 8));
  };

  const handleStateInputChange = (value: string) => {
    setStateQuery(value);
    setShowStateDropdown(true);

    const results = searchStates(value);
    setStateResults(results);

    const exactMatch = BRAZILIAN_STATES.find(
      (s) => s.uf.toUpperCase() === value.toUpperCase(),
    );
    if (exactMatch) {
      handleChange('state', exactMatch.uf);
    }
  };

  const handleStateSelect = (uf: string) => {
    setStateQuery(uf);
    handleChange('state', uf);
    setShowStateDropdown(false);
  };

  return (
    <div>
      <div className="text-center mb-10">
        <h2 className="text-3xl font-semibold text-gray-900 mb-3">Dados da empresa</h2>
        <p className="text-gray-600">
          Essas informações serão usadas para notas, contratos, faturamento e relatórios.
        </p>
      </div>

      <div className="space-y-5 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome fantasia da empresa <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={data.fantasyName}
            onChange={(e) => handleChange('fantasyName', e.target.value)}
            placeholder="Ex: Outdoor Brasil Publicidade"
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
              errors.fantasyName ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
            }`}
          />
          {errors.fantasyName && (
            <p className="mt-2 text-sm text-red-600">{errors.fantasyName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Razão social
          </label>
          <input
            type="text"
            value={data.legalName}
            onChange={(e) => handleChange('legalName', e.target.value)}
            placeholder="Ex: Outdoor Brasil Publicidade Ltda"
            className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CNPJ <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={data.cnpj}
            onChange={(e) => handleCNPJChange(e.target.value)}
            placeholder="00.000.000/0000-00"
            maxLength={18}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
              errors.cnpj ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
            }`}
          />
          {errors.cnpj && (
            <p className="mt-2 text-sm text-red-600">{errors.cnpj}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone / WhatsApp
            </label>
            <input
              type="tel"
              value={formatPhoneDisplay(phoneDigits)}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(11) 99999-9999"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
              }`}
            />
            {errors.phone && (
              <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              10 ou 11 dígitos (com DDD)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site
            </label>
            <input
              type="url"
              value={data.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://www.exemplo.com.br"
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UF / Estado
            </label>
            <div className="relative">
              <input
                type="text"
                value={stateQuery}
                onChange={(e) => handleStateInputChange(e.target.value)}
                onFocus={() => {
                  setShowStateDropdown(true);
                  setStateResults(BRAZILIAN_STATES);
                }}
                onBlur={() => {
                  setTimeout(() => setShowStateDropdown(false), 200);
                }}
                placeholder="SP ou São Paulo"
                maxLength={20}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                  errors.state ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                }`}
              />
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.state && (
              <p className="mt-2 text-sm text-red-600">{errors.state}</p>
            )}

            {showStateDropdown && stateResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {stateResults.map((state) => (
                  <button
                    key={state.uf}
                    type="button"
                    onMouseDown={() => handleStateSelect(state.uf)}
                    className="w-full px-4 py-2.5 text-left hover:bg-blue-50 text-sm transition-colors"
                  >
                    <span className="text-gray-900 font-medium">{state.uf}</span>
                    <span className="text-gray-500 ml-2">- {state.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cidade
            </label>
            <input
              type="text"
              value={data.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="Ex: São Paulo"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                errors.city ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
              }`}
            />
            {errors.city && (
              <p className="mt-2 text-sm text-red-600">{errors.city}</p>
            )}
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              País
            </label>
            <input
              type="text"
              value={data.country}
              onChange={(e) => handleChange('country', e.target.value)}
              placeholder="Brasil"
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número estimado de usuários internos
          </label>
          <input
            type="text"
            value={data.estimatedUsers}
            onChange={(e) => handleChange('estimatedUsers', e.target.value)}
            placeholder="Ex: 5"
            className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
          <p className="mt-2 text-xs text-gray-500">
            Apenas para inteligência comercial, não afeta o plano.
          </p>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Dados financeiros</h3>
          <p className="text-sm text-gray-600 mb-5">
            Nesta etapa já coletamos o perfil do pagador e o endereço de cobrança.
            A tokenização real do cartão e a ativação automática no Mercado Pago entram na próxima etapa.
          </p>

          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Responsável financeiro <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={data.billingContactName}
                  onChange={(e) => handleChange('billingContactName', e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                    errors.billingContactName ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                />
                {errors.billingContactName && <p className="mt-2 text-sm text-red-600">{errors.billingContactName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome / razão social para cobrança <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={data.billingLegalName}
                  onChange={(e) => handleChange('billingLegalName', e.target.value)}
                  placeholder="Ex: Outdoor Brasil Publicidade Ltda"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                    errors.billingLegalName ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                />
                {errors.billingLegalName && <p className="mt-2 text-sm text-red-600">{errors.billingLegalName}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail financeiro <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={data.billingEmail}
                  onChange={(e) => handleChange('billingEmail', e.target.value)}
                  placeholder="financeiro@empresa.com.br"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                    errors.billingEmail ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                />
                {errors.billingEmail && <p className="mt-2 text-sm text-red-600">{errors.billingEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefone financeiro</label>
                <input
                  type="tel"
                  value={formatPhoneDisplay(billingPhoneDigits)}
                  onChange={(e) => handleBillingPhoneChange(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                    errors.billingPhone ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                />
                {errors.billingPhone && <p className="mt-2 text-sm text-red-600">{errors.billingPhone}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF ou CNPJ do pagador <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formatBillingDocumentDisplay(data.billingDocument)}
                  onChange={(e) => handleBillingDocumentChange(e.target.value)}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                    errors.billingDocument ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                />
                {errors.billingDocument && <p className="mt-2 text-sm text-red-600">{errors.billingDocument}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forma preferida de cobrança <span className="text-red-600">*</span>
                </label>
                <select
                  value={data.billingPreferredMethod}
                  onChange={(e) => handleChange('billingPreferredMethod', e.target.value as SignupCompanyStep['billingPreferredMethod'])}
                  className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                >
                  <option value="CARTAO">Cartão recorrente</option>
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">Boleto</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-900 mb-4">Endereço de cobrança</div>
              <div className="grid md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CEP <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formatZipcodeDisplay(data.billingAddressZipcode)}
                    onChange={(e) => handleBillingZipcodeChange(e.target.value)}
                    placeholder="00000-000"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      errors.billingAddressZipcode ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                  {errors.billingAddressZipcode && <p className="mt-2 text-sm text-red-600">{errors.billingAddressZipcode}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rua / logradouro <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.billingAddressStreet}
                    onChange={(e) => handleChange('billingAddressStreet', e.target.value)}
                    placeholder="Ex: Av. Paulista"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      errors.billingAddressStreet ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                  {errors.billingAddressStreet && <p className="mt-2 text-sm text-red-600">{errors.billingAddressStreet}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.billingAddressNumber}
                    onChange={(e) => handleChange('billingAddressNumber', e.target.value)}
                    placeholder="Ex: 1000"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      errors.billingAddressNumber ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                  {errors.billingAddressNumber && <p className="mt-2 text-sm text-red-600">{errors.billingAddressNumber}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={data.billingAddressComplement}
                    onChange={(e) => handleChange('billingAddressComplement', e.target.value)}
                    placeholder="Sala, conjunto, bloco..."
                    className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bairro <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.billingAddressDistrict}
                    onChange={(e) => handleChange('billingAddressDistrict', e.target.value)}
                    placeholder="Ex: Bela Vista"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      errors.billingAddressDistrict ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                  {errors.billingAddressDistrict && <p className="mt-2 text-sm text-red-600">{errors.billingAddressDistrict}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.billingAddressCity}
                    onChange={(e) => handleChange('billingAddressCity', e.target.value)}
                    placeholder="Ex: São Paulo"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      errors.billingAddressCity ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                  {errors.billingAddressCity && <p className="mt-2 text-sm text-red-600">{errors.billingAddressCity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado / UF <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.billingAddressState}
                    onChange={(e) => handleChange('billingAddressState', e.target.value.toUpperCase())}
                    placeholder="Ex: SP"
                    maxLength={20}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      errors.billingAddressState ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                  {errors.billingAddressState && <p className="mt-2 text-sm text-red-600">{errors.billingAddressState}</p>}
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    País <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.billingAddressCountry}
                    onChange={(e) => handleChange('billingAddressCountry', e.target.value)}
                    placeholder="Brasil"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      errors.billingAddressCountry ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                  {errors.billingAddressCountry && <p className="mt-2 text-sm text-red-600">{errors.billingAddressCountry}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-10 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
        >
          Voltar
        </button>
        <button
          onClick={onNext}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 font-medium"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
