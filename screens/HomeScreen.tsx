import React from 'react';
import {StatusBar, StyleSheet, TouchableOpacity, Text, useColorScheme, View} from 'react-native';
import {NewAppScreen} from '@react-native/new-app-screen';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Button} from '../component/button/Button';
import type {RootStackParamList} from '../App';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const safeAreaInsets = useSafeAreaInsets();
  const navigation = useNavigation<HomeNavProp>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NewAppScreen
        templateFileName="App.tsx"
        safeAreaInsets={safeAreaInsets}
      />
      <Button text="DONE" onPress={() => console.log('testing')} />

      {/* Action buttons row */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('Chat')}
          activeOpacity={0.8}>
          <Text style={styles.chatButtonEmoji}>💬</Text>
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => navigation.navigate('AI')}
          activeOpacity={0.8}>
          <Text style={styles.chatButtonEmoji}>✨</Text>
          <Text style={styles.chatButtonText}>AI Studio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonRow: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  chatButton: {
    backgroundColor: '#0A84FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#0A84FF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  aiButton: {
    backgroundColor: '#6B21D6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#BF5AF2',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  chatButtonEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
