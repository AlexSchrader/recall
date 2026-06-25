import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import HomePage from './pages/HomePage.jsx';
import CoursePage from './pages/CoursePage.jsx';
import UnitPage from './pages/UnitPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import QuizResultPage from './pages/QuizResultPage.jsx';
import ChatListPage from './pages/ChatListPage.jsx';
import ChatThreadPage from './pages/ChatThreadPage.jsx';
import FlashcardsPage from './pages/FlashcardsPage.jsx';
import DeckPage from './pages/DeckPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import StudyGuidePage from './pages/StudyGuidePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import FeedbackPage from './pages/FeedbackPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import GamesPage from './pages/GamesPage.jsx';
import SpeedRoundPage from './pages/games/SpeedRoundPage.jsx';
import StreakChallengePage from './pages/games/StreakChallengePage.jsx';
import MatchItPage from './pages/games/MatchItPage.jsx';

function AppRoutes() {
  const { user, prefs } = useAuth();
  const location = useLocation();
  const authLoading = user === undefined;
  const prefsLoading = user && prefs === undefined;
  if (authLoading || prefsLoading) return null;

  // First-time users — redirect to onboarding unless already there
  if (user && prefs && !prefs.onboardingDone && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Routes>
      <Route path="/onboarding" element={user ? <OnboardingPage /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<div className="page"><HomePage /></div>} />
          <Route path="/courses/:courseId" element={<div className="page"><CoursePage /></div>} />
          <Route path="/units/:unitId" element={<div className="page"><UnitPage /></div>} />
          <Route path="/quizzes/:quizId" element={<div className="page"><QuizPage /></div>} />
          <Route path="/quizzes/:quizId/results" element={<div className="page"><QuizResultPage /></div>} />
          <Route path="/chat" element={<div className="page"><ChatListPage /></div>} />
          <Route path="/chat/:threadId" element={<ChatThreadPage />} />
          <Route path="/units/:unitId/flashcards" element={<div className="page"><FlashcardsPage /></div>} />
          <Route path="/flashcards/decks/:deckId" element={<div className="page"><DeckPage /></div>} />
          <Route path="/flashcards/decks/:deckId/review" element={<div className="page"><ReviewPage /></div>} />
          <Route path="/flashcards/daily" element={<div className="page"><ReviewPage daily /></div>} />
          <Route path="/units/:unitId/study-guide" element={<div className="page"><StudyGuidePage /></div>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/progress" element={<div className="page"><ProgressPage /></div>} />
          <Route path="/feedback" element={<div className="page"><FeedbackPage /></div>} />
          <Route path="/admin" element={<div className="page"><AdminPage /></div>} />
          <Route path="/games" element={<div className="page"><GamesPage /></div>} />
          <Route path="/games/speed-round" element={<div className="page"><SpeedRoundPage /></div>} />
          <Route path="/games/streak" element={<div className="page"><StreakChallengePage /></div>} />
          <Route path="/games/match" element={<div className="page"><MatchItPage /></div>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
