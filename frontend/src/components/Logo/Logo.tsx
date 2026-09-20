import React, { useState } from 'react';

export interface LogoProps {
  variant?: 'full' | 'symbol' | 'horizontal' | 'auth';
  height?: number | string;
  width?: number | string;
  showTagline?: boolean;
  showIsoBadge?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  height,
  width,
  showTagline = false,
  showIsoBadge = false,
  className = '',
  style = {},
}) => {
  const [imgError, setImgError] = useState(false);

  // Fallback vector representation of the IIEC logo
  const renderFallbackSymbol = (size = 32) => (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '6px',
        background: 'linear-gradient(135deg, #D8232A 0%, #154D96 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontWeight: 800,
        fontSize: `${Math.round(size * 0.44)}px`,
        letterSpacing: '-0.03em',
        boxShadow: '0 2px 6px rgba(216, 35, 42, 0.25)',
      }}
    >
      IIEC
    </div>
  );

  if (variant === 'symbol') {
    return (
      <div
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        {!imgError ? (
          <div
            style={{
              width: width || height || '34px',
              height: height || width || '34px',
              borderRadius: '6px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <img
              src="/logo.png"
              alt="IIEC Logo"
              onError={() => setImgError(true)}
              style={{
                width: '180%',
                maxWidth: 'none',
                objectFit: 'contain',
                marginLeft: '-10%',
              }}
            />
          </div>
        ) : (
          renderFallbackSymbol(typeof height === 'number' ? height : 34)
        )}
      </div>
    );
  }

  if (variant === 'auth') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          ...style,
        }}
      >
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            marginBottom: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src="/logo.png"
            alt="IIEC — International Intelligent Educational Consultancy"
            onError={() => setImgError(true)}
            style={{
              height: height || '62px',
              width: width || 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
        <h2
          style={{
            fontSize: '19px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '4px',
            letterSpacing: '-0.02em',
          }}
        >
          IIEC Overseas CRM
        </h2>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          International Intelligent Educational Consultancy
        </p>
        <span
          style={{
            marginTop: '6px',
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 600,
            color: '#154D96',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}
        >
          ISO 9001:2015 Certified Company
        </span>
      </div>
    );
  }

  // Horizontal / Full default layout
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        ...style,
      }}
    >
      <img
        src="/logo.png"
        alt="IIEC Logo"
        onError={() => setImgError(true)}
        style={{
          height: height || '34px',
          width: width || 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />
      {(showTagline || showIsoBadge) && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {showTagline && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#D8232A',
                lineHeight: 1.2,
              }}
            >
              International Intelligent Educational Consultancy
            </span>
          )}
          {showIsoBadge && (
            <span style={{ fontSize: '10px', color: '#6B7280', lineHeight: 1.2 }}>
              An ISO 9001 : 2015 Certified Company
            </span>
          )}
        </div>
      )}
    </div>
  );
};
