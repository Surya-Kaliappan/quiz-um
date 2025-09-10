// src/pages/LiveLobbyPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function LiveLobbyPage() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const [players, setPlayers] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase.from('players').select('*').eq('session_id', quizId);
    if (data) setPlayers(data);
  }, [quizId]);

  useEffect(() => {
    const fetchQuizAndQuestions = async () => {
      const { data } = await supabase.from('quizzes').select('title, status, join_code').eq('id', quizId).single();
      if(data) setQuiz(data);

      const { data: questionsData } = await supabase.from('questions').select('*').eq('quiz_id', quizId).order('id');
      if (questionsData) setQuestions(questionsData);
    };
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
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [quizId, fetchPlayers]);

  const broadcastState = (newStatus, questionIndex) => {
    const channel = supabase.channel(`quiz-session-${quizId}`);
    channel.send({
      type: 'broadcast',
      event: 'STATE_UPDATE',
      payload: { 
        status: newStatus, 
        currentQuestionIndex: questionIndex,
        totalQuestions: questions.length
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
      if(newStatus === 'draft'){
        broadcastState('finished', -1); // Notify players the quiz is over
        return navigate('/admin');
      }
      setQuiz(data);
      if (newStatus === 'active') {
        broadcastState(newStatus, 0); // Start with the first question
      } else {
        broadcastState(newStatus, -1);
      }
    }
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      broadcastState('active', nextIndex);
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
        {quiz?.status === 'active' && <button onClick={handleNextQuestion}>Next Question</button>}
        {quiz?.status === 'active' && <button onClick={() => updateQuizStatus('finished')}>Stop Session</button>}
        {quiz?.status === 'finished' && <button onClick={() => updateQuizStatus('draft')}>Reset for New Session</button>}
      </div>

      {quiz?.status === 'active' && (
        <h3>Showing Question {currentQuestionIndex + 1} of {questions.length}</h3>
      )}

      <hr />
      <h3>Players ({players.length}):</h3>
      <ul>
        {players.map(player => (
          <li key={player.id}>{player.name} - {player.is_ready ? 'Ready' : '... Joined'}</li>
        ))}
      </ul>
    </div>
  );
}

export default LiveLobbyPage;