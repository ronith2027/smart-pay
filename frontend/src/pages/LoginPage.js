import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTrpc } from '../trpc/TrpcProvider.jsx';
import './LoginPage.css';

const LoginPage = () => {
  const trpc = useTrpc();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState('verify'); // 'verify' | 'reset'
  const [resetToken, setResetToken] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    userId: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (isForgot && forgotStep === 'verify') {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email was entered incorrectly';
      }
      if (!/^\d{10}$/.test(formData.phone)) {
        newErrors.phone = 'Enter a valid 10-digit phone';
      }
    } else if (isForgot && forgotStep === 'reset') {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    } else if (isLogin) {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email was entered incorrectly';
      }
      if (!formData.password) {
        newErrors.password = 'Password is required';
      }
    } else {
      if (!formData.name) {
        newErrors.name = 'Name is required';
      }
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email was entered incorrectly';
      }
      // Phone is now optional
      if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
        newErrors.phone = 'Enter a valid 10-digit phone';
      }
      if (!formData.userId || formData.userId.length < 3) {
        newErrors.userId = 'User ID must be at least 3 chars';
      }
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      if (isForgot) {
        if (forgotStep === 'verify') {
          const res = await api.post('/auth/forgot/verify', {
            email: formData.email,
            mobile_number: formData.phone
          });
          setResetToken(res.data.token);
          setMessage('Verified. Please enter your new password.');
          setForgotStep('reset');
          return;
        } else {
          const res2 = await api.post('/auth/forgot/reset', {
            token: resetToken,
            new_password: formData.password
          });
          setMessage(res2.data.message || 'Password reset successfully. Please sign in.');
          setIsForgot(false);
          setIsLogin(true);
          setForgotStep('verify');
          setResetToken('');
          setFormData({ name: '', email: '', phone: '', userId: '', password: '', confirmPassword: '' });
          return;
        }
      } else if (isLogin) {
// Login via tRPC
        const result = await trpc.auth.login.mutate({ email: formData.email, password: formData.password });
        localStorage.setItem('token', result.token);
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        setMessage('Login successful! Redirecting...');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
// Register via tRPC
        const result = await trpc.auth.register.mutate({
          full_name: formData.name,
          email: formData.email,
          mobile_number: formData.phone,
          user_id_public: formData.userId,
          password: formData.password,
        });
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        setMessage('Registration successful! Please login.');
        setTimeout(() => {
          setIsLogin(true);
          setFormData({ name: '', email: '', phone: '', userId: '', password: '', confirmPassword: '' });
        }, 2000);
      }
    } catch (error) {
const msg = error?.message || error?.response?.data?.message || 'An error occurred';
      setMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsForgot(false);
    setIsLogin(!isLogin);
    setFormData({ name: '', email: '', phone: '', userId: '', password: '', confirmPassword: '' });
    setErrors({});
    setMessage('');
  };

  const openForgot = () => {
    setIsForgot(true);
    setIsLogin(false);
    setForgotStep('verify');
    setResetToken('');
    setFormData({ name: '', email: '', phone: '', userId: '', password: '', confirmPassword: '' });
    setErrors({});
    setMessage('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isForgot ? 'Forgot password' : (isLogin ? 'Log in' : 'Create Account')}</h2>
        
        <form onSubmit={handleSubmit}>
          {!isLogin && !isForgot && (
            <div className="form-group">
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleInputChange}
                className={errors.name ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
          )}

          {!isLogin && !isForgot && (
            <div className="form-group">
              <input
                type="text"
                name="userId"
                placeholder="User ID"
                value={formData.userId}
                onChange={handleInputChange}
                className={errors.userId ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.userId && <span className="error-text">{errors.userId}</span>}
            </div>
          )}

          {(!isForgot || (isForgot && forgotStep === 'verify')) && (
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
          )}

          {(!isLogin || (isForgot && forgotStep === 'verify')) && (
            <div className="form-group">
              <input
                type="tel"
                name="phone"
                placeholder="Phone number"
                value={formData.phone}
                onChange={handleInputChange}
                className={errors.phone ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>
          )}

          {(!isForgot || (isForgot && forgotStep === 'reset')) && (
            <div className="form-group">
              <input
                type="password"
                name="password"
                placeholder="password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>
          )}

          {(!isLogin || (isForgot && forgotStep === 'reset')) && (
            <div className="form-group">
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={errors.confirmPassword ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>
          )}

          {/* Forgot password link removed as requested */}

          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : (isForgot ? (forgotStep === 'verify' ? 'Verify' : 'Reset Password') : (isLogin ? 'Log in' : 'Sign up'))}
          </button>
        </form>

        {/* Social login buttons removed as requested */}

        {isForgot ? (
          <div className="toggle-mode">
            <p>Remembered the password? <button type="button" onClick={() => { setIsForgot(false); setIsLogin(true); setForgotStep('verify'); setResetToken(''); }}>Back to login</button></p>
          </div>
        ) : (
          <div className="toggle-mode">
            {isLogin ? (
              <p>Not a member? <button type="button" onClick={toggleMode}>Join Now</button></p>
            ) : (
              <p>Already a member? <button type="button" onClick={toggleMode}>Sign in</button></p>
            )}
          </div>
        )}

        {message && (
          <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;