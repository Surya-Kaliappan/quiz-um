// src/pages/AdminDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { supabase } from '../supabaseClient.js';
import { useNavigate } from 'react-router-dom';

function AdminDashboardPage() {
  const { user, signOut } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // This simplified structure prevents re-renders on tab focus.
    // It runs once when the user is loaded.
    const fetchQuizzes = async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('quizzes')
        .select('id, title')
        .eq('admin_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching quizzes:', error);
      } else {
        setQuizzes(data);
      }
      setLoading(false);
    };

    // We check for the user from the auth context.
    if (user) {
      fetchQuizzes(user);
    }

  }, [user]); // This useEffect is now solely dependent on the user object.

  const handleDeleteQuiz = async (quizId, quizTitle) => {
    if (window.confirm(`Are you sure you want to delete the quiz "${quizTitle}"?`)) {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) {
        alert(error.message);
      } else {
        setQuizzes(currentQuizzes => currentQuizzes.filter(q => q.id !== quizId));
      }
    }
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <p>Welcome, {user?.email}!</p>
      <button onClick={signOut}>Sign Out</button>
      <hr />
      <button onClick={() => navigate('/admin/create')}>+ Create New Quiz Template</button>
      <h3>Your Quiz Templates</h3>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {quizzes.length > 0 ? (
            quizzes.map((quiz) => (
              <tr key={quiz.id}>
                <td>{quiz.title}</td>
                <td>
                  <button onClick={() => navigate(`/admin/quiz/${quiz.id}/edit`)}>Edit</button>
                  <button onClick={() => handleDeleteQuiz(quiz.id, quiz.title)} style={{ color: 'red' }}>Delete</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2">You haven't created any quiz templates yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboardPage;