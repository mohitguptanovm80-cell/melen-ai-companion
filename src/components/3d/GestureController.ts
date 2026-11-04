import { PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';

export interface GestureState {
  rotateX: number; // Polar angle (vertical rotation in radians)
  rotateY: number; // Azimuthal angle (horizontal rotation in radians)
  distance: number; // Camera distance / zoom
}

export interface GestureOptions {
  initialRotateX?: number;
  initialRotateY?: number;
  initialDistance?: number;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  onUpdate?: (state: GestureState) => void;
}

export class TouchOrbitControls {
  private state: GestureState;
  private minDistance: number;
  private maxDistance: number;
  private minPolarAngle: number;
  private maxPolarAngle: number;
  private onUpdate?: (state: GestureState) => void;

  // Touch tracking
  private prevTouchX = 0;
  private prevTouchY = 0;
  private initialPinchDist = 0;
  private initialPinchZoom = 0;

  constructor(options: GestureOptions = {}) {
    this.minDistance = options.minDistance ?? 1.5;
    this.maxDistance = options.maxDistance ?? 6.0;
    this.minPolarAngle = options.minPolarAngle ?? 0.1;
    this.maxPolarAngle = options.maxPolarAngle ?? Math.PI / 2 + 0.3; // Prevent flipping upside down
    this.onUpdate = options.onUpdate;

    this.state = {
      rotateX: options.initialRotateX ?? 0.2,
      rotateY: options.initialRotateY ?? 0,
      distance: options.initialDistance ?? 3.5,
    };
  }

  public getState(): GestureState {
    return { ...this.state };
  }

  public setDistance(dist: number) {
    this.state.distance = Math.min(Math.max(dist, this.minDistance), this.maxDistance);
    this.notify();
  }

  public reset() {
    this.state = {
      rotateX: 0.2,
      rotateY: 0,
      distance: 3.5,
    };
    this.notify();
  }

  private notify() {
    if (this.onUpdate) {
      this.onUpdate({ ...this.state });
    }
  }

  public createPanResponder() {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 1) {
          this.prevTouchX = touches[0].pageX;
          this.prevTouchY = touches[0].pageY;
        } else if (touches.length === 2) {
          this.initialPinchDist = this.getDistanceBetweenTouches(touches);
          this.initialPinchZoom = this.state.distance;
        }
      },

      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 1) {
          // 1 Finger: Orbit Rotation
          const touch = touches[0];
          const deltaX = touch.pageX - this.prevTouchX;
          const deltaY = touch.pageY - this.prevTouchY;

          this.prevTouchX = touch.pageX;
          this.prevTouchY = touch.pageY;

          const rotateSpeed = 0.007;
          this.state.rotateY += deltaX * rotateSpeed;
          this.state.rotateX += deltaY * rotateSpeed;

          // Clamp polar angle
          this.state.rotateX = Math.min(
            Math.max(this.state.rotateX, this.minPolarAngle),
            this.maxPolarAngle
          );

          this.notify();
        } else if (touches.length === 2) {
          // 2 Fingers: Pinch to Zoom
          const currentDist = this.getDistanceBetweenTouches(touches);
          if (this.initialPinchDist > 0) {
            const factor = this.initialPinchDist / currentDist;
            const newDist = this.initialPinchZoom * factor;
            this.state.distance = Math.min(
              Math.max(newDist, this.minDistance),
              this.maxDistance
            );
            this.notify();
          }
        }
      },

      onPanResponderRelease: () => {
        this.initialPinchDist = 0;
      },
    });
  }

  private getDistanceBetweenTouches(touches: readonly any[]): number {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
