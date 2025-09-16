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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-blue-50 to-blue-200 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <h3 className="text-2xl font-semibold text-blue-900 mb-4">{title}</h3>
        <div className="flex-1 overflow-y-auto pr-2">
          <form onSubmit={handleSave}>
            <label className="block text-sm font-medium text-blue-800 mb-1">Question Text</label>
            <textarea
              className="w-full p-3 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-600 bg-gray-100 text-gray-800"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              required
            />
            {options.map((option, index) => (
              <div key={index} className="mt-4">
                <label className="block text-sm font-medium text-blue-800 mb-1">Option {index + 1}</label>
                <input
                  className="w-full p-3 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-600 bg-gray-100 text-gray-800"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  required
                />
                <label className="flex items-center mt-2 text-blue-800">
                  <input
                    type="radio"
                    name="correctAnswerModal"
                    value={option}
                    checked={correctAnswer === option}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="mr-2 h-5 w-5 rounded-full border-blue-300 text-blue-600 focus:ring-blue-600 transition-colors"
                  />
                  Correct
                </label>
              </div>
            ))}
          </form>
        </div>
        <div className="mt-6 flex justify-end space-x-3 sticky bottom-0 bg-gradient-to-br from-blue-50 to-blue-200 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-blue-300 text-blue-900 px-4 py-2 rounded-md hover:bg-blue-400 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddQuestionsPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState({ title: '', description: '', shuffle_questions: false, admin_paced: false, per_question_timer: '' });
  const [initialQuiz, setInitialQuiz] = useState(null);
  const [pacingMode, setPacingMode] = useState(null); // 'admin_paced', 'shuffle_questions', or null
  const [hasChanges, setHasChanges] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const isNewQuiz = !quizId;

  const fetchQuizData = useCallback(async () => {
    if (isNewQuiz) return;
    setLoading(true);
    const { data: quizData } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
    if (quizData) {
      setQuiz(quizData);
      setInitialQuiz(quizData);
      setPacingMode(quizData.admin_paced ? 'admin_paced' : quizData.shuffle_questions ? 'shuffle_questions' : null);
    }
    const { data: questionsData } = await supabase.from('questions').select('*').eq('quiz_id', quizId).order('id');
    if (questionsData) setQuestions(questionsData);
    setLoading(false);
  }, [quizId, isNewQuiz]);

  useEffect(() => {
    fetchQuizData();
  }, [fetchQuizData]);

  useEffect(() => {
    if (!initialQuiz) return;
    const isChanged =
      quiz.title !== initialQuiz.title ||
      quiz.description !== initialQuiz.description ||
      quiz.per_question_timer !== initialQuiz.per_question_timer ||
      pacingMode !== (initialQuiz.admin_paced ? 'admin_paced' : initialQuiz.shuffle_questions ? 'shuffle_questions' : null);
    setHasChanges(isChanged);
  }, [quiz, pacingMode, initialQuiz]);

  const handleDetailsChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && (name === 'admin_paced' || name === 'shuffle_questions')) {
      setPacingMode(checked ? name : null);
      setQuiz((prev) => ({
        ...prev,
        admin_paced: name === 'admin_paced' && checked,
        shuffle_questions: name === 'shuffle_questions' && checked,
      }));
    } else {
      setQuiz((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!quiz.title) {
      alert('Quiz title is required.');
      return;
    }
    if (!pacingMode) {
      alert('Please select a pacing mode (Admin-paced or Shuffle Questions).');
      return;
    }
    setActionLoading(true);
    const quizDataToSave = {
      title: quiz.title,
      description: quiz.description,
      admin_id: user.id,
      shuffle_questions: pacingMode === 'shuffle_questions',
      admin_paced: pacingMode === 'admin_paced',
      per_question_timer: quiz.per_question_timer || null,
    };
    if (isNewQuiz) {
      const { data, error } = await supabase.from('quizzes').insert(quizDataToSave).select('id').single();
      if (error) alert(error.message);
      else if (data) {
        setInitialQuiz(quizDataToSave);
        setHasChanges(false);
        navigate(`/admin/quiz/${data.id}/edit`, { replace: true });
      }
    } else {
      const { error } = await supabase.from('quizzes').update(quizDataToSave).eq('id', quizId);
      if (error) alert(error.message);
      else {
        setInitialQuiz(quizDataToSave);
        setHasChanges(false);
        alert('Quiz details updated!');
      }
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

  if (loading) return <div className="text-center text-gray-600">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col">
      <div className="container mx-auto p-4 md:p-6 max-w-6xl flex-1">
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
        <Link to="/admin" className="text-blue-800 hover:text-blue-900 font-medium mb-4 md:mb-6">← Back to Dashboard</Link>
        <h2 className="text-2xl md:text-4xl font-bold text-blue-900 mb-6 md:mb-8">{isNewQuiz ? 'Create Quiz' : 'Edit Quiz'}</h2>
        <form onSubmit={handleSaveDetails} className="space-y-4 md:space-y-6 bg-gray-100 p-4 md:p-8 rounded-lg shadow-md flex-1">
          <div className="flex flex-col space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={quiz.title || ''}
                onChange={handleDetailsChange}
                required
                className="w-full p-3 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-600 bg-gray-100 text-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">Description</label>
              <textarea
                name="description"
                value={quiz.description || ''}
                onChange={handleDetailsChange}
                className="w-full p-3 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-600 bg-gray-100 text-gray-800"
              />
            </div>
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-blue-900 mt-4 md:mt-6">Quiz Settings</h3>
          <div className="flex flex-col space-y-4">
            <label className="flex items-center text-sm font-medium text-blue-800">
              <input
                type="checkbox"
                name="shuffle_questions"
                checked={pacingMode === 'shuffle_questions'}
                onChange={handleDetailsChange}
                className="mr-2 h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-600 transition-colors"
              />
              Shuffle Questions
            </label>
            <label className="flex items-center text-sm font-medium text-blue-800">
              <input
                type="checkbox"
                name="admin_paced"
                checked={pacingMode === 'admin_paced'}
                onChange={handleDetailsChange}
                className="mr-2 h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-600 transition-colors"
              />
              Admin Paced (Live Quiz)
            </label>
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">Timer Per Question (seconds)</label>
              <input
                type="number"
                name="per_question_timer"
                value={quiz.per_question_timer || ''}
                onChange={handleDetailsChange}
                className="w-full p-3 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-600 bg-gray-100 text-gray-800"
              />
            </div>
          </div>
          {hasChanges && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={actionLoading}
                className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                {actionLoading ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          )}
        </form>
        <hr className="my-6 md:my-8 border-blue-300" />
        {!isNewQuiz && (
          <div>
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-semibold text-blue-900">Questions</h3>
              <button
                onClick={() => setIsAddingQuestion(true)}
                disabled={actionLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                + Add Question
              </button>
            </div>
            <ul className="space-y-4">
              {questions.map((q, index) => (
                <li key={q.id} className="p-4 bg-gray-100 rounded-lg shadow-md">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                    <span className="text-gray-800 text-base md:text-lg">{index + 1}. {q.question_text}</span>
                    <div className="flex space-x-3 mt-2 md:mt-0">
                      <button
                        onClick={() => setEditingQuestion(q)}
                        disabled={actionLoading}
                        className="bg-blue-500 text-white px-3 md:px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        disabled={actionLoading}
                        className="bg-red-500 text-white px-3 md:px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddQuestionsPage;