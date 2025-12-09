import type { KeyboardEvent } from 'react';

interface HintOverlayProps {
  visible: boolean;
  text: string;
  onClose(): void;
}

export function HintOverlay({ visible, text, onClose }: HintOverlayProps) {
  if (!visible) return null;

  const handleAnyKey = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onClose();
  };

  return (
    <div
      className="bunker-overlay-layer"
      tabIndex={-1}
      onKeyDown={handleAnyKey}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: 480,
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            background: 'rgba(4, 10, 18, 0.92)',
            borderRadius: 10,
            padding: '10px 14px 9px',
            border: '1px solid rgba(132, 213, 196, 0.4)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.75)',
            color: '#e5f4ff',
            fontSize: 12,
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            style={{
              width: 3,
              alignSelf: 'stretch',
              borderRadius: 999,
              background: 'linear-gradient(to bottom, #6fffd3, #2ce1aa)',
              opacity: 0.9,
            }}
          />
          <div style={{ flex: 1 }}>
            <div>{text}</div>
            <div style={{ marginTop: 4, fontSize: 10, opacity: 0.8 }}>
              Press any key or click&nbsp;
              <button
                type="button"
                onClick={onClose}
                style={{
                  border: 'none',
                  padding: 0,
                  background: 'none',
                  color: '#aee9ff',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                }}
              >
                close
              </button>
              .
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


