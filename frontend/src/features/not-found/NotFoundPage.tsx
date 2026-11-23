import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plane } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import './NotFoundPage.css';

/** The "0" of 404: a globe with a plane circling it. Decorative, so hidden from screen readers. */
const GlobeZero: React.FC = () => (
  <svg className="nf-globe" viewBox="0 0 120 120" fill="none" aria-hidden="true" style={{ overflow: 'visible' }}>
    <circle cx="60" cy="60" r="40" fill="#EFF6FF" stroke="currentColor" strokeWidth="7" />
    <ellipse cx="60" cy="60" rx="17" ry="40" stroke="currentColor" strokeWidth="4" opacity="0.55" />
    <path d="M22 47h76M22 73h76" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
    <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="2" strokeDasharray="3 7" opacity="0.35" />
    <g className="nf-plane">
      {/* Plane sits at the top of the orbit; lucide's plane points up-right, so turn it to face along the path. */}
      <g transform="rotate(45 60 4)">
        <Plane x={48} y={-8} width={24} height={24} strokeWidth={2} color="currentColor" fill="#FFFFFF" />
      </g>
    </g>
  </svg>
);

export const NotFoundPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const home = !user
    ? { to: '/login', label: 'Go to sign in' }
    : user.role === UserRole.STUDENT
      ? { to: '/portal', label: 'Back to my portal' }
      : { to: '/dashboard', label: 'Back to dashboard' };

  // history.state.idx is set by React Router; 0 means this tab has nowhere to go back to.
  const canGoBack = typeof window !== 'undefined' && (window.history.state?.idx ?? 0) > 0;

  return (
    <div className="nf-page">
      <header className="nf-header">
        <Link to={home.to} aria-label="IIEC CRM home">
          <img src="/logo.png" alt="IIEC" />
        </Link>
      </header>

      <main className="nf-main">
        <div className="nf-code" role="img" aria-label="404">
          <span aria-hidden="true">4</span>
          <GlobeZero />
          <span aria-hidden="true">4</span>
        </div>

        <p className="nf-eyebrow">Page not found</p>
        <h1 className="nf-title">This page took a different route</h1>
        <p className="nf-text">
          We couldn't find <span className="nf-path">{location.pathname}</span>. It may have moved, or the link may be
          mistyped.
        </p>

        <div className="nf-actions">
          <Link to={home.to} className="btn btn-primary">
            {home.label}
          </Link>
          {canGoBack && (
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} aria-hidden="true" /> Go back
            </button>
          )}
        </div>

        <p className="nf-help">If you followed a link inside the CRM, let your admin know so it can be fixed.</p>
      </main>
    </div>
  );
};
