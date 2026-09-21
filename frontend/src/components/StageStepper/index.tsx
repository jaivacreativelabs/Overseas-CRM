import React from 'react';
import { Check, Lock } from 'lucide-react';
import { StudentStage } from '../../types';

interface StageStepperProps {
  currentStage: StudentStage;
  onStageClick?: (stage: StudentStage) => void;
}

export const STAGES_CONFIG: { stage: StudentStage; label: string; lockReason?: string }[] = [
  { stage: StudentStage.LEAD_CAPTURED, label: '1. Lead Captured' },
  { stage: StudentStage.PRELIMINARY_COUNSELLING, label: '2. Counselling' },
  { stage: StudentStage.PROFILE_EVALUATION, label: '3. Profile Eval', lockReason: 'Requires completed preliminary counselling' },
  { stage: StudentStage.UNIVERSITY_SHORTLISTING, label: '4. Universities', lockReason: 'Requires completed profile evaluation' },
  { stage: StudentStage.DOCUMENT_COLLECTION, label: '5. Documents', lockReason: 'Requires 1 selected university' },
  { stage: StudentStage.APPLICATION_SUBMISSION, label: '6. Application', lockReason: 'Requires all mandatory documents approved' },
  { stage: StudentStage.OFFER_MANAGEMENT, label: '7. Offer Letter', lockReason: 'Requires submitted application and university decision' },
  { stage: StudentStage.FEE_PAYMENT, label: '8. Fee Payment', lockReason: 'Requires signed offer acceptance' },
  { stage: StudentStage.VISA_PROCESSING, label: '9. Visa Filing', lockReason: 'Requires verified fee deposit' },
  { stage: StudentStage.PRE_DEPARTURE, label: '10. Pre-Departure', lockReason: 'Requires approved visa grant' },
  { stage: StudentStage.DEPARTURE, label: '11. Departure', lockReason: 'Requires accommodation, flight & insurance' },
  { stage: StudentStage.ARRIVAL_CONFIRMED, label: '12. Arrival', lockReason: 'Requires departure confirmation' },
];

export const StageStepper: React.FC<StageStepperProps> = ({ currentStage, onStageClick }) => {
  const currentIndex = STAGES_CONFIG.findIndex((s) => s.stage === currentStage);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 18px',
        overflowX: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', minWidth: '880px', gap: '6px' }}>
        {STAGES_CONFIG.map((item, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLocked = index > currentIndex;

          return (
            <React.Fragment key={item.stage}>
              <div
                onClick={() => onStageClick && onStageClick(item.stage)}
                title={isLocked ? `Locked: ${item.lockReason}` : item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isCurrent ? 'var(--primary-light)' : 'transparent',
                  border: isCurrent ? '1px solid rgba(0, 87, 248, 0.3)' : '1px solid transparent',
                  cursor: isCompleted || isCurrent ? 'pointer' : 'not-allowed',
                  opacity: isLocked ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <div
                  className={`step-dot ${
                    isCompleted ? 'completed' : isCurrent ? 'current' : isLocked ? 'locked' : 'pending'
                  }`}
                >
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : isLocked ? <Lock size={11} /> : index + 1}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: isCurrent ? 600 : 500,
                    color: isCurrent ? 'var(--primary)' : isCompleted ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {item.label.replace(/^\d+\.\s*/, '')}
                </span>
              </div>
              {index < STAGES_CONFIG.length - 1 && (
                <div
                  style={{
                    width: '12px',
                    height: '2px',
                    backgroundColor: isCompleted ? 'var(--success)' : 'var(--border-color)',
                    flexShrink: 0,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export { VerticalStageStepper } from './VerticalStageStepper';
