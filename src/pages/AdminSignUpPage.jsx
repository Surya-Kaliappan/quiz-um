import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function AdminLoginPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRePassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (event) => {
    event.preventDefault();
    if (password !== repassword) {
      alert("Passwords do not match!");
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name, // Save the name to the user's metadata
        },
      },
    });

    setLoading(false);
    if (error) {
      alert(error.message);
    } else {
      alert('Sign up successful! Please log in to continue.');
      navigate('/admin-login'); 
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4 md:p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 animate-underline">
            Admin Sign Up
          </h2>
          <form className="flex flex-col space-y-4">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="p-3 rounded-lg text-sm md:text-base text-gray-800 border border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="p-3 rounded-lg text-sm md:text-base text-gray-800 border border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="p-3 rounded-lg text-sm md:text-base text-gray-800 border border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            />
            <input
              type="password"
              placeholder="Confirm-Password"
              value={repassword}
              onChange={(e) => setRePassword(e.target.value)}
              required
              className="p-3 rounded-lg text-sm md:text-base text-gray-800 border border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            />
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-3 rounded-lg hover:scale-105 hover:from-blue-600 hover:to-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing up...
                </>
              ) : (
                'Sign up'
              )}
            </button>
          </form>
          <div className="text-center mt-4">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/admin-login" className="text-blue-600 hover:underline">
                Log In
              </Link>
            </p>
            <Link to="/" className="text-m text-blue-600 hover:underline mt-2 inline-block">
              Go Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;