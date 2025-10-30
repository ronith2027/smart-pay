import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AccountDetailsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    user_id_public: ''
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // Image upload state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      const userData = response.data.user;
      setUser(userData);
      setProfileForm({
        name: userData.name || userData.full_name || '',
        email: userData.email || '',
        phone_number: userData.phone_number || userData.mobile_number || '',
        user_id_public: userData.username || userData.user_id_public || userData.email || ''
      });
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        return navigate('/');
      }
      setError('Failed to load profile');
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      await api.put('/auth/profile', { name: profileForm.name, email: profileForm.email });
      setSuccess('Profile updated successfully!');
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordForm.new_password.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    
    try {
      await api.put('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      setSuccess('Password changed successfully!');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return;
    
    setUploading(true);
    setError('');
    setSuccess('');
    
    try {
      const formData = new FormData();
      formData.append('profile_image', selectedImage);
      
      const response = await api.put('/auth/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSuccess('Profile image updated successfully!');
      setSelectedImage(null);
      setImagePreview(null);
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0f0f13', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#e2e8f0'
      }}>
        Loading...
      </div>
    );
  }

  const tabStyle = (isActive) => ({
    padding: '12px 24px',
    background: isActive ? '#3182ce' : 'transparent',
    color: isActive ? '#fff' : '#a0aec0',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  });

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid #4a5568',
    borderRadius: '8px',
    background: '#2d3748',
    color: '#e2e8f0',
    fontSize: '14px',
    marginBottom: '16px'
  };

  const buttonStyle = {
    padding: '12px 24px',
    background: '#3182ce',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f13',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '30px' 
      }}>
        <h1 style={{ color: '#e2e8f0', fontSize: '28px', margin: 0 }}>
          Account Details
        </h1>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{
            ...buttonStyle,
            background: '#4a5568'
          }}
        >
          Back to Dashboard
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          background: '#fed7d7',
          color: '#c53030',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{
          background: '#c6f6d5',
          color: '#22543d',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {success}
        </div>
      )}

      {/* Main Content */}
      <div style={{
        background: '#1a202c',
        borderRadius: '12px',
        overflow: 'hidden',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          background: '#2d3748',
          borderBottom: '1px solid #4a5568'
        }}>
          <button 
            onClick={() => setActiveTab('profile')}
            style={tabStyle(activeTab === 'profile')}
          >
            Profile Information
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            style={tabStyle(activeTab === 'security')}
          >
            Security
          </button>
          <button 
            onClick={() => setActiveTab('image')}
            style={tabStyle(activeTab === 'image')}
          >
            Profile Image
          </button>
        </div>

        <div style={{ padding: '30px' }}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              <h2 style={{ color: '#e2e8f0', marginBottom: '20px' }}>
                Profile Information
              </h2>
              <form onSubmit={handleProfileSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#a0aec0', 
                    marginBottom: '8px',
                    fontSize: '14px' 
                  }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({
                      ...profileForm, 
                      name: e.target.value
                    })}
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#a0aec0', 
                    marginBottom: '8px',
                    fontSize: '14px' 
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({
                      ...profileForm, 
                      email: e.target.value
                    })}
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#a0aec0', 
                    marginBottom: '8px',
                    fontSize: '14px' 
                  }}>
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone_number}
                    onChange={(e) => setProfileForm({
                      ...profileForm, 
                      phone_number: e.target.value
                    })}
                    style={inputStyle}
                    readOnly
                    title="Mobile number cannot be changed for security reasons"
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#a0aec0', 
                    marginBottom: '8px',
                    fontSize: '14px' 
                  }}>
                    User ID
                  </label>
                  <input
                    type="text"
                    value={profileForm.user_id_public}
                    style={{
                      ...inputStyle,
                      background: '#4a5568',
                      cursor: 'not-allowed'
                    }}
                    readOnly
                    title="User ID cannot be changed"
                  />
                </div>

                <button type="submit" style={buttonStyle}>
                  Update Profile
                </button>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div>
              <h2 style={{ color: '#e2e8f0', marginBottom: '20px' }}>
                Change Password
              </h2>
              <form onSubmit={handlePasswordSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#a0aec0', 
                    marginBottom: '8px',
                    fontSize: '14px' 
                  }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({
                      ...passwordForm, 
                      current_password: e.target.value
                    })}
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#a0aec0', 
                    marginBottom: '8px',
                    fontSize: '14px' 
                  }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({
                      ...passwordForm, 
                      new_password: e.target.value
                    })}
                    style={inputStyle}
                    required
                    minLength={6}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#a0aec0', 
                    marginBottom: '8px',
                    fontSize: '14px' 
                  }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({
                      ...passwordForm, 
                      confirm_password: e.target.value
                    })}
                    style={inputStyle}
                    required
                    minLength={6}
                  />
                </div>

                <button type="submit" style={buttonStyle}>
                  Change Password
                </button>
              </form>
            </div>
          )}

          {/* Profile Image Tab */}
          {activeTab === 'image' && (
            <div>
              <h2 style={{ color: '#e2e8f0', marginBottom: '20px' }}>
                Profile Image
              </h2>
              
              {/* Current Image */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  color: '#a0aec0', 
                  marginBottom: '12px',
                  fontSize: '14px' 
                }}>
                  Current Profile Image
                </label>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: user.profile_image 
                    ? `url(http://localhost:3001/uploads/profiles/${user.profile_image}) center/cover`
                    : '#4a5568',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a0aec0',
                  fontSize: '14px',
                  border: '3px solid #2d3748'
                }}>
                  {!user.profile_image && 'No Image'}
                </div>
              </div>

              {/* Image Upload */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  color: '#a0aec0', 
                  marginBottom: '8px',
                  fontSize: '14px' 
                }}>
                  Choose New Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{
                    ...inputStyle,
                    padding: '8px'
                  }}
                />
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#a0aec0', 
                    marginBottom: '8px',
                    fontSize: '14px' 
                  }}>
                    Preview
                  </label>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: `url(${imagePreview}) center/cover`,
                    border: '3px solid #3182ce'
                  }} />
                </div>
              )}

              {/* Upload Button */}
              {selectedImage && (
                <button 
                  onClick={handleImageUpload}
                  disabled={uploading}
                  style={{
                    ...buttonStyle,
                    opacity: uploading ? 0.6 : 1,
                    cursor: uploading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </button>
              )}

              {/* Upload Guidelines */}
              <div style={{
                marginTop: '24px',
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '1px solid #4a5568'
              }}>
                <h4 style={{ color: '#e2e8f0', marginBottom: '8px', fontSize: '14px' }}>
                  Upload Guidelines:
                </h4>
                <ul style={{ color: '#a0aec0', fontSize: '12px', margin: 0, paddingLeft: '20px' }}>
                  <li>Maximum file size: 5MB</li>
                  <li>Accepted formats: JPG, PNG, GIF</li>
                  <li>Recommended size: 400x400 pixels</li>
                  <li>Square images work best for profile pictures</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountDetailsPage;