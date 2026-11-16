import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ButlerProp, ButlerState } from '../../shared/types';
import { ButlerPropsSvg } from './ButlerPropsSvg';

interface ButlerHandsAndPropsProps {
  state: ButlerState;
  prop: ButlerProp;
  walkingNow: boolean;
}

export const ButlerHandsAndProps: React.FC<ButlerHandsAndPropsProps> = ({
  state,
  prop,
  walkingNow,
}) => {
  const scopeRef = useRef<SVGGElement | null>(null);

  useGSAP(
    () => {
      if (!scopeRef.current) return;

      if (state === 'listening') {
        gsap.fromTo(
          '.listen-pulse-ring',
          { scale: 0.75, opacity: 0.9, transformOrigin: 'center center' },
          {
            scale: 1.85,
            opacity: 0,
            duration: 1.35,
            repeat: -1,
            ease: 'power2.out',
            transformOrigin: 'center center',
          }
        );
      }

      if (state === 'thinking') {
        gsap.to('.monocle-scan-ring', {
          rotation: 360,
          duration: 3.6,
          repeat: -1,
          ease: 'none',
          transformOrigin: 'center center',
        });
      }

      if (state === 'presenting_mail') {
        gsap.fromTo(
          '.cloche-tray-group',
          { x: 18, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' }
        );
        gsap.to('.floating-mail-badge', {
          y: -5,
          duration: 1.2,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
      }

      if (state === 'urgent_bill_alert') {
        gsap.to('.urgent-desk-bell', {
          rotation: 18,
          duration: 0.11,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          transformOrigin: '23px 8px',
        });
        gsap.fromTo(
          '.urgent-ripple-ring',
          { scale: 0.65, opacity: 0.9, transformOrigin: 'center center' },
          {
            scale: 2.1,
            opacity: 0,
            duration: 1.15,
            repeat: -1,
            ease: 'power2.out',
            transformOrigin: 'center center',
          }
        );
      }

      if (state === 'typing_post' || state === 'executing_payment') {
        gsap.to('.scribing-pen', {
          x: 7,
          y: -3,
          rotation: -18,
          duration: 0.18,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          transformOrigin: 'bottom center',
        });
        gsap.fromTo(
          '.scribe-sparkle',
          { y: 4, opacity: 0.2, scale: 0.7 },
          {
            y: -14,
            opacity: 1,
            scale: 1.2,
            duration: 0.85,
            stagger: 0.22,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
          }
        );
      }

      if (state === 'awaiting_approval') {
        gsap.to('.floating-parchment', {
          y: -4,
          duration: 1.6,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
      }
    },
    { scope: scopeRef, dependencies: [state, prop] }
  );

  const isSpecialProp =
    prop === 'composio_orb' ||
    prop === 'tea_service' ||
    prop === 'twirling_cane' ||
    prop === 'disco_ball' ||
    prop === 'magic_dove' ||
    prop === 'monocle_watch';

  return (
    <g id="alfred-hands-and-props" ref={scopeRef}>
      {/* IDLE: Dignified Clasped White-Gloved Hands + Subtle Gold Floor Aura */}
      {state === 'idle' && !walkingNow && !isSpecialProp && (
        <g>
          <ellipse
            cx="110"
            cy="264"
            rx="46"
            ry="6"
            fill="none"
            stroke="rgba(251, 191, 36, 0.35)"
            strokeWidth="1.6"
          />
          <ellipse cx="105" cy="202" rx="9" ry="6.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.1" />
          <ellipse cx="115" cy="202" rx="9" ry="6.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.1" />
        </g>
      )}

      {/* LISTENING: Cyan Monocle & Ear Pulse Ring */}
      {state === 'listening' && (
        <g>
          <circle
            className="listen-pulse-ring"
            cx="126"
            cy="84"
            r="14"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
          />
          <circle cx="151" cy="88" r="5" fill="rgba(34, 211, 238, 0.35)" />
        </g>
      )}

      {/* THINKING: Right Gloved Hand to Chin + Rotating Dashed Monocle Scan Ring */}
      {state === 'thinking' && (
        <g>
          <circle
            className="monocle-scan-ring"
            cx="126"
            cy="84"
            r="15.5"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />
          <path d="M150 162 Q144 136 124 122" stroke="#111827" strokeWidth="11" strokeLinecap="round" fill="none" />
          <circle cx="121" cy="119" r="7" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
        </g>
      )}

      {/* PRESENTING MAIL: Extended Left Arm + Polished Silver Cloche/Tray + Floating Envelope */}
      {state === 'presenting_mail' && (
        <g className="cloche-tray-group" transform="translate(2, 140)">
          <ellipse cx="38" cy="40" rx="34" ry="6.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
          <path d="M12 38 C12 16, 64 16, 64 38 Z" fill="rgba(226,232,240,0.28)" stroke="#cbd5e1" strokeWidth="1.2" />
          <circle cx="38" cy="19" r="3" fill="#fbbf24" />
          <g className="floating-mail-badge">
            <rect x="20" y="20" width="36" height="22" rx="3" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.5" />
            <polyline points="20,21 38,32 56,21" fill="none" stroke="#d97706" strokeWidth="1.4" />
            <circle cx="38" cy="31" r="3" fill="#dc2626" />
          </g>
        </g>
      )}

      {/* URGENT BILL ALERT: Crimson Invoice Card + Shaking Brass Bell + Expanding Ripple */}
      {state === 'urgent_bill_alert' && (
        <g>
          <circle
            className="urgent-ripple-ring"
            cx="182"
            cy="158"
            r="16"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.2"
          />
          <g transform="translate(8, 134)">
            <rect x="4" y="4" width="44" height="56" rx="5" fill="#450a0a" stroke="#ef4444" strokeWidth="2.2" />
            <rect x="9" y="10" width="34" height="7" rx="2" fill="#ef4444" />
            <line x1="10" y1="25" x2="40" y2="25" stroke="#fca5a5" strokeWidth="2" />
            <line x1="10" y1="33" x2="34" y2="33" stroke="#f87171" strokeWidth="2" />
            <text x="10" y="49" fontSize="8.5" fontWeight="bold" fill="#fde047">
              OVERDUE
            </text>
          </g>
          <g transform="translate(159, 132)" className="urgent-desk-bell">
            <rect x="20" y="2" width="6" height="13" rx="2" fill="#78350f" />
            <path d="M9 36 C9 19, 37 19, 37 36 L42 42 L4 42 Z" fill="url(#goldGrad)" stroke="#b45309" strokeWidth="1.5" />
            <circle cx="23" cy="44" r="4.2" fill="#f59e0b" />
          </g>
        </g>
      )}

      {/* TYPING POST / EXECUTING PAYMENT: Rapid Fountain Pen + Progress Sparkles */}
      {(state === 'typing_post' || state === 'executing_payment') && (
        <g transform="translate(148, 138)">
          <g className="scribing-pen" transform="rotate(-26)">
            <rect x="14" y="10" width="8.5" height="40" rx="4" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
            <polygon points="14,50 22.5,50 18.25,61" fill="url(#goldGrad)" />
          </g>
          <circle className="scribe-sparkle" cx="12" cy="18" r="2.8" fill="#fbbf24" />
          <circle className="scribe-sparkle" cx="30" cy="10" r="2.5" fill="#38bdf8" />
          <circle className="scribe-sparkle" cx="42" cy="24" r="2.8" fill="#34d399" />
        </g>
      )}

      {/* AWAITING APPROVAL: Poised Fountain Pen over Floating Glass/Parchment Card */}
      {state === 'awaiting_approval' && (
        <g transform="translate(142, 132)" className="floating-parchment">
          <rect
            x="0"
            y="14"
            width="42"
            height="50"
            rx="6"
            fill="rgba(15, 23, 42, 0.88)"
            stroke="#fbbf24"
            strokeWidth="1.6"
          />
          <line x1="8" y1="26" x2="34" y2="26" stroke="#fde68a" strokeWidth="2" />
          <line x1="8" y1="35" x2="28" y2="35" stroke="#94a3b8" strokeWidth="1.8" />
          <rect x="8" y="46" width="26" height="9" rx="3" fill="#f59e0b" />
          <g transform="translate(26, -4) rotate(-25)">
            <rect x="6" y="6" width="7.5" height="34" rx="3.5" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.4" />
            <polygon points="6,40 13.5,40 9.75,50" fill="url(#goldGrad)" />
          </g>
        </g>
      )}

      {/* Composio Orb & Showmanship Props */}
      {isSpecialProp && <ButlerPropsSvg prop={prop} />}
    </g>
  );
};
