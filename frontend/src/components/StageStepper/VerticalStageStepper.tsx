import React from 'react';
import { Check, Lock } from 'lucide-react';
import { StudentStage } from '../../types';
import { STAGES_CONFIG } from './index';

interface VerticalStageStepperProps {
  currentStage: StudentStage;
  sidebarCollapsed?: boolean;
}

export const VerticalStageStepper: React.FC<VerticalStageStepperProps> = ({
  currentStage,
  sidebarCollapsed = false,
}) => {
  const currentIndex = STAGES_CONFIG.findIndex((s) => s.stage === currentStage);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const progressPercent = Math.round(((activeIndex + 1) / STAGES_CONFIG.length) * 100);

  if (sidebarCollapsed) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 0',
        }}
        title={`Application Progress: Stage ${activeIndex + 1} of 12 (${progressPercent}%)`}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '11px',
            border: '1px solid rgba(0, 87, 248, 0.3)',
          }}
        >
          {activeIndex + 1}/12
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* Header & Overall Journey Progress */}
      <div
        style={{
          padding: '8px 10px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
            }}
          >
            Application Journey
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--primary)',
              backgroundColor: 'var(--primary-light)',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            {progressPercent}%
          </span>
        </div>

        {/* Progress Bar Line */}
        <div
          style={{
            width: '100%',
            height: '4px',
            backgroundColor: 'var(--border-light)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginTop: '2px',
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              backgroundColor: 'var(--primary)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* 12 Vertical Stages Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '0 4px' }}>
        {STAGES_CONFIG.map((item, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isLocked = index > activeIndex;

          return (
            <div key={item.stage} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div
                title={isLocked ? `Locked: ${item.lockReason}` : item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isCurrent ? 'var(--primary-light)' : 'transparent',
                  border: isCurrent ? '1px solid rgba(0, 87, 248, 0.25)' : '1px solid transparent',
                  opacity: isLocked ? 0.65 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Step Circle Indicator */}
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    flexShrink: 0,
                    backgroundColor: isCompleted
                      ? 'var(--success-bg)'
                      : isCurrent
                      ? 'var(--primary)'
                      : 'var(--bg-hover)',
                    color: isCompleted
                      ? 'var(--success)'
                      : isCurrent
                      ? '#FFFFFF'
                      : 'var(--text-muted)',
                    border: isCompleted
                      ? '1px solid var(--success-border)'
                      : isCurrent
                      ? 'none'
                      : '1px solid var(--border-color)',
                  }}
                >
                  {isCompleted ? (
                    <Check size={11} strokeWidth={3} />
                  ) : isLocked ? (
                    <Lock size={9} />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Step Title Label */}
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: isCurrent ? 600 : 500,
                    color: isCurrent
                      ? 'var(--primary)'
                      : isCompleted
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.label.replace(/^\d+\.\s*/, '')}
                </span>
              </div>

              {/* Connecting vertical line */}
              {index < STAGES_CONFIG.length - 1 && (
                <div
                  style={{
                    width: '2px',
                    height: '8px',
                    marginLeft: '17px',
                    backgroundColor: isCompleted ? 'var(--success)' : 'var(--border-color)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
