import './global.css';
import { StatusBar } from 'expo-status-bar';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { useOTAUpdates } from './src/hooks/useOTAUpdates';

export default function App() {
  useOTAUpdates();

  return (
    <AuthScreen>
      <DashboardScreen />
      <StatusBar style="light" />
    </AuthScreen>
  );
}
