import React from 'react';
import { Outlet } from 'react-router-dom';
import { Logo } from '../components/Logo';

export const AuthLayout: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          padding: '36px 32px',
        }}
      >
        <div style={{ marginBottom: '28px' }}>
          <Logo variant="auth" height={60} />
        </div>

        <Outlet />
      </div>
    </div>
  );
};
