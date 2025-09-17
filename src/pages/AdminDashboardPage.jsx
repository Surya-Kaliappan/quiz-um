// src/pages/AdminDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { supabase } from '../supabaseClient.js';
import { useNavigate, Link } from 'react-router-dom';

function AdminDashboardPage() {
  const { user, signOut } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const navigate = useNavigate();

  const adminName = user?.user_metadata?.full_name || user?.email;

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

  const handleDeploy = async (quizId, state) => {
    setIsDeploying(true);
    let newJoinCode = null;
    if(state === 'deployed'){
        newJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    const { data, error } = await supabase.from('quizzes')
      .update({ status: state, join_code: newJoinCode }).eq('id', quizId).select().single();
    if (error) alert(error.message);
    else setQuizzes(currentQuizzes => currentQuizzes.map(q => q.id === quizId ? data : q));
    setIsDeploying(false);
  };

  const handleDelete = async (quizId, quizTitle) => {
    if (window.confirm(`Are you sure you want to permanently delete "${quizTitle}"?`)) {
      const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
      if (error) alert(`Error deleting quiz: ${error.message}`);
      else setQuizzes(currentQuizzes => currentQuizzes.filter(q => q.id !== quizId));
    }
  };

  if (loading) return <div className="text-center text-blue-800 text-lg">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col">
      <div className="container mx-auto p-4 md:p-6 max-w-6xl flex-1 relative">
        <div className="flex flex-col mb-6 md:mb-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl md:text-4xl font-bold text-blue-900">Admin Dashboard</h2>
            <button
              onClick={signOut}
              className="md:hidden bg-blue-300 text-blue-900 px-3 py-1 text-sm rounded-md hover:bg-blue-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
          <span className="text-blue-800 text-base md:text-lg mt-2">Welcome, {adminName}!</span>
          <button
            onClick={signOut}
            className="hidden md:block bg-blue-300 text-blue-900 px-4 py-2 rounded-md hover:bg-blue-400 transition-colors absolute top-6 right-6"
          >
            Sign Out
          </button>
        </div>
        <hr className="my-6 md:my-8 border-blue-300" />
        <div className="flex justify-end mb-4 md:mb-6">
          <button
            onClick={() => navigate('/admin/create')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            + Create New Quiz
          </button>
        </div>
        <h3 className="text-lg md:text-xl font-semibold text-blue-900 mb-4">Your Quizzes</h3>
        <div className="hidden md:block bg-gray-100 rounded-lg shadow-md">
          <table className="w-full text-center">
            <thead>
              <tr className="bg-blue-50">
                <th className="p-4 text-blue-800 font-medium">Title</th>
                <th className="p-4 text-blue-800 font-medium">Join Code</th>
                <th className="p-4 text-blue-800 font-medium">Status</th>
                <th className="p-4 text-blue-800 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((quiz) => (
                <tr key={quiz.id} className="border-t border-blue-200 hover:bg-blue-50">
                  <td className="p-4 text-gray-800">{quiz.title}</td>
                  <td className="p-4 text-gray-800">
                    {quiz.status === 'deployed' || quiz.status === 'active' ? (
                      <strong>{quiz.join_code}</strong>
                    ) : (
                      '---'
                    )}
                  </td>
                  <td className="p-4 text-gray-800">{quiz.status}</td>
                  <td className="p-4 flex justify-center space-x-2">
                    {quiz.status === 'draft' && (
                      <button
                        onClick={() => handleDeploy(quiz.id, 'deployed')}
                        disabled={isDeploying}
                        className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors"
                      >
                        {isDeploying ? 'Activating...' : 'Activate'}
                      </button>
                    )}
                    {quiz.status !== 'draft' && (
                      <Link to={`/admin/lobby/${quiz.id}`} target="_blank">
                        <button className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors">
                          View Lobby
                        </button>
                      </Link>
                    )}
                    { (quiz.status === 'draft') && <button
                      onClick={() => navigate(`/admin/quiz/${quiz.id}/edit`)}
                      disabled={quiz.status !== 'draft'}
                      className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
                    >
                      Edit
                    </button>}
                    { quiz.status === 'draft' && <button
                      onClick={() => handleDelete(quiz.id, quiz.title)}
                      disabled={quiz.status !== 'draft'}
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 disabled:bg-red-300 transition-colors"
                    >
                      Delete
                    </button>}
                    { quiz.status === 'deployed' && <button 
                      onClick={() => handleDeploy(quiz.id, 'draft')}
                      disabled={isDeploying}
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-700 disabled:bg-red-300 transition-colors"
                    >
                      {isDeploying ? 'Deactivating' : 'Deactivate'}
                    </button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;