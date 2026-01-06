
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SplashScreen } from './modules/home/components/SplashScreen';
import { SelectionScreen } from './modules/family/components/SelectionScreen';
import { AppDashboard } from './modules/home/components/AppDashboard';
import { TreeScreen } from './modules/tree/components/TreeScreen';
import { EventsScreen } from './modules/home/components/EventsScreen';
import { FeedScreen } from './modules/home/components/FeedScreen';
import { RegisterScreen } from './modules/home/components/RegisterScreen';
import { LoginScreen } from './modules/home/components/LoginScreen';
import { EmailRegisterScreen } from './modules/home/components/EmailRegisterScreen';
import { EmailLoginScreen } from './modules/home/components/EmailLoginScreen';
import { VerifyEmailScreen } from './modules/home/components/VerifyEmailScreen';
import { ForgotPasswordScreen } from './modules/home/components/ForgotPasswordScreen';
import { SportsScreen } from './modules/home/components/SportsScreen';
import { DirectoryScreen } from './modules/home/components/DirectoryScreen';
import { AdminScreen } from './modules/admin/AdminScreen';
import { OnboardingScreen } from './modules/onboarding/OnboardingScreen';
import { ProfileScreen } from './modules/profile/ProfileScreen';
import { ProtectedRoute } from './modules/auth/components/ProtectedRoute';
import { ConfirmDialogProvider } from './components/ConfirmDialog';
// Utilities
import { UtilitiesScreen } from './modules/utilities/UtilitiesScreen';
import { WhoIsWhoGame } from './modules/utilities/components/WhoIsWhoGame';
import { DominoScorekeeper } from './modules/utilities/components/DominoScorekeeper';
import { BasketScorekeeper } from './modules/utilities/components/BasketScorekeeper';

function App() {
  return (
    <ConfirmDialogProvider>
      <Router>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/select" element={<SelectionScreen />} />
          <Route path="/login" element={<LoginScreen />} />

          {/* Email Authentication Routes */}
          <Route path="/register-email" element={<EmailRegisterScreen />} />
          <Route path="/login-email" element={<EmailLoginScreen />} />
          <Route path="/verify-email" element={<VerifyEmailScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppDashboard />} />
            <Route path="/tree" element={<TreeScreen />} />
            <Route path="/events" element={<EventsScreen />} />
            <Route path="/feed" element={<FeedScreen />} />
            <Route path="/register" element={<RegisterScreen />} />
            <Route path="/sports" element={<SportsScreen />} />
            <Route path="/directory" element={<DirectoryScreen />} />
            <Route path="/admin" element={<AdminScreen />} />
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            {/* Utilities */}
            <Route path="/utilities" element={<UtilitiesScreen />} />
            <Route path="/utilities/who-is-who" element={<WhoIsWhoGame />} />
            <Route path="/utilities/domino" element={<DominoScorekeeper />} />
            <Route path="/utilities/basket" element={<BasketScorekeeper />} />
          </Route>
          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ConfirmDialogProvider>
  );
}

export default App;
