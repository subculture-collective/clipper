import React, { useState } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';

interface CommentComposerProps {
    onSubmit: (content: string) => void;
    onCancel?: () => void;
    isLoading?: boolean;
    placeholder?: string;
    initialValue?: string;
    autoFocus?: boolean;
    showCancel?: boolean;
}

export function CommentComposer({
    onSubmit,
    onCancel,
    isLoading = false,
    placeholder = 'Write a comment...',
    initialValue = '',
    autoFocus = false,
    showCancel = false,
}: CommentComposerProps) {
    const [content, setContent] = useState(initialValue);

    const handleSubmit = () => {
        if (content.trim() && !isLoading) {
            onSubmit(content.trim());
            setContent('');
        }
    };

    const handleCancel = () => {
        setContent('');
        onCancel?.();
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View className="border-t border-gray-200 bg-white p-3">
                <View className="flex-row items-start gap-2">
                    <TextInput
                        className="flex-1 min-h-[40px] max-h-[120px] border border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900"
                        placeholder={placeholder}
                        placeholderTextColor="#9ca3af"
                        value={content}
                        onChangeText={setContent}
                        multiline
                        autoFocus={autoFocus}
                        editable={!isLoading}
                        textAlignVertical="top"
                    />

                    <View className="flex-row gap-2">
                        {showCancel && (
                            <TouchableOpacity
                                onPress={handleCancel}
                                disabled={isLoading}
                                className="h-[40px] px-4 items-center justify-center rounded-lg bg-gray-100 active:bg-gray-200"
                            >
                                <Text className="text-sm font-semibold text-gray-700">
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={!content.trim() || isLoading}
                            className={`h-[40px] px-4 items-center justify-center rounded-lg ${
                                !content.trim() || isLoading
                                    ? 'bg-gray-300'
                                    : 'bg-primary-600 active:bg-primary-700'
                            }`}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text className="text-sm font-semibold text-white">
                                    Post
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
