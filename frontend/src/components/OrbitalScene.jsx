import React, { useEffect, useRef } from 'react';
import { getOrbitTilt } from '../utils/orbitTilt.js';

/**
 * Lightweight CSS 3D orbital scene for the dashboard hero.
 * No WebGL or external runtime is required; respects live motion preferences.
 */
export default function OrbitalScene() {
  const sceneRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const writeTilt = () => {
      scene.style.setProperty('--scene-tilt-x', currentX.toFixed(2) + 'deg');
      scene.style.setProperty('--scene-tilt-y', currentY.toFixed(2) + 'deg');
    };

    const animateTilt = () => {
      if (reducedMotion.matches) {
        frame = 0;
        return;
      }
      currentX += (targetX - currentX) * 0.055;
      currentY += (targetY - currentY) * 0.055;
      writeTilt();
      if (Math.abs(targetX - currentX) > 0.03 || Math.abs(targetY - currentY) > 0.03) {
        frame = window.requestAnimationFrame(animateTilt);
      } else {
        frame = 0;
      }
    };

    const requestTilt = () => {
      if (!reducedMotion.matches && !frame) {
        frame = window.requestAnimationFrame(animateTilt);
      }
    };

    const onPointerMove = event => {
      if (reducedMotion.matches || event.pointerType === 'touch') return;
      const tilt = getOrbitTilt(event.clientX, event.clientY, scene.getBoundingClientRect());
      targetX = tilt.x;
      targetY = tilt.y;
      requestTilt();
    };

    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
      requestTilt();
    };

    const onMotionPreferenceChange = event => {
      if (!event.matches) return;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      targetX = 0;
      targetY = 0;
      currentX = 0;
      currentY = 0;
      writeTilt();
    };

    scene.addEventListener('pointermove', onPointerMove, { passive: true });
    scene.addEventListener('pointerleave', onPointerLeave, { passive: true });
    reducedMotion.addEventListener('change', onMotionPreferenceChange);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scene.removeEventListener('pointermove', onPointerMove);
      scene.removeEventListener('pointerleave', onPointerLeave);
      reducedMotion.removeEventListener('change', onMotionPreferenceChange);
    };
  }, []);

  return (
    <div ref={sceneRef} className="orbit-scene" aria-hidden="true">
      <div className="orbit-scene-stars orbit-scene-stars-back" />
      <div className="orbit-scene-depth">
        <div className="orbit-scene-halo" />
        <div className="orbit-scene-planet">
          <span className="orbit-scene-planet-land orbit-scene-planet-land-one" />
          <span className="orbit-scene-planet-land orbit-scene-planet-land-two" />
          <span className="orbit-scene-planet-clouds" />
          <span className="orbit-scene-planet-shine" />
        </div>
        <div className="orbit-scene-ring orbit-scene-ring-back" />
        <div className="orbit-scene-ring orbit-scene-ring-mid" />
        <div className="orbit-scene-ring orbit-scene-ring-front" />
        <span className="orbit-scene-moon orbit-scene-moon-one" />
        <span className="orbit-scene-moon orbit-scene-moon-two" />
        <span className="orbit-scene-satellite"><i /></span>
      </div>
      <div className="orbit-scene-caption"><span className="orbit-scene-live-dot" /> ORBITAL SYSTEM <span>·</span> ONLINE</div>
    </div>
  );
}
