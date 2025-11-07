/**
 * FilterChip - A chip component for displaying active filters
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type FilterChipProps = {
    label: string;
    onRemove?: () => void;
    variant?: 'default' | 'primary';
};

export function FilterChip({
    label,
    onRemove,
    variant = 'default',
}: FilterChipProps) {
    const isPrimary = variant === 'primary';

    return (
        <View
            className={`flex-row items-center px-3 py-1.5 rounded-full mr-2 mb-2 ${
                isPrimary ? 'bg-sky-500' : 'bg-gray-200'
            }`}
        >
            <Text
                className={`text-sm ${
                    isPrimary ? 'text-white font-medium' : 'text-gray-700'
                }`}
            >
                {label}
            </Text>
            {onRemove && (
                <TouchableOpacity
                    onPress={onRemove}
                    className="ml-1.5"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons
                        name="close-circle"
                        size={16}
                        color={isPrimary ? '#ffffff' : '#6b7280'}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
}
