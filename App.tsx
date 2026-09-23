import './global.css';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { UpdateBanner } from './src/components/UpdateBanner';
import { useOTAUpdates } from './src/hooks/useOTAUpdates';

export default function App() {
  const { status, applyUpdate } = useOTAUpdates();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthScreen>
        <UpdateBanner status={status} onPress={applyUpdate} />
        <DashboardScreen />
        <StatusBar style="light" />
      </AuthScreen>
    </GestureHandlerRootView>
  );
}
