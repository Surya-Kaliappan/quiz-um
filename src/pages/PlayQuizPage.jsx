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

  const progressWidth = (timeLeft / duration) * 100;

  return (
    <div className="mb-4">
      <div className={`text-lg md:text-xl font-semibold ${timeLeft < 5 ? 'text-red-600 animate-pulse' : 'text-blue-800'}`}>
        Time Remaining: {timeLeft}s
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
        <div
          className={`h-2.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500`}
          style={{ width: `${progressWidth}%` }}
        ></div>
      </div>
    </div>
  );
}

function PlayQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [gameState, setGameState] = useState({ status: 'lobby', currentQuestionIndex: 0, questionStartTime: null });
  const [loading, setLoading] = useState(true);
  const [submittedAnswer, setSubmittedAnswer] = useState(null);
  const [lastSelectedOption, setLastSelectedOption] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [finalScore, setFinalScore] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNext, setIsNext] = useState(false);

  const localPlayerId = localStorage.getItem('quiz_player_id');
  const localPlayerName = localStorage.getItem('quiz_player_name');

  const getSavedAnswers = () => JSON.parse(localStorage.getItem(`quiz_${quizId}_answers`)) || {};
  const saveAnswer = useCallback((questionId, answer, result, correctAnswer) => {
    const answers = getSavedAnswers();
    answers[questionId] = { answer, result, correctAnswer };
    localStorage.setItem(`quiz_${quizId}_answers`, JSON.stringify(answers));
  }, [quizId]);

  const setupQuiz = useCallback(async () => {
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes').select(`*, questions(id, quiz_id, question_text, options, correct_answer)`).eq('id', quizId).order('id', { foreignTable: 'questions' }).single();
    
    if (quizError || !quizData) return navigate('/');

    setQuiz(quizData);
    console.dir(quizData);

    const savedOrder = localStorage.getItem(`quiz_${quizId}_order`);
    let questionOrder = quizData.questions || [];

    if (savedOrder) {
      questionOrder = JSON.parse(savedOrder);
    } else if (!quizData.admin_paced && quizData.shuffle_questions) {
      questionOrder = shuffleArray(questionOrder);
      localStorage.setItem(`quiz_${quizId}_order`, JSON.stringify(questionOrder));
    }
    setQuestions(questionOrder);
    
    const savedIndex = localStorage.getItem(`quiz_${quizId}_index`);
    const initialIndex = savedIndex ? parseInt(savedIndex, 10) : (quizData.admin_paced ? -1 : 0);
    
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
        payload.payload.questionStartTime = new Date().toISOString();
        setGameState(payload.payload);
      }).subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [quizId, navigate, localPlayerName, setupQuiz]);

  useEffect(() => {
    const currentQuestion = questions[gameState.currentQuestionIndex];
    if (currentQuestion) {
      const savedAnswers = getSavedAnswers();
      const previousSubmission = savedAnswers[currentQuestion.id];
      if (previousSubmission) {
        setSubmittedAnswer(previousSubmission.answer);
        setLastSelectedOption(previousSubmission.answer !== 'TIME_UP' ? previousSubmission.answer : null);
        setAnswerResult(previousSubmission.result);
        setCorrectAnswer(previousSubmission.correctAnswer);
      } else {
        setSubmittedAnswer(null);
        setLastSelectedOption(null);
        setAnswerResult(null);
        setCorrectAnswer(null);
      }
    }
  }, [gameState.currentQuestionIndex, questions]);

  const handleAnswerSubmit = async (option) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmittedAnswer(option);
    setLastSelectedOption(option);
    const currentQuestion = questions[gameState.currentQuestionIndex];
    const { data, error } = await supabase.functions.invoke('quiz-manager', {
      body: { action: 'SUBMIT_ANSWER', payload: { quizId, playerId: parseInt(localPlayerId, 10), questionId: currentQuestion.id, submittedAnswer: option, questionStartTime: gameState.questionStartTime } },
    });
    if (error) {
      alert("Error submitting answer.");
    } else {
      const result = data.correct ? 'correct' : 'incorrect';
      setAnswerResult(result);
      setCorrectAnswer(currentQuestion.correct_answer || data.correct_answer);
      saveAnswer(currentQuestion.id, option, result, currentQuestion.correct_answer || data.correct_answer);
    }
    setIsSubmitting(false);
  };

  const handleSelfPacedNext = useCallback(() => {
    if (isNext) return;
    setIsNext(true);
    const nextIndex = gameState.currentQuestionIndex + 1;
    localStorage.setItem(`quiz_${quizId}_index`, nextIndex);
    setGameState(prev => ({...prev, currentQuestionIndex: nextIndex, questionStartTime: new Date().toISOString()}));
    setIsNext(false);
  }, [gameState.currentQuestionIndex, quizId]);

  const handleQuitQuiz = async () => {
    if (!localPlayerId) return;

    if(gameState.status !== 'finished'){
      const channel = supabase.channel(`live-lobby-${quizId}`);
      channel.send({
        type: 'broadcast',
        event: 'player_left',
        payload: { playerId: parseInt(localPlayerId, 10) },
      });

      await supabase.from('players').delete().eq('id', localPlayerId);
    }
    localStorage.clear();
    navigate('/');
  };

  const handleTimeUp = () => {
    setSubmittedAnswer("TIME_UP");
    if (quiz && !quiz.admin_paced) {
      setTimeout(() => {
        handleSelfPacedNext();
      }, 1000);
    }
  };
  
  const isQuizFinished = !quiz?.admin_paced && gameState.currentQuestionIndex >= questions.length;
  useEffect(() => {
    const fetchFinalScore = async () => {
      if ((gameState.status === 'finished' || isQuizFinished) && localPlayerId) {
        const { data, error } = await supabase
          .from('players')
          .select('score')
          .eq('id', localPlayerId)
          .single();
        
        if (error) {
          console.error("Could not fetch final score", error);
        } else if (data) {
          setFinalScore(data.score);
        }
      }
    };

    fetchFinalScore();
  }, [gameState.status, isQuizFinished, localPlayerId]);

  if (loading) return <div className="text-center text-blue-800 text-lg animate-pulse">Loading Quiz...</div>;
  if (!quiz) return <div className="text-center text-blue-800 text-lg">Quiz not found.</div>;

  if (gameState.status !== 'active') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4 md:p-6">
        <div className="max-w-3xl w-full">
          <button
            onClick={handleQuitQuiz}
            className="fixed top-4 right-4 z-10 bg-white text-black font-bold px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base rounded-lg hover:scale-105 hover:red-300 transition-all duration-300"
          >
            Quit
          </button>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 animate-fade-in">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 animate-underline">Greetings, {localPlayerName}!</h2>
            <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-3">Lobby for: {quiz.title}</h3>
            {gameState.status === 'deployed' && <p>Waiting for the admin to Start Quiz</p>}
            {gameState.status === 'cancelled' && <p>Quiz has been Cancelled by Admin.</p>}
            {gameState.status === 'finished' && finalScore !== null && (
              <div className="mt-4">
                <p>Quiz has been Finished!!</p>
                <h3 className="text-center text-lg md:text-xl font-semibold text-gray-800 mb-1 mt-5">Your Final Score</h3>
                <p className="text-center text-gray-900 text-xl md:text-lg font-bold">{finalScore} out of {questions.length}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } 

  const currentQuestion = questions[gameState.currentQuestionIndex];
  const timeLimit = quiz?.per_question_timer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4 md:p-6">
      <div className="max-w-3xl w-full">
        <button
          onClick={handleQuitQuiz}
          className="fixed top-4 right-4 z-10 bg-white text-black font-bold px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base rounded-lg hover:scale-105 hover:red-300 transition-all duration-300"
        >
          Quit
        </button>
        <h3 className='fixed top-4 left-5 z-10 text-white font-bold text-2xl'>{localPlayerName}</h3>
        {currentQuestion && !isQuizFinished ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 animate-fade-in">
            <div className="flex items-center mb-4">
              <div className="relative w-10 h-10 mr-3">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-0 flex items-center justify-center bg-white rounded-full text-lg font-bold text-gray-900">
                  {gameState.currentQuestionIndex + 1}
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-800">
                of {questions.length}
              </h3>
            </div>
            {timeLimit && (
              <Timer 
                startTime={gameState.questionStartTime} 
                duration={timeLimit}
                onTimeUp={handleTimeUp}
              />
            )}
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-4 animate-underline">{currentQuestion.question_text}</h2>
            <div className="flex flex-col space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSubmit(option)}
                  disabled={isSubmitting || !!submittedAnswer}
                  className={`p-4 rounded-lg text-sm md:text-base text-gray-800 border border-blue-400/50 transition-all duration-300 cursor-not-allowed ${
                    (option === submittedAnswer || (submittedAnswer === 'TIME_UP' && option === lastSelectedOption))
                      ? answerResult === null
                        ? 'bg-blue-100 border-blue-200 animate-pulse'
                        : answerResult === 'correct'
                        ? 'bg-green-100 border-green-200 font-semibold'
                        : 'bg-red-100 border-red-200 font-semibold'
                      : 'bg-white border-blue-400/50'
                  } ${!(isSubmitting || !!submittedAnswer) ? 'hover:bg-blue-50 hover:scale-105 cursor-pointer' : ''}`}
                >
                  {option}
                </button>
              ))}
            </div>
            {answerResult && (
              <h3 className="text-lg md:text-xl text-gray-800 font-semibold mt-4">
                You were {answerResult}! {answerResult === 'incorrect' && correctAnswer && (
                  <span className="text-blue-600">Correct answer: {correctAnswer}</span>
                )}
              </h3>
            )}
            {submittedAnswer === 'TIME_UP' && answerResult === null && (
              <h3 className="text-lg md:text-xl text-red-600 font-semibold mt-4 animate-pulse">
                Time's up! {correctAnswer && (
                  <span className="text-blue-600">Correct answer: {correctAnswer}</span>
                )}
              </h3>
            )}
            {!quiz.admin_paced && answerResult && (
              <button
                onClick={handleSelfPacedNext}
                disabled={isNext}
                className="bg-blue-400 text-white px-5 py-2.5 rounded-lg hover:scale-105 hover:green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 mt-4"
              >
                Next Question
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 animate-fade-in">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 animate-underline">
              {gameState.status === 'finished' || isQuizFinished ? 'Quiz has finished!' : 'Waiting for the next question...'}
            </h2>
            {finalScore !== null && (
              <div>
                <h3 className="text-center text-lg md:text-xl font-semibold text-gray-800 mb-2">Your Final Score</h3>
                <p className="text-center text-xl text-gray-900 text-base md:text-lg font-bold">{finalScore} out of {questions.length}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayQuizPage;