// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AddQuestionsPage from './pages/AddQuestionsPage';
import PlayerPage from './pages/PlayerPage';
import HomePage from './pages/HomePage';
import AdminLoginPage from './pages/AdminLoginPage';
import { useAuth } from './AuthContext.jsx';

function App() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/play/:quizId" element={<PlayerPage />} />
      <Route path="/admin-login" element={<AdminLoginPage />} />
      
      {/* Protected Admin Routes */}
      <Route path="/admin" element={user ? <AdminDashboardPage /> : <Navigate to="/admin-login" />} />
      <Route path="/admin/create" element={user ? <AddQuestionsPage /> : <Navigate to="/admin-login" />} />
      <Route path="/admin/quiz/:quizId/edit" element={user ? <AddQuestionsPage /> : <Navigate to="/admin-login" />} />
    </Routes>
  );
}

export default App;