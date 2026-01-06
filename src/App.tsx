
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
import { TicTacToeUltimate } from './modules/utilities/components/TicTacToeUltimate';
import { BattleshipGame } from './modules/utilities/components/BattleshipGame';
import { TimelineGame } from './modules/utilities/components/TimelineGame';
import { SnakeGame } from './modules/utilities/components/SnakeGame';
import { SpaceInvadersGame } from './modules/utilities/components/SpaceInvadersGame';
import { WordSearchGame } from './modules/utilities/components/WordSearchGame';
import { CompassGame } from './modules/utilities/components/CompassGame';
import { BlackJackOnline } from './modules/utilities/components/BlackJackOnline';
import { AngelitoGame } from './modules/utilities/components/AngelitoGame';

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

          {/* Public Utilities - No login required */}
          <Route path="/utilities" element={<UtilitiesScreen />} />
          <Route path="/utilities/domino" element={<DominoScorekeeper />} />
          <Route path="/utilities/basket" element={<BasketScorekeeper />} />
          <Route path="/utilities/tictactoe" element={<TicTacToeUltimate />} />
          <Route path="/utilities/battleship" element={<BattleshipGame />} />
          <Route path="/utilities/timeline" element={<TimelineGame />} />
          <Route path="/utilities/snake" element={<SnakeGame />} />
          <Route path="/utilities/space-invaders" element={<SpaceInvadersGame />} />
          <Route path="/utilities/word-search" element={<WordSearchGame />} />
          <Route path="/utilities/compass" element={<CompassGame />} />
          <Route path="/utilities/blackjack" element={<BlackJackOnline />} />

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
            {/* Who-is-Who needs photos from API */}
            <Route path="/utilities/who-is-who" element={<WhoIsWhoGame />} />
            <Route path="/utilities/angelito" element={<AngelitoGame />} />
          </Route>
          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ConfirmDialogProvider>
  );
}

export default App;
