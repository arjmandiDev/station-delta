import type { BunkerDestination } from '../systems/ui/GameUIBridge';

interface TitleScreenOverlayProps {
  visible: boolean;
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  skipTitle: boolean;
  onToggleSkip(skip: boolean): void;
  onStart(): void;
  onRooms(dest: BunkerDestination): void;
  onOpenMenu(): void;
}

const LOADING_HINTS: string[] = [
  'Hint: Press H in the bunker to show a quick help overlay.',
  'Hint: Press N to toggle your flashlight in dark corners.',
  'Hint: Esc opens the pause menu where you can navigate between rooms.',
  'Hint: If the mouse stops looking around, click the scene to recapture the cursor.',
];

function getLoadingHint(progress: number): string {
  if (!LOADING_HINTS.length) return '';
  const clamped = Math.max(0, Math.min(99, Math.floor(progress)));
  const bucketSize = 100 / LOADING_HINTS.length;
  const index = Math.min(
    LOADING_HINTS.length - 1,
    Math.floor(clamped / bucketSize),
  );
  return LOADING_HINTS[index];
}

export function TitleScreenOverlay({
  visible,
  isLoading,
  loadingProgress,
  loadingMessage,
  skipTitle,
  onToggleSkip,
  onStart,
  onRooms,
  onOpenMenu,
}: TitleScreenOverlayProps) {
  const className = `bunker-title-screen ${visible ? 'is-visible' : 'is-hidden'}`;
  const loadingLabel = isLoading
    ? `Just a moment...`
    : 'Bunker ready. Enter when you are.';
  const loadingHint = getLoadingHint(loadingProgress);
  const clampedProgress = Math.max(0, Math.min(100, loadingProgress));

  return (
    <div className={className}>
      <div className="bunker-title-panel">
        <div className="bunker-title-panel-section-left">
          <header className="bunker-title-heading">
            <div className="bunker-title-heading-main">Bunker Portfolio</div>
            <div className="bunker-title-heading-title"></div>
            <div className="bunker-title-heading-sub">
              <p>I’m Mad Arjmandi. Welcome to my bunker. I’m a developer who prefers building worlds over static pages,<br />
              and this place is where I shape ideas into something you can walk through instead of simply read. You’ve stepped<br />
              into an interactive space, not a conventional website, built to feel personal, atmospheric, and a little mysterious. <br />
              Think of it as an entry point into my work and my process—hands-on, exploratory, and rooted in the kind of <br />
              creativity that comes from experimenting without rules.</p>

              <p>You’re free to move, explore, and find your own path through the shelter. Each room represents a different <br />
              part of what I do—the main hall, the projects, the contact space—and all of them are designed to be <br />
              discovered rather than clicked. Follow the hints, travel between rooms, and let the environment guide you <br />
              through the story behind this project and the mindset that drives me to build spaces instead of pages.</p>
            </div>
          </header>

          <div className="bunker-title-grid">
            <section className="bunker-title-primary">
              <div className="bunker-title-cta">
                <button
                  className="bunker-btn-primary"
                  onClick={onStart}
                  disabled={isLoading}>
                  <span>{isLoading ? 'Loading…' : 'Enter Bunker'}</span>
                </button>

                {/* <button
                  className="bunker-btn-ghost"
                  type="button"
                  onClick={onOpenMenu}
                  disabled={isLoading}
                >
                  <span>Menu</span>
                  <span className="bunker-kbd">Esc</span>
                </button> */}
              </div>

              <div className="bunker-title-meta">
                <div className="bunker-title-meta-shortcuts">
                  <span className="bunker-title-hint">
                    <span className="bunker-kbd">WASD</span> move ·{' '}
                    <span className="bunker-kbd">Mouse</span> look
                  </span>
                </div>
                {/* <div className="bunker-title-hint">Press any key at any time to recapture the cursor.</div> */}
              </div>
            </section>

            <aside className="bunker-title-secondary">
              {/* <div className="bunker-title-rooms">
              <div className="bunker-title-rooms-label">Rooms</div>
              <div className="bunker-title-rooms-row">
                <button
                  className="bunker-btn-ghost"
                  type="button"
                  onClick={() => onRooms('main')}
                  disabled={isLoading}
                >
                  Main
                </button>
                <button
                  className="bunker-btn-ghost"
                  type="button"
                  onClick={() => onRooms('projects')}
                  disabled={isLoading}
                >
                  Projects
                </button>
                <button
                  className="bunker-btn-ghost"
                  type="button"
                  onClick={() => onRooms('contact')}
                  disabled={isLoading}
                >
                  Contact
                </button>
              </div>
            </div> */}

              <div className="bunker-title-footer">
                {/* <label className="bunker-title-checkbox">
                <input
                  type="checkbox"
                  checked={skipTitle}
                  onChange={(e) => onToggleSkip(e.target.checked)}
                />
                <span>Don&apos;t show again</span>
              </label> */}
                {isLoading ? (
                  <div className="bunker-title-loading">
                    <div className="bunker-title-hint bunker-title-loading-label">
                      {loadingLabel}
                    </div>
                    <div className="bunker-title-loading-bar">
                      <div
                        className="bunker-title-loading-bar-fill"
                        style={{ width: `${clampedProgress}%` }}
                      />
                    </div>
                    <div className="bunker-title-loading-meta">
                      <span>{Math.round(clampedProgress)}%</span>
                      {loadingHint && <span>{loadingHint}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="bunker-title-hint">
                    {loadingLabel}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
        <div className="bunker-title-panel-section-right"></div>
      </div>
    </div>
  );
}
