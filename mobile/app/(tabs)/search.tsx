/**
 * Search screen
 */

import { View, Text, TextInput } from 'react-native';
import { useState } from 'react';

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  return (
    <View className="flex-1 bg-white p-4">
      <TextInput
        className="bg-gray-100 p-3 rounded-lg text-base"
        placeholder="Search clips, users, games..."
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />
      
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500 text-center">
          {query ? `Searching for "${query}"...` : 'Enter a search query'}
        </Text>
      </View>
    </View>
  );
}
