
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SplashScreen } from './modules/home/components/SplashScreen';
import { SelectionScreen } from './modules/family/components/SelectionScreen';
import { AppDashboard } from './modules/home/components/AppDashboard';
import { TreeScreen } from './modules/tree/components/TreeScreen';
import { EventsScreen } from './modules/home/components/EventsScreen';
import { FeedScreen } from './modules/home/components/FeedScreen';
import { RegisterScreen } from './modules/home/components/RegisterScreen';
import { LoginScreen } from './modules/home/components/LoginScreen';
import { SportsScreen } from './modules/home/components/SportsScreen';
import { AdminScreen } from './modules/admin/AdminScreen';
import { OnboardingScreen } from './modules/onboarding/OnboardingScreen';
import { ProtectedRoute } from './modules/auth/components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/select" element={<SelectionScreen />} />
        <Route path="/login" element={<LoginScreen />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppDashboard />} />
          <Route path="/tree" element={<TreeScreen />} />
          <Route path="/events" element={<EventsScreen />} />
          <Route path="/feed" element={<FeedScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/sports" element={<SportsScreen />} />
          <Route path="/admin" element={<AdminScreen />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
        </Route>
        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
