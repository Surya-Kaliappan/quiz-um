// src/pages/LiveLobbyPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Timer component for the admin's view
function AdminTimer({ startTime, duration }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  useEffect(() => {
    if (!startTime || !duration) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((new Date().getTime() - new Date(startTime).getTime()) / 1000);
      const remaining = duration - elapsed;
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, duration]);

  return <span>(Time left: {timeLeft}s)</span>;
}

function LiveLobbyPage() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const [players, setPlayers] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isNext,setIsNext] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase.from('players').select('*').eq('session_id', quizId);
    if (data) setPlayers(data);
  }, [quizId]);

  const fetchQuizAndQuestions = useCallback(async () => {
    const { data } = await supabase.from('quizzes').select('title, status, join_code, per_question_timer, admin_paced').eq('id', quizId).single();
    if(data) setQuiz(data);
    if(data?.status === 'active') setCurrentQuestionIndex(0);

    const { data: questionsData } = await supabase.from('questions').select('*').eq('quiz_id', quizId).order('id');
    if (questionsData) setQuestions(questionsData);
  }, [quizId]);

  useEffect(() => {
    fetchQuizAndQuestions();
    fetchPlayers();

    const channel = supabase.channel(`live-lobby-${quizId}`);
    channel
      .on('broadcast', { event: 'player_joined' }, (payload) => {
        setPlayers(currentPlayers => [...currentPlayers, payload.payload.player]);
      })
      .on('broadcast', { event: 'player_left' }, (payload) => {
        setPlayers(currentPlayers => currentPlayers.filter(p => p.id !== payload.payload.playerId));
      })
      .on('broadcast', { event: 'player_answered' }, () => fetchPlayers())
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [quizId, fetchPlayers]);

  const broadcastState = (newStatus, questionIndex, startTime) => {
    const channel = supabase.channel(`quiz-session-${quizId}`);
    channel.send({
      type: 'broadcast',
      event: 'STATE_UPDATE',
      payload: { 
        status: newStatus, 
        currentQuestionIndex: questionIndex,
        totalQuestions: questions.length,
        questionStartTime: startTime,
      },
    });
  };

  const updateQuizStatus = async (newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'draft') {
      updates.join_code = null;
      setIsResetting(true);
      await supabase.from('players').delete().eq('session_id', quizId);
    } else if (newStatus === 'active') {
      setIsStarting(true);
    } else if (newStatus === 'finished') {
      setIsStopping(true);
    }
    
    const { data, error } = await supabase.from('quizzes').update(updates).eq('id', quizId).select().single();
    
    if (error) {
      alert(error.message);
    } else {
      setQuiz(data);
      if(newStatus === 'draft'){
        broadcastState('finished', -1, null); // Notify players the quiz is over
        return navigate('/admin');
      }
      if (newStatus === 'active') {
        const startTime = new Date().toISOString();
        setCurrentQuestionIndex(0);
        setQuestionStartTime(startTime);
        broadcastState(newStatus, 0, startTime); // Start with the first question
      } else {
        broadcastState(newStatus, -1, null);
      }
    }
    setIsStarting(false);
    setIsStopping(false);
    setIsResetting(false);
  };

  const handleNextQuestion = () => {
    setIsNext(true);
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      const startTime = new Date().toISOString();
      setCurrentQuestionIndex(nextIndex);
      setQuestionStartTime(startTime);
      broadcastState('active', nextIndex, startTime);
    } 
    else {
      updateQuizStatus('finished'); // End of questions, finish the quiz
    }
    setIsNext(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col">
      <div className="container mx-auto p-4 md:p-6 max-w-6xl flex-1">
        <Link to="/admin" className="text-blue-800 hover:text-blue-900 font-medium mb-4 md:mb-6">← Back to Dashboard</Link>
        <h2 className="text-2xl md:text-4xl font-bold text-blue-900 mb-2">Live Session Control: {quiz?.title}</h2>
        <div className="text-blue-800 text-base md:text-lg mb-4 md:mb-6">Game Code: <strong>{quiz?.join_code || 'N/A'}</strong></div>
        
        <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
          {quiz?.status === 'deployed' && players.length>0 && (
            <button
              onClick={() => updateQuizStatus('active')}
              disabled={isStarting}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isStarting ? 'Starting...' : 'Start Quiz'}
            </button>
          )}
          {quiz?.status === 'active' && quiz?.admin_paced && (
            <button
              onClick={handleNextQuestion}
              disabled={isNext}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isNext ? 'Moving...' :'Next Question'}
            </button>
          )}
          {quiz?.status === 'active' && (
            <button
              onClick={() => updateQuizStatus('finished')}
              disabled={isStopping}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isStopping ? 'Stopping...' :'Stop Session'}
            </button>
          )}
          {quiz?.status === 'finished' && (
            <button
              onClick={() => updateQuizStatus('draft')}
              disabled={isResetting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Reset for New Session
            </button>
          )}
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-6">
          {quiz?.status === 'active' && quiz?.admin_paced && questions.length > 0 && (
            <div className="bg-gray-100 rounded-xl shadow-lg p-5 border border-blue-100 mb-4 md:mb-0">
              <h3 className="text-lg md:text-xl font-semibold text-blue-900 mb-3">
                Question {currentQuestionIndex + 1} of {questions.length}
                {quiz.per_question_timer && (
                  <span className="ml-2">
                    <AdminTimer startTime={questionStartTime} duration={quiz.per_question_timer} />
                  </span>
                )}
              </h3>
              {questions[currentQuestionIndex] && (
                <div>
                  <h4 className="text-base md:text-lg font-medium text-gray-800 mb-4">
                    {questions[currentQuestionIndex].question_text}
                  </h4>
                  <ul className="space-y-2">
                    {questions[currentQuestionIndex].options.map((option, index) => (
                      <li
                        key={index}
                        className={`p-3 rounded-md border text-gray-800 text-sm md:text-base ${
                          option === questions[currentQuestionIndex].correct_answer
                            ? 'bg-green-50 border-green-200 font-semibold'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        {option}
                        {option === questions[currentQuestionIndex].correct_answer && (
                          <span className="ml-2 text-green-600"></span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="bg-gray-100 rounded-xl shadow-lg p-5 border border-blue-100 max-h-96 overflow-y-auto">
            <h3 className="text-lg md:text-xl font-semibold text-blue-900 mb-3">Players ({players.length})</h3>
            {players.length > 0 ? (
              <ul className="space-y-2">
                {players.map((player, index) => (
                  <li
                    key={player.id}
                    className={`flex justify-between items-center p-3 rounded-md text-sm md:text-base text-gray-800 ${
                      index % 2 === 0 ? 'bg-blue-50' : 'bg-blue-100'
                    } hover:bg-blue-200 transition-colors`}
                  >
                    <span className="flex items-center">
                      <span className="mr-2 text-blue-600">👤</span>
                      {player.name}
                    </span>
                    <span className="font-semibold">
                      Score: <span className="text-blue-900">{player.score}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-800 text-sm md:text-base">No players have joined yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveLobbyPage;