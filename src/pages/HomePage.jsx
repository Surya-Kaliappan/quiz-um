// src/pages/HomePage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function HomePage() {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFindQuiz = async (event) => {
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
    } else if (data.status !== 'deployed') {
      alert(`This quiz is not currently accepting new players.`);
    } else {
      // Navigate to the lobby using the quiz's real ID
      navigate(`/lobby/${data.id}`);
    }
  };
  
  return (
    <div>
      <h2>Welcome to the Interactive Quiz!</h2>
      <p>Enter the 6-character code to join a quiz.</p>
      
      <form onSubmit={handleFindQuiz}>
        <input
          type="text"
          placeholder="e.g., AB12CD"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          maxLength="6"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Finding...' : 'Find Quiz'}
        </button>
      </form>
      <hr />
      <Link to="/admin-login">Go to Admin Login</Link>
    </div>
  );
}

export default HomePage;