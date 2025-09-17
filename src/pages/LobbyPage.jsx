import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function LobbyPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      const { data, error } = await supabase.from('quizzes').select('title, description, status').eq('id', quizId).single();
      if (error || !data) return navigate('/');
      if (data.status === 'active') return navigate(`/play/${quizId}`);
      setQuiz(data);
    };
    fetchQuiz();
  }, [quizId, navigate]);

  const handleJoin = async () => {
    if (!studentName) return;
    setLoading(true);

    const { data: newPlayer, error } = await supabase
      .from('players').insert({ session_id: quizId, name: studentName, is_ready: true }).select().single();

    if (error) {
      alert("Error joining quiz because "+error.message);
      setLoading(false);
    } else {
      localStorage.setItem('quiz_session_id', quizId);
      localStorage.setItem('quiz_player_id', newPlayer.id);
      localStorage.setItem('quiz_player_name', newPlayer.name);
      localStorage.setItem(`quiz_${quizId}_index`, 0);
      
      const channel = supabase.channel(`live-lobby-${quizId}`);
      channel.send({
        type: 'broadcast',
        event: 'player_joined',
        payload: { player: newPlayer },
      });

      navigate(`/play/${quizId}`);
    }
  };

  if (!quiz) return <div className="text-center text-blue-800 text-lg animate-pulse">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4 md:p-6">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 animate-underline">
            Joining: {quiz.title}
          </h2>
          <div className="flex flex-col space-y-4">
            <input
              type="text"
              placeholder="Enter your name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              required
              className="p-3 rounded-lg text-sm md:text-base text-gray-800 border border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            />
            <div className="flex items-center space-x-3 text-sm md:text-base text-gray-700">
              <label className="flex items-center space-x-2">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isReady}
                    onChange={() => setIsReady(!isReady)}
                    className="appearance-none h-6 w-6 border border-blue-400/50 rounded-md checked:bg-gradient-to-r checked:from-blue-500 checked:to-indigo-600 checked:border-none focus:outline-none transition-all duration-300"
                  />
                  <svg
                    className={`absolute top-1 left-1 h-4 w-4 text-white ${isReady ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-semibold">I agree</span>
              </label>
              <button
                onClick={() => setShowTerms(true)}
                className="text-blue-500 hover:text-blue-600 font-semibold underline transition-colors duration-300"
              >
                View Terms and Conditions
              </button>
            </div>
            <button
              onClick={handleJoin}
              disabled={!isReady || !studentName || loading}
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
                  Joining...
                </>
              ) : (
                'Join and Wait'
              )}
            </button>
          </div>
        </div>
      </div>

      {showTerms && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-lg w-full max-h-[70vh] overflow-y-auto">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 animate-underline">
              Terms and Conditions
            </h3>
            <p className="text-gray-700 text-sm md:text-base mb-6">
              {quiz.description}
            </p>
            <button
              onClick={() => setShowTerms(false)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-3 rounded-lg hover:scale-105 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LobbyPage;