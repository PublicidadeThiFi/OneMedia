import { useState, useEffect } from 'react';
import { useNavigation } from '../App';
import { SignupStepper } from '../components/signup/SignupStepper';
import { Step1Plan } from '../components/signup/Step1Plan';
import { Step2Company } from '../components/signup/Step2Company';
import { Step3User } from '../components/signup/Step3User';
import { SuccessScreen } from '../components/signup/SuccessScreen';
import {
  SignupPlanStep,
  SignupCompanyStep,
  SignupUserStep,
  SignupPayload,
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
    
    if (planRange && PLAN_DEFINITIONS.find((p) => p.range === planRange)) {
      setStep1Data({
        estimatedPoints: null,
        selectedPlanRange: planRange,
        selectedPlatformPlanId: `plan-${planRange}`, // Temporary mock ID
      });
    }
  }, []);

  // Step 1 validation
  const validateStep1 = (): boolean => {
    if (!step1Data.selectedPlanRange) {
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

    // Build the signup payload
    const payload: SignupPayload = {
      plan: {
        platformPlanId: step1Data.selectedPlatformPlanId!,
        planRange: step1Data.selectedPlanRange!,
      },
      company: {
        fantasyName: step2Data.fantasyName,
        legalName: step2Data.legalName || undefined,
        cnpj: onlyDigits(step2Data.cnpj), // Send only digits
        phone: step2Data.phone ? onlyDigits(step2Data.phone) : undefined, // Send only digits
        website: step2Data.website || undefined,
        city: step2Data.city || undefined,
        state: step2Data.state || undefined,
        country: step2Data.country || undefined,
      },
      adminUser: {
        name: step3Data.name,
        email: step3Data.email,
        phone: onlyDigits(step3Data.phone), // Send only digits
        password: step3Data.password, // Send plain password - backend will hash it
      },
    };

    // TODO: Implement API call to POST /api/signup
    // This should create:
    // 1. Company with subscriptionStatus = TRIAL
    // 2. User with role ADMINISTRATIVO linked to Company
    // 3. PlatformSubscription with:
    //    - planId from selected plan
    //    - status = TRIAL
    //    - maxOwnersPerMediaPoint = 1 (default: 1 proprietário por ponto)
    //    - addonExtraStorage = false
    //    - currentPeriodStart = now
    //    - currentPeriodEnd = now + 30 days (or 14 days per v2)
    
    console.log('Signup payload (TODO: send to API):', payload);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsLoading(false);
    setIsSuccess(true);

    // TODO: When API is integrated, handle errors and show appropriate messages
    // If successful, show success screen
    // If error, show error toast and keep user on step 3
  };

  const stepTitles = ['Plano', 'Empresa', 'Acesso'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">OOH</span>
            </div>
            <span className="text-lg text-gray-900">OOH Manager</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-[#4F46E5] transition-colors"
          >
            Voltar ao site
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isSuccess ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
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