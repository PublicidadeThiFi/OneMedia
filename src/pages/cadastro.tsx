import { useState, useEffect } from 'react';
import { useNavigation } from '../App';
import { SignupStepper } from '../components/signup/SignupStepper';
import { Step1Plan } from '../components/signup/Step1Plan';
import { Step2Company } from '../components/signup/Step2Company';
import { Step3User } from '../components/signup/Step3User';
import { SuccessScreen } from '../components/signup/SuccessScreen';
import imgOnemediaLogo from '../assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';
import {
  SignupPlanStep,
  SignupCompanyStep,
  SignupUserStep,
  SignupRequestDto,
  PlanRange,
  PLAN_DEFINITIONS,
} from '../types/signup';
import { 
  onlyDigits, 
  isValidPhone, 
  isValidCNPJ,
  isValidEmail,
  validatePasswordRequirements 
} from '../lib/validators';

import { publicApiClient } from '../lib/apiClient';

export default function Cadastro() {
  const navigate = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Step data
  const [step1Data, setStep1Data] = useState<SignupPlanStep>({
    estimatedPoints: null,
    selectedPlanRange: null,
    selectedPlatformPlanId: null,
  });

  const [step2Data, setStep2Data] = useState<SignupCompanyStep>({
    fantasyName: '',
    legalName: '',
    cnpj: '',
    phone: '',
    website: '',
    city: '',
    state: '',
    country: 'Brasil',
    estimatedUsers: '',
  });

  const [step3Data, setStep3Data] = useState<SignupUserStep>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  });

  // Errors
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});

  // Handle pre-selected plan from query string
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planRange = urlParams.get('planRange') as PlanRange | null;
    
    const plan = planRange ? PLAN_DEFINITIONS.find((p) => p.range === planRange) : undefined;
    if (planRange && plan) {
      setStep1Data({
        estimatedPoints: null,
        selectedPlanRange: planRange,
        selectedPlatformPlanId: plan.id,
      });
    }
  }, []);

  // Step 1 validation
  const validateStep1 = (): boolean => {
    if (!step1Data.selectedPlanRange || !step1Data.selectedPlatformPlanId) {
      setStep1Error('Selecione um plano para continuar');
      return false;
    }
    setStep1Error(null);
    return true;
  };

  // Step 2 validation
  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!step2Data.fantasyName.trim()) {
      errors.fantasyName = 'Nome fantasia é obrigatório';
    }

    if (!step2Data.cnpj.trim()) {
      errors.cnpj = 'CNPJ é obrigatório';
    } else if (!isValidCNPJ(step2Data.cnpj)) {
      errors.cnpj = 'CNPJ deve ter 14 dígitos';
    }

    // Phone validation (optional field)
    if (step2Data.phone && !isValidPhone(step2Data.phone)) {
      errors.phone = 'Telefone deve ter 10 ou 11 dígitos (com DDD)';
    }

    setStep2Errors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 3 validation
  const validateStep3 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!step3Data.name.trim()) {
      errors.name = 'Nome completo é obrigatório';
    }

    if (!step3Data.email.trim()) {
      errors.email = 'E-mail é obrigatório';
    } else if (!isValidEmail(step3Data.email)) {
      errors.email = 'E-mail inválido';
    }

    if (!step3Data.phone.trim()) {
      errors.phone = 'Telefone é obrigatório';
    } else if (!isValidPhone(step3Data.phone)) {
      errors.phone = 'Telefone deve ter 10 ou 11 dígitos (com DDD)';
    }

    // Strong password validation
    if (!step3Data.password) {
      errors.password = 'Senha é obrigatória';
    } else {
      const passwordReqs = validatePasswordRequirements(step3Data.password);
      if (!passwordReqs.isValid) {
        const missing: string[] = [];
        if (!passwordReqs.minLength) missing.push('8 caracteres');
        if (!passwordReqs.hasUpperCase) missing.push('1 letra maiúscula');
        if (!passwordReqs.hasNumber) missing.push('1 número');
        if (!passwordReqs.hasSpecialChar) missing.push('1 caractere especial');
        errors.password = `A senha deve conter: ${missing.join(', ')}`;
      }
    }

    if (step3Data.password !== step3Data.confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem';
    }

    if (!step3Data.acceptedTerms) {
      errors.acceptedTerms = 'Você deve aceitar os termos para continuar';
    }

    setStep3Errors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle step 1 next
  const handleStep1Next = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  // Handle step 2 next
  const handleStep2Next = () => {
    if (validateStep2()) {
      setCurrentStep(3);
    }
  };

  // Handle final submit
  const handleSubmit = async () => {
    if (!validateStep3()) {
      return;
    }

    setIsLoading(true);

    try {
      // Safety: if for some reason planId wasn't set, send user back to step 1.
      if (!step1Data.selectedPlatformPlanId) {
        setCurrentStep(1);
        setStep1Error('Selecione um plano para continuar');
        return;
      }

      const estimatedUsers = step2Data.estimatedUsers?.trim()
        ? Number(onlyDigits(step2Data.estimatedUsers))
        : undefined;

      const dto: SignupRequestDto = {
        planId: step1Data.selectedPlatformPlanId,
        companyName: step2Data.fantasyName,
        cnpj: step2Data.cnpj ? onlyDigits(step2Data.cnpj) : undefined,
        companyPhone: step2Data.phone ? onlyDigits(step2Data.phone) : undefined,
        site: step2Data.website || undefined,
        addressCity: step2Data.city || undefined,
        addressState: step2Data.state || undefined,
        addressCountry: step2Data.country || undefined,
        estimatedUsers:
          typeof estimatedUsers === 'number' && !Number.isNaN(estimatedUsers)
            ? estimatedUsers
            : undefined,

        adminName: step3Data.name,
        adminEmail: step3Data.email,
        adminPhone: step3Data.phone ? onlyDigits(step3Data.phone) : undefined,
        adminPassword: step3Data.password,
        adminPasswordConfirmation: step3Data.confirmPassword,

        acceptTerms: !!step3Data.acceptedTerms,
      };

      await publicApiClient.post('/signup', dto);

      setIsSuccess(true);
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      const message = Array.isArray(apiMessage)
        ? apiMessage.join('\n')
        : typeof apiMessage === 'string'
          ? apiMessage
          : 'Erro ao criar conta. Verifique os dados e tente novamente.';

      setStep3Errors({ api: message });
    } finally {
      setIsLoading(false);
    }
  };

  const stepTitles = ['Plano', 'Empresa', 'Acesso'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={imgOnemediaLogo} alt="OneMedia" className="h-12" />
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-700 hover:text-blue-600 transition-colors"
          >
            Voltar ao site
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isSuccess ? (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-12">
            <SuccessScreen
              companyName={step2Data.fantasyName}
              userEmail={step3Data.email}
            />
          </div>
        ) : (
          <>
            {/* Stepper */}
            <SignupStepper currentStep={currentStep} steps={stepTitles} />

            {/* Step Content */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 mt-8">
              {currentStep === 1 && (
                <Step1Plan
                  data={step1Data}
                  onChange={setStep1Data}
                  onNext={handleStep1Next}
                  error={step1Error}
                />
              )}

              {currentStep === 2 && (
                <Step2Company
                  data={step2Data}
                  onChange={setStep2Data}
                  onNext={handleStep2Next}
                  onBack={() => setCurrentStep(1)}
                  errors={step2Errors}
                />
              )}

              {currentStep === 3 && (
                <Step3User
                  data={step3Data}
                  onChange={setStep3Data}
                  onSubmit={handleSubmit}
                  onBack={() => setCurrentStep(2)}
                  errors={step3Errors}
                  isLoading={isLoading}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}