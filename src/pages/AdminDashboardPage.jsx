// src/pages/AdminDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { supabase } from '../supabaseClient.js';
import { useNavigate, Link } from 'react-router-dom';

function AdminDashboardPage() {
  const { user, signOut } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async (currentUser) => {
      if (!currentUser) { setLoading(false); return; }
      const { data, error } = await supabase.from('quizzes').select('*').eq('admin_id', currentUser.id).order('created_at', { ascending: false });
      if (error) console.error('Error fetching quizzes:', error);
      else setQuizzes(data);
      setLoading(false);
    };
    if (user) fetchQuizzes(user);
  }, [user]);

  const handleDeploy = async (quizId) => {
    const newJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase.from('quizzes')
      .update({ status: 'deployed', join_code: newJoinCode }).eq('id', quizId).select().single();
    if (error) alert(error.message);
    else setQuizzes(currentQuizzes => currentQuizzes.map(q => q.id === quizId ? data : q));
  };

  const handleDelete = async (quizId, quizTitle) => {
    if (window.confirm(`Are you sure you want to permanently delete "${quizTitle}"?`)) {
      const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
      if (error) alert(`Error deleting quiz: ${error.message}`);
      else setQuizzes(currentQuizzes => currentQuizzes.filter(q => q.id !== quizId));
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <p>Welcome, {user?.email}!</p>
      <button onClick={signOut}>Sign Out</button>
      <hr />
      <button onClick={() => navigate('/admin/create')}>+ Create New Quiz</button>
      <h3>Your Quizzes</h3>
      <table>
        <thead><tr><th>Title</th><th>Join Code</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {quizzes.map((quiz) => (
            <tr key={quiz.id}>
              <td>{quiz.title}</td>
              <td>{quiz.status === 'deployed' || quiz.status === 'active' ? <strong>{quiz.join_code}</strong> : '---'}</td>
              <td>{quiz.status}</td>
              <td>
                {quiz.status === 'draft' && <button onClick={() => handleDeploy(quiz.id)}>Deploy</button>}
                {quiz.status !== 'draft' && <Link to={`/admin/lobby/${quiz.id}`}><button>View Lobby</button></Link>}
                <button onClick={() => navigate(`/admin/quiz/${quiz.id}/edit`)} disabled={quiz.status !== 'draft'}>Edit</button>
                <button onClick={() => handleDelete(quiz.id, quiz.title)} style={{ color: 'red' }} disabled={quiz.status !== 'draft'}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboardPage;