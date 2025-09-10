// src/pages/LiveLobbyPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function LiveLobbyPage() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const [players, setPlayers] = useState([]);
  const [quiz, setQuiz] = useState(null);

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase.from('players').select('*').eq('session_id', quizId);
    if (data) setPlayers(data);
  }, [quizId]);

  useEffect(() => {
    const fetchQuiz = async () => {
      const { data } = await supabase.from('quizzes').select('title, status, join_code').eq('id', quizId).single();
      if(data) setQuiz(data);
    };
    fetchQuiz();
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

  const updateQuizStatus = async (newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'draft') {
      updates.join_code = null;
      await supabase.from('players').delete().eq('session_id', quizId);
      navigate('/admin');
    }
    
    const { data, error } = await supabase.from('quizzes').update(updates).eq('id', quizId).select().single();
    
    if (error) {
      alert(error.message);
    } else {
      setQuiz(data);
      // Broadcast the status change to all players
      const channel = supabase.channel(`quiz-session-${quizId}`);
      channel.send({
        type: 'broadcast',
        event: 'STATUS_UPDATE',
        payload: { newStatus: data.status },
      });
    }
  };

  return (
    <div>
      <Link to="/admin">← Back to Dashboard</Link>
      <h2>Live Session Control : {quiz?.title}</h2>
      <h2>Game Code : {quiz?.join_code}</h2>
      
      <div style={{ margin: '20px 0' }}>
        {quiz?.status === 'deployed' && <button onClick={() => updateQuizStatus('active')}>Start Quiz</button>}
        {quiz?.status === 'active' && <button onClick={() => updateQuizStatus('finished')}>Stop Session</button>}
        {quiz?.status === 'finished' && <button onClick={() => updateQuizStatus('draft')}>Reset for New Session</button>}
      </div>

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