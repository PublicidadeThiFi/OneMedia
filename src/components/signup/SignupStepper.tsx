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
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all font-semibold ${
                step.isCompleted
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : step.isActive
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.isCompleted ? (
                <Check className="w-6 h-6" />
              ) : (
                <span className="text-lg">{step.number}</span>
              )}
            </div>
            <span
              className={`mt-2 text-sm font-medium hidden sm:block ${
                step.isActive ? 'text-blue-600' : step.isCompleted ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {step.title}
            </span>
          </div>

          {/* Connector Line */}
          {index < stepData.length - 1 && (
            <div
              className={`w-16 sm:w-24 h-1 mx-2 rounded-full transition-all ${
                step.isCompleted ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
