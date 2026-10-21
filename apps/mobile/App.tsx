import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import manropeRegular from './assets/fonts/Manrope-Regular.ttf';
import manropeSemiBold from './assets/fonts/Manrope-SemiBold.ttf';
import manropeBold from './assets/fonts/Manrope-Bold.ttf';
import { TypographyProvider } from './src/components/Typography';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { LoginScreen } from './src/screens/LoginScreen';
import { LedgerScreen } from './src/screens/LedgerScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { useOnboarding } from './src/hooks/useOnboarding';
import { colors, fonts } from './src/theme';

function RootScreen() {
  const { session, loading } = useAuth();
  const onboarding = useOnboarding();
  if (loading || onboarding.loading)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  if (session) return <LedgerScreen />;
  if (!onboarding.completed) return <OnboardingScreen onComplete={onboarding.complete} />;
  return <LoginScreen />;
}
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: manropeRegular,
    [fonts.semibold]: manropeSemiBold,
    [fonts.bold]: manropeBold,
  });
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="dark" />
        {!fontsLoaded && !fontError ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator accessibilityLabel="Loading fonts" color={colors.green} />
          </View>
        ) : (
          <TypographyProvider loaded={fontsLoaded}>
            <AuthProvider>
              <RootScreen />
            </AuthProvider>
          </TypographyProvider>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
