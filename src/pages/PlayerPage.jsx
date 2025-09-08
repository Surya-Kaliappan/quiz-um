// src/pages/PlayerPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function PlayerPage() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [name, setName] = useState('');

  const callEngine = (action, payload = {}) => {
    supabase.functions.invoke('quiz-manager', {
      body: { action, sessionId, payload },
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
      <h1>Quiz Time!</h1>
      {!session || !session.currentQuestion ? (
        <div>
          <input type="text" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} />
          <button onClick={() => callEngine('JOIN', { name })}>Join</button>
        </div>
      ) : (
        <div>
          <h3>{session.currentQuestion.text}</h3>
          {session.currentQuestion.options.map((opt, i) => <button key={i}>{opt}</button>)}
        </div>
      )}

      {session && (
        <div>
          <h4>Players Joined:</h4>
          <ul>{session.players.map((p, i) => <li key={i}>{p.name}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
export default PlayerPage;