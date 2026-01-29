"use client";

import { useState } from "react";
import {
  X,
  CreditCard,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  ChevronRight,
} from "lucide-react";

interface SalaryActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string) => void;
}

export default function SalaryActionModal({
  isOpen,
  onClose,
  onSelectAction,
}: SalaryActionModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    {
      id: "company_paid",
      title: "Company Paid Staff",
      description: "Money company gave to staff",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      actions: [
        {
          id: "add_payment",
          title: "Company Paid Staff",
          description: "Record salary payment to staff",
        },
      ],
    },
    {
      id: "staff_paid",
      title: "Staff Paid Company",
      description: "Money staff gave back to company",
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
      actions: [
        {
          id: "recover_payment",
          title: "Staff Paid Company",
          description: "Record money received from staff",
        },
        {
          id: "add_deduction",
          title: "Add Deduction",
          description: "Deduct from staff salary",
        },
      ],
    },
  ];

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleActionSelect = (actionId: string) => {
    onSelectAction(actionId);
    onClose();
    setSelectedCategory(null);
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  if (!isOpen) return null;

  const selectedCategoryData = categories.find(
    (cat) => cat.id === selectedCategory,
  );

  return (
    <>
      {/* Mobile Bottom Sheet */}
      <div
        className="fixed inset-x-0 -bottom-5 z-50 transform transition-transform duration-300 ease-out md:hidden"
        style={{ transform: isOpen ? "translateY(0)" : "translateY(100%)" }}
      >
        <div className="bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-hidden">
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
            <div className="flex items-center">
              {selectedCategory && (
                <button
                  onClick={handleBack}
                  className="mr-3 p-1 cursor-pointer text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </button>
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedCategory
                  ? selectedCategoryData?.title
                  : "Salary Actions"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 cursor-pointer hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[80vh]">
            {!selectedCategory ? (
              /* Main Categories */
              <div className="p-6 space-y-4">
                {categories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className="w-full p-4 cursor-pointer bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 ${category.bgColor} rounded-xl`}>
                          <IconComponent
                            className={`h-6 w-6 ${category.color}`}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-gray-900">
                            {category.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {category.description}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Actions for Selected Category */
              <div className="p-6 space-y-4">
                {selectedCategoryData?.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionSelect(action.id)}
                    className="w-full p-4 cursor-pointer bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">
                          {action.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Modal */}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center   backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center">
              {selectedCategory && (
                <button
                  onClick={handleBack}
                  className="mr-3 p-1 cursor-pointer text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </button>
              )}
              <h3 className="text-xl font-bold text-gray-900">
                {selectedCategory
                  ? selectedCategoryData?.title
                  : "Salary Actions"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 cursor-pointer hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-105"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[60vh]">
            {!selectedCategory ? (
              /* Main Categories */
              <div className="p-6 space-y-4">
                {categories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className="w-full p-4 bg-white border cursor-pointer border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left group"
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`p-3 ${category.bgColor} rounded-xl group-hover:scale-105 transition-transform`}
                        >
                          <IconComponent
                            className={`h-6 w-6 ${category.color}`}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-gray-900">
                            {category.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {category.description}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Actions for Selected Category */
              <div className="p-6 space-y-4">
                {selectedCategoryData?.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionSelect(action.id)}
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">
                          {action.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
