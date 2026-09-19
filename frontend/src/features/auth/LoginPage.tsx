import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/api-client';
import { Button } from '../../components/Button';
import { Input } from '../../components/Form';
import { User, UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post<{ token: string; user: User }>('/auth/login', {
        email,
        password,
      });

      login(res.data.token, res.data.user);
      success(`Welcome back, ${res.data.user.name}!`);

      if (res.data.user.role === UserRole.STUDENT) {
        navigate('/portal');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      error(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleLogin}>
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. owner@jaivacrm.com"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        <Button
          type="submit"
          variant="primary"
          style={{ width: '100%', marginTop: '16px' }}
          loading={loading}
        >
          Sign In
        </Button>
      </form>
    </div>
  );
};
