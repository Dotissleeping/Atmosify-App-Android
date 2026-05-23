import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import MainScreen from './src/screens/MainScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" translucent />
      <MainScreen />
    </SafeAreaProvider>
  );
}
