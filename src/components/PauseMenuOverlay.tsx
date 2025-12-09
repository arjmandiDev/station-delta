import type { BunkerDestination, BunkerSettings } from '../systems/ui/GameUIBridge';

type PauseTab = 'rooms' | 'settings' | 'help';

interface PauseMenuOverlayProps {
  visible: boolean;
  activeTab: PauseTab;
  onChangeTab(tab: PauseTab): void;
  settings: BunkerSettings;
  onSettingsChange(next: BunkerSettings): void;
  onRooms(dest: BunkerDestination): void;
  onResume(): void;
  onExitToTitle(): void;
}

export function PauseMenuOverlay({
  visible,
  activeTab,
  onChangeTab,
  settings,
  onSettingsChange,
  onRooms,
  onResume,
  onExitToTitle,
}: PauseMenuOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="bunker-overlay-layer bunker-pause-overlay"
    >
      <div
        className="bunker-pause-dialog"
      >
        <nav
          className="bunker-pause-nav"
        >
          {/* <div
            className="bunker-pause-nav-title"
          >
            Bunker Menu
          </div> */}
          <NavItem
            label="Rooms"
            active={activeTab === 'rooms'}
            onClick={() => onChangeTab('rooms')}
          />
          <NavItem
            label="Help"
            active={activeTab === 'help'}
            onClick={() => onChangeTab('help')}
          />
          <NavItem
            label="Settings"
            active={activeTab === 'settings'}
            onClick={() => onChangeTab('settings')}
          />

          <div style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid rgba(54, 72, 92, 0.9)' }}>
            <button
              type="button"
              onClick={onResume}
              className="bunker-btn-ghost bunker-pause-nav-resume"
            >
              <span>Resume</span>
              <span className="bunker-kbd">Esc</span>
            </button>
            <button
              type="button"
              onClick={onExitToTitle}
              className="bunker-btn-ghost bunker-pause-nav-exit"
            >
              Exit
            </button>
          </div>
        </nav>

        <section
          className="bunker-pause-content"
        >
          {activeTab === 'rooms' && (
            <RoomsPanel onRooms={onRooms} />
          )}
          {activeTab === 'settings' && (
            <SettingsPanel settings={settings} onChange={onSettingsChange} />
          )}
          {activeTab === 'help' && <HelpPanel />}
        </section>
      </div>
    </div>
  );
}

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick(): void;
}) {
  const className = active
    ? 'bunker-pause-nav-item bunker-pause-nav-item-active'
    : 'bunker-pause-nav-item';

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
    >
      {label}
    </button>
  );
}

function RoomsPanel({
  onRooms,
}: {
  onRooms(dest: BunkerDestination): void;
}) {
  return (
    <div className="bunker-pause-panel">
      <header>
        <h2 className="bunker-pause-section-title">Rooms</h2>
        <p className="bunker-pause-section-subtitle">
          Jump directly to key areas of the bunker. Your position will update immediately.
        </p>
      </header>
      <div
        className="bunker-pause-rooms-grid"
      >
        <DestinationCard
          title="Main Room"
          description="Central hub. Spawn point, overview of the space."
          onGo={() => onRooms('main')}
        />
        <DestinationCard
          title="Projects Room"
          description="Walk straight into the work: demos, prototypes, and builds."
          onGo={() => onRooms('projects')}
        />
        <DestinationCard
          title="Contact Room"
          description="Signals, links, and ways to reach out from the bunker."
          onGo={() => onRooms('contact')}
        />
      </div>
    </div>
  );
}

function DestinationCard({
  title,
  description,
  onGo,
}: {
  title: string;
  description: string;
  onGo(): void;
}) {
  return (
    <div
      className="bunker-pause-destination-card"
    >
      <div className="bunker-pause-destination-title">{title}</div>
      <div className="bunker-pause-destination-description">{description}</div>
      <button
        type="button"
        onClick={onGo}
        className="bunker-btn-ghost bunker-pause-destination-go"
      >
        Go
      </button>
    </div>
  );
}

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: BunkerSettings;
  onChange(next: BunkerSettings): void;
}) {
  const update = (partial: Partial<BunkerSettings>) => {
    onChange({
      ...settings,
      ...partial,
      graphics: { ...settings.graphics, ...(partial.graphics || {}) },
      audio: { ...settings.audio, ...(partial.audio || {}) },
      controls: { ...settings.controls, ...(partial.controls || {}) },
      ui: { ...settings.ui, ...(partial.ui || {}) },
    });
  };

  return (
    <div className="bunker-pause-panel">
      <header>
        <h2 className="bunker-pause-section-title">Settings</h2>
        <p className="bunker-pause-section-subtitle">
          Tune visuals, audio, and controls. Changes are applied immediately.
        </p>
      </header>

      <div
        className="bunker-pause-settings-grid"
      >
        <div>
          {/* Graphics */}
          <div>
            <h3 className="bunker-pause-settings-heading">
              Graphics
            </h3>
            <div className="bunker-pause-field-group">
              <label className="bunker-pause-label-column">
                <span>Quality preset</span>
                <select
                  value={settings.graphics.quality}
                  onChange={(e) =>
                    update({
                      graphics: { ...settings.graphics, quality: e.target.value as any },
                    })
                  }
                  className="bunker-pause-select"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label className="bunker-pause-label-column">
                <span>Resolution scale ({settings.graphics.resolutionScale}%)</span>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={settings.graphics.resolutionScale}
                  onChange={(e) =>
                    update({
                      graphics: {
                        ...settings.graphics,
                        resolutionScale: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
            </div>
          </div>
          {/* Controls */}
          <div>
            <h3 className="bunker-pause-settings-heading">
              Controls
            </h3>
            <div className="bunker-pause-field-group">
              <SliderRow
                label={`Mouse sensitivity (${settings.controls.mouseSensitivity.toFixed(1)}x)`}
                min={0.5}
                max={2}
                step={0.1}
                value={settings.controls.mouseSensitivity}
                onChange={(value) =>
                  update({ controls: { ...settings.controls, mouseSensitivity: value } })
                }
              />
              <ToggleRow
                label="Invert Y axis"
                checked={settings.controls.invertY}
                onChange={(checked) =>
                  update({ controls: { ...settings.controls, invertY: checked } })
                }
              />
            </div>
          </div>
        </div>
        <div>
          {/* Audio */}
          <div>
            <h3 className="bunker-pause-settings-heading">
              Audio
            </h3>
            <div className="bunker-pause-field-group">
            <ToggleRow
                label="Mute all"
                checked={settings.audio.muted}
                onChange={(checked) =>
                  update({ audio: { ...settings.audio, muted: checked } })
                }
              />
              <SliderRow
                label="Master volume"
                value={settings.audio.masterVolume}
                onChange={(value) =>
                  update({ audio: { ...settings.audio, masterVolume: value } })
                }
              />
              <SliderRow
                label="SFX volume"
                value={settings.audio.sfxVolume}
                onChange={(value) =>
                  update({ audio: { ...settings.audio, sfxVolume: value } })
                }
              />
              <SliderRow
                label="Music / ambience"
                value={settings.audio.musicVolume}
                onChange={(value) =>
                  update({ audio: { ...settings.audio, musicVolume: value } })
                }
              />
              
            </div>
          </div>
          {/* UI / Accessibility */}
          <div>
            <h3 className="bunker-pause-settings-heading">
              UI / Accessibility
            </h3>
            <div className="bunker-pause-field-group">
              <ToggleRow
                label="UI overlays / subtitles"
                checked={settings.ui.showUI}
                onChange={(checked) =>
                  update({ ui: { ...settings.ui, showUI: checked } })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.05,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange(value: number): void;
}) {
  return (
    <label className="bunker-pause-slider-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
}) {
  return (
    <label
      className="bunker-pause-toggle-row"
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function HelpPanel() {
  return (
    <div className="bunker-pause-panel bunker-pause-panel-help">
      <header>
        <h2 className="bunker-pause-section-title">Help</h2>
        <p className="bunker-pause-section-subtitle">
          Quick reference for controls, gameplay, and pointer lock.
        </p>
      </header>

      <section>
        <h3 className="bunker-pause-help-heading">Keybindings</h3>
        <ul className="bunker-pause-help-list">
          <li>
            <span className="bunker-kbd">W&nbsp;A&nbsp;S&nbsp;D</span>&nbsp; Move
          </li>
          <li>
            <span className="bunker-kbd">Mouse</span>&nbsp; Look around
          </li>
          <li>
            <span className="bunker-kbd">Space</span>&nbsp; Jump
          </li>
          <li>
            <span className="bunker-kbd">E</span>&nbsp; Interact (where available)
          </li>
          <li>
            <span className="bunker-kbd">N</span>&nbsp; Toggle flashlight
          </li>
          <li>
            <span className="bunker-kbd">H</span>&nbsp; Toggle hint overlay
          </li>
          <li>
            <span className="bunker-kbd">Esc</span>&nbsp; Open / close menu
          </li>
        </ul>
      </section>

      <section>
        <h3 className="bunker-pause-help-heading">How to play</h3>
        <p className="bunker-pause-help-text">
          Explore the bunker at your own pace. Move through doors and corridors to discover
          different rooms. Some areas may stream in as you approach; brief hitches are normal
          while assets load.
        </p>
      </section>

      <section>
        <h3 className="bunker-pause-help-heading">Pointer lock / mouse capture</h3>
        <ul className="bunker-pause-help-list">
          <li>Click anywhere on the scene to capture the mouse and look freely.</li>
          <li>Press Esc to release the cursor and open the pause menu.</li>
          <li>
            If the mouse stops moving the camera, click the scene again to recapture pointer
            lock.
          </li>
        </ul>
      </section>
    </div>
  );
}


