// src/pages/PlayQuizPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function PlayQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const localPlayerId = localStorage.getItem('quiz_player_id');
  const localPlayerName = localStorage.getItem('quiz_player_name');

  useEffect(() => {
    const savedSessionId = localStorage.getItem('quiz_session_id');
    if (savedSessionId !== quizId || !localPlayerName) {
      return navigate(`/lobby/${quizId}`);
    }

    const fetchQuizState = async () => {
      const { data, error } = await supabase.from('quizzes').select('status, title').eq('id', quizId).single();
      if (error || !data) return navigate('/');
      setQuiz(data);
      setLoading(false);
    };
    fetchQuizState();

    const channel = supabase.channel(`quiz-session-${quizId}`);
    channel.on('broadcast', { event: 'STATUS_UPDATE' }, (payload) => {
        // When a status update is received, update the local state
        console.dir(payload);
        setQuiz(currentQuiz => ({ ...currentQuiz, status: payload.payload.newStatus }));
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
    localStorage.removeItem('quiz_player_id');
    localStorage.removeItem('quiz_player_name');
    localStorage.removeItem('quiz_session_id');
    navigate('/');
  };

  if (loading) return <div>Loading Quiz...</div>;
  if (!quiz) return <div>Quiz not found.</div>;

  if (quiz.status !== 'active') {
    console.log(quiz);
    return (
      <div>
        <button onClick={handleQuitQuiz} style={{ float: 'right' }}>Quit</button>
        <h2>Welcome, {localPlayerName}!</h2>
        <h3>Lobby for: {quiz.title}</h3>
        <p>Waiting for the admin to start the quiz...</p>
      </div>
    );
  } 

  // Quiz is active, show questions (placeholder for now)
  return (
    <div>
      <button onClick={handleQuitQuiz} style={{ float: 'right' }}>Quit</button>
      <h2>{quiz.title} is now Active!</h2>
      <p>Questions will appear here.</p>
    </div>
  );
}

export default PlayQuizPage;