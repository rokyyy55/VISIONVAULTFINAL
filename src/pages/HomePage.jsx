import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useLang } from "../context/LangContext";
import { makeStyles } from "../styles/styles";

// ── SVG Icons ──────────────────────────────────────────────────────────────────
const IconRobot = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <circle cx="12" cy="5" r="2"/>
    <line x1="12" y1="7" x2="12" y2="11"/>
    <line x1="8" y1="15" x2="8" y2="17"/>
    <line x1="16" y1="15" x2="16" y2="17"/>
    <circle cx="9" cy="14" r="1" fill={color} stroke="none"/>
    <circle cx="15" cy="14" r="1" fill={color} stroke="none"/>
  </svg>
);

const IconLock = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2"/>
    <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    <circle cx="12" cy="16" r="1.5" fill={color} stroke="none"/>
  </svg>
);

const IconBolt = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={color} stroke={color}/>
  </svg>
);

const IconClose = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconBrain = ({ size = 36, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2a2.5 2.5 0 0 1 5 0v.5a2.5 2.5 0 0 1 2.5 2.5 2.5 2.5 0 0 1 2.5 2.5c0 1-.4 1.9-1 2.5.6.6 1 1.5 1 2.5a2.5 2.5 0 0 1-2.5 2.5 2.5 2.5 0 0 1-2.5 2.5h-5a2.5 2.5 0 0 1-2.5-2.5A2.5 2.5 0 0 1 4 12.5C3.4 11.9 3 11 3 10a2.5 2.5 0 0 1 2.5-2.5A2.5 2.5 0 0 1 8 5a2.5 2.5 0 0 1 1.5-3z"/>
    <line x1="12" y1="6" x2="12" y2="18"/>
    <line x1="9" y1="10" x2="15" y2="10"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>
);

// ── Learn More Modal ───────────────────────────────────────────────────────────
function LearnMoreModal({ onClose, D, isDark, S }) {
  const features = [
    {
      title: "AI-Powered Vision Analysis",
      desc: "VisionVault uses state-of-the-art large vision-language models (LLaMA 4 via Groq) to read and understand the actual content of your documents — not just their filenames. It can handle PDFs, images, Word documents, and Excel spreadsheets.",
    },
    {
      title: "Automatic Classification",
      desc: "Simply point VisionVault at a folder of mixed documents. The AI extracts key fields — document type, profession, date, names, amounts — and classifies each file according to your chosen criteria, with no manual intervention.",
    },
    {
      title: "Smart Organization",
      desc: "After classification, VisionVault automatically copies your files into a clean, nested folder hierarchy. Similar values are grouped together intelligently, so 'Senior Accountant', 'Accounting Specialist', and 'Staff Accountant' all land in the same folder.",
    },
    {
      title: "Fully Configurable Wizard",
      desc: "A 5-step wizard lets you choose exactly what to classify by, list allowed values, add extra fields to extract, and set the industry context — all without writing a single line of code.",
    },
    {
      title: "Local & Cloud Modes",
      desc: "Run inference entirely offline using a local OpenVINO model for maximum privacy, or use Groq's blazing-fast cloud API for speed. Your documents never leave your machine in local mode.",
    },
    {
      title: "Resume Support & Live Progress",
      desc: "If a scan is interrupted, VisionVault picks up exactly where it left off. A real-time progress ring shows you every file being processed as it happens.",
    },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          ...S.glassCard,
          maxWidth: 680, width: "100%", maxHeight: "85vh",
          overflowY: "auto", padding: "40px 36px", position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <h2 style={{
              fontSize: 30, fontWeight: 800, margin: "0 0 6px",
              color: D.text, fontFamily: "'Rajdhani',sans-serif", letterSpacing: -0.5,
            }}>What is VisionVault?</h2>
            <p style={{ color: D.text2, fontSize: 15, margin: 0 }}>
              An AI-powered document intelligence engine that classifies and organizes your files automatically.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              ...S.ghostBtn, padding: "8px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginLeft: 16,
            }}
          >
            <IconClose color={D.text2} />
          </button>
        </div>

        {/* Features grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
              border: `1px solid ${D.glassBorder}`,
              borderRadius: 14, padding: "20px",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
                color: D.accent2, textTransform: "uppercase",
                fontFamily: "'Rajdhani',sans-serif", marginBottom: 8,
              }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: D.text, marginBottom: 8 }}>
                {f.title}
              </div>
              <p style={{ fontSize: 13, color: D.text2, lineHeight: 1.65, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 28, padding: "16px 20px",
          background: isDark ? `rgba(124,58,237,0.08)` : `rgba(0,119,204,0.07)`,
          border: `1px solid ${D.border2}`, borderRadius: 12,
          fontSize: 13, color: D.text2, lineHeight: 1.6,
        }}>
          <strong style={{ color: D.accent }}>Track:</strong> General Track — AI Projects and Practical Applications &nbsp;·&nbsp;
          <strong style={{ color: D.accent }}>Event:</strong> AI EXPO 2026 — House of AI, Blida 1 University
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function HomePage({ onStart }) {
  const { theme: D, isDark } = useTheme();
  const { t } = useLang();
  const S = makeStyles(D);
  const [showLearnMore, setShowLearnMore] = useState(false);

  const features = [
    { icon: <IconRobot size={20} color={D.accent} />,  label: t.feat1 },
    { icon: <IconLock  size={20} color={D.accent2} />, label: t.feat2 },
    { icon: <IconBolt  size={20} color={isDark ? "#a78bfa" : "#0077cc"} />, label: t.feat3 },
  ];

  return (
    <div style={{
      position: "relative", zIndex: 1,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "100px 32px 60px", textAlign: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Sora:wght@300;400;600;700;800&display=swap');
        @keyframes pulseGlow { 0%,100%{opacity:1;box-shadow:0 0 8px currentColor} 50%{opacity:0.4;box-shadow:0 0 20px currentColor} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "6px 18px", borderRadius: 100,
        border: `1px solid ${D.border2}`,
        background: isDark ? "rgba(6,182,212,0.08)" : "rgba(0,140,210,0.1)",
        marginBottom: 36, animation: "fadeUp 0.6s ease both",
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: D.accent2, display: "inline-block",
          animation: "pulseGlow 2.2s infinite", color: D.accent2,
        }}/>
        <span style={{
          fontSize: 11, color: D.accent2, fontWeight: 700,
          letterSpacing: 2, fontFamily: "'Rajdhani',sans-serif", textTransform: "uppercase",
        }}>
          {t.tagline}
        </span>
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: "clamp(48px,8vw,80px)", fontWeight: 800,
        lineHeight: 1.02, letterSpacing: "-2px", margin: "0 0 28px",
        fontFamily: "'Rajdhani','Sora',sans-serif",
        animation: "fadeUp 0.6s ease 0.1s both",
      }}>
        {t.heroTitle.map((word, i) => (
          <span key={i} style={{
            display: "block",
            color: i === 0 ? D.text : i === 1 ? (isDark ? "#a78bfa" : "#0099dd") : "transparent",
            background: i === 2 ? `linear-gradient(90deg,${D.accent},${D.accent2})` : "none",
            WebkitBackgroundClip: i === 2 ? "text" : "unset",
            WebkitTextFillColor: i === 2 ? "transparent" : "unset",
            textShadow: isDark && i === 0 ? "0 0 40px rgba(124,58,237,0.3)" : "none",
          }}>{word}</span>
        ))}
      </h1>

      {/* Subtitle */}
      <p style={{
        fontSize: 17, color: D.text2, lineHeight: 1.75,
        maxWidth: 560, margin: "0 auto 52px",
        animation: "fadeUp 0.6s ease 0.2s both",
      }}>{t.heroSub}</p>

      {/* CTA Buttons */}
      <div style={{
        display: "flex", gap: 16, justifyContent: "center",
        flexWrap: "wrap", animation: "fadeUp 0.6s ease 0.3s both",
      }}>
        <button
          onClick={onStart}
          style={{ ...S.primaryBtn, fontSize: 16, padding: "15px 42px", borderRadius: 13 }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 30px ${D.accentGlow}`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 0 24px ${D.accentGlow}`; }}
        >
          {t.getStarted} →
        </button>
        <button
          onClick={() => setShowLearnMore(true)}
          style={{ ...S.ghostBtn, fontSize: 16, padding: "15px 42px", borderRadius: 13 }}
        >
          {t.learnMore}
        </button>
      </div>

      {/* Feature pills */}
      <div style={{
        display: "flex", gap: 32, justifyContent: "center",
        marginTop: 80, flexWrap: "wrap",
        animation: "fadeUp 0.6s ease 0.4s both",
      }}>
        {features.map(({ icon, label }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 22px", borderRadius: 100,
            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.55)",
            border: `1px solid ${D.glassBorder}`,
            backdropFilter: "blur(10px)",
          }}>
            {icon}
            <span style={{ fontSize: 13, fontWeight: 700, color: D.text2, letterSpacing: 0.5 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Decorative orb */}
      {isDark && (
        <div style={{
          position: "absolute", left: "50%", top: "35%",
          width: 600, height: 600, borderRadius: "50%",
          background: `radial-gradient(circle, ${D.accent}18 0%, transparent 65%)`,
          transform: "translate(-50%,-50%)",
          pointerEvents: "none", zIndex: -1,
        }}/>
      )}

      {/* Learn More Modal */}
      {showLearnMore && (
        <LearnMoreModal
          onClose={() => setShowLearnMore(false)}
          D={D} isDark={isDark} S={S}
        />
      )}
    </div>
  );
}
