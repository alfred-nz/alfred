import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { AnimatePresence, motion } from 'motion/react';
import { Coffee, Footprints, MessageSquare, Mic, Minus, Music, Pin, Sparkles } from 'lucide-react';
import { ButlerPerformAction, ButlerProp, ButlerState } from '../../shared/types';
import { VolumeChangeListener } from '../hooks/useAudioLipSync';
import { ButlerHandsAndProps } from './ButlerHandsAndProps';

gsap.registerPlugin(useGSAP);

export interface AlfredCharacterProps {
  state: ButlerState;
  prop: ButlerProp;
  audioLevel: number;
  registerVolumeListener: (fn: VolumeChangeListener) => () => void;
  liveConnected: boolean;
  isWalking: boolean;
  stayPut: boolean;
  walkDirection: 'left' | 'right';
  onSummonClick: () => void;
  onOpenSettingsDoubleClick: () => void;
  onRightClickPreview: () => void;
  onPerformAction: (action: ButlerPerformAction) => void;
  onToggleStayPut: () => void;
  onMinimizeToTaskbar: () => void;
  onQuickListen: () => void;
  onDragDelta: (deltaX: number, deltaY: number) => void;
}

export const AlfredCharacter: React.FC<AlfredCharacterProps> = ({
  state,
  prop,
  audioLevel,
  registerVolumeListener,
  liveConnected,
  isWalking,
  stayPut,
  walkDirection,
  onSummonClick,
  onOpenSettingsDoubleClick,
  onRightClickPreview,
  onPerformAction,
  onToggleStayPut,
  onMinimizeToTaskbar,
  onQuickListen,
  onDragDelta,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<SVGGElement | null>(null);
  const headRef = useRef<SVGGElement | null>(null);
  const pupilsRef = useRef<SVGGElement | null>(null);
  const monocleRef = useRef<SVGGElement | null>(null);
  const eyelidsRef = useRef<SVGGElement | null>(null);
  const browLeftRef = useRef<SVGPathElement | null>(null);
  const browRightRef = useRef<SVGPathElement | null>(null);
  const mouthOpenRef = useRef<SVGGElement | null>(null);
  const smileRef = useRef<SVGPathElement | null>(null);
  const haloRef = useRef<SVGCircleElement | null>(null);

  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const clickTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    moved: boolean;
  }>({ dragging: false, startX: 0, startY: 0, moved: false });

  // 1. Continuous 3.2s sine-wave breathing (#alfred-body) + natural 3-5s randomized blink timeline
  useGSAP(
    () => {
      if (bodyRef.current) {
        gsap.to(bodyRef.current, {
          y: -3.2,
          scaleY: 1.016,
          duration: 1.6,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          transformOrigin: '110px 230px',
        });
      }

      let active = true;
      let delayed: gsap.core.Tween | null = null;

      const scheduleBlink = () => {
        if (!active || !eyelidsRef.current) return;
        const nextDelay = 3 + Math.random() * 2.1;
        delayed = gsap.delayedCall(nextDelay, () => {
          if (!eyelidsRef.current) return;
          gsap
            .timeline({ onComplete: scheduleBlink })
            .to(eyelidsRef.current, {
              scaleY: 1,
              duration: 0.07,
              ease: 'power2.in',
              transformOrigin: 'center top',
            })
            .to(eyelidsRef.current, {
              scaleY: 0,
              duration: 0.09,
              ease: 'power2.out',
              transformOrigin: 'center top',
            });
        });
      };

      if (eyelidsRef.current) {
        gsap.set(eyelidsRef.current, { scaleY: 0, transformOrigin: 'center top' });
        scheduleBlink();
      }

      return () => {
        active = false;
        delayed?.kill();
      };
    },
    { scope: rootRef }
  );

  // 2. State-driven #alfred-head tilt/nodding & independent #alfred-eyebrows choreography
  useGSAP(
    () => {
      if (!headRef.current || !browLeftRef.current || !browRightRef.current) return;
      gsap.killTweensOf([headRef.current, browLeftRef.current, browRightRef.current]);

      if (state === 'thinking' || state === 'monocle_inspect') {
        gsap.to(headRef.current, {
          rotation: -4.5,
          y: 1.5,
          duration: 1.1,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          transformOrigin: '110px 120px',
        });
        gsap.to(browLeftRef.current, { y: 1.5, rotation: 4, duration: 0.3, transformOrigin: 'center' });
        gsap.to(browRightRef.current, { y: -4.5, rotation: 7, duration: 0.3, transformOrigin: 'center' });
      } else if (state === 'listening') {
        gsap.to(headRef.current, {
          rotation: 3.5,
          y: 2,
          duration: 0.4,
          ease: 'power2.out',
          transformOrigin: '110px 120px',
        });
        gsap.to([browLeftRef.current, browRightRef.current], { y: -2.2, rotation: 0, duration: 0.3 });
      } else if (state === 'urgent_bill_alert') {
        gsap.to(headRef.current, { rotation: 0, y: -1, duration: 0.25 });
        gsap.to(browLeftRef.current, { y: 2.5, rotation: 10, duration: 0.25, transformOrigin: 'center' });
        gsap.to(browRightRef.current, { y: 2.5, rotation: -10, duration: 0.25, transformOrigin: 'center' });
      } else if (state === 'speaking') {
        gsap.to(headRef.current, {
          rotation: 2.2,
          y: -1.8,
          duration: 0.52,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          transformOrigin: '110px 120px',
        });
        gsap.to([browLeftRef.current, browRightRef.current], { y: -2, rotation: 0, duration: 0.3 });
      } else if (state === 'awaiting_approval') {
        gsap.to(headRef.current, {
          rotation: -3,
          y: -1,
          duration: 0.45,
          ease: 'power2.out',
          transformOrigin: '110px 120px',
        });
        gsap.to(browLeftRef.current, { y: -2, rotation: -3, duration: 0.3 });
        gsap.to(browRightRef.current, { y: -3.5, rotation: 4, duration: 0.3 });
      } else {
        gsap.to(headRef.current, { rotation: 0, y: 0, duration: 0.4, ease: 'power2.out' });
        gsap.to([browLeftRef.current, browRightRef.current], { y: 0, rotation: 0, duration: 0.35 });
      }
    },
    { scope: rootRef, dependencies: [state] }
  );

  // 3. Smooth gsap.quickTo() cursor eye-tracking (#alfred-pupils & #alfred-monocle) + 2D screen drag
  useEffect(() => {
    if (!pupilsRef.current || !monocleRef.current) return;
    const xPupilTo = gsap.quickTo(pupilsRef.current, 'x', { duration: 0.18, ease: 'power3.out' });
    const yPupilTo = gsap.quickTo(pupilsRef.current, 'y', { duration: 0.18, ease: 'power3.out' });
    const xMonoTo = gsap.quickTo(monocleRef.current, 'x', { duration: 0.24, ease: 'power3.out' });
    const yMonoTo = gsap.quickTo(monocleRef.current, 'y', { duration: 0.24, ease: 'power3.out' });

    const onMove = (e: MouseEvent) => {
      if (rootRef.current) {
        const rect = rootRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height * 0.34;
        const dx = Math.max(-4.2, Math.min(4.2, (e.clientX - cx) / 40));
        const dy = Math.max(-2.8, Math.min(2.8, (e.clientY - cy) / 40));
        xPupilTo(dx);
        yPupilTo(dy);
        xMonoTo(dx * 0.42);
        yMonoTo(dy * 0.42);
      }

      if (dragRef.current.dragging) {
        const deltaX = e.screenX - dragRef.current.startX;
        const deltaY = e.screenY - dragRef.current.startY;
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          dragRef.current.moved = true;
          dragRef.current.startX = e.screenX;
          dragRef.current.startY = e.screenY;
          onDragDelta(deltaX, deltaY);
        }
      }
    };

    const onUp = () => {
      dragRef.current.dragging = false;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [onDragDelta]);

  // 4. Zero-rerender 60fps Web Audio Lip-Sync driving #alfred-mouth & circular #alfred-audio-halo
  useEffect(() => {
    return registerVolumeListener((level) => {
      if (mouthOpenRef.current && smileRef.current) {
        if (level > 0.025) {
          const openScale = 0.22 + level * 1.15;
          gsap.set(mouthOpenRef.current, {
            opacity: 1,
            scaleY: openScale,
            scaleX: 0.92 + level * 0.16,
            transformOrigin: 'center top',
          });
          gsap.set(smileRef.current, { opacity: 0.15 });
        } else {
          gsap.set(mouthOpenRef.current, { opacity: 0, scaleY: 0.15, transformOrigin: 'center top' });
          gsap.set(smileRef.current, { opacity: 1 });
        }
      }

      if (haloRef.current) {
        gsap.set(haloRef.current, {
          opacity: level > 0.02 ? 0.25 + level * 0.65 : 0,
          scale: 0.92 + level * 0.36,
          transformOrigin: '110px 104px',
        });
      }
    });
  }, [registerVolumeListener]);
  const isUrgent = state === 'urgent_bill_alert';
  const isDancing =
    state === 'dance_moonwalk' ||
    state === 'dance_charleston' ||
    state === 'dance_spin' ||
    state === 'dance_disco';
  const walkingNow = isWalking || state === 'walking' || isDancing;

  const effectiveProp: ButlerProp =
    prop !== 'none'
      ? prop
      : state === 'connecting_tool' || state === 'celebrating'
        ? 'composio_orb'
        : 'none';

  const danceClass =
    state === 'dance_moonwalk'
      ? 'animate-dance-moonwalk'
      : state === 'dance_charleston'
        ? 'animate-dance-charleston'
        : state === 'dance_spin'
          ? 'animate-dance-spin'
          : state === 'dance_disco'
            ? 'animate-dance-disco'
            : state === 'bowing'
              ? 'animate-butler-bow'
              : state === 'celebrating'
                ? 'animate-butler-celebrate'
                : walkingNow
                  ? 'animate-butler-walk'
                  : '';

  return (
    <div
      ref={rootRef}
      onContextMenu={(e) => {
        e.preventDefault();
        onRightClickPreview();
      }}
      className="relative select-none flex flex-col items-center"
      style={{
        width: '100%',
        height: '100%',
        filter: 'drop-shadow(0 10px 16px rgba(61, 75, 55, 0.13))',
      }}
    >


      <div
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          dragRef.current = { dragging: true, startX: e.screenX, startY: e.screenY, moved: false };
        }}
        onClick={() => {
          if (dragRef.current.moved) return;
          if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
          clickTimerRef.current = window.setTimeout(() => {
            onQuickListen();
            clickTimerRef.current = null;
          }, 215);
        }}
        onDoubleClick={() => {
          if (clickTimerRef.current) {
            window.clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
          }
          setShowQuickMenu(false);
          onOpenSettingsDoubleClick();
        }}
        title="Click to talk • Double-click for connections"
        className={`relative w-full h-full cursor-grab active:cursor-grabbing ${danceClass}`}
      >
        <svg
          viewBox="0 0 220 278"
          className="w-full h-full overflow-visible"
          style={{
            transform: walkDirection === 'right' && walkingNow ? 'scaleX(-1)' : undefined,
          }}
        >
          <defs>
            <linearGradient id="suitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>
            <linearGradient id="lapelGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde6ce" />
              <stop offset="100%" stopColor="#f2c199" />
            </linearGradient>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="hairGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>

          {/* Circular Audio-Visualizer Halo Behind Shoulders */}
          <circle
            id="alfred-audio-halo"
            ref={haloRef}
            cx="110"
            cy="104"
            r="58"
            fill="rgba(251, 191, 36, 0.1)"
            stroke="url(#goldGrad)"
            strokeWidth="2.2"
            strokeDasharray="6 4"
            opacity={audioLevel > 0.02 ? 0.45 : 0}
          />

          {/* Walking Trousers & Polished Oxford Shoes */}
          <g className={walkingNow ? 'animate-leg-left' : ''}>
            <rect x="85" y="216" width="18" height="40" rx="6" fill="#111827" stroke="#334155" strokeWidth="1.2" />
            <ellipse cx="90" cy="260" rx="14" ry="6.5" fill="#05080f" stroke="#475569" strokeWidth="1.2" />
          </g>
          <g className={walkingNow ? 'animate-leg-right' : ''}>
            <rect x="117" y="216" width="18" height="40" rx="6" fill="#111827" stroke="#334155" strokeWidth="1.2" />
            <ellipse cx="122" cy="260" rx="14" ry="6.5" fill="#05080f" stroke="#475569" strokeWidth="1.2" />
          </g>

          {/* RIGGED LAYER 1: #alfred-body (Tailored Charcoal Tuxedo, Crisp White Collar & Gold Pocket-Watch Chain) */}
          <g id="alfred-body" ref={bodyRef}>
            {/* Left Sleeve */}
            <g className={walkingNow ? 'animate-arm-left' : ''}>
              <path d="M60 140 C47 160, 48 186, 56 202" stroke="#111827" strokeWidth="14" strokeLinecap="round" fill="none" />
              {walkingNow && <circle cx="56" cy="205" r="6.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />}
            </g>

            {/* Charcoal Tuxedo Torso & Satin Peak Lapels */}
            <path
              d="M56 140 C60 122, 160 122, 164 140 L170 222 L50 222 Z"
              fill="url(#suitGrad)"
              stroke="#334155"
              strokeWidth="1.5"
            />
            <polygon points="88,128 132,128 110,192" fill="#f8fafc" />
            <polygon points="84,128 96,128 110,188 76,158" fill="url(#lapelGrad)" />
            <polygon points="136,128 124,128 110,188 144,158" fill="url(#lapelGrad)" />

            {/* Crisp Wingtip White Collar & Silk Bowtie */}
            <polygon points="94,126 110,136 98,142" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
            <polygon points="126,126 110,136 122,142" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
            <polygon points="97,133 108,139 97,145" fill={isUrgent ? '#ef4444' : '#b91c1c'} />
            <polygon points="123,133 112,139 123,145" fill={isUrgent ? '#ef4444' : '#b91c1c'} />
            <circle cx="110" cy="139" r="3.4" fill="url(#goldGrad)" />

            {/* Gold Pocket-Watch Chain */}
            <path
              d="M110 182 Q130 198 148 184"
              fill="none"
              stroke="url(#goldGrad)"
              strokeWidth="2.2"
              strokeDasharray="3 2"
            />
            <circle cx="149" cy="184" r="3" fill="url(#goldGrad)" />

            {/* Right Sleeve */}
            <g className={walkingNow ? 'animate-arm-right' : ''}>
              <path d="M160 140 C173 160, 172 186, 164 202" stroke="#111827" strokeWidth="14" strokeLinecap="round" fill="none" />
              {walkingNow && <circle cx="164" cy="205" r="6.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />}
            </g>
          </g>

          {/* RIGGED LAYER 2: #alfred-head (Silver-Streaked Parted Hair, Eyebrows, Pupils, Gold Monocle & Lip-Sync Mouth) */}
          <g id="alfred-head" ref={headRef}>
            {/* Ears & Sculpted Head */}
            <circle cx="71" cy="90" r="8" fill="#f2c199" />
            <circle cx="149" cy="90" r="8" fill="#f2c199" />
            <rect x="74" y="46" width="72" height="80" rx="35" fill="url(#skinGrad)" />

            {/* Distinguished Neatly Parted Silver-Streaked Hair & Sideburns */}
            <path
              d="M72 74 C70 40, 100 32, 114 36 C136 33, 150 46, 148 74 C144 58, 128 52, 104 54 C88 55, 77 62, 72 74 Z"
              fill="url(#hairGrad)"
            />
            {/* Crisp Side-Part Silver Streak */}
            <path d="M92 43 Q108 40 126 46" stroke="#f1f5f9" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M74 72 C70 85, 72 98, 78 102" stroke="#cbd5e1" strokeWidth="4.8" strokeLinecap="round" fill="none" />
            <path d="M146 72 C150 85, 148 98, 142 102" stroke="#cbd5e1" strokeWidth="4.8" strokeLinecap="round" fill="none" />

            {/* Sclera */}
            <ellipse cx="94" cy="84" rx="8.2" ry="7.2" fill="#ffffff" />
            <ellipse cx="126" cy="84" rx="8.2" ry="7.2" fill="#ffffff" />

            {/* RIGGED LAYER 3: #alfred-pupils (gsap.quickTo cursor eye-tracking) */}
            <g id="alfred-pupils" ref={pupilsRef}>
              <circle cx="94" cy="84" r="3.8" fill="#0f172a" />
              <circle cx="126" cy="84" r="3.8" fill="#0f172a" />
              <circle cx="92.6" cy="82.5" r="1.25" fill="#ffffff" />
              <circle cx="124.6" cy="82.5" r="1.25" fill="#ffffff" />
            </g>

            {/* Randomized Natural Blink Eyelids */}
            <g ref={eyelidsRef}>
              <ellipse cx="94" cy="84" rx="8.6" ry="7.6" fill="#f2c199" />
              <ellipse cx="126" cy="84" rx="8.6" ry="7.6" fill="#f2c199" />
            </g>

            {/* RIGGED LAYER 4: #alfred-monocle (Polished Gold Monocle over Right Eye + Delicate Gold Chain) */}
            <g id="alfred-monocle" ref={monocleRef}>
              <circle
                cx="126"
                cy="84"
                r="11.5"
                fill="rgba(254, 243, 199, 0.14)"
                stroke="url(#goldGrad)"
                strokeWidth="2.5"
              />
              {/* Specular Glass Glint */}
              <path d="M120 77 Q124 75 128 77" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              {/* Monocle Cord Draping to Lapel */}
              <path
                d="M137 86 Q146 108 136 130"
                fill="none"
                stroke="url(#goldGrad)"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
            </g>

            {/* RIGGED LAYER 5: #alfred-eyebrows (Independent Left & Right Expressive Brows) */}
            <g id="alfred-eyebrows">
              <path
                ref={browLeftRef}
                d="M84 71 Q94 66 103 71"
                stroke="#94a3b8"
                strokeWidth="3.6"
                strokeLinecap="round"
                fill="none"
              />
              <path
                ref={browRightRef}
                d="M117 70 Q126 65 136 70"
                stroke="#94a3b8"
                strokeWidth="3.6"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* Dignified Nose */}
            <path d="M110 82 L108 95 Q110 97 113 95" stroke="#d9a17c" strokeWidth="1.8" strokeLinecap="round" fill="none" />

            {/* RIGGED LAYER 6: #alfred-mouth (60fps Imperative Lip-Sync Aperture + Dignified Silent Smile) */}
            <g id="alfred-mouth">
              <path
                id="alfred-smile"
                ref={smileRef}
                d="M102 109 Q110 113.5 118 109"
                stroke="#7c2d12"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <g ref={mouthOpenRef} opacity={0}>
                <rect x="101" y="106.5" width="18" height="12" rx="6" fill="#450a0a" stroke="#7f1d1d" strokeWidth="1" />
                <ellipse cx="110" cy="115" rx="5.5" ry="2.8" fill="#dc2626" />
              </g>
            </g>

            {/* Sculpted Silver Gentleman Moustache */}
            <path
              d="M110 101 C100 100, 91 105, 86 103 C91 109.5, 102 108.5, 110 104.8 C118 108.5, 129 109.5, 134 103 C129 105, 120 100, 110 101 Z"
              fill="#e2e8f0"
              stroke="#94a3b8"
              strokeWidth="0.8"
            />
          </g>

          {/* RIGGED LAYER 7: #alfred-hands-and-props */}
          <ButlerHandsAndProps state={state} prop={effectiveProp} walkingNow={walkingNow} />
        </svg>


      </div>
    </div>
  );
};
