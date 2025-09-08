// src/pages/PlayQuizPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function PlayQuizPage() {
  const { quizId } = useParams();
  const [gameState, setGameState] = useState(null);
  const [playerName, setPlayerName] = useState('');

  const callGameEngine = (action, payload = {}) => {
    supabase.functions.invoke('quiz-manager', {
      body: { action, payload: { ...payload, sessionId: quizId } },
    });
  };

  useEffect(() => {
    const channel = supabase.channel(`quiz-${quizId}`);
    channel.on('broadcast', { event: 'STATE_UPDATE' }, ({ payload }) => {
        setGameState(payload);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [quizId]);

  const currentQuestion = gameState?.questions?.[gameState.currentQuestionIndex];

  return (
    <div>
      <h2>Quiz Time!</h2>
      {!gameState || gameState.status === 'lobby' ? (
        <div>
          <h3>Join the Game</h3>
          <input type="text" placeholder="Your Name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
          <button onClick={() => callGameEngine('PLAYER_JOIN', { playerName })}>Join</button>
        </div>
      ) : (
        <div>
          <h3>Question {gameState.currentQuestionIndex + 1}</h3>
          {currentQuestion ? (
            <div>
              <h2>{currentQuestion.question_text}</h2>
              {currentQuestion.options.map((option, i) => <button key={i}>{option}</button>)}
            </div>
          ) : (
            <h2>{gameState.status === 'finished' ? 'Quiz Finished!' : 'Waiting for question...'}</h2>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayQuizPage;