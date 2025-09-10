// src/pages/PlayQuizPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function PlayQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [gameState, setGameState] = useState({ status: 'lobby', currentQuestionIndex: -1 });
  const [loading, setLoading] = useState(true);
  const localPlayerId = localStorage.getItem('quiz_player_id');
  const localPlayerName = localStorage.getItem('quiz_player_name');

  useEffect(() => {
    const savedSessionId = localStorage.getItem('quiz_session_id');
    if (savedSessionId !== quizId || !localPlayerName) {
      return navigate(`/lobby/${quizId}`);
    }

    const fetchInitialData = async () => {
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes').select(`*, questions(*)`).eq('id', quizId).single();
      
      if (quizError || !quizData) return navigate('/');
      
      setQuiz(quizData);
      console.log(quizData);
      setQuestions(quizData.questions || []);
      setGameState({ status: quizData.status, currentQuestionIndex: -1 });
      setLoading(false);
    };

    fetchInitialData();

    const channel = supabase.channel(`quiz-session-${quizId}`);
    channel.on('broadcast', { event: 'STATE_UPDATE' }, (payload) => {
        // When a status update is received, update the local state
        console.dir(payload);
        setGameState(payload.payload);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [quizId, navigate, localPlayerName]);

  const handleQuitQuiz = async () => {
    if (!localPlayerId) return;

    const channel = supabase.channel(`live-lobby-${quizId}`);
    channel.send({
      type: 'broadcast',
      event: 'player_left',
      payload: { playerId: parseInt(localPlayerId, 10) },
    });

    await supabase.from('players').delete().eq('id', localPlayerId);
    localStorage.clear();
    navigate('/');
  };

  if (loading) return <div>Loading Quiz...</div>;
  if (!quiz) return <div>Quiz not found.</div>;

  if (gameState.status === 'finished' || gameState.status === 'draft') {
    return <div><h2>Quiz Over</h2><p>This quiz session has ended. Thank you for playing!</p></div>;
  }

  if (gameState.status !== 'active') {
    return (
      <div>
        <button onClick={handleQuitQuiz} style={{ float: 'right' }}>Quit</button>
        <h2>Welcome, {localPlayerName}!</h2>
        <h3>Lobby for: {quiz.title}</h3>
        <p>Status: <strong style={{textTransform: 'capitalize'}}>{gameState.status}</strong>. Waiting for the admin...</p>
      </div>
    );
  } 

  const currentQuestion = questions[gameState.currentQuestionIndex];

  // Quiz is active, show questions (placeholder for now)
  return (
    <div>
      <button onClick={handleQuitQuiz} style={{ float: 'right' }}>Quit</button>
      <h2>{quiz.title}</h2>
      {currentQuestion ? (
        <div>
          <h3>Question {gameState.currentQuestionIndex + 1} / {questions.length}</h3>
          <h2>{currentQuestion.question_text}</h2>
          <div>
            {currentQuestion.options.map((option, index) => (
              <button key={index}>{option}</button>
            ))}
          </div>
        </div>
      ) : (
        <h2>Quiz Finished!</h2>
      )}
    </div>
  );
}

export default PlayQuizPage;