import { Check } from 'lucide-react';

type Step = {
  number: number;
  title: string;
  isCompleted: boolean;
  isActive: boolean;
};

type SignupStepperProps = {
  currentStep: number;
  steps: string[];
};

export function SignupStepper({ currentStep, steps }: SignupStepperProps) {
  const stepData: Step[] = steps.map((title, index) => ({
    number: index + 1,
    title,
    isCompleted: index < currentStep - 1,
    isActive: index === currentStep - 1,
  }));

  return (
    <div className="flex items-center justify-center mb-8">
      {stepData.map((step, index) => (
        <div key={step.number} className="flex items-center">
          {/* Step Circle */}
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                step.isCompleted
                  ? 'bg-green-600 text-white'
                  : step.isActive
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.isCompleted ? (
                <Check className="w-5 h-5" />
              ) : (
                <span>{step.number}</span>
              )}
            </div>
            <span
              className={`mt-2 text-sm hidden sm:block ${
                step.isActive ? 'text-[#4F46E5]' : 'text-gray-500'
              }`}
            >
              {step.title}
            </span>
          </div>

          {/* Connector Line */}
          {index < stepData.length - 1 && (
            <div
              className={`w-16 sm:w-24 h-0.5 mx-2 transition-all ${
                step.isCompleted ? 'bg-green-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
