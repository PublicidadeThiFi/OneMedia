import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SignupCompanyStep } from '../../types/signup';
import { 
  onlyDigits, 
  formatPhoneDisplay, 
  handlePhoneInput,
  formatCNPJDisplay 
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

export function Step2Company({ data, onChange, onNext, onBack, errors }: Step2CompanyProps) {
  // Phone state management
  const [phoneDigits, setPhoneDigits] = useState(onlyDigits(data.phone));
  
  // State/UF autocomplete
  const [stateQuery, setStateQuery] = useState(data.state);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateResults, setStateResults] = useState(BRAZILIAN_STATES);

  const handleChange = (field: keyof SignupCompanyStep, value: string) => {
    onChange({ ...data, [field]: value });
  };

  // CNPJ formatting
  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJDisplay(value);
    handleChange('cnpj', formatted);
  };

  // Phone handling
  const handlePhoneChange = (value: string) => {
    const digits = handlePhoneInput(value);
    setPhoneDigits(digits);
    handleChange('phone', digits); // Store only digits
  };

  // State/UF handling
  const handleStateInputChange = (value: string) => {
    setStateQuery(value);
    setShowStateDropdown(true);
    
    const results = searchStates(value);
    setStateResults(results);
    
    // If exact match by UF, update the actual state field
    const exactMatch = BRAZILIAN_STATES.find(
      s => s.uf.toUpperCase() === value.toUpperCase()
    );
    if (exactMatch) {
      handleChange('state', exactMatch.uf);
    }
  };

  const handleStateSelect = (uf: string, name: string) => {
    setStateQuery(uf);
    handleChange('state', uf);
    setShowStateDropdown(false);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-gray-900 mb-2">Dados da empresa</h2>
        <p className="text-gray-600">
          Essas informações serão usadas para notas, contratos e relatórios.
        </p>
      </div>

      <div className="space-y-5 mb-8">
        {/* Nome Fantasia */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Nome fantasia da empresa <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={data.fantasyName}
            onChange={(e) => handleChange('fantasyName', e.target.value)}
            placeholder="Ex: Outdoor Brasil Publicidade"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
              errors.fantasyName ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.fantasyName && (
            <p className="mt-1 text-sm text-red-600">{errors.fantasyName}</p>
          )}
        </div>

        {/* Razão Social */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Razão social
          </label>
          <input
            type="text"
            value={data.legalName}
            onChange={(e) => handleChange('legalName', e.target.value)}
            placeholder="Ex: Outdoor Brasil Publicidade Ltda"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          />
        </div>

        {/* CNPJ */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            CNPJ <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={data.cnpj}
            onChange={(e) => handleCNPJChange(e.target.value)}
            placeholder="00.000.000/0000-00"
            maxLength={18}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
              errors.cnpj ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.cnpj && (
            <p className="mt-1 text-sm text-red-600">{errors.cnpj}</p>
          )}
        </div>

        {/* Grid 2 columns */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Telefone */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Telefone / WhatsApp
            </label>
            <input
              type="tel"
              value={formatPhoneDisplay(phoneDigits)}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(11) 99999-9999"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              10 ou 11 dígitos (com DDD)
            </p>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Site
            </label>
            <input
              type="url"
              value={data.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://www.exemplo.com.br"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
            />
          </div>
        </div>

        {/* Grid 3 columns - Location */}
        <div className="grid md:grid-cols-3 gap-5">
          {/* UF / Estado */}
          <div className="relative">
            <label className="block text-sm text-gray-700 mb-2">
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
                  // Delay to allow click on dropdown item
                  setTimeout(() => setShowStateDropdown(false), 200);
                }}
                placeholder="SP ou São Paulo"
                maxLength={20}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
                  errors.state ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.state && (
              <p className="mt-1 text-sm text-red-600">{errors.state}</p>
            )}
            
            {/* State Dropdown */}
            {showStateDropdown && stateResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {stateResults.map((state) => (
                  <button
                    key={state.uf}
                    type="button"
                    onMouseDown={() => handleStateSelect(state.uf, state.name)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                  >
                    <span className="text-gray-700">{state.uf}</span>
                    <span className="text-gray-500 ml-2">- {state.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cidade */}
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">
              Cidade
            </label>
            <input
              type="text"
              value={data.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="Ex: São Paulo"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
                errors.city ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-600">{errors.city}</p>
            )}
          </div>

          {/* País */}
          <div className="md:col-span-3">
            <label className="block text-sm text-gray-700 mb-2">
              País
            </label>
            <input
              type="text"
              value={data.country}
              onChange={(e) => handleChange('country', e.target.value)}
              placeholder="Brasil"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
            />
          </div>
        </div>

        {/* Estimativa de usuários */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Número estimado de usuários internos
          </label>
          <input
            type="text"
            value={data.estimatedUsers}
            onChange={(e) => handleChange('estimatedUsers', e.target.value)}
            placeholder="Ex: 5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          />
          <p className="mt-1 text-xs text-gray-500">
            Apenas para inteligência comercial, não afeta o plano
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={onNext}
          className="bg-[#4F46E5] text-white px-8 py-3 rounded-lg hover:bg-[#4338CA] transition-colors"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}