// src/pages/AddQuestionsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext.jsx';

// Reusable Modal Component for Adding/Editing Questions
function QuestionModal({ initialQuestion, onSave, onCancel, title }) {
  const [questionText, setQuestionText] = useState(initialQuestion.question_text || '');
  const [options, setOptions] = useState(initialQuestion.options || ['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(initialQuestion.correct_answer || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!options.includes(correctAnswer)) return alert("The correct answer must be one of the options.");
    setLoading(true);
    await onSave({ ...initialQuestion, question_text: questionText, options, correct_answer: correctAnswer });
    setLoading(false);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '500px' }}>
        <h3>{title}</h3>
        <form onSubmit={handleSave}>
          <label>Question Text</label>
          <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} required />
          {options.map((option, index) => (
            <div key={index}>
              <label>Option {index + 1}</label>
              <input placeholder={`Option ${index + 1}`} value={option} onChange={(e) => handleOptionChange(index, e.target.value)} required />
              <label><input type="radio" name="correctAnswerModal" value={option} checked={correctAnswer === option} onChange={(e) => setCorrectAnswer(e.target.value)} /> Correct</label>
            </div>
          ))}
          <div style={{ marginTop: '20px' }}>
            <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddQuestionsPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState({ title: '', description: '', shuffle_questions: false, admin_paced: false, per_question_timer: '', overall_timer: '' });
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false); // New state for add modal
  const isNewQuiz = !quizId;
  
  const fetchQuizData = useCallback(async () => {
    if (isNewQuiz) return;
    setLoading(true);
    const { data: quizData } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
    if (quizData) setQuiz(quizData);
    const { data: questionsData } = await supabase.from('questions').select('*').eq('quiz_id', quizId).order('id');
    if (questionsData) setQuestions(questionsData);
    setLoading(false);
  }, [quizId, isNewQuiz]);

  useEffect(() => { fetchQuizData(); }, [fetchQuizData]);

  const handleDetailsChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;
    setQuiz(prevQuiz => {
      let newState = { ...prevQuiz, [name]: finalValue };
      if (name === 'admin_paced' && checked) {
        newState.shuffle_questions = false;
        newState.overall_timer = '';
      }
      if ((name === 'shuffle_questions' && checked) || (name === 'overall_timer' && value)) {
        newState.admin_paced = false;
      }
      return newState;
    });
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    const quizDataToSave = { 
      title: quiz.title, description: quiz.description, admin_id: user.id,
      shuffle_questions: quiz.shuffle_questions, admin_paced: quiz.admin_paced,
      per_question_timer: quiz.per_question_timer || null, overall_timer: quiz.overall_timer || null,
    };
    if (isNewQuiz) {
      const { data, error } = await supabase.from('quizzes').insert(quizDataToSave).select('id').single();
      if (error) alert(error.message);
      else if (data) navigate(`/admin/quiz/${data.id}/edit`, { replace: true });
    } else {
      const { error } = await supabase.from('quizzes').update(quizDataToSave).eq('id', quizId);
      if (error) alert(error.message);
      else alert('Quiz details updated!');
    }
    setActionLoading(false);
  };

  const handleAddQuestion = async (newQuestionData) => {
    setActionLoading(true);
    const { error } = await supabase.from('questions').insert({
      quiz_id: quizId,
      question_text: newQuestionData.question_text,
      options: newQuestionData.options,
      correct_answer: newQuestionData.correct_answer,
    });
    if (error) alert(error.message);
    setIsAddingQuestion(false);
    fetchQuizData();
    setActionLoading(false);
  };

  const handleUpdateQuestion = async (updatedQuestion) => {
    setActionLoading(true);
    const { error } = await supabase.from('questions').update({
      question_text: updatedQuestion.question_text,
      options: updatedQuestion.options,
      correct_answer: updatedQuestion.correct_answer,
    }).eq('id', updatedQuestion.id);
    if (error) alert(error.message);
    setEditingQuestion(null);
    fetchQuizData();
    setActionLoading(false);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm("Are you sure?")) {
      setActionLoading(true);
      await supabase.from('questions').delete().eq('id', questionId);
      fetchQuizData();
      setActionLoading(false);
    }
  };
  
  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {isAddingQuestion && (
         <QuestionModal
          title="Add New Question"
          initialQuestion={{}}
          onSave={handleAddQuestion}
          onCancel={() => setIsAddingQuestion(false)}
        />
      )}
      {editingQuestion && (
        <QuestionModal 
          title="Edit Question"
          initialQuestion={editingQuestion} 
          onSave={handleUpdateQuestion} 
          onCancel={() => setEditingQuestion(null)}
        />
      )}
      
      <Link to="/admin">← Back to Dashboard</Link>
      <h2>{isNewQuiz ? 'Create Quiz' : 'Edit Quiz'}</h2>
      <form onSubmit={handleSaveDetails}>
        <div><label>Title</label><input name="title" value={quiz.title || ''} onChange={handleDetailsChange} required /></div>
        <div><label>Description</label><textarea name="description" value={quiz.description || ''} onChange={handleDetailsChange} /></div>
        <h3>Quiz Settings</h3>
        <div><label><input type="checkbox" name="shuffle_questions" checked={quiz.shuffle_questions || false} onChange={handleDetailsChange} disabled={quiz.admin_paced} /> Shuffle Questions</label></div>
        <div><label><input type="checkbox" name="admin_paced" checked={quiz.admin_paced || false} onChange={handleDetailsChange} /> Admin Paced (Live Quiz)</label></div>
        <div><label>Timer Per Question (seconds)</label><input type="number" name="per_question_timer" value={quiz.per_question_timer || ''} onChange={handleDetailsChange} /></div>
        <div><label>Overall Quiz Timer (minutes)</label><input type="number" name="overall_timer" value={quiz.overall_timer || ''} onChange={handleDetailsChange} disabled={quiz.admin_paced} /></div>
        <button type="submit" disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save Details'}</button>
      </form>
      <hr />
      {!isNewQuiz && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Questions</h3>
            <button onClick={() => setIsAddingQuestion(true)} disabled={actionLoading}>+ Add Question</button>
          </div>
          <ul>
            {questions.map((q, index) => (
              <li key={q.id}>
                {index + 1}. {q.question_text}
                <div>
                  <button onClick={() => setEditingQuestion(q)} disabled={actionLoading}>Edit</button>
                  <button onClick={() => handleDeleteQuestion(q.id)} disabled={actionLoading} style={{marginLeft: '10px'}}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AddQuestionsPage;