import './global.css';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { useOTAUpdates } from './src/hooks/useOTAUpdates';

export default function App() {
  useOTAUpdates();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthScreen>
        <DashboardScreen />
        <StatusBar style="light" />
      </AuthScreen>
    </GestureHandlerRootView>
  );
}
