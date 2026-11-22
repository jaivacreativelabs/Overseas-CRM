import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/api-client';
import { Button } from '../../components/Button';
import { Input } from '../../components/Form';
import { User, UserRole } from '../../types';

export const STUDENT_CREDENTIALS = [
  { id: 'STU-2026-0101', name: 'Aarav Sharma', email: 'aarav.sharma.dtu@gmail.com' },
  { id: 'STU-2026-0102', name: 'Ananya Iyer', email: 'ananya.iyer.annauniv@gmail.com' },
  { id: 'STU-2026-0103', name: 'Aditya Verma', email: 'aditya.verma.vjti@gmail.com' },
  { id: 'STU-2026-0104', name: 'Diya Nambiar', email: 'diya.nambiar.nitc@gmail.com' },
  { id: 'STU-2026-0105', name: 'Kavya Deshmukh', email: 'kavya.deshmukh.coep@gmail.com' },
  { id: 'STU-2026-0106', name: 'Rohan Kulkarni', email: 'rohan.kulkarni.rvce@gmail.com' },
  { id: 'STU-2026-0107', name: 'Meera Krishnan', email: 'meera.krishnan.psg@gmail.com' },
  { id: 'STU-2026-0108', name: 'Nikhil Joshi', email: 'nikhil.joshi.manipal@gmail.com' },
  { id: 'STU-2026-0109', name: 'Sneha Mukherjee', email: 'sneha.mukherjee.ju@gmail.com' },
  { id: 'STU-2026-0110', name: 'Arjun Pillai', email: 'arjun.pillai.vit@gmail.com' },
  { id: 'STU-2026-0111', name: 'Pooja Hegde', email: 'pooja.hegde.bmsce@gmail.com' },
  { id: 'STU-2026-0112', name: 'Siddharth Rao', email: 'siddharth.rao.cbit@gmail.com' },
  { id: 'STU-2026-0113', name: 'Tanvi Agarwal', email: 'tanvi.agarwal.thapar@gmail.com' },
  { id: 'STU-2026-0114', name: 'Varun Nair', email: 'varun.nair.pes@gmail.com' },
  { id: 'STU-2026-0115', name: 'Ishita Sen', email: 'ishita.sen.bits@gmail.com' },
];

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

      {/* Quick Demo Fill Buttons */}
      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Quick Demo Credentials (Password: Password@123)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {[
            { label: '👑 Owner Admin', mail: 'owner@jaivacrm.com' },
            { label: '🛡️ Branch Admin', mail: 'admin@jaivacrm.com' },
            { label: '🎓 Counselor', mail: 'counsellor@jaivacrm.com' },
            { label: '👨‍🎓 Student Portal', mail: 'rohan.sharma@example.com' },
          ].map((demo) => (
            <button
              key={demo.mail}
              type="button"
              onClick={() => {
                setEmail(demo.mail);
                setPassword('Password@123');
              }}
              style={{
                fontSize: '11px',
                padding: '6px 8px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {demo.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '10px' }}>
          <select
            aria-label="Quick Select Student"
            onChange={(e) => {
              if (e.target.value) {
                setEmail(e.target.value);
                setPassword('Password@123');
              }
            }}
            value={STUDENT_CREDENTIALS.some((s) => s.email === email) ? email : ''}
            style={{
              width: '100%',
              fontSize: '11px',
              padding: '6px 8px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">🎓 Quick Fill: Any of the 15 Students...</option>
            {STUDENT_CREDENTIALS.map((s) => (
              <option key={s.email} value={s.email}>
                {s.id}: {s.name} ({s.email})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
