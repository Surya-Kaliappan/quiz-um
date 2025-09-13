// src/pages/PlayQuizPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function shuffleArray(array) {
  let shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// A new Timer component
function Timer({ startTime, duration, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!startTime || !duration) {
      setTimeLeft(duration || 0);
      return;
    }
    const interval = setInterval(() => {
      const startTimeMs = new Date(startTime).getTime();
      const nowMs = new Date().getTime();
      const elapsed = Math.floor((nowMs - startTimeMs) / 1000);
      const remaining = duration - elapsed;
      
      if (remaining >= 0) {
        setTimeLeft(remaining);
      } else {
        setTimeLeft(0);
        clearInterval(interval);
        onTimeUp();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [startTime, duration, onTimeUp]);

  return <h3>Time Remaining: {timeLeft}s</h3>;
}

function PlayQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [gameState, setGameState] = useState({ status: 'lobby', currentQuestionIndex: 0, questionStartTime: null });
  const [loading, setLoading] = useState(true);
  const [submittedAnswer, setSubmittedAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);

  const localPlayerId = localStorage.getItem('quiz_player_id');
  const localPlayerName = localStorage.getItem('quiz_player_name');

  const getSavedAnswers = () => JSON.parse(localStorage.getItem(`quiz_${quizId}_answers`)) || {};
  const saveAnswer = useCallback((questionId, answer, result) => {
    const answers = getSavedAnswers();
    answers[questionId] = {answer, result};
    localStorage.setItem(`quiz_${quizId}_answers`, JSON.stringify(answers));
  }, [quizId, navigate]);

  const setupQuiz = useCallback(async () => {
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes').select(`*, questions(id, quiz_id, question_text, options)`).eq('id', quizId).single();
    
    if (quizError || !quizData) return navigate('/');

    setQuiz(quizData);

    // **THE FIX**: Check localStorage for a saved question order
    const savedOrder = localStorage.getItem(`quiz_${quizId}_order`);
    let questionOrder = quizData.questions || [];

    if (savedOrder) {
      // If an order is saved, use it.
      questionOrder = JSON.parse(savedOrder);
    } else if (!quizData.admin_paced && quizData.shuffle_questions) {
      // If no order is saved and shuffling is on, create one and save it.
      questionOrder = shuffleArray(questionOrder);
      localStorage.setItem(`quiz_${quizId}_order`, JSON.stringify(questionOrder));
    }
    setQuestions(questionOrder);
    
    const savedIndex = localStorage.getItem(`quiz_${quizId}_index`);
    const initialIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
    
    setGameState({ 
      status: quizData.status, 
      currentQuestionIndex: initialIndex,
      totalQuestions: questionOrder.length,
    });
    
    setLoading(false);
  }, [quizId, navigate]);

  useEffect(() => {
    const savedSessionId = localStorage.getItem('quiz_session_id');
    if (savedSessionId !== quizId || !localPlayerName) return navigate(`/lobby/${quizId}`);
    setupQuiz();

    const channel = supabase.channel(`quiz-session-${quizId}`);
    channel.on('broadcast', { event: 'STATE_UPDATE' }, (payload) => {
        setGameState(payload.payload);
      }).subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [quizId, navigate, localPlayerName, setupQuiz]);

  useEffect(() => {
    // When the question changes, check for a previously submitted answer.
    const currentQuestion = questions[gameState.currentQuestionIndex];
    if (currentQuestion) {
      const savedAnswers = getSavedAnswers();
      const previousSubmission = savedAnswers[currentQuestion.id];
      if (previousSubmission) {
        setSubmittedAnswer(previousSubmission.answer);
        setAnswerResult(previousSubmission.result);
      } else {
        setSubmittedAnswer(null);
        setAnswerResult(null);
      }
    }
  }, [gameState.currentQuestionIndex, questions, getSavedAnswers]);

  const handleAnswerSubmit = async (option) => {
    setSubmittedAnswer(option);
    const currentQuestion = questions[gameState.currentQuestionIndex];
    const { data, error } = await supabase.functions.invoke('quiz-manager', {
      body: { action: 'SUBMIT_ANSWER', payload: { quizId, playerId: parseInt(localPlayerId, 10), questionId: currentQuestion.id, submittedAnswer: option, questionStartTime: gameState.questionStartTime } },
    });
    if (error) alert("Error submitting answer.");
    else {
      const result = data.correct ? 'correct' : 'incorrect';
      setAnswerResult(result);
      // Save the result to localStorage
      saveAnswer(currentQuestion.id, option, result);
    }
  };

  const handleSelfPacedNext = useCallback(() => {
    const nextIndex = gameState.currentQuestionIndex + 1;
    localStorage.setItem(`quiz_${quizId}_index`, nextIndex);
    setGameState(prev => ({...prev, currentQuestionIndex: nextIndex, questionStartTime: new Date().getTime()}));
  }, [gameState.currentQuestionIndex, quizId]);

  const handleQuitQuiz = async () => {
    if (!localPlayerId) return;

    const channel = supabase.channel(`live-lobby-${quizId}`);
    channel.send({
      type: 'broadcast',
      event: 'player_left',
      payload: { playerId: parseInt(localPlayerId, 10) },
    });

    await supabase.from('players').delete().eq('id', localPlayerId);
    localStorage.clear();
    navigate('/');
  };

  const handleTimeUp = () => {
    setSubmittedAnswer("TIME_UP");
    if(quiz && !quiz.admin_paced){
      setTimeout(() => {
        handleSelfPacedNext();
      }, 1000);
    }
  };

  if (loading) return <div>Loading Quiz...</div>;
  if (!quiz) return <div>Quiz not found.</div>;

  if (gameState.status !== 'active') {
    return (
      <div>
        <button onClick={handleQuitQuiz} style={{ float: 'right' }}>Quit</button>
        <h2>Welcome, {localPlayerName}!</h2>
        <h3>Lobby for: {quiz.title}</h3>
        <p>Status: <strong style={{textTransform: 'capitalize'}}>{gameState.status}</strong>. Waiting for the admin...</p>
      </div>
    );
  } 

  const isQuizFinished = !quiz.admin_paced && gameState.currentQuestionIndex >= questions.length;
  const currentQuestion = questions[gameState.currentQuestionIndex];
  const timeLimit = quiz?.per_question_timer;

  return (
    <div>
      <button onClick={handleQuitQuiz} style={{ float: 'right' }}>Quit</button>
      <h2>{quiz.title}</h2>
      {currentQuestion && !isQuizFinished ? (
        <div>
          {timeLimit && (
            <Timer 
              startTime={gameState.questionStartTime} 
              duration={timeLimit}
              onTimeUp={handleTimeUp}
            />
          )}
          <h3>Question {gameState.currentQuestionIndex + 1} / {questions.length}</h3>
          <h2>{currentQuestion.question_text}</h2>
          <div>
            {currentQuestion.options.map((option, index) => (
              <button key={index} onClick={() => handleAnswerSubmit(option)} disabled={!!submittedAnswer}
                style={{ backgroundColor: answerResult === 'correct' && option === submittedAnswer ? 'lightgreen' : (answerResult === 'incorrect' && option === submittedAnswer ? 'salmon' : '') }}>
                {option}
              </button>
            ))}
          </div>
          {answerResult && <h3>You were {answerResult}!</h3>}
          {!quiz.admin_paced && answerResult && (
            <button onClick={handleSelfPacedNext} style={{marginTop: '20px'}}>Next Question</button>
          )}
        </div>
      ) : (
        <h2>{gameState.status === 'finished' || isQuizFinished ? 'Quiz has finished!' : 'Waiting for the next question...'}</h2>
      )}
    </div>
  );
}

export default PlayQuizPage;