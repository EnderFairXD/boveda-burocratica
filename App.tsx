import './global.css';
import { StatusBar } from 'expo-status-bar';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';

export default function App() {
  return (
    <AuthScreen>
      <DashboardScreen />
      <StatusBar style="light" />
    </AuthScreen>
  );
}
