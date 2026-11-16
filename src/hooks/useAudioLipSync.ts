import { useCallback, useEffect, useRef, useState } from 'react';

export type VolumeChangeListener = (level: number) => void;

/**
 * Real-time Web Audio API Lip-Sync Engine (AnalyserNode fftSize=256, smoothing=0.5).
 * Drives #alfred-mouth & #alfred-audio-halo imperatively at 60fps via onVolumeChange
 * without triggering 60fps React re-renders.
 */
export function useAudioLipSync() {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTestTonePlaying, setIsTestTonePlaying] = useState(false);

  const playCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const activeCountRef = useRef<number>(0);
  const syntheticSpeechRef = useRef<boolean>(false);
  const smoothedLevelRef = useRef<number>(0);
  const listenersRef = useRef<Set<VolumeChangeListener>>(new Set());

  const ensureAudioGraph = useCallback(() => {
    if (!playCtxRef.current || playCtxRef.current.state === 'closed') {
      const ctx = new AudioContext({ sampleRate: 24000 });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      analyser.connect(ctx.destination);
      playCtxRef.current = ctx;
      analyserRef.current = analyser;
    }
    if (playCtxRef.current.state === 'suspended') {
      playCtxRef.current.resume().catch(() => {});
    }
    return { ctx: playCtxRef.current, analyser: analyserRef.current! };
  }, []);

  const registerVolumeListener = useCallback((fn: VolumeChangeListener) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  const notifyListeners = useCallback((level: number) => {
    for (const fn of listenersRef.current) {
      fn(level);
    }
  }, []);

  const setActiveSourcesCount = useCallback((count: number) => {
    activeCountRef.current = Math.max(0, count);
  }, []);

  const setSyntheticSpeechActive = useCallback((active: boolean) => {
    syntheticSpeechRef.current = active;
  }, []);

  // 1-click syllable-modulated British Butler cadence tone for live lip-sync testing
  const playLipSyncTestTone = useCallback(() => {
    const { ctx, analyser } = ensureAudioGraph();
    if (isTestTonePlaying) return;

    const now = ctx.currentTime;
    const duration = 2.6;
    const carrier = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const envGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(132, now);
    carrier.frequency.linearRampToValueAtTime(154, now + 0.7);
    carrier.frequency.linearRampToValueAtTime(122, now + 1.6);
    carrier.frequency.linearRampToValueAtTime(138, now + 2.2);
    carrier.frequency.linearRampToValueAtTime(110, now + duration);

    sub.type = 'triangle';
    sub.frequency.setValueAtTime(264, now);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(680, now);
    filter.Q.setValueAtTime(2.4, now);

    const syllables = [
      [0.0, 0.0],
      [0.08, 0.3],
      [0.24, 0.04],
      [0.38, 0.36],
      [0.6, 0.05],
      [0.76, 0.28],
      [0.98, 0.02],
      [1.18, 0.38],
      [1.46, 0.04],
      [1.68, 0.32],
      [2.05, 0.25],
      [duration, 0.0],
    ];
    for (const [t, g] of syllables) {
      envGain.gain.linearRampToValueAtTime(g, now + t);
    }

    carrier.connect(filter);
    sub.connect(filter);
    filter.connect(envGain);
    envGain.connect(analyser);

    activeCountRef.current += 1;
    setIsTestTonePlaying(true);

    carrier.start(now);
    sub.start(now);
    carrier.stop(now + duration);
    sub.stop(now + duration);

    carrier.onended = () => {
      activeCountRef.current = Math.max(0, activeCountRef.current - 1);
      setIsTestTonePlaying(false);
    };
  }, [ensureAudioGraph, isTestTonePlaying]);

  useEffect(() => {
    let rafId = 0;
    let frameCounter = 0;
    const timeDomain = new Uint8Array(256);

    const loop = () => {
      const analyser = analyserRef.current;
      let target = 0;

      if (analyser && activeCountRef.current > 0) {
        analyser.getByteTimeDomainData(timeDomain);
        let sumSq = 0;
        for (let i = 0; i < timeDomain.length; i++) {
          const centered = (timeDomain[i] - 128) / 128;
          sumSq += centered * centered;
        }
        const rawRms = Math.sqrt(sumSq / timeDomain.length);
        const gated = rawRms < 0.014 ? 0 : (rawRms - 0.014) * 4.6;
        target = Math.max(0, Math.min(1, gated));
      } else if (syntheticSpeechRef.current) {
        const t = performance.now() * 0.016;
        target = Math.max(0.06, Math.min(0.92, 0.35 + 0.34 * Math.sin(t) + 0.22 * Math.sin(t * 2.35)));
      }

      const prev = smoothedLevelRef.current;
      const coeff = target > prev ? 0.48 : 0.24;
      const next = prev + (target - prev) * coeff;
      const clamped = next < 0.008 ? 0 : Math.min(1, next);

      smoothedLevelRef.current = clamped;
      notifyListeners(clamped);

      frameCounter++;
      if (frameCounter % 3 === 0) {
        setAudioLevel((old) => (Math.abs(old - clamped) > 0.015 || (clamped === 0 && old !== 0) ? clamped : old));
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [notifyListeners]);

  const closeAudioGraph = useCallback(() => {
    playCtxRef.current?.close().catch(() => {});
    playCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  return {
    audioLevel,
    isTestTonePlaying,
    ensureAudioGraph,
    registerVolumeListener,
    setActiveSourcesCount,
    setSyntheticSpeechActive,
    playLipSyncTestTone,
    closeAudioGraph,
  };
}
