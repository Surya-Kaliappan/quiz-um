import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function HomePage() {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFindQuiz = async () => {
    if (!joinCode) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, status')
      .eq('join_code', joinCode.toUpperCase())
      .single();

    setLoading(false);

    if (error || !data) {
      alert('Quiz not found. Please check the code.');
    } else if (data.status !== 'deployed') {
      alert('This quiz is not currently accepting new players.');
    } else {
      navigate(`/lobby/${data.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4 md:p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 animate-underline">
            Quiz UM
          </h2>
          <p className="text-gray-700 text-base md:text-lg mb-6">
            Enter the 6-character code from your host to join a session.
          </p>
          <form className="flex flex-col space-y-4">
            <input
              type="text"
              placeholder="e.g., AB12CD"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              maxLength="6"
              className="p-3 rounded-lg text-sm md:text-base text-gray-800 border border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            />
            <button
              onClick={handleFindQuiz}
              disabled={loading || !joinCode}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-3 rounded-lg hover:scale-105 hover:from-blue-600 hover:to-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Finding...
                </>
              ) : (
                'Find Quiz'
              )}
            </button>
            <div className="text-center text-gray-700 text-sm md:text-base">
              Are you a host?{' '}
              <Link
                to="/admin-login"
                className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:scale-105 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300"
              >
                Log in here
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default HomePage;