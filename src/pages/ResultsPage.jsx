import { useTheme } from "../context/ThemeContext";
import { useLang } from "../context/LangContext";
import { makeStyles } from "../styles/styles";

const API = "http://localhost:8000";

// ── SVG Icons ──────────────────────────────────────────────────────────────────
const IconCheck = ({ size = 36, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconFolder = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const IconRefresh = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

export default function ResultsPage({ results, onReset }) {
  const { theme: D, isDark } = useTheme();
  const { t } = useLang();
  const S = makeStyles(D);

  const pct = results ? Math.round((results.success / results.total) * 100) : 0;

  const openFolder = async () => {
    if (!results?.output_path) return;
    try {
      await fetch(`${API}/api/open-folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: results.output_path }),
      });
    } catch (e) {
      console.error("Could not open folder:", e);
    }
  };

  return (
    <div style={{
      position: "relative", zIndex: 1,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "100px 32px 60px",
    }}>
      <div style={{ ...S.glassCard, maxWidth: 600, width: "100%", padding: "52px 40px", textAlign: "center" }}>

        {/* Success icon */}
        <div style={{
          width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px",
          background: `linear-gradient(135deg,${D.accent},${D.accent2})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 40px ${D.accentGlow}`,
        }}>
          <IconCheck size={36} color="#fff" />
        </div>

        <h2 style={{
          fontSize: 40, fontWeight: 800, letterSpacing: -1.5,
          color: D.text, margin: "0 0 8px", fontFamily: "'Rajdhani',sans-serif",
        }}>
          {t.done}
        </h2>
        <p style={{ color: D.text2, fontSize: 16, margin: "0 0 44px" }}>
          {results?.success} {t.filesProcessed}
        </p>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 36 }}>
          {[
            { lbl: t.total,        val: results?.total,   col: D.text },
            { lbl: t.successLabel, val: results?.success, col: "#10b981" },
            { lbl: t.errorLabel,   val: results?.errors,  col: "#ef4444" },
          ].map(({ lbl, val, col }) => (
            <div key={lbl} style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.55)",
              borderRadius: 14, padding: "22px 12px",
              border: `1px solid ${D.glassBorder}`,
            }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: col, fontFamily: "'Rajdhani',sans-serif" }}>{val}</div>
              <div style={{ fontSize: 11, color: D.text3, marginTop: 6, letterSpacing: 1, textTransform: "uppercase" }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Success rate bar */}
        <div style={{
          background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.55)",
          borderRadius: 12, padding: "16px 20px", marginBottom: 36,
          border: `1px solid ${D.glassBorder}`, textAlign: "left",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: D.text2 }}>{t.successRate}</span>
            <span style={{ fontWeight: 800, color: "#10b981", fontFamily: "'Rajdhani',sans-serif" }}>{pct}%</span>
          </div>
          <div style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)", borderRadius: 100, height: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#10b981,#06b6d4)", borderRadius: 100, transition: "width 0.6s ease" }}/>
          </div>
        </div>

        {/* Output path display */}
        {results?.output_path && (
          <div style={{
            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.4)",
            border: `1px solid ${D.glassBorder}`, borderRadius: 10,
            padding: "10px 14px", marginBottom: 24,
            fontSize: 12, color: D.text3, textAlign: "left",
            wordBreak: "break-all", fontFamily: "monospace",
          }}>
            {results.output_path}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <button
            onClick={openFolder}
            style={{
              ...S.primaryBtn, padding: "14px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <IconFolder size={18} color="#fff" />
            {t.viewResults}
          </button>
          <button
            onClick={onReset}
            style={{
              ...S.ghostBtn, padding: "14px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <IconRefresh size={18} color={D.text2} />
            {t.scanAgain}
          </button>
        </div>
      </div>
    </div>
  );
}
