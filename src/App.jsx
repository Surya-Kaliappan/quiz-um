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
import AdminSignUpPage from './pages/AdminSignUpPage.jsx';

function App() {
  const { user } = useAuth();
  
  return (
    <div className='app-container'>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:quizId" element={<LobbyPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/play/:quizId" element={<PlayQuizPage />} />
        <Route path="/admin-signup" element={<AdminSignUpPage />} />
        
        {/* Protected Admin Routes */}
        <Route path="/admin" element={user ? <AdminDashboardPage /> : <Navigate to="/admin-login" />} />
        <Route path="/admin/create" element={user ? <AddQuestionsPage /> : <Navigate to="/admin-login" />} />
        <Route path="/admin/quiz/:quizId/edit" element={user ? <AddQuestionsPage /> : <Navigate to="/admin-login" />} />
        <Route path="/admin/lobby/:quizId" element={user ? <LiveLobbyPage /> : <Navigate to="/admin-login" />} />
      </Routes>
    </div>
  );
}

export default App;