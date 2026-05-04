import React from 'react';

type OrderStepperProps = {
  currentStep: 1 | 2 | 3 | 4;
};

const steps = ['Đã đặt', 'Xác nhận', 'Đang giao', 'Thành công'];

const OrderStepper: React.FC<OrderStepperProps> = ({ currentStep }) => {
  return (
    <div className="flex w-full flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        {steps.map((label, index) => {
          const stepIndex = index + 1;
          const isCompleted = stepIndex < currentStep;
          const isActive = stepIndex === currentStep;

          return (
            <div key={label} className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-blue-500 text-white'
                      : 'border border-slate-300 bg-white text-slate-400'
                  }`}
                >
                  {stepIndex}
                </div>
                <div className="min-w-0 text-sm font-medium text-slate-700">{label}</div>
              </div>
              {index < steps.length - 1 && (
                <div className="mt-3 h-1 w-full rounded-full bg-slate-200">
                  <div
                    className={`h-1 rounded-full transition-all duration-300 ${
                      stepIndex < currentStep ? 'w-full bg-emerald-500' : isActive ? 'w-1/2 bg-blue-500' : 'w-0 bg-transparent'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderStepper;
