/**
 * Loading screen component.
 * 
 * Purpose: Displays loading progress and status.
 * Responsibilities: Show loading state, progress, messages.
 * Inputs: Loading state, progress percentage, message.
 * Outputs: Rendered loading UI.
 * Side effects: None (UI only).
 */

interface LoadingScreenProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

export function LoadingScreen({ isLoading, progress = 0, message = 'Loading...' }: LoadingScreenProps) {
  if (!isLoading) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#0a0f1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        color: 'white',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu',
      }}
    >
      <div style={{ fontSize: '24px', marginBottom: '20px' }}>{message}</div>
      <div
        style={{
          width: '300px',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'white',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div style={{ marginTop: '10px', fontSize: '14px', opacity: 0.7 }}>
        {Math.round(progress)}%
      </div>
    </div>
  );
}

