// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AddQuestionsPage from './pages/AddQuestionsPage';
import HomePage from './pages/HomePage';
import AdminLoginPage from './pages/AdminLoginPage';
import { useAuth } from './AuthContext.jsx';
import LobbyPage from './pages/LobbyPage.jsx';
import LiveLobbyPage from './pages/LiveLobbyPage.jsx';
import PlayQuizPage from './pages/PlayQuizPage.jsx';

function App() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/lobby/:quizId" element={<LobbyPage />} />
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/play/:quizId" element={<PlayQuizPage />} />
      
      {/* Protected Admin Routes */}
      <Route path="/admin" element={user ? <AdminDashboardPage /> : <Navigate to="/admin-login" />} />
      <Route path="/admin/create" element={user ? <AddQuestionsPage /> : <Navigate to="/admin-login" />} />
      <Route path="/admin/quiz/:quizId/edit" element={user ? <AddQuestionsPage /> : <Navigate to="/admin-login" />} />
      <Route path="/admin/lobby/:quizId" element={user ? <LiveLobbyPage /> : <Navigate to="/admin-login" />} />
    </Routes>
  );
}

export default App;