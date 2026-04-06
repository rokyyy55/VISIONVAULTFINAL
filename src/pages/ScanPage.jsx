import { useState, useRef, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useLang } from "../context/LangContext";
import { makeStyles } from "../styles/styles";

const API = "http://localhost:8000";

// ── SVG Icon Library ───────────────────────────────────────────────────────────
const Icon = {
  FolderOpen: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Folder: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  FolderIn: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      <line x1="12" y1="11" x2="12" y2="17"/>
      <polyline points="9 14 12 17 15 14"/>
    </svg>
  ),
  Layers: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  Target: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Plus: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Building: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 22V12h6v10"/>
      <path d="M9 7h.01M12 7h.01M15 7h.01M9 11h.01M15 11h.01"/>
    </svg>
  ),
  Rocket: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),
  List: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  Check: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Alert: ({ size = 16, color = "#f87171" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <triangle points="10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  File: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
      <polyline points="13 2 13 9 20 9"/>
    </svg>
  ),
  Shuffle: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8"/>
      <line x1="4" y1="20" x2="21" y2="3"/>
      <polyline points="21 16 21 21 16 21"/>
      <line x1="15" y1="15" x2="21" y2="21"/>
      <line x1="4" y1="4" x2="9" y2="9"/>
    </svg>
  ),
  Skip: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4"/>
      <line x1="19" y1="5" x2="19" y2="19"/>
    </svg>
  ),
  X: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

// ── Progress Ring ──────────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 160, stroke = 10, color = "#7c3aed", color2 = "#06b6d4" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const id = "grad" + Math.round(pct);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(124,58,237,0.12)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.35s ease" }} />
    </svg>
  );
}

// ── Steps Bar ─────────────────────────────────────────────────────────────────
function Steps({ current, total, D }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 4, flex: 1, borderRadius: 100,
          background: i < current
            ? `linear-gradient(90deg,${D.accent},${D.accent2})`
            : `rgba(124,58,237,0.15)`,
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ScanPage({ onDone }) {
  const { theme: D, isDark } = useTheme();
  const { t } = useLang();
  const S = makeStyles(D);

  const [step, setStep] = useState(1);

  // Step 1
  const [inputPath,  setInputPath]  = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [files,      setFiles]      = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef();

  // Step 2
  const [classifyBy, setClassifyBy] = useState("document_type");
  const classifyPresets = ["document_type", "profession", "department", "language", "date"];

  // Step 3
  const [knowsValues,   setKnowsValues]   = useState(null);
  const [allowedValues, setAllowedValues] = useState([]);
  const [newValue,      setNewValue]      = useState("");
  const [groupSimilar,  setGroupSimilar]  = useState(false);

  // Step 4
  const [extraFields, setExtraFields] = useState("");

  // Step 5
  const [industry, setIndustry] = useState("General");
  const industryPresets = ["General", "Healthcare", "Legal", "Finance", "Logistics", "HR", "Education", "Real Estate"];

  // Scan state
  const [scanning,    setScanning]    = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [processed,   setProcessed]   = useState(0);
  const [total,       setTotal]       = useState(0);
  const [errors,      setErrors]      = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [errorMsg,    setErrorMsg]    = useState("");
  const esRef = useRef(null);

  const label = {
    fontSize: 11, color: D.text3, letterSpacing: 1.4,
    textTransform: "uppercase", display: "block", marginBottom: 8,
    fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
  };

  const chip = (active) => ({
    padding: "8px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600,
    cursor: "pointer", transition: "all 0.2s", border: "1px solid",
    borderColor: active ? D.accent : D.glassBorder,
    background: active ? `${D.accent}22` : "transparent",
    color: active ? D.accent : D.text2,
  });

  const handleDrop = useCallback(e => {
    e.preventDefault(); setIsDragging(false);
    const f = Array.from(e.dataTransfer.files);
    setFiles(f);
    if (f.length && !inputPath)
      setInputPath(f[0].webkitRelativePath?.split("/")[0] || f[0].name + (f.length > 1 ? ` (+${f.length - 1})` : ""));
  }, [inputPath]);

  const addValue = () => {
    const v = newValue.trim();
    if (v && !allowedValues.includes(v)) setAllowedValues(prev => [...prev, v]);
    setNewValue("");
  };

  const startScan = async () => {
    setErrorMsg("");
    setScanning(true);
    setProgress(0); setProcessed(0); setErrors(0);

    const apiKey    = localStorage.getItem("vv_groq_key") || "";
    const modelPath = localStorage.getItem("vv_model_path") || "";
    const engine    = localStorage.getItem("vv_engine") || "cloud";
    const extraList = extraFields.split(",").map(f => f.trim().toLowerCase().replace(/\s+/g, "_")).filter(Boolean);

    try {
      const res = await fetch(`${API}/api/scan/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_path:     inputPath.trim(),
          output_path:    outputPath.trim(),
          engine,
          api_key:        apiKey,
          model_path:     modelPath,
          criteria:       [classifyBy],
          classify_by:    classifyBy,
          allowed_values: allowedValues.length ? allowedValues : null,
          group_similar:  groupSimilar,
          extra_fields:   extraList,
          industry,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to start scan");
      }

      const { job_id, total: t } = await res.json();
      setTotal(t);

      const es = new EventSource(`${API}/api/scan/${job_id}/progress`);
      esRef.current = es;
      es.onmessage = (e) => {
        const data = JSON.parse(e.data);
        setProgress(data.percent || 0);
        setProcessed(data.processed || 0);
        setTotal(data.total || t);
        setErrors(data.errors || 0);
        setCurrentFile(data.current || "");
        if (data.status === "done") {
          es.close();
          setTimeout(() => onDone({ total: data.total, success: data.success, errors: data.errors, output_path: outputPath.trim(), job_id }), 700);
        }
      };
      es.onerror = () => { es.close(); setErrorMsg("Lost connection to backend."); setScanning(false); };
    } catch (err) {
      setErrorMsg(err.message);
      setScanning(false);
    }
  };

  // ── Error box ────────────────────────────────────────────────────────────────
  const ErrorBox = ({ msg }) => msg ? (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: "#f87171", fontSize: 14 }}>
      <Icon.Alert size={16} />
      {msg}
    </div>
  ) : null;

  // ── Scanning UI ──────────────────────────────────────────────────────────────
  if (scanning) return (
    <div style={{ position: "relative", zIndex: 1, padding: "100px 32px 60px", maxWidth: 680, margin: "0 auto" }}>
      <div style={{ ...S.glassCard, padding: "52px 40px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative", marginBottom: 32 }}>
          <ProgressRing pct={progress} color={D.accent} color2={D.accent2} />
          <div style={{ position: "absolute", textAlign: "center" }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: D.text, lineHeight: 1, fontFamily: "'Rajdhani',sans-serif" }}>{progress}%</div>
            <div style={{ fontSize: 11, color: D.text3, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 2 }}>Processing</div>
          </div>
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 700, color: D.text, margin: "0 0 8px", fontFamily: "'Rajdhani',sans-serif" }}>Analyzing documents...</h3>
        {currentFile && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: D.text2, fontSize: 13, margin: "0 0 24px", opacity: 0.8 }}>
            <Icon.File size={14} color={D.text3} />
            {currentFile}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          {[["Total", total], ["Done", processed], ["Errors", errors]].map(([lbl, val]) => (
            <div key={lbl} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.55)", borderRadius: 12, padding: "16px 10px", border: `1px solid ${D.glassBorder}` }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: lbl === "Errors" && val > 0 ? "#f87171" : D.text, fontFamily: "'Rajdhani',sans-serif" }}>{val}</div>
              <div style={{ fontSize: 10, color: D.text3, marginTop: 5, letterSpacing: 1, textTransform: "uppercase" }}>{lbl}</div>
            </div>
          ))}
        </div>
        <div style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)", borderRadius: 100, height: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,${D.accent},${D.accent2})`, borderRadius: 100, transition: "width 0.35s ease" }} />
        </div>
      </div>
    </div>
  );

  // ── Wizard UI ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", zIndex: 1, padding: "100px 32px 60px", maxWidth: 680, margin: "0 auto" }}>
      <Steps current={step} total={5} D={D} />

      {/* STEP 1 — Folders */}
      {step === 1 && <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 6px" }}>
          <Icon.FolderOpen size={28} color={D.accent} />
          <h2 style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 800, letterSpacing: -1, margin: 0, color: D.text, fontFamily: "'Rajdhani',sans-serif" }}>Select Folders</h2>
        </div>
        <p style={{ color: D.text2, marginBottom: 28, fontSize: 15 }}>Where are your documents, and where should the output go?</p>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? D.accent2 : D.border}`, borderRadius: 18,
            padding: "40px 24px", textAlign: "center", cursor: "pointer", marginBottom: 24,
            background: isDragging ? `${D.accent2}10` : isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.40)",
            backdropFilter: "blur(10px)", transition: "all 0.2s",
          }}
        >
          <input ref={fileRef} type="file" multiple style={{ display: "none" }}
            onChange={e => { const f = Array.from(e.target.files); setFiles(f); if (f.length) setInputPath(f[0].name + (f.length > 1 ? ` (+${f.length - 1})` : "")); }} />

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <Icon.FolderIn size={48} color={isDragging ? D.accent2 : D.text3} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 15, color: D.text, margin: "0 0 4px" }}>Drop folder or files here</p>
          <p style={{ color: D.text3, fontSize: 13, margin: 0 }}>or click to browse</p>
          {files.length > 0 && (
            <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: `${D.accent}18`, border: `1px solid ${D.accent}44` }}>
              <Icon.Check size={13} color={D.accent} />
              <span style={{ color: D.accent, fontWeight: 700, fontSize: 13 }}>{files.length} files ready</span>
            </div>
          )}
        </div>

        {/* Path inputs */}
        <div style={{ display: "grid", gap: 16, marginBottom: 28 }}>
          {[
            { lbl: "Input Folder",  val: inputPath,  set: setInputPath,  ph: "C:\\Users\\...\\my_documents",  Ico: Icon.Folder },
            { lbl: "Output Folder", val: outputPath, set: setOutputPath, ph: "C:\\Users\\...\\sorted_output", Ico: Icon.FolderIn },
          ].map(({ lbl, val, set, ph, Ico }) => (
            <div key={lbl}>
              <span style={label}>{lbl}</span>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex", alignItems: "center" }}>
                  <Ico size={16} color={D.text3} />
                </span>
                <input style={{ ...S.inputStyle, paddingLeft: 40 }} value={val} onChange={e => set(e.target.value)} placeholder={ph} />
              </div>
            </div>
          ))}
        </div>

        <ErrorBox msg={errorMsg} />
        <button onClick={() => setStep(2)} disabled={!inputPath || !outputPath}
          style={{ ...S.primaryBtn, width: "100%", padding: "14px", fontSize: 15, opacity: (!inputPath || !outputPath) ? 0.45 : 1 }}>
          Next →
        </button>
      </>}

      {/* STEP 2 — Classify by */}
      {step === 2 && <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 6px" }}>
          <Icon.Layers size={28} color={D.accent} />
          <h2 style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 800, letterSpacing: -1, margin: 0, color: D.text, fontFamily: "'Rajdhani',sans-serif" }}>Classify By</h2>
        </div>
        <p style={{ color: D.text2, marginBottom: 24, fontSize: 15 }}>What field should documents be sorted into folders by?</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          {classifyPresets.map(p => <button key={p} onClick={() => setClassifyBy(p)} style={chip(classifyBy === p)}>{p}</button>)}
        </div>
        <span style={label}>Or type a custom field</span>
        <input style={{ ...S.inputStyle, marginBottom: 28 }} value={classifyBy}
          onChange={e => setClassifyBy(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
          placeholder="e.g. contract_type, pay_period..." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={() => setStep(1)} style={{ ...S.ghostBtn, padding: "14px" }}>← Back</button>
          <button onClick={() => setStep(3)} disabled={!classifyBy} style={{ ...S.primaryBtn, padding: "14px", opacity: !classifyBy ? 0.45 : 1 }}>Next →</button>
        </div>
      </>}

      {/* STEP 3 — Allowed values */}
      {step === 3 && <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 6px" }}>
          <Icon.Target size={28} color={D.accent} />
          <h2 style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 800, letterSpacing: -1, margin: 0, color: D.text, fontFamily: "'Rajdhani',sans-serif" }}>Possible Values</h2>
        </div>
        <p style={{ color: D.text2, marginBottom: 24, fontSize: 15 }}>Do you know the possible values for <strong style={{ color: D.accent }}>{classifyBy}</strong>?</p>

        <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
          {[
            { key: "yes",  Ico: Icon.Check,   title: "Yes, I'll list them",      desc: "Locks output to exact values — most accurate" },
            { key: "no",   Ico: Icon.Shuffle,  title: "No, let the model decide", desc: "AI picks freely, optionally groups similar values" },
            { key: "skip", Ico: Icon.Skip,     title: "Skip — no constraint",     desc: "Free text, no grouping" },
          ].map(({ key, Ico, title, desc }) => (
            <div key={key} onClick={() => setKnowsValues(key)} style={{
              padding: "16px 20px", borderRadius: 14, cursor: "pointer", transition: "all 0.2s",
              border: `1.5px solid ${knowsValues === key ? D.accent : D.glassBorder}`,
              background: knowsValues === key ? `${D.accent}12` : isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.4)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 15, color: D.text, marginBottom: 3 }}>
                <Ico size={16} color={knowsValues === key ? D.accent : D.text3} />
                {title}
              </div>
              <div style={{ fontSize: 13, color: D.text3, paddingLeft: 26 }}>{desc}</div>
            </div>
          ))}
        </div>

        {knowsValues === "yes" && (
          <div style={{ ...S.glassCard, padding: "20px", marginBottom: 20 }}>
            <span style={label}>Add values for "{classifyBy}"</span>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <input style={{ ...S.inputStyle, flex: 1 }} value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addValue()}
                placeholder="e.g. Invoice, CV, Contract..." />
              <button onClick={addValue} style={{ ...S.primaryBtn, padding: "10px 18px" }}>+ Add</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {allowedValues.map(v => (
                <div key={v} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 100, background: `${D.accent}18`, border: `1px solid ${D.accent}44` }}>
                  <span style={{ color: D.accent, fontSize: 13, fontWeight: 600 }}>{v}</span>
                  <span onClick={() => setAllowedValues(prev => prev.filter(x => x !== v))}
                    style={{ color: D.text3, cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <Icon.X size={12} color={D.text3} />
                  </span>
                </div>
              ))}
              {allowedValues.length === 0 && <span style={{ color: D.text3, fontSize: 13 }}>No values added yet — press Enter or click Add</span>}
            </div>
          </div>
        )}

        {knowsValues === "no" && (
          <div style={{ ...S.glassCard, padding: "20px", marginBottom: 20 }}>
            <span style={label}>Group similar values into the same folder?</span>
            <p style={{ color: D.text3, fontSize: 13, marginBottom: 14 }}>"Farm Manager" and "Farm Supervisor" → one folder</p>
            <div style={{ display: "flex", gap: 10 }}>
              {[["Yes, group them", true], ["No, keep separate", false]].map(([lbl, val]) => (
                <button key={lbl} onClick={() => setGroupSimilar(val)} style={chip(groupSimilar === val)}>{lbl}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={() => setStep(2)} style={{ ...S.ghostBtn, padding: "14px" }}>← Back</button>
          <button onClick={() => setStep(4)} disabled={!knowsValues || (knowsValues === "yes" && allowedValues.length === 0)}
            style={{ ...S.primaryBtn, padding: "14px", opacity: (!knowsValues || (knowsValues === "yes" && allowedValues.length === 0)) ? 0.45 : 1 }}>
            Next →
          </button>
        </div>
      </>}

      {/* STEP 4 — Extra fields */}
      {step === 4 && <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 6px" }}>
          <Icon.Plus size={28} color={D.accent} />
          <h2 style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 800, letterSpacing: -1, margin: 0, color: D.text, fontFamily: "'Rajdhani',sans-serif" }}>Extra Fields</h2>
        </div>
        <p style={{ color: D.text2, marginBottom: 12, fontSize: 15 }}>Any other fields to extract besides <strong style={{ color: D.accent }}>{classifyBy}</strong>?</p>
        <p style={{ color: D.text3, fontSize: 13, marginBottom: 20 }}>Examples: name, date, email, total_amount, department, salary</p>
        <span style={label}>Fields (comma-separated) — leave blank to skip</span>
        <input style={{ ...S.inputStyle, marginBottom: 14 }} value={extraFields}
          onChange={e => setExtraFields(e.target.value)} placeholder="e.g. name, date, total_amount" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
          {["name", "date", "email", "total_amount", "department", "salary", "city", "language"].map(f => (
            <button key={f} onClick={() => {
              const cur = extraFields.split(",").map(x => x.trim()).filter(Boolean);
              if (!cur.includes(f)) setExtraFields([...cur, f].join(", "));
            }} style={{ ...chip(extraFields.includes(f)), fontSize: 12, padding: "5px 12px" }}>+ {f}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={() => setStep(3)} style={{ ...S.ghostBtn, padding: "14px" }}>← Back</button>
          <button onClick={() => setStep(5)} style={{ ...S.primaryBtn, padding: "14px" }}>Next →</button>
        </div>
      </>}

      {/* STEP 5 — Industry + summary */}
      {step === 5 && <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 6px" }}>
          <Icon.Building size={28} color={D.accent} />
          <h2 style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 800, letterSpacing: -1, margin: 0, color: D.text, fontFamily: "'Rajdhani',sans-serif" }}>Industry Context</h2>
        </div>
        <p style={{ color: D.text2, marginBottom: 20, fontSize: 15 }}>Helps the AI understand your documents better.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          {industryPresets.map(ind => <button key={ind} onClick={() => setIndustry(ind)} style={chip(industry === ind)}>{ind}</button>)}
        </div>
        <span style={label}>Or type a custom industry</span>
        <input style={{ ...S.inputStyle, marginBottom: 24 }} value={industry}
          onChange={e => setIndustry(e.target.value)} placeholder="e.g. Agriculture, Manufacturing..." />

        {/* Summary card */}
        <div style={{ ...S.glassCard, padding: "20px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: D.text3, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, marginBottom: 12 }}>
            <Icon.List size={14} color={D.text3} />
            Scan Summary
          </div>
          {[
            [<Icon.FolderOpen size={14} color={D.text3} />,  "Input",       inputPath],
            [<Icon.FolderIn   size={14} color={D.text3} />,  "Output",      outputPath],
            [<Icon.Layers     size={14} color={D.text3} />,  "Classify by", classifyBy],
            [<Icon.Target     size={14} color={D.text3} />,  "Values",      allowedValues.length ? allowedValues.join(", ") : knowsValues === "no" ? `Free (${groupSimilar ? "grouped" : "separate"})` : "Free"],
            [<Icon.Plus       size={14} color={D.text3} />,  "Extra fields",extraFields || "None"],
            [<Icon.Building   size={14} color={D.text3} />,  "Industry",    industry],
          ].map(([ico, k, v], i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8, fontSize: 13 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: D.text3, minWidth: 130, flexShrink: 0 }}>{ico} {k}</span>
              <span style={{ color: D.text, fontWeight: 600, wordBreak: "break-all" }}>{v}</span>
            </div>
          ))}
        </div>

        <ErrorBox msg={errorMsg} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={() => setStep(4)} style={{ ...S.ghostBtn, padding: "14px" }}>← Back</button>
          <button onClick={startScan} style={{ ...S.primaryBtn, padding: "14px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon.Rocket size={16} color="#fff" />
            Start Scan
          </button>
        </div>
      </>}
    </div>
  );
}
