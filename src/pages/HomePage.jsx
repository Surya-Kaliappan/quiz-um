// src/pages/HomePage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function HomePage() {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoinQuiz = async (event) => {
    event.preventDefault();
    if (!joinCode) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, status')
      .eq('join_code', joinCode.toUpperCase())
      .single();

    setLoading(false);

    if (error || !data) {
      alert('Quiz not found. Please check the code.');
    } else if (data.status !== 'deployed' && data.status !== 'active') {
      alert(`This quiz is not currently active. Its status is: ${data.status}`);
    } else {
      navigate(`/play/${data.id}`);
    }
  };
  
  return (
    <div>
      <h2>Join an Interactive Quiz</h2>
      <form onSubmit={handleJoinQuiz}>
        <input
          type="text"
          placeholder="Enter Join Code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          maxLength="6"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Joining...' : 'Join'}
        </button>
      </form>
    </div>
  );
}

export default HomePage;