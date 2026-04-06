import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useLang } from "../context/LangContext";
import { makeStyles } from "../styles/styles";

export default function SettingsPanel({ engine, setEngine, onClose, onSwitchEngine }) {
  const { theme: D, isDark, toggle } = useTheme();
  const { t, lang, setLang } = useLang();
  const S = makeStyles(D);

  const [apiKey, setApiKey]     = useState(() => localStorage.getItem("vv_groq_key") || "");
  const [modelPath, setModelPath] = useState(() => localStorage.getItem("vv_model_path") || "");
  const [saved, setSaved]       = useState(false);

  const save = () => {
    if (engine === "cloud")  localStorage.setItem("vv_groq_key",    apiKey);
    if (engine === "local")  localStorage.setItem("vv_model_path",  modelPath);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  };

  const row = { marginBottom:18 };
  const label = {
    fontSize:11, color:D.text3, letterSpacing:1.4,
    textTransform:"uppercase", display:"block", marginBottom:7,
    fontFamily:"'Rajdhani',sans-serif", fontWeight:700,
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)",
      display:"flex", alignItems:"center", justifyContent:"center",
    }} onClick={onClose}>
      <div style={{
        ...S.glassCard, minWidth:360, maxWidth:440, width:"90%",
        padding:"32px", position:"relative",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
          <span style={{ fontWeight:800, fontSize:19, color:D.text, fontFamily:"'Rajdhani',sans-serif", letterSpacing:1 }}>
            ⚙ {t.settings}
          </span>
          <button onClick={onClose} style={{ ...S.ghostBtn, padding:"5px 12px", fontSize:13 }}>✕</button>
        </div>

        {/* Language */}
        <div style={row}>
          <span style={label}>Language / Langue</span>
          <div style={{ display:"flex", gap:8 }}>
            {["en","fr"].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                ...S.btn(), padding:"8px 22px", fontSize:13,
                background: lang===l ? `linear-gradient(135deg,${D.accent},${D.accent2})` : D.glass,
                color: lang===l ? "#fff" : D.text2,
                border:`1px solid ${lang===l ? "transparent" : D.glassBorder}`,
                borderRadius:9,
              }}>{l==="en"?"English":"Français"}</button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div style={row}>
          <span style={label}>Theme</span>
          <div style={{ display:"flex", gap:8 }}>
            {[true,false].map(d => (
              <button key={String(d)} onClick={() => { if(isDark!==d) toggle(); }} style={{
                ...S.btn(), padding:"8px 22px", fontSize:13,
                background: isDark===d ? `linear-gradient(135deg,${D.accent},${D.accent2})` : D.glass,
                color: isDark===d ? "#fff" : D.text2,
                border:`1px solid ${isDark===d ? "transparent" : D.glassBorder}`,
                borderRadius:9,
              }}>{d ? `🌙 ${t.dark}` : `☀ ${t.light}`}</button>
            ))}
          </div>
        </div>

        {/* Switch engine */}
        <div style={{ borderTop:`1px solid ${D.glassBorder}`, paddingTop:20, ...row }}>
          <span style={label}>{t.switchEngine}</span>
          <div style={{ display:"flex", gap:8 }}>
            {["local","cloud"].map(e => (
              <button key={e} onClick={() => { setEngine(e); onSwitchEngine(e); }} style={{
                ...S.btn(), padding:"8px 22px", fontSize:13,
                background: engine===e ? `linear-gradient(135deg,${D.accent},${D.accent2})` : D.glass,
                color: engine===e ? "#fff" : D.text2,
                border:`1px solid ${engine===e ? "transparent" : D.glassBorder}`,
                borderRadius:9,
              }}>{e==="local"?t.localMode:t.cloudMode}</button>
            ))}
          </div>
        </div>

        {/* Key / path */}
        {engine === "cloud" && (
          <div style={row}>
            <span style={label}>{t.apiKey}</span>
            <input type="password" style={S.inputStyle} value={apiKey}
              onChange={e => setApiKey(e.target.value)} placeholder={t.apiKeyPh} />
          </div>
        )}
        {engine === "local" && (
          <div style={row}>
            <span style={label}>{t.modelPath}</span>
            <input style={S.inputStyle} value={modelPath}
              onChange={e => setModelPath(e.target.value)} placeholder={t.modelPathPh} />
          </div>
        )}

        <button onClick={save} style={{ ...S.primaryBtn, width:"100%", padding:"13px", fontSize:14, marginTop:4 }}>
          {saved ? t.saved : t.saveGo}
        </button>
      </div>
    </div>
  );
}
