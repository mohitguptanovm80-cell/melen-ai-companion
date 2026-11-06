import * as THREE from 'three';
import { resolveAnimationClips } from '../../utils/modelHelpers';

export class AnimationController {
  readonly resolved;
  readonly mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private talking = false;
  private walking = false;
  private previewing = false;
  private elapsed = 0;
  private retire = new Map<THREE.AnimationAction, number>();
  private finishPending = false;
  private baseY: number;

  constructor(private root: THREE.Object3D, private motion: THREE.Group, clips: THREE.AnimationClip[], private onChange: (name: string | null) => void) {
    this.baseY = motion.position.y;
    this.resolved = resolveAnimationClips(clips);
    this.mixer = new THREE.AnimationMixer(root);
    clips.forEach(clip => this.actions.set(clip.name, this.mixer.clipAction(clip)));
    this.mixer.addEventListener('finished', this.onFinished);
    this.setTalking(false);
  }
  private onFinished = (event: { action: THREE.AnimationAction }) => {
    if (event.action === this.current) this.finishPending = true;
  };
  setTalking(talking: boolean) {
    this.walking = false;
    this.talking = talking; this.previewing = false;
    this.play(talking ? this.resolved.talkName ?? this.resolved.idleName : this.resolved.idleName, false);
  }
  walk() {
    this.walking = true;
    this.talking = false;
    this.previewing = false;
    const clip = this.resolved.allNames.find(name => /walk/i.test(name));
    this.play(clip ?? this.resolved.idleName, false);
  }
  preview(name: string) {
    if (this.walking || this.talking || !this.actions.has(name)) return;
    this.previewing = true;
    this.play(name, true);
  }
  private play(name: string | null, once: boolean) {
    const next = name ? this.actions.get(name) ?? null : null;
    if (next === this.current && !once && next?.loop === THREE.LoopRepeat) return;
    const previous = this.current;
    this.finishPending = false;
    if (next) {
      this.retire.delete(next);
      next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
      next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
      next.clampWhenFinished = once;
      next.play();
    }
    if (previous && previous !== next) {
      if (next) previous.crossFadeTo(next, 0.3, false); else previous.fadeOut(0.3);
      this.retire.set(previous, 0.35);
    } else if (next) next.fadeIn(0.3);
    this.current = next;
    this.onChange(name);
  }
  update(delta: number) {
    const dt = Math.min(Math.max(delta, 0), 0.05);
    this.elapsed += dt;
    this.mixer.update(dt);
    this.retire.forEach((remaining, action) => {
      if (remaining <= dt) { action.stop(); this.retire.delete(action); }
      else this.retire.set(action, remaining - dt);
    });
    if (this.finishPending) { this.finishPending = false; this.setTalking(this.talking); }
    // No matching clip: bounded, frame-rate-independent reaction on a separate parent.
    const procedural = !this.previewing && (this.talking ? !this.resolved.talkName : !this.resolved.idleName);
    const stride = this.walking ? Math.sin(this.elapsed * 2) * 0.18 : 0;
    this.motion.position.x = THREE.MathUtils.damp(this.motion.position.x, stride, 12, dt);
    const target = procedural ? Math.sin(this.elapsed * (this.talking ? 7 : 2)) * (this.talking ? 0.035 : 0.008) : 0;
    this.motion.position.y = THREE.MathUtils.damp(this.motion.position.y, this.baseY + target, 14, dt);
    this.motion.rotation.y = THREE.MathUtils.damp(this.motion.rotation.y, procedural && this.talking ? Math.sin(this.elapsed * 3) * 0.06 : 0, 14, dt);
  }
  dispose() {
    this.mixer.removeEventListener('finished', this.onFinished);
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.root);
    this.actions.clear(); this.retire.clear();
  }
}
