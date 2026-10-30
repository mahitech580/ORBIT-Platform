import React, { useEffect, useRef } from 'react';
import { shouldTrackBackgroundPointer } from '../utils/backgroundPointer.js';
import { subscribeMediaQuery } from '../utils/mediaQueryListener.js';
import { getCanvasBackingSize } from '../utils/canvasResolution.js';

const VERTEX_SHADER = [
  'attribute vec2 a_position;',
  'void main() {',
  '  gl_Position = vec4(a_position, 0.0, 1.0);',
  '}'
].join('\n');

const FRAGMENT_SHADER = [
  'precision highp float;',
  'uniform vec2 u_resolution;',
  'uniform float u_time;',
  'uniform vec2 u_mouse;',
  'uniform float u_dark;',
  'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
  'float noise(vec2 p) {',
  '  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
  '  float a = hash(i); float b = hash(i + vec2(1.0, 0.0));',
  '  float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));',
  '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
  '}',
  'float fbm(vec2 p) {',
  '  float value = 0.0; float amplitude = 0.5;',
  '  mat2 transform = mat2(1.6, -1.2, 1.2, 1.6);',
  '  for (int i = 0; i < 5; i++) {',
  '    value += amplitude * noise(p);',
  '    p = transform * p + vec2(17.1, 31.7);',
  '    amplitude *= 0.5;',
  '  }',
  '  return value;',
  '}',
  'void main() {',
  '  vec2 uv = gl_FragCoord.xy / u_resolution.xy;',
  '  float aspect = u_resolution.x / max(1.0, u_resolution.y);',
  '  vec2 p = vec2(uv.x * aspect, uv.y);',
  '  vec2 mouse = vec2(u_mouse.x * aspect, u_mouse.y);',
  '  float cursorInfluence = exp(-distance(p, mouse) * 2.4);',
  '  vec2 drift = vec2(u_time * 0.023, -u_time * 0.017);',
  '  vec2 flow = p * 2.8 + drift + (mouse - p) * cursorInfluence * 0.16;',
  '  vec2 warp = vec2(fbm(flow + vec2(0.0, u_time * 0.035)), fbm(flow + vec2(5.2, -3.1) - u_time * 0.028));',
  '  vec2 domain = flow + (warp - 0.5) * 2.8;',
  '  vec2 deepWarp = vec2(fbm(domain + vec2(2.8, -1.4)), fbm(domain + vec2(-4.5, 3.7)));',
  '  float cloud = fbm(domain * 1.10 + deepWarp * 1.45);',
  '  float marbleWave = 0.5 + 0.5 * sin((domain.x * 1.1 + domain.y * 0.72 + cloud * 2.9 + deepWarp.x * 0.9) * 4.9);',
  '  float marbleEdge = smoothstep(0.83, 0.98, marbleWave);',
  '  float blendField = smoothstep(0.16, 0.88, fbm(domain * 0.82 + deepWarp * 2.15));',
  '  vec3 pink = vec3(0.99, 0.73, 0.87);',
  '  vec3 lavender = vec3(0.72, 0.66, 0.98);',
  '  vec3 mint = vec3(0.54, 0.91, 0.79);',
  '  vec3 blue = vec3(0.51, 0.77, 1.00);',
  '  vec3 pastelA = mix(pink, lavender, smoothstep(0.12, 0.80, cloud));',
  '  vec3 pastelB = mix(mint, blue, smoothstep(0.18, 0.82, deepWarp.y));',
  '  vec3 pastel = mix(pastelA, pastelB, smoothstep(0.20, 0.84, marbleWave));',
  '  pastel = mix(pastel, vec3(0.98, 0.96, 1.00), 0.18 + blendField * 0.20);',
  '  pastel = mix(pastel, vec3(1.0), marbleEdge * 0.20);',
  '  vec3 midnight = vec3(0.012, 0.022, 0.055);',
  '  vec3 neonBlue = vec3(0.07, 0.28, 0.95);',
  '  vec3 neonPurple = vec3(0.38, 0.09, 0.84);',
  '  vec3 neonCyan = vec3(0.02, 0.64, 0.83);',
  '  vec3 neonA = mix(neonBlue, neonPurple, smoothstep(0.18, 0.82, cloud));',
  '  vec3 neonB = mix(neonCyan, vec3(0.22, 0.12, 0.58), smoothstep(0.12, 0.86, deepWarp.x));',
  '  vec3 neon = mix(neonA, neonB, smoothstep(0.18, 0.82, marbleWave) * 0.80);',
  '  neon = mix(midnight, neon, 0.40 + blendField * 0.40);',
  '  neon += vec3(0.05, 0.025, 0.16) * marbleEdge * 0.6;',
  '  vec3 color = mix(pastel, neon, u_dark);',
  '  float vignette = 1.0 - smoothstep(0.05, 1.35, distance(uv, vec2(0.5, 0.5)));',
  '  color = mix(color, color * (u_dark > 0.5 ? 0.74 : 0.96), (1.0 - vignette) * 0.25);',
  '  gl_FragColor = vec4(color, 1.0);',
  '}'
].join('\n');

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to allocate a smoke shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Shader compilation failed.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

export default function SmokeBackground({ lightMode = true }) {
  const canvasRef = useRef(null);
  const modeRef = useRef(lightMode);
  modeRef.current = lightMode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power'
    });
    if (!gl) {
      canvas.dataset.fallback = 'true';
      return undefined;
    }

    let program = null;
    let buffer = null;
    let raf = 0;
    let disposed = false;
    let visible = document.visibilityState !== 'hidden';
    let width = 1;
    let height = 1;
    let startTime = 0;
    let lastFrame = 0;
    let resizeObserver = null;
    let currentPointer = { x: 0.5, y: 0.5 };
    let targetPointer = { x: 0.5, y: 0.5 };
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionPreference.matches;

    try {
      const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      program = gl.createProgram();
      if (!program) throw new Error('Unable to allocate the smoke program.');
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Unable to link smoke shaders.');
      }

      buffer = gl.createBuffer();
      if (!buffer) throw new Error('Unable to allocate the smoke canvas.');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      gl.useProgram(program);
      const position = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      const resolution = gl.getUniformLocation(program, 'u_resolution');
      const time = gl.getUniformLocation(program, 'u_time');
      const mouse = gl.getUniformLocation(program, 'u_mouse');
      const dark = gl.getUniformLocation(program, 'u_dark');

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const size = getCanvasBackingSize(rect.width, rect.height, window.devicePixelRatio || 1);
        width = size.width;
        height = size.height;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }
      };
      const onResize = () => {
        resize();
        scheduleFrame();
      };
      const movePointer = event => {
        if (!shouldTrackBackgroundPointer(event, reducedMotion)) return;
        targetPointer = {
          x: Math.min(1, Math.max(0, event.clientX / Math.max(1, window.innerWidth))),
          y: 1 - Math.min(1, Math.max(0, event.clientY / Math.max(1, window.innerHeight)))
        };
      };
      const leavePointer = () => { targetPointer = { x: 0.5, y: 0.5 }; };

      const scheduleFrame = () => {
        if (!disposed && visible && !raf) raf = window.requestAnimationFrame(draw);
      };
      const draw = now => {
        raf = 0;
        if (disposed || !visible) return;
        if (!reducedMotion && now - lastFrame < 30) {
          scheduleFrame();
          return;
        }
        lastFrame = now;
        if (!startTime) startTime = now;
        const elapsed = reducedMotion ? 0.4 : (now - startTime) / 1000;
        currentPointer.x += (targetPointer.x - currentPointer.x) * 0.055;
        currentPointer.y += (targetPointer.y - currentPointer.y) * 0.055;
        gl.useProgram(program);
        gl.uniform2f(resolution, width, height);
        gl.uniform1f(time, elapsed);
        gl.uniform2f(mouse, currentPointer.x, currentPointer.y);
        gl.uniform1f(dark, modeRef.current ? 0 : 1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        // Reduced-motion users get one still frame instead of an idle animation loop.
        if (!reducedMotion) scheduleFrame();
      };
      const onContextLost = () => {
        // The CSS background remains available if the browser or GPU drops WebGL.
        disposed = true;
        if (raf) window.cancelAnimationFrame(raf);
        raf = 0;
        canvas.dataset.fallback = 'true';
      };
      const onVisibilityChange = () => {
        visible = document.visibilityState !== 'hidden';
        if (!visible) {
          if (raf) window.cancelAnimationFrame(raf);
          raf = 0;
          return;
        }
        scheduleFrame();
      };
      const onMotionPreferenceChange = event => {
        reducedMotion = event.matches;
        lastFrame = 0;
        startTime = 0;
        if (reducedMotion) {
          if (raf) window.cancelAnimationFrame(raf);
          raf = 0;
          currentPointer = { x: 0.5, y: 0.5 };
          targetPointer = { x: 0.5, y: 0.5 };
        }
        // Draw one still frame when motion is reduced; otherwise restart the loop.
        scheduleFrame();
      };

      resize();
      window.addEventListener('resize', onResize, { passive: true });
      if (typeof window.ResizeObserver === 'function') {
        resizeObserver = new window.ResizeObserver(onResize);
        resizeObserver.observe(canvas.parentElement || canvas);
      }
      canvas.addEventListener('webglcontextlost', onContextLost);
      document.addEventListener('visibilitychange', onVisibilityChange);
      const unsubscribeMotionPreference = subscribeMediaQuery(motionPreference, onMotionPreferenceChange);
      window.addEventListener('pointermove', movePointer, { passive: true });
      window.addEventListener('pointerleave', leavePointer, { passive: true });
      canvas.dataset.fallback = 'false';
      scheduleFrame();

      return () => {
        disposed = true;
        window.cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        if (resizeObserver) resizeObserver.disconnect();
        canvas.removeEventListener('webglcontextlost', onContextLost);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        unsubscribeMotionPreference();
        window.removeEventListener('pointermove', movePointer);
        window.removeEventListener('pointerleave', leavePointer);
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      };
    } catch {
      canvas.dataset.fallback = 'true';
      if (raf) window.cancelAnimationFrame(raf);
      if (resizeObserver) resizeObserver.disconnect();
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      return undefined;
    }
  }, []);

  return <div className="smoke-background" aria-hidden="true">
    <canvas ref={canvasRef} />
    <div className="smoke-css-fallback" />
  </div>;
}
