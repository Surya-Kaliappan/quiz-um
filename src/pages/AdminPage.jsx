// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function AdminPage() {
  const { sessionId } = useParams();
  const [session, setSession] = useState({ players: [] });

  const callEngine = (action) => {
    supabase.functions.invoke('quiz-manager', {
      body: { action, sessionId },
    });
  };

  useEffect(() => {
    const channel = supabase.channel(`quiz-${sessionId}`);
    channel.on('broadcast', { event: 'STATE_UPDATE' }, ({ payload }) => {
      setSession(payload);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  return (
    <div>
      <h1>Admin for Session: {sessionId}</h1>
      <button onClick={() => callEngine('START')}>Start Quiz</button>
      <h3>Players:</h3>
      <ul>
        {session.players.map((p, i) => <li key={i}>{p.name}</li>)}
      </ul>
      {session.currentQuestion && <h4>Current Question: {session.currentQuestion.text}</h4>}
    </div>
  );
}
export default AdminPage;