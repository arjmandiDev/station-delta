/**
 * Mobile touch controls for navigation.
 * 
 * Purpose: Provides touch-based controls for mobile devices.
 * Responsibilities: Virtual joystick, touch camera rotation, button handling.
 * Inputs: Touch events.
 * Outputs: Movement and rotation commands.
 * Side effects: Creates UI elements, handles touch events.
 */

export interface MobileControlState {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  rotationDeltaX: number;
  rotationDeltaY: number;
}

export class MobileControls {
  private container: HTMLElement;
  private joystick: HTMLElement | null = null;
  private joystickKnob: HTMLElement | null = null;
  private jumpButton: HTMLElement | null = null;
  private joystickCenter: { x: number; y: number } = { x: 0, y: 0 };
  private joystickRadius: number = 50;
  /**
   * Current joystick offset in pixels relative to the center.
   * 
   * We keep this in JS instead of parsing the CSS `transform` string so that
   * movement logic stays robust against browser-normalized `calc()` syntax.
   */
  private joystickOffset: { x: number; y: number } = { x: 0, y: 0 };
  private touchId: number | null = null;
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;
  private isRotating: boolean = false;
  private rotationDeltaX: number = 0;
  private rotationDeltaY: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createUI();
    this.setupEventListeners();
  }

  /**
   * Creates mobile control UI elements.
   */
  private createUI(): void {
    // Joystick container
    this.joystick = document.createElement('div');
    this.joystick.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 80px;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.3);
      touch-action: none;
      z-index: 100;
    `;

    this.joystickKnob = document.createElement('div');
    this.joystickKnob.style.cssText = `
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    `;

    this.joystick.appendChild(this.joystickKnob);
    this.container.appendChild(this.joystick);

    // Jump button
    this.jumpButton = document.createElement('div');
    this.jumpButton.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 80px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      touch-action: none;
      z-index: 100;
      user-select: none;
    `;
    this.jumpButton.textContent = '↑';
    this.container.appendChild(this.jumpButton);
  }

  /**
   * Sets up touch event listeners.
   */
  private setupEventListeners(): void {
    if (!this.joystick || !this.jumpButton) return;

    // Joystick events
    this.joystick.addEventListener('touchstart', this.handleJoystickStart.bind(this));
    this.joystick.addEventListener('touchmove', this.handleJoystickMove.bind(this));
    this.joystick.addEventListener('touchend', this.handleJoystickEnd.bind(this));

    // Jump button
    this.jumpButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.jumpButton?.classList.add('active');
    });
    this.jumpButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.jumpButton?.classList.remove('active');
    });

    // Camera rotation (right side of screen)
    this.container.addEventListener('touchstart', this.handleRotationStart.bind(this));
    this.container.addEventListener('touchmove', this.handleRotationMove.bind(this));
    this.container.addEventListener('touchend', this.handleRotationEnd.bind(this));
  }

  /**
   * Handles joystick touch start.
   */
  private handleJoystickStart(e: TouchEvent): void {
    e.preventDefault();
    if (this.touchId !== null) return;

    const touch = e.touches[0];
    this.touchId = touch.identifier;
    const rect = this.joystick!.getBoundingClientRect();
    this.joystickCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  /**
   * Handles joystick touch move.
   */
  private handleJoystickMove(e: TouchEvent): void {
    if (this.touchId === null || !this.joystickKnob) return;

    const touch = Array.from(e.touches).find((t) => t.identifier === this.touchId);
    if (!touch) return;

    e.preventDefault();

    const deltaX = touch.clientX - this.joystickCenter.x;
    const deltaY = touch.clientY - this.joystickCenter.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const clampedDistance = Math.min(distance, this.joystickRadius);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * clampedDistance;
    const y = Math.sin(angle) * clampedDistance;

    // Store offset for input logic
    this.joystickOffset.x = x;
    this.joystickOffset.y = y;

    this.joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  /**
   * Handles joystick touch end.
   */
  private handleJoystickEnd(e: TouchEvent): void {
    if (this.touchId === null) return;

    const touch = Array.from(e.changedTouches).find((t) => t.identifier === this.touchId);
    if (!touch) return;

    e.preventDefault();
    this.touchId = null;

    // Reset offset when touch ends
    this.joystickOffset.x = 0;
    this.joystickOffset.y = 0;

    if (this.joystickKnob) {
      this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    }
  }

  /**
   * Handles rotation touch start.
   */
  private handleRotationStart(e: TouchEvent): void {
    if (this.touchId !== null) return; // Joystick is active

    const touch = e.touches[0];
    if (touch.clientX > window.innerWidth / 2) {
      // Right side of screen
      this.isRotating = true;
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
    }
  }

  /**
   * Handles rotation touch move.
   */
  private handleRotationMove(e: TouchEvent): void {
    if (!this.isRotating) return;

    const touch = e.touches[0];
    this.rotationDeltaX = touch.clientX - this.lastTouchX;
    this.rotationDeltaY = touch.clientY - this.lastTouchY;
    this.lastTouchX = touch.clientX;
    this.lastTouchY = touch.clientY;
  }

  /**
   * Handles rotation touch end.
   */
  private handleRotationEnd(_e: TouchEvent): void {
    this.isRotating = false;
    this.rotationDeltaX = 0;
    this.rotationDeltaY = 0;
  }

  /**
   * Gets current control state.
   */
  getControlState(): MobileControlState {
    if (!this.joystickKnob) {
      return {
        moveForward: false,
        moveBackward: false,
        moveLeft: false,
        moveRight: false,
        jump: false,
        rotationDeltaX: 0,
        rotationDeltaY: 0,
      };
    }

    const normalizedX = this.joystickOffset.x / this.joystickRadius;
    const normalizedY = this.joystickOffset.y / this.joystickRadius;

    const jump = this.jumpButton?.classList.contains('active') || false;

    const rotationX = this.rotationDeltaX;
    const rotationY = this.rotationDeltaY;
    
    // Reset rotation deltas after reading
    this.rotationDeltaX = 0;
    this.rotationDeltaY = 0;

    return {
      moveForward: normalizedY < -0.3,
      moveBackward: normalizedY > 0.3,
      moveLeft: normalizedX < -0.3,
      moveRight: normalizedX > 0.3,
      jump,
      rotationDeltaX: rotationX,
      rotationDeltaY: rotationY,
    };
  }

  /**
   * Disposes of mobile controls.
   */
  dispose(): void {
    if (this.joystick) {
      this.joystick.remove();
    }
    if (this.jumpButton) {
      this.jumpButton.remove();
    }
  }
}

