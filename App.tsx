import './global.css';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { UpdateBanner } from './src/components/UpdateBanner';
import { useGithubUpdate } from './src/hooks/useGithubUpdate';

export default function App() {
  const { status, latestVersion, applyUpdate } = useGithubUpdate();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthScreen>
        <UpdateBanner status={status} latestVersion={latestVersion} onPress={applyUpdate} />
        <DashboardScreen />
        <StatusBar style="light" />
      </AuthScreen>
    </GestureHandlerRootView>
  );
}
