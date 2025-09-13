// src/pages/LobbyPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function LobbyPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      const { data, error } = await supabase.from('quizzes').select('title, description, status').eq('id', quizId).single();
      if (error || !data) return navigate('/');
      if (data.status === 'active') return navigate(`/play/${quizId}`);
      setQuiz(data);
    };
    fetchQuiz();
  }, [quizId, navigate]);

  const handleJoin = async () => {
    if (!studentName) return;
    setLoading(true);

    const { data: newPlayer, error } = await supabase
      .from('players').insert({ session_id: quizId, name: studentName, is_ready: true }).select().single();

    if (error) {
      alert("Error joining quiz.");
      setLoading(false);
    } else {
      localStorage.setItem('quiz_session_id', quizId);
      localStorage.setItem('quiz_player_id', newPlayer.id);
      localStorage.setItem('quiz_player_name', newPlayer.name);
      localStorage.setItem(`quiz_${quizId}_index`, 0);
      
      // Broadcast the join player
      const channel = supabase.channel(`live-lobby-${quizId}`);
      channel.send({
        type: 'broadcast',
        event: 'player_joined',
        payload: { player: newPlayer },
      });

      navigate(`/play/${quizId}`);
    }
  };

  if (!quiz) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>Joining: {quiz.title}</h2>
      <div style={{ border: '1px solid #ccc', padding: '10px', whiteSpace: 'pre-wrap' }}>{quiz.description}</div>
      <div style={{ marginTop: '20px' }}>
        <input type="text" placeholder="Enter your name" value={studentName} onChange={(e) => setStudentName(e.target.value)} required />
        <div>
          <label><input type="checkbox" checked={isReady} onChange={() => setIsReady(!isReady)} /> I have read the rules.</label>
        </div>
      </div>
      <button onClick={handleJoin} disabled={!isReady || !studentName || loading}>
        {loading ? 'Joining...' : 'Join and Wait'}
      </button>
    </div>
  );
}

export default LobbyPage;