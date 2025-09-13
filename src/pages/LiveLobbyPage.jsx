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

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase.from('players').select('*').eq('session_id', quizId);
    if (data) setPlayers(data);
  }, [quizId]);

  const fetchQuizAndQuestions = useCallback(async () => {
    const { data } = await supabase.from('quizzes').select('title, status, join_code, per_question_timer, overall_timer, admin_paced').eq('id', quizId).single();
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
      await supabase.from('players').delete().eq('session_id', quizId);
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
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      const startTime = new Date().toISOString();
      setCurrentQuestionIndex(nextIndex);
      setQuestionStartTime(startTime);
      broadcastState('active', nextIndex, startTime);
    } else {
      updateQuizStatus('finished'); // End of questions, finish the quiz
    }
  };

  return (
    <div>
      <Link to="/admin">← Back to Dashboard</Link>
      <h2>Live Session Control : {quiz?.title}</h2>
      <h2>Game Code : {quiz?.join_code}</h2>
      
      <div style={{ margin: '20px 0' }}>
        {quiz?.status === 'deployed' && <button onClick={() => updateQuizStatus('active')}>Start Quiz</button>}
        {quiz?.status === 'active' && quiz?.admin_paced && <button onClick={handleNextQuestion}>Next Question</button>}
        {quiz?.status === 'active' && <button onClick={() => updateQuizStatus('finished')}>Stop Session</button>}
        {quiz?.status === 'finished' && <button onClick={() => updateQuizStatus('draft')}>Reset for New Session</button>}
      </div>

      {quiz?.status === 'active' && questions.length > 0 && quiz?.admin_paced && (
        <h3>
          {quiz.admin_paced ? `Showing Question ${currentQuestionIndex + 1}` : 'Self-paced quiz in progress'}
          {quiz.per_question_timer && <AdminTimer startTime={questionStartTime} duration={quiz.per_question_timer} />}
        </h3>
      )}

      <hr />
      <h3>Players ({players.length}):</h3>
      <ul>
        {players.map(player => (
          <li key={player.id}>{player.name} - <strong>Score: {player.score}</strong></li>
        ))}
      </ul>
    </div>
  );
}

export default LiveLobbyPage;