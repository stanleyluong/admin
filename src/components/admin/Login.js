import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import useMessage from '../../hooks/useMessage';

const Login = ({ auth, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { message, messageType, showMessage } = useMessage();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      showMessage('Logged in successfully!', 'success');
      onLogin(userCredential.user);
    } catch (error) {
      console.error('Error logging in:', error);
      showMessage('Error logging in: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-darkBlue flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-lightBlue bg-opacity-20 p-8 rounded-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-lightestSlate">Admin Login</h2>
          <p className="mt-2 text-center text-sm text-lightSlate">
            Enter your credentials to access admin features
          </p>
        </div>
        
        {message && (
          <div className={`p-4 rounded ${
            messageType === 'success' ? 'bg-green-100 text-green-700' : 
            messageType === 'info' ? 'bg-blue-100 text-blue-700' :
            'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-darkBlue bg-green hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {loading ? 'Loading...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Login;