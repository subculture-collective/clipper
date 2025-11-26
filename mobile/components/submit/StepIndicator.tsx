/**
 * Step Indicator Component
 * Shows progress through the multi-step submission wizard
 */

import { View, Text } from 'react-native';

interface StepIndicatorProps {
    currentStep: number;
    totalSteps: number;
    steps: string[];
}

export default function StepIndicator({
    currentStep,
    totalSteps,
    steps,
}: StepIndicatorProps) {
    return (
        <View className="py-4">
            {/* Progress Bar */}
            <View className="flex-row items-center mb-4">
                {Array.from({ length: totalSteps }).map((_, index) => (
                    <View
                        key={index}
                        className="flex-1 flex-row items-center"
                    >
                        {/* Circle */}
                        <View
                            className={`w-8 h-8 rounded-full items-center justify-center ${
                                index < currentStep
                                    ? 'bg-primary-600'
                                    : index === currentStep
                                      ? 'bg-primary-600'
                                      : 'bg-gray-300'
                            }`}
                        >
                            <Text
                                className={`text-sm font-semibold ${
                                    index <= currentStep
                                        ? 'text-white'
                                        : 'text-gray-600'
                                }`}
                            >
                                {index + 1}
                            </Text>
                        </View>
                        {/* Line */}
                        {index < totalSteps - 1 && (
                            <View
                                className={`flex-1 h-1 mx-2 ${
                                    index < currentStep
                                        ? 'bg-primary-600'
                                        : 'bg-gray-300'
                                }`}
                            />
                        )}
                    </View>
                ))}
            </View>
            {/* Step Label */}
            <Text className="text-sm text-center text-gray-600">
                Step {currentStep + 1} of {totalSteps}: {steps[currentStep]}
            </Text>
        </View>
    );
}
