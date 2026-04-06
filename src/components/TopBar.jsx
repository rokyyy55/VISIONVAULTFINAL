import { useTheme } from "../context/ThemeContext";
import { useLang } from "../context/LangContext";
import { makeStyles } from "../styles/styles";

// ── VisionVault Logo SVG (traced from the uploaded logo, transparent bg) ──────
function VVLogo({ size = 34, color = "#7c3aed", color2 = "#06b6d4" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left wing */}
      <path
        d="M50 62 L18 18 L28 18 L50 54 Z"
        fill={color}
        opacity="0.95"
      />
      {/* Right wing */}
      <path
        d="M50 62 L72 18 L82 18 L50 54 Z"
        fill={color2}
        opacity="0.95"
      />
      {/* Left inner blade */}
      <path
        d="M50 54 L34 22 L28 18 L44 50 Z"
        fill={color}
        opacity="0.5"
      />
      {/* Right inner blade */}
      <path
        d="M50 54 L66 22 L72 18 L56 50 Z"
        fill={color2}
        opacity="0.5"
      />
      {/* Bottom V point */}
      <path
        d="M44 50 L50 82 L56 50 L50 54 Z"
        fill={color}
        opacity="0.9"
      />
      {/* Center dot */}
      <circle cx="50" cy="57" r="3.5" fill={color2} />
    </svg>
  );
}

// ── SVG Icons for buttons ──────────────────────────────────────────────────────
const IconSun = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const IconMoon = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const IconSettings = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

// ── TopBar ─────────────────────────────────────────────────────────────────────
export default function TopBar({ engine, onSettings }) {
  const { theme: D, isDark, toggle } = useTheme();
  const { t, lang, toggle: toggleLang } = useLang();
  const S = makeStyles(D);

  const engineColor = engine === "cloud" ? D.accent2 : D.accent;
  const engineLabel = engine === "cloud" ? t.cloudBadge : t.localBadge;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      padding: "14px 32px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: isDark ? "rgba(4,8,26,0.75)" : "rgba(200,235,255,0.65)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: `1px solid ${D.glassBorder}`,
    }}>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

        {/* VV Logo — no background box, transparent */}
        <div style={{
          width: 36, height: 36,
          display: "flex", alignItems: "center", justifyContent: "center",
          filter: `drop-shadow(0 0 8px ${D.accentGlow})`,
        }}>
          <VVLogo size={36} color={D.accent} color2={D.accent2} />
        </div>

        <span style={{
          fontWeight: 800, fontSize: 17,
          color: D.text,
          fontFamily: "'Rajdhani','Sora',sans-serif",
          textTransform: "uppercase", letterSpacing: 2,
        }}>VisionVault</span>

        {engine && (
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: 1.8,
            padding: "3px 9px", borderRadius: 6,
            background: `${engineColor}22`,
            color: engineColor,
            border: `1px solid ${engineColor}55`,
            textTransform: "uppercase",
          }}>{engineLabel}</span>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={toggle} style={{
          ...S.ghostBtn, padding: "7px 14px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isDark ? <IconSun color={D.text2} /> : <IconMoon color={D.text2} />}
        </button>
        <button onClick={toggleLang} style={{
          ...S.ghostBtn, padding: "7px 14px",
          fontSize: 12, fontWeight: 800, letterSpacing: 1,
        }}>
          {lang === "en" ? "FR" : "EN"}
        </button>
        <button onClick={onSettings} style={{
          ...S.ghostBtn, padding: "7px 16px", fontSize: 13,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <IconSettings color={D.text2} />
          {t.settings}
        </button>
      </div>
    </div>
  );
}
