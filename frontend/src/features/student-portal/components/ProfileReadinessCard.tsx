import React from 'react';
import { Award, CheckCircle2, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';

interface ProfileReadinessCardProps {
  score?: number;
  onBoostScore?: () => void;
}

export const ProfileReadinessCard: React.FC<ProfileReadinessCardProps> = ({
  score = 88,
  onBoostScore,
}) => {
  // SVG Circular Gauge calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="student-readiness-card">
      <div className="student-readiness-header">
        <div className="student-readiness-title-group">
          <div className="student-readiness-icon-box">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="student-readiness-title">Admissions Readiness Index</h3>
            <p className="student-readiness-subtitle">Real-time profile strength calculated for Fall 2026</p>
          </div>
        </div>
        <Badge variant={score >= 80 ? 'success' : score >= 60 ? 'primary' : 'warning'}>
          {score >= 80 ? 'Competitive Profile' : 'In Progress'}
        </Badge>
      </div>

      <div className="student-readiness-body">
        {/* Circular Gauge */}
        <div className="student-readiness-gauge-wrapper">
          <svg className="student-readiness-gauge-svg" width="96" height="96" viewBox="0 0 96 96">
            <circle
              className="student-readiness-gauge-bg"
              cx="48"
              cy="48"
              r={radius}
              strokeWidth="7"
            />
            <circle
              className="student-readiness-gauge-fill"
              cx="48"
              cy="48"
              r={radius}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="student-readiness-gauge-text">
            <span className="student-readiness-score-num">{score}</span>
            <span className="student-readiness-score-denom">/100</span>
          </div>
        </div>

        {/* 4 Metric Sub-Bars */}
        <div className="student-readiness-breakdown">
          <div className="student-readiness-bar-item">
            <div className="student-readiness-bar-label">
              <span>Academics & Tests</span>
              <strong style={{ color: '#059669' }}>95%</strong>
            </div>
            <div className="student-readiness-track">
              <div className="student-readiness-fill success" style={{ width: '95%' }} />
            </div>
          </div>

          <div className="student-readiness-bar-item">
            <div className="student-readiness-bar-label">
              <span>University Selection</span>
              <strong style={{ color: 'var(--primary)' }}>100%</strong>
            </div>
            <div className="student-readiness-track">
              <div className="student-readiness-fill primary" style={{ width: '100%' }} />
            </div>
          </div>

          <div className="student-readiness-bar-item">
            <div className="student-readiness-bar-label">
              <span>Application Dossier & SOP</span>
              <strong style={{ color: '#D97706' }}>70%</strong>
            </div>
            <div className="student-readiness-track">
              <div className="student-readiness-fill warning" style={{ width: '70%' }} />
            </div>
          </div>

          <div className="student-readiness-bar-item">
            <div className="student-readiness-bar-label">
              <span>Financials & Visa Prep</span>
              <strong style={{ color: 'var(--text-muted)' }}>40%</strong>
            </div>
            <div className="student-readiness-track">
              <div className="student-readiness-fill neutral" style={{ width: '40%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer Callout */}
      <div className="student-readiness-callout">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          <CheckCircle2 size={15} color="#059669" style={{ flexShrink: 0 }} />
          <span>Finalizing your Statement of Purpose (SOP) will raise your index to <strong>96/100</strong>.</span>
        </div>
        {onBoostScore && (
          <Button variant="secondary" size="sm" onClick={onBoostScore} icon={<ArrowRight size={13} />}>
            Upload SOP
          </Button>
        )}
      </div>
    </div>
  );
};
