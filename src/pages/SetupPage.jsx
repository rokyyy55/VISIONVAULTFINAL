import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useLang } from "../context/LangContext";
import { makeStyles } from "../styles/styles";

export default function SetupPage({ engine, onDone, onBack }) {
  const { theme: D } = useTheme();
  const { t } = useLang();
  const S = makeStyles(D);

  const [apiKey, setApiKey]     = useState(() => localStorage.getItem("vv_groq_key") || "");
  const [modelPath, setModelPath] = useState(() => localStorage.getItem("vv_model_path") || "");
  const [testStatus, setTestStatus] = useState(null); // null | testing | ok | fail

  const canSave = engine === "cloud" ? apiKey.length > 10 : modelPath.length > 5;

  const test = async () => {
    setTestStatus("testing");
    await new Promise(r => setTimeout(r, 1500));
    setTestStatus(apiKey.startsWith("gsk_") && apiKey.length > 20 ? "ok" : "fail");
  };

  const save = () => {
    if (engine === "cloud") localStorage.setItem("vv_groq_key", apiKey);
    else                    localStorage.setItem("vv_model_path", modelPath);
    onDone();
  };

  const label = {
    fontSize:11, color:D.text3, letterSpacing:1.4,
    textTransform:"uppercase", display:"block", marginBottom:8,
    fontFamily:"'Rajdhani',sans-serif", fontWeight:700,
  };

  const statusColor = testStatus==="ok" ? "#10b981" : testStatus==="fail" ? "#ef4444" : D.text2;

  return (
    <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:"100px 32px 60px" }}>
      <div style={{ width:"100%", maxWidth:500 }}>
        <button onClick={onBack} style={{ ...S.ghostBtn, padding:"8px 18px", fontSize:13, marginBottom:32 }}>← {t.back}</button>

        <div style={{ ...S.glassCard, padding:"36px 32px" }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
            <div style={{ fontSize:34 }}>{engine==="cloud"?"☁":"💻"}</div>
            <div>
              <h2 style={{ fontSize:24, fontWeight:800, margin:0, color:D.text, fontFamily:"'Rajdhani',sans-serif" }}>
                {engine==="cloud" ? t.cloudSetup : t.localSetup}
              </h2>
              <p style={{ fontSize:12, color:D.text3, margin:"4px 0 0" }}>{t.onceOnly}</p>
            </div>
          </div>

          <div style={{ borderTop:`1px solid ${D.glassBorder}`, margin:"20px 0 24px" }}/>

          {engine === "cloud" ? (
            <>
              <div style={{ marginBottom:20 }}>
                <span style={label}>{t.apiKey}</span>
                <input
                  type="password"
                  style={{ ...S.inputStyle }}
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setTestStatus(null); }}
                  placeholder={t.apiKeyPh}
                />
              </div>

              <a
                href="https://console.groq.com"
                target="_blank" rel="noreferrer"
                style={{ display:"block", fontSize:13, color:D.accent2, marginBottom:20, textDecoration:"none" }}
              >
                {t.getGroqKey}
              </a>

              <button
                onClick={test}
                disabled={!apiKey || testStatus==="testing"}
                style={{
                  ...S.ghostBtn, width:"100%", marginBottom:12,
                  color: statusColor,
                  border:`1px solid ${testStatus==="ok" ? "#10b98166" : testStatus==="fail" ? "#ef444466" : D.glassBorder}`,
                  opacity: !apiKey ? 0.5 : 1,
                }}
              >
                {testStatus==="testing" ? `⏳ ${t.testing}`
                 : testStatus==="ok"    ? `✅ ${t.testOk}`
                 : testStatus==="fail"  ? `❌ ${t.testFail}`
                 :                        `🔌 ${t.testConn}`}
              </button>
            </>
          ) : (
            <div style={{ marginBottom:24 }}>
              <span style={label}>{t.modelPath}</span>
              <input
                style={{ ...S.inputStyle }}
                value={modelPath}
                onChange={e => setModelPath(e.target.value)}
                placeholder={t.modelPathPh}
              />
            </div>
          )}

          <button
            onClick={save}
            disabled={!canSave}
            style={{ ...S.primaryBtn, width:"100%", padding:"14px", fontSize:15, opacity: canSave ? 1 : 0.45 }}
          >
            {t.saveGo}
          </button>
        </div>
      </div>
    </div>
  );
}
