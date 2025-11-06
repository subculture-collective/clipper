import React from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface VoteButtonsProps {
    voteScore: number;
    userVote?: number; // 1 for upvote, -1 for downvote, 0 for no vote
    onUpvote: () => void;
    onDownvote: () => void;
    isLoading?: boolean;
    size?: 'small' | 'medium';
}

export function VoteButtons({
    voteScore,
    userVote,
    onUpvote,
    onDownvote,
    isLoading = false,
    size = 'medium',
}: VoteButtonsProps) {
    const isSmall = size === 'small';
    const iconSize = isSmall ? 'text-lg' : 'text-2xl';
    const scoreSize = isSmall ? 'text-sm' : 'text-base';
    const padding = isSmall ? 'p-1' : 'p-2';

    return (
        <View className="flex-row items-center gap-1">
            {/* Upvote Button */}
            <TouchableOpacity
                onPress={onUpvote}
                disabled={isLoading}
                className={`${padding} rounded active:opacity-50`}
            >
                <Text
                    className={`${iconSize} ${
                        userVote === 1 ? 'text-orange-500' : 'text-gray-500'
                    }`}
                >
                    ⬆
                </Text>
            </TouchableOpacity>

            {/* Score Display */}
            <View className="min-w-[32px] items-center">
                {isLoading ? (
                    <ActivityIndicator size="small" color="#6b7280" />
                ) : (
                    <Text
                        className={`${scoreSize} font-semibold ${
                            userVote === 1
                                ? 'text-orange-500'
                                : userVote === -1
                                ? 'text-blue-500'
                                : 'text-gray-700'
                        }`}
                    >
                        {voteScore}
                    </Text>
                )}
            </View>

            {/* Downvote Button */}
            <TouchableOpacity
                onPress={onDownvote}
                disabled={isLoading}
                className={`${padding} rounded active:opacity-50`}
            >
                <Text
                    className={`${iconSize} ${
                        userVote === -1 ? 'text-blue-500' : 'text-gray-500'
                    }`}
                >
                    ⬇
                </Text>
            </TouchableOpacity>
        </View>
    );
}
