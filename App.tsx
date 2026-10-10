import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { CartProvider } from './src/context/CartContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { CartToast } from './src/components/CartToast';
import { NetworkBanner } from './src/components/NetworkBanner';

import { COLORS } from './src/constants/theme';
import { realtimeService } from './src/services/realtime';

const NavigationRoot: React.FC = () => {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer
        ref={navigationRef}
        theme={{
          dark: isDark,
          colors: {
            primary: COLORS.primary,
            background: colors.background,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
            notification: COLORS.primary,
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '800' },
          },
        }}
      >
        <AppNavigator />
      </NavigationContainer>
      <NetworkBanner />
      <CartToast />
    </>
  );
};

export default function App() {
  React.useEffect(() => {
    realtimeService.connect();
  }, []);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <NetworkProvider>
          <CartProvider>
            <NavigationRoot />
          </CartProvider>
        </NetworkProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
