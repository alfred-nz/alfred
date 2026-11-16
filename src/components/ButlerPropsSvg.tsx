import React from 'react';
import { ButlerProp } from '../../shared/types';

export const ButlerPropsSvg: React.FC<{ prop: ButlerProp }> = ({ prop }) => {
  return (
    <>
      {/* Spectacles Prop */}
      {prop === 'spectacles' && (
        <g stroke="url(#goldGrad)" strokeWidth="2.2" fill="rgba(56,189,248,0.12)">
          <circle cx="94.5" cy="84" r="11" />
          <circle cx="125.5" cy="84" r="11" />
          <line x1="105.5" y1="84" x2="114.5" y2="84" />
        </g>
      )}

      {/* Silver Mail Tray + Sealed Envelope */}
      {prop === 'silver_tray_mail' && (
        <g transform="translate(8, 150)">
          <ellipse cx="38" cy="30" rx="34" ry="7" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
          <rect x="18" y="8" width="40" height="24" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.4" />
          <polyline points="18,9 38,22 58,9" fill="none" stroke="#64748b" strokeWidth="1.4" />
          <circle cx="38" cy="20" r="3.5" fill="#dc2626" />
        </g>
      )}

      {/* Urgent Red-Bordered Invoice + Ringing Brass Bell */}
      {prop === 'urgent_bill_bell' && (
        <>
          <g transform="translate(8, 138)">
            <rect x="6" y="4" width="44" height="56" rx="4" fill="#fef2f2" stroke="#ef4444" strokeWidth="2.5" />
            <rect x="11" y="10" width="34" height="7" rx="2" fill="#ef4444" />
            <line x1="12" y1="25" x2="42" y2="25" stroke="#991b1b" strokeWidth="2" />
            <line x1="12" y1="33" x2="36" y2="33" stroke="#b91c1c" strokeWidth="2" />
            <text x="13" y="49" fontSize="9" fontWeight="bold" fill="#dc2626">
              DUE!
            </text>
          </g>
          <g transform="translate(162, 134)" className="animate-bell-swing">
            <rect x="20" y="2" width="6" height="14" rx="2" fill="#78350f" />
            <path
              d="M8 38 C8 20, 38 20, 38 38 L43 44 L3 44 Z"
              fill="url(#goldGrad)"
              stroke="#a16207"
              strokeWidth="1.5"
            />
            <circle cx="23" cy="46" r="4.5" fill="#ca8a04" />
          </g>
        </>
      )}

      {/* Gold-Nib Fountain Pen */}
      {prop === 'fountain_pen' && (
        <g transform="translate(154, 142) rotate(-28)">
          <rect x="12" y="8" width="9" height="44" rx="4" fill="#0f172a" stroke="url(#goldGrad)" strokeWidth="1.5" />
          <polygon points="12,52 21,52 16.5,64" fill="url(#goldGrad)" />
        </g>
      )}

      {/* Magnifying Glass */}
      {prop === 'magnifying_glass' && (
        <g transform="translate(152, 132)">
          <circle
            cx="22"
            cy="22"
            r="15"
            fill="rgba(56,189,248,0.22)"
            stroke="url(#goldGrad)"
            strokeWidth="3.2"
          />
          <line x1="33" y1="33" x2="46" y2="48" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}

      {/* Composio Golden Keyring & Orbiting App Constellation Orb */}
      {prop === 'composio_orb' && (
        <g transform="translate(148, 114)">
          {/* Outer glowing energy halo */}
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="rgba(139, 92, 246, 0.14)"
            stroke="rgba(167, 139, 250, 0.45)"
            strokeWidth="1.4"
            strokeDasharray="4 3"
            className="animate-composio-reverse"
          />
          {/* Orbiting App Satellites */}
          <g className="animate-composio-orbit">
            <circle cx="32" cy="6" r="4.5" fill="#34d399" />
            <circle cx="55" cy="44" r="4.2" fill="#f59e0b" />
            <circle cx="9" cy="44" r="4.2" fill="#38bdf8" />
          </g>
          {/* Golden Butler Keyring Core */}
          <circle
            cx="32"
            cy="32"
            r="12"
            fill="#1e1b4b"
            stroke="url(#goldGrad)"
            strokeWidth="2.6"
          />
          {/* Miniature Skeleton Key Emblem */}
          <circle cx="32" cy="28" r="3.6" fill="none" stroke="url(#goldGrad)" strokeWidth="2" />
          <line x1="32" y1="31.5" x2="32" y2="40" stroke="url(#goldGrad)" strokeWidth="2" strokeLinecap="round" />
          <line x1="32" y1="36.5" x2="35.5" y2="36.5" stroke="url(#goldGrad)" strokeWidth="1.8" />
          <line x1="32" y1="39.5" x2="35.5" y2="39.5" stroke="url(#goldGrad)" strokeWidth="1.8" />
          {/* Sparkle Stars */}
          <polygon
            points="8,10 10,14 14,16 10,18 8,22 6,18 2,16 6,14"
            fill="#fde047"
            className="animate-sparkle-pop"
          />
          <polygon
            points="56,8 57.5,11 61,12.5 57.5,14 56,17 54.5,14 51,12.5 54.5,11"
            fill="#c084fc"
            className="animate-sparkle-pop"
          />
        </g>
      )}

      {/* Afternoon Earl Grey Tea Service (Silver Salver + Teapot + Steaming Cup) */}
      {prop === 'tea_service' && (
        <g transform="translate(4, 146)">
          <ellipse cx="40" cy="34" rx="36" ry="7" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
          {/* Bone-China Teapot */}
          <ellipse cx="28" cy="24" rx="12" ry="9" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.3" />
          <path d="M16 22 Q10 18 14 14" fill="none" stroke="#94a3b8" strokeWidth="2" />
          <path d="M40 22 Q46 16 48 19" fill="none" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="28" cy="14" r="2.5" fill="url(#goldGrad)" />
          {/* Teacup */}
          <path d="M49 24 L61 24 L59 32 L51 32 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
          {/* Rising Steam Wisps */}
          <path d="M53 20 Q51 14 55 10" fill="none" stroke="#e2e8f0" strokeWidth="1.6" strokeLinecap="round" className="animate-steam-rise" />
          <path d="M58 21 Q60 15 57 11" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" className="animate-steam-rise" />
        </g>
      )}

      {/* Twirling 1920s Charleston Cane & Musical Notes */}
      {prop === 'twirling_cane' && (
        <>
          <g transform="translate(152, 136)">
            <g className="animate-cane-twirl">
              <line x1="6" y1="26" x2="48" y2="26" stroke="#451a03" strokeWidth="4" strokeLinecap="round" />
              <circle cx="6" cy="26" r="4.5" fill="url(#goldGrad)" />
              <circle cx="48" cy="26" r="3" fill="#fde047" />
            </g>
          </g>
          <text x="26" y="64" fontSize="16" fill="#fde047" className="animate-steam-rise">♪</text>
          <text x="178" y="54" fontSize="17" fill="#38bdf8" className="animate-steam-rise">♫</text>
        </>
      )}

      {/* Hanging Faceted Disco Mirrorball & Prism Sparkles */}
      {prop === 'disco_ball' && (
        <g>
          <line x1="176" y1="0" x2="176" y2="22" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="176" cy="34" r="13" fill="#e2e8f0" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="164" y1="30" x2="188" y2="30" stroke="#64748b" strokeWidth="1" />
          <line x1="164" y1="38" x2="188" y2="38" stroke="#64748b" strokeWidth="1" />
          <line x1="176" y1="21" x2="176" y2="47" stroke="#64748b" strokeWidth="1" />
          <polygon points="34,42 36,47 41,49 36,51 34,56 32,51 27,49 32,47" fill="#f472b6" className="animate-sparkle-pop" />
          <polygon points="194,62 196,66 200,68 196,70 194,74 192,70 188,68 192,66" fill="#34d399" className="animate-sparkle-pop" />
        </g>
      )}

      {/* Top-Hat Magic Surprise (White Origami Dove & Confetti Stars) */}
      {prop === 'magic_dove' && (
        <g>
          <g transform="translate(88, 2)" className="animate-butler-float">
            <path d="M22 20 C12 10, 4 14, 10 24 C16 28, 28 28, 34 22 C40 12, 32 8, 22 20 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
            <polygon points="34,20 40,22 34,24" fill="#f59e0b" />
          </g>
          <polygon points="52,24 54,29 59,31 54,33 52,38 50,33 45,31 50,29" fill="#fde047" className="animate-sparkle-pop" />
          <polygon points="164,22 166,27 171,29 166,31 164,36 162,31 157,29 162,27" fill="#ec4899" className="animate-sparkle-pop" />
        </g>
      )}

      {/* Gold Monocle & Open Pocket Watch */}
      {prop === 'monocle_watch' && (
        <>
          <circle cx="125.5" cy="84" r="11.5" fill="rgba(253,224,71,0.16)" stroke="url(#goldGrad)" strokeWidth="2.4" />
          <path d="M136 88 Q142 108 134 126" fill="none" stroke="url(#goldGrad)" strokeWidth="1.3" strokeDasharray="2 2" />
          <g transform="translate(154, 166)">
            <circle cx="18" cy="18" r="13" fill="#fef9c3" stroke="url(#goldGrad)" strokeWidth="3" />
            <line x1="18" y1="18" x2="18" y2="10" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="18" y1="18" x2="24" y2="18" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        </>
      )}
    </>
  );
};
