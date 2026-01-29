"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  content: string;
}

const getRoleBasedSteps = (role: string): OnboardingStep[] => {
  const baseSteps = [
    {
      title: "Welcome to payrollbook",
      description: "Your complete attendance management solution",
      icon: "🏢",
      content:
        "payrollbook helps you manage employee attendance, track working hours, and generate payroll reports efficiently.",
    },
  ];

  switch (role) {
    case "MANAGER":
      return [
        ...baseSteps,
        {
          title: "Manager Dashboard",
          description: "Oversee your team operations",
          icon: "👔",
          content:
            "Access comprehensive dashboards to monitor team attendance, approve requests, and manage operations.",
        },
        {
          title: "Approve Attendance",
          description: "Review and approve attendance records",
          icon: "✅",
          content:
            "Review attendance submissions, approve or reject requests, and maintain accurate time records.",
        },
        {
          title: "Team Reports",
          description: "Generate performance insights",
          icon: "📊",
          content:
            "Access detailed reports on team attendance patterns, working hours, and productivity metrics.",
        },
      ];
    case "ACCOUNTANT":
      return [
        ...baseSteps,
        {
          title: "Financial Dashboard",
          description: "Manage payroll and expenses",
          icon: "💰",
          content:
            "Access salary calculations, expense tracking, and financial reporting tools.",
        },
        {
          title: "Salary Processing",
          description: "Calculate and process salaries",
          icon: "🧮",
          content:
            "Process payroll calculations based on attendance data and generate salary reports.",
        },
        {
          title: "Financial Reports",
          description: "Generate expense and payroll reports",
          icon: "📈",
          content:
            "Create detailed financial reports, track company expenses, and analyze cost patterns.",
        },
      ];
    case "STAFF":
      return [
        ...baseSteps,
        {
          title: "Mark Attendance",
          description: "Easy attendance tracking",
          icon: "📱",
          content:
            "Use your mobile device to mark attendance by taking a photo. Our system automatically records your location and time.",
        },
        {
          title: "View Records",
          description: "Access your attendance history",
          icon: "📅",
          content:
            "View your attendance records, working hours, and salary details in your personal dashboard.",
        },
        {
          title: "Stay Updated",
          description: "Receive important notifications",
          icon: "🔔",
          content:
            "Get notified about attendance reminders, salary updates, and important company announcements.",
        },
      ];
    default:
      return [
        ...baseSteps,
        {
          title: "Get Started",
          description: "Begin using payrollbook",
          icon: "🚀",
          content:
            "Explore your dashboard, mark attendance, and start managing your work efficiently.",
        },
      ];
  }
};

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  role: string;
}

export default function OnboardingModal({
  isOpen,
  onComplete,
  role,
}: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const onboardingSteps = getRoleBasedSteps(role);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">{step.icon}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {step.title}
              </h2>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-2 bg-gray-50">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / onboardingSteps.length) * 100}%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>
              {currentStep + 1} of {onboardingSteps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-blue-600 hover:text-blue-800"
            >
              Skip
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">{step.icon}</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {step.title}
            </h3>
            <p className="text-gray-600 leading-relaxed">{step.content}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <div className="flex space-x-1">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <span>{isLastStep ? "Get Started" : "Next"}</span>
            {isLastStep ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
