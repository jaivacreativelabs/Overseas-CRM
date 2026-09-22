import React from 'react';
import { Check, Lock } from 'lucide-react';
import { StudentStage } from '../../types';

export interface StageStepperProps {
  currentStage: StudentStage;
  activeStage?: StudentStage;
  onStageClick?: (stage: StudentStage) => void;
}

export const STAGES_CONFIG: { stage: StudentStage; label: string; lockReason?: string }[] = [
  { stage: StudentStage.LEAD_CAPTURED, label: '1. Lead Captured' },
  { stage: StudentStage.PRELIMINARY_COUNSELLING, label: '2. Counselling' },
  { stage: StudentStage.PROFILE_EVALUATION, label: '3. Profile Evaluation', lockReason: 'Requires completed preliminary counselling' },
  { stage: StudentStage.UNIVERSITY_SHORTLISTING, label: '4. Universities', lockReason: 'Requires completed profile evaluation' },
  { stage: StudentStage.DOCUMENT_COLLECTION, label: '5. Documents', lockReason: 'Requires 1 selected university' },
  { stage: StudentStage.APPLICATION_SUBMISSION, label: '6. Applications', lockReason: 'Requires all mandatory documents approved' },
  { stage: StudentStage.OFFER_MANAGEMENT, label: '7. Offer Letter', lockReason: 'Requires submitted application and university decision' },
  { stage: StudentStage.FEE_PAYMENT, label: '8. Fee Payment', lockReason: 'Requires signed offer acceptance' },
  { stage: StudentStage.VISA_PROCESSING, label: '9. Visa Filing', lockReason: 'Requires verified fee deposit' },
  { stage: StudentStage.PRE_DEPARTURE, label: '10. Pre-Departure', lockReason: 'Requires approved visa grant' },
  { stage: StudentStage.DEPARTURE, label: '11. Departure', lockReason: 'Requires accommodation, flight & insurance' },
  { stage: StudentStage.ARRIVAL_CONFIRMED, label: '12. Arrival', lockReason: 'Requires departure confirmation' },
];

export const StageStepper: React.FC<StageStepperProps> = ({ currentStage, activeStage, onStageClick }) => {
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
          const isSelected = activeStage ? item.stage === activeStage : false;

          return (
            <React.Fragment key={item.stage}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onStageClick && onStageClick(item.stage)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onStageClick && onStageClick(item.stage);
                  }
                }}
                title={isLocked ? `Stage: ${item.label.replace(/^\d+\.\s*/, '')} (Click to view details - ${item.lockReason})` : `Stage: ${item.label.replace(/^\d+\.\s*/, '')} (Click to view)`}
                className={`crm-stage-step ${isCurrent ? 'is-current' : ''} ${isSelected && !isCurrent ? 'is-selected' : ''}`}
                style={{
                  opacity: isLocked ? 0.75 : 1,
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
                    fontWeight: isCurrent || isSelected ? 600 : 500,
                    color: isCurrent
                      ? 'var(--primary)'
                      : isCompleted
                      ? 'var(--text-primary)'
                      : isSelected
                      ? 'var(--primary)'
                      : 'var(--text-muted)',
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
