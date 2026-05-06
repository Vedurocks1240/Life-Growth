"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Shield, LogOut, Clock, Smartphone, TrendingUp,
  AlertCircle, Loader2, Zap, Lock, Download,
  FileText, FileJson, ChevronDown, Table2, BarChart2,
} from "lucide-react";

// ── SHA-256 (mirrors Android exactly) ────────────────────────
async function computePasswordHash(password, username) {
  const salt = username.split("").reverse().join("") + "LifeGrowth_2024";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password + salt));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

// ── Device detection ──────────────────────────────────────────
function useDevice() {
  const [device, setDevice] = useState("desktop");
  useEffect(() => {
    const check = () => setDevice(window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop");
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return device;
}

// ── Tooltip ───────────────────────────────────────────────────
function OrangeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0f0f0f", border:"0.5px solid rgba(255,87,34,0.35)", borderRadius:8, padding:"8px 14px", fontFamily:"monospace", fontSize:12 }}>
      <p style={{ color:"#666", marginBottom:4 }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color:"#FF5722" }}>{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  );
}

// ── Radial gauge ──────────────────────────────────────────────
function IdleWorthGauge({ score, size = 120 }) {
  const r = size * 0.4, cx = size/2, cy = size/2;
  const circ = 2 * Math.PI * r, pct = Math.min(score/10,1);
  const dash = pct * circ;
  const color = score >= 8 ? "#FF5722" : score >= 6 ? "#FF9800" : "#F44336";
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size*0.063}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size*0.063}
          strokeDasharray={`${dash.toFixed(2)} ${(circ-dash).toFixed(2)}`}
          strokeDashoffset={(circ*0.25).toFixed(2)} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition:"stroke-dasharray 1s ease" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:size*0.19, fontWeight:700, fontFamily:"monospace", color, lineHeight:1 }}>{score.toFixed(1)}</span>
        <span style={{ fontSize:size*0.09, fontFamily:"monospace", color:"#444" }}>/10</span>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, icon, compact }) {
  return (
    <div style={{ background:"#0a0a0a", border:"0.5px solid rgba(255,255,255,0.07)", borderRadius:12, padding: compact ? "14px 16px" : "18px 20px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
        <span style={{ color:"#555" }}>{icon}</span>
        <span style={{ fontFamily:"monospace", fontSize:9, letterSpacing:"1.5px", color:"#555" }}>{label}</span>
      </div>
      <div style={{ fontSize: compact ? 26 : 30, fontWeight:700, fontFamily:"monospace", color: accent||"#fff", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontFamily:"monospace", fontSize:10, color:"#444", marginTop:5 }}>{sub}</div>}
    </div>
  );
}

// ── Export helpers ────────────────────────────────────────────
function dl(blob, name) {
  const u = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u);
}

function doJSON(stats, appUsage, profile) {
  dl(new Blob([JSON.stringify({
    exportedAt: new Date().toISOString(),
    user: { username:profile?.username, level:profile?.level, monthlyScore:profile?.monthlyScore },
    dailyStats: stats,
    appUsageBreakdown: appUsage,
  }, null, 2)], { type:"application/json" }), "life-growth-logs.json");
}

function doCSV(stats, appUsage) {
  const rows = [
    ["=== DAILY STATS ==="],
    ["Date","Screen Time (min)","Screen Time (h:m)","Unlocks","IdleWorth Score","AI Insight"],
    ...stats.map(s => [s.date, s.screenTimeMinutes, `${Math.floor(s.screenTimeMinutes/60)}h ${s.screenTimeMinutes%60}m`, s.unlockCount, s.idleWorthScore, `"${(s.aiInsight||"").replace(/"/g,'""')}"`]),
    [],
    ["=== APP USAGE (last 7 days) ==="],
    ["Category","Usage (min)","Usage (h:m)"],
    ...appUsage.map(a => [a.category, a.usageTimeMinutes, `${Math.floor(a.usageTimeMinutes/60)}h ${a.usageTimeMinutes%60}m`]),
  ];
  dl(new Blob([rows.map(r=>r.join(",")).join("\n")], { type:"text/csv" }), "life-growth-logs.csv");
}

function doHTML(stats, appUsage, profile) {
  const sRows = stats.map(s=>`<tr>
    <td>${s.date}</td>
    <td>${s.screenTimeMinutes}m <span class="sub">(${Math.floor(s.screenTimeMinutes/60)}h ${s.screenTimeMinutes%60}m)</span></td>
    <td>${s.unlockCount}</td>
    <td class="score ${s.idleWorthScore>=8?"g":s.idleWorthScore>=6?"y":"r"}">${s.idleWorthScore}</td>
    <td class="ins">${s.aiInsight||"—"}</td></tr>`).join("");
  const aRows = appUsage.map(a=>`<tr><td>${a.category}</td><td>${a.usageTimeMinutes}m</td><td>${Math.floor(a.usageTimeMinutes/60)}h ${a.usageTimeMinutes%60}m</td></tr>`).join("");
  dl(new Blob([`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Life Growth — Activity Log</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#000;color:#fff;font-family:'Courier New',monospace;padding:2rem;max-width:960px;margin:auto}
h1{color:#FF5722;font-size:2rem;margin-bottom:.3rem;letter-spacing:-1px}.meta{color:#555;font-size:.8rem;margin-bottom:2rem}
.meta span{color:#FF5722}h2{color:#666;font-size:.65rem;letter-spacing:2.5px;margin:2rem 0 .75rem;padding-bottom:.5rem;border-bottom:0.5px solid #1a1a1a}
table{width:100%;border-collapse:collapse;font-size:.85rem;margin-bottom:1rem}th{text-align:left;padding:.6rem .8rem;background:#0a0a0a;color:#444;font-size:.6rem;letter-spacing:1.5px;border-bottom:1px solid #1a1a1a}
td{padding:.65rem .8rem;border-bottom:0.5px solid #0d0d0d;color:#888;vertical-align:top}tr:hover td{background:#050505}
.score{font-weight:700;font-size:.95rem}.g{color:#FF5722}.y{color:#FF9800}.r{color:#F44336}
.ins{color:#555;font-size:.78rem;max-width:380px;line-height:1.5}.sub{color:#444;font-size:.72rem}
footer{color:#2a2a2a;font-size:.65rem;margin-top:3rem;text-align:center;letter-spacing:1px}
</style></head><body>
<h1>⚡ Life Growth</h1>
<div class="meta">Activity Report for <span>@${profile?.username||"user"}</span> · Level <span>${profile?.level||1}</span> · Monthly Score <span>${profile?.monthlyScore||"—"}</span> · Generated <span>${new Date().toLocaleString()}</span></div>
<h2>DAILY STATS</h2>
<table><thead><tr><th>DATE</th><th>SCREEN TIME</th><th>UNLOCKS</th><th>IDLEWORTH</th><th>AI INSIGHT</th></tr></thead><tbody>${sRows}</tbody></table>
<h2>APP USAGE — LAST 7 DAYS</h2>
<table><thead><tr><th>CATEGORY</th><th>MINUTES</th><th>HOURS</th></tr></thead><tbody>${aRows}</tbody></table>
<footer>LIFE GROWTH · DISCIPLINE TRACKER · life-growth-web.vercel.app</footer>
</body></html>`], { type:"text/html" }), "life-growth-report.html");
}

// ── Export dropdown ───────────────────────────────────────────
function ExportButton({ stats, appUsage, profile, compact }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const opts = [
    { label:"JSON", desc:"Raw data", icon:<FileJson size={15}/>, fn:() => doJSON(stats, appUsage, profile) },
    { label:"CSV / Excel", desc:"Spreadsheet", icon:<Table2 size={15}/>, fn:() => doCSV(stats, appUsage) },
    { label:"HTML Report", desc:"Styled report", icon:<FileText size={15}/>, fn:() => doHTML(stats, appUsage, profile) },
  ];

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={() => setOpen(o=>!o)} style={{
        display:"flex", alignItems:"center", gap:6,
        background:"rgba(255,87,34,0.1)", border:"0.5px solid rgba(255,87,34,0.35)",
        borderRadius:8, padding: compact ? "9px 12px" : "8px 14px",
        color:"#FF5722", fontFamily:"inherit", fontSize:12,
        cursor:"pointer", fontWeight:600, letterSpacing:"0.2px", whiteSpace:"nowrap",
      }}>
        <Download size={13}/>
        {compact ? "Export" : "Export Logs"}
        <ChevronDown size={11} style={{ transform:open?"rotate(180deg)":"none", transition:"transform 0.2s" }}/>
      </button>

      {open && (
        <div style={{
          position:"absolute", right:0, top:"calc(100% + 8px)", zIndex:200,
          background:"#0f0f0f", border:"0.5px solid rgba(255,255,255,0.1)",
          borderRadius:10, overflow:"hidden", minWidth:210,
          boxShadow:"0 12px 40px rgba(0,0,0,0.8)",
        }}>
          <div style={{ padding:"10px 14px 8px", borderBottom:"0.5px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontFamily:"monospace", fontSize:9, letterSpacing:"1.5px", color:"#444" }}>DOWNLOAD ACTIVITY LOGS</span>
          </div>
          {opts.map(o => (
            <button key={o.label} onClick={() => { o.fn(); setOpen(false); }} style={{
              display:"flex", alignItems:"center", gap:12, width:"100%",
              padding:"11px 16px", background:"none", border:"none",
              color:"#777", fontFamily:"inherit", fontSize:13,
              cursor:"pointer", textAlign:"left",
              borderBottom:"0.5px solid rgba(255,255,255,0.04)",
              transition:"all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background="#1a1a1a"; e.currentTarget.style.color="#FF5722"; }}
            onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.color="#777"; }}>
              <span style={{ color:"#FF5722", flexShrink:0 }}>{o.icon}</span>
              <div>
                <div style={{ fontWeight:600 }}>{o.label}</div>
                <div style={{ fontSize:10, color:"#444", fontFamily:"monospace", marginTop:1 }}>{o.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const device    = useDevice();
  const isMobile  = device === "mobile";
  const isTablet  = device === "tablet";
  const gap       = isMobile ? 12 : 16;
  const gaugeSize = isMobile ? 100 : 128;

  const [screen, setScreen]       = useState("login");
  const [form, setForm]           = useState({ username:"", password:"" });
  const [formError, setFormError] = useState("");
  const [busy, setBusy]           = useState(false);
  const [profile, setProfile]     = useState(null);
  const [usageData, setUsageData] = useState({ stats:[], appUsage:[] });

  async function handleLogin(e) {
    e.preventDefault();
    setFormError("");
    const { username, password } = form;
    if (!username.trim() || !password) return setFormError("Username and password are required.");
    setBusy(true);
    try {
      const passwordHash = await computePasswordHash(password, username.trim().toLowerCase());
      const res = await fetch("/api/auth/login", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), passwordHash }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error||"Login failed."); setBusy(false); return; }
      setProfile(data);
      setScreen("loading");
      const ur = await fetch(`/api/sync/usage?userId=${data.userId}&days=30`);
      const uj = await ur.json();
      if (!ur.ok || !uj.stats?.length) { setScreen("nodata"); setBusy(false); return; }
      setUsageData(uj);
      setScreen("dash");
    } catch { setFormError("Network error — check your connection."); }
    finally { setBusy(false); }
  }

  function handleLogout() {
    setProfile(null); setUsageData({ stats:[], appUsage:[] });
    setForm({ username:"", password:"" }); setFormError(""); setScreen("login");
  }

  const today        = usageData.stats[usageData.stats.length-1] ?? {};
  const currentScore = today.idleWorthScore ?? profile?.monthlyScore ?? 0;

  // ── CSS reset + animations ────────────────────────────────
  const globalStyle = `
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    .fu{animation:fadeUp 0.35s ease both}
    .fu2{animation:fadeUp 0.35s ease 0.1s both}
    .fu3{animation:fadeUp 0.35s ease 0.2s both}
    .fu4{animation:fadeUp 0.35s ease 0.3s both}
    input{transition:border-color 0.2s}
    input:focus{border-color:rgba(255,87,34,0.5)!important;outline:none}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
    button{transition:opacity 0.15s,background 0.15s}
  `;

  // ════════════════════════════════════════════════════════════
  // LOGIN
  // ════════════════════════════════════════════════════════════
  if (screen === "login") return (
    <>
      <style>{globalStyle}</style>
      <div style={{ minHeight:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding: isMobile ? "24px 20px" : "40px 24px", position:"relative", overflow:"hidden" }}>
        {/* ambient glow */}
        <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:600, height:300, background:"radial-gradient(ellipse at center top, rgba(255,87,34,0.07), transparent 70%)", pointerEvents:"none" }}/>

        {/* Logo */}
        <div className="fu" style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:36 }}>
          <div style={{ width:56, height:56, background:"#FF5722", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16, boxShadow:"0 0 40px rgba(255,87,34,0.25)" }}>
            <Shield size={28} color="#fff"/>
          </div>
          <h1 style={{ fontSize: isMobile?28:32, fontWeight:800, color:"#fff", letterSpacing:"-1px", lineHeight:1 }}>Life Growth</h1>
          <p style={{ fontFamily:"monospace", fontSize:10, letterSpacing:"3px", color:"#444", marginTop:6 }}>DISCIPLINE TRACKER</p>
        </div>

        {/* Card */}
        <div className="fu2" style={{ width:"100%", maxWidth: isMobile ? "100%" : 400, background:"#080808", border:"0.5px solid rgba(255,255,255,0.08)", borderRadius:16, padding: isMobile ? "28px 24px" : "36px 32px" }}>
          <p style={{ fontFamily:"monospace", fontSize:10, letterSpacing:"2px", color:"#444", marginBottom:24 }}>SIGN IN TO DASHBOARD</p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontFamily:"monospace", fontSize:10, letterSpacing:"1.5px", color:"#555", marginBottom:8 }}>USERNAME</label>
              <input type="text" autoComplete="username" spellCheck={false}
                value={form.username}
                onChange={e => setForm(s=>({...s,username:e.target.value}))}
                placeholder="your_username"
                style={{ width:"100%", background:"#0f0f0f", border:"0.5px solid rgba(255,255,255,0.1)", borderRadius:10, padding: isMobile?"14px 16px":"13px 16px", fontFamily:"monospace", fontSize:14, color:"#fff" }}/>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontFamily:"monospace", fontSize:10, letterSpacing:"1.5px", color:"#555", marginBottom:8 }}>PASSWORD</label>
              <input type="password" autoComplete="current-password"
                value={form.password}
                onChange={e => setForm(s=>({...s,password:e.target.value}))}
                placeholder="••••••••"
                style={{ width:"100%", background:"#0f0f0f", border:"0.5px solid rgba(255,255,255,0.1)", borderRadius:10, padding: isMobile?"14px 16px":"13px 16px", fontFamily:"monospace", fontSize:14, color:"#fff" }}/>
            </div>

            {formError && (
              <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,87,34,0.08)", border:"0.5px solid rgba(255,87,34,0.25)", borderRadius:8, padding:"10px 12px", marginBottom:16 }}>
                <AlertCircle size={14} color="#FF5722" style={{ flexShrink:0 }}/>
                <span style={{ fontFamily:"monospace", fontSize:12, color:"#FF5722" }}>{formError}</span>
              </div>
            )}

            <button type="submit" disabled={busy} style={{
              width:"100%", background: busy?"#1a0d08":"#FF5722", color:"#fff",
              border:"none", borderRadius:10, padding: isMobile?"16px":"14px",
              fontSize:15, fontWeight:600, cursor: busy?"default":"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              {busy ? <><Loader2 size={16} style={{ animation:"spin 1s linear infinite" }}/> Authenticating...</> : <><Lock size={15}/> Access Dashboard</>}
            </button>
          </form>

          <p style={{ textAlign:"center", fontFamily:"monospace", fontSize:10, color:"#2a2a2a", marginTop:20 }}>
            USE YOUR LIFE GROWTH ANDROID CREDENTIALS
          </p>
        </div>

        {/* Device hint */}
        <p className="fu3" style={{ marginTop:20, fontFamily:"monospace", fontSize:10, color:"#2a2a2a", letterSpacing:"1px" }}>
          {isMobile ? "📱 MOBILE" : isTablet ? "📟 TABLET" : "🖥 DESKTOP"} VIEW
        </p>
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════
  if (screen === "loading") return (
    <>
      <style>{globalStyle}</style>
      <div style={{ minHeight:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
        <Loader2 size={28} color="#FF5722" style={{ animation:"spin 1s linear infinite" }}/>
        <p style={{ fontFamily:"monospace", fontSize:12, color:"#444", letterSpacing:"1px" }}>FETCHING YOUR DATA...</p>
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════════
  // NO DATA
  // ════════════════════════════════════════════════════════════
  if (screen === "nodata") return (
    <>
      <style>{globalStyle}</style>
      <div style={{ minHeight:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, padding:24 }}>
        <div style={{ width:64, height:64, background:"#0a0a0a", border:"0.5px solid rgba(255,255,255,0.08)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Zap size={24} color="#333"/>
        </div>
        <div style={{ textAlign:"center" }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#fff", marginBottom:8 }}>No data synced yet</h2>
          <p style={{ fontFamily:"monospace", fontSize:12, color:"#444", lineHeight:1.7 }}>Open the Life Growth app and start<br/>tracking to see your stats here.</p>
        </div>
        <button onClick={handleLogout} style={{ background:"#0f0f0f", border:"0.5px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"10px 20px", color:"#666", fontFamily:"monospace", fontSize:12, cursor:"pointer" }}>
          ← Back to Login
        </button>
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════════════════════════
  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ background:"#000", minHeight:"100vh", paddingBottom:48 }}>

        {/* ── HEADER ── */}
        <header style={{
          position:"sticky", top:0, zIndex:50,
          background:"rgba(8,8,8,0.95)", backdropFilter:"blur(12px)",
          borderBottom:"0.5px solid rgba(255,255,255,0.06)",
          padding: isMobile ? "12px 16px" : "12px 28px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, background:"#FF5722", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Shield size={15} color="#fff"/>
            </div>
            {!isMobile && <span style={{ fontSize:15, fontWeight:700, color:"#fff", letterSpacing:"-0.3px" }}>Life Growth</span>}
            <span style={{ fontFamily:"monospace", fontSize:10, background:"rgba(255,87,34,0.12)", color:"#FF5722", border:"0.5px solid rgba(255,87,34,0.3)", borderRadius:100, padding:"3px 10px", letterSpacing:"0.5px" }}>
              LVL {profile?.level}
            </span>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap: isMobile?8:12 }}>
            <ExportButton stats={usageData.stats} appUsage={usageData.appUsage} profile={profile} compact={isMobile}/>
            {!isMobile && (
              <span style={{ fontFamily:"monospace", fontSize:11, color:"#444", background:"#0f0f0f", border:"0.5px solid rgba(255,255,255,0.07)", borderRadius:8, padding:"6px 10px" }}>
                @{profile?.username}
              </span>
            )}
            <button onClick={handleLogout} style={{
              display:"flex", alignItems:"center", gap:6, background:"none",
              border:"0.5px solid rgba(255,255,255,0.08)", borderRadius:8,
              padding: isMobile?"9px":"7px 14px", color:"#555", fontFamily:"inherit", fontSize:12, cursor:"pointer",
            }}>
              <LogOut size={13}/>{!isMobile && " Logout"}
            </button>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <div style={{ maxWidth:1200, margin:"0 auto", padding: isMobile?"16px":isTablet?"20px 24px":"24px 32px", display:"flex", flexDirection:"column", gap }}>

          {/* ── USERNAME banner (mobile) ── */}
          {isMobile && (
            <div className="fu" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontFamily:"monospace", fontSize:12, color:"#444" }}>@{profile?.username}</span>
              <span style={{ fontFamily:"monospace", fontSize:10, color:"#333" }}>Monthly: <span style={{ color:"#FF5722" }}>{profile?.monthlyScore?.toFixed(1)}</span></span>
            </div>
          )}

          {/* ── SCORE + STAT CARDS ── */}
          <div className="fu" style={{
            display:"grid", gap,
            gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "2fr 1fr 1fr" : "2.5fr 1fr 1fr",
          }}>
            {/* IdleWorth — full width on mobile */}
            <div style={{
              gridColumn: isMobile ? "1 / -1" : "1",
              background:"#0a0a0a", border:"0.5px solid rgba(255,255,255,0.07)",
              borderRadius:12, padding: isMobile?"16px 18px":"20px 22px",
              display:"flex", alignItems:"center", gap: isMobile?14:20,
            }}>
              <IdleWorthGauge score={currentScore} size={gaugeSize}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontFamily:"monospace", fontSize:9, letterSpacing:"1.5px", color:"#555", marginBottom:6 }}>IDLEWORTH SCORE</p>
                <div style={{ display:"flex", alignItems:"baseline", gap:4, flexWrap:"wrap" }}>
                  <span style={{ fontSize: isMobile?32:40, fontWeight:800, fontFamily:"monospace", color:"#FF5722", lineHeight:1 }}>{currentScore.toFixed(1)}</span>
                  <span style={{ fontFamily:"monospace", fontSize:14, color:"#333" }}>/10.0</span>
                </div>
                <p style={{ fontFamily:"monospace", fontSize:10, color:"#444", marginTop:5 }}>
                  Monthly avg: <span style={{ color:"#FF5722" }}>{profile?.monthlyScore?.toFixed(1)}</span>
                </p>
                {today.aiInsight && !isMobile && (
                  <p style={{ fontSize:12, color:"#555", marginTop:8, lineHeight:1.6, maxWidth:280 }}>{today.aiInsight}</p>
                )}
              </div>
            </div>

            <StatCard label="SCREEN TIME" icon={<Clock size={12}/>}
              value={`${today.screenTimeMinutes ?? "—"}m`}
              sub={today.screenTimeMinutes ? `${Math.floor(today.screenTimeMinutes/60)}h ${today.screenTimeMinutes%60}m today` : null}
              compact={isMobile}/>
            <StatCard label="UNLOCKS" icon={<Smartphone size={12}/>}
              value={today.unlockCount ?? "—"} sub="times today"
              accent="#FF5722" compact={isMobile}/>
          </div>

          {/* ── AI INSIGHT (mobile only) ── */}
          {isMobile && today.aiInsight && (
            <div className="fu2" style={{ background:"#0a0a0a", border:"0.5px solid rgba(255,87,34,0.12)", borderRadius:12, padding:"14px 16px" }}>
              <p style={{ fontFamily:"monospace", fontSize:9, letterSpacing:"1.5px", color:"#555", marginBottom:6 }}>AI INSIGHT — TODAY</p>
              <p style={{ fontSize:13, color:"#777", lineHeight:1.6 }}>{today.aiInsight}</p>
            </div>
          )}

          {/* ── CHARTS ── */}
          <div className="fu3" style={{
            display:"grid", gap,
            gridTemplateColumns: isMobile || isTablet ? "1fr" : "3fr 2fr",
          }}>
            {/* Line */}
            <div style={{ background:"#0a0a0a", border:"0.5px solid rgba(255,255,255,0.07)", borderRadius:12, padding: isMobile?"14px":"20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <TrendingUp size={13} color="#FF5722"/>
                <span style={{ fontFamily:"monospace", fontSize:9, letterSpacing:"1.5px", color:"#555" }}>IDLEWORTH TREND</span>
                <span style={{ marginLeft:"auto", fontFamily:"monospace", fontSize:9, background:"rgba(255,87,34,0.1)", color:"#FF5722", border:"0.5px solid rgba(255,87,34,0.2)", borderRadius:100, padding:"2px 7px" }}>LIVE</span>
              </div>
              <ResponsiveContainer width="100%" height={isMobile?150:190}>
                <LineChart data={usageData.stats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                  <XAxis dataKey="date" tick={{ fill:"#444", fontSize: isMobile?9:10, fontFamily:"monospace" }} tickFormatter={v=>v?.slice(5)}/>
                  <YAxis domain={[4,10]} tick={{ fill:"#444", fontSize: isMobile?9:10, fontFamily:"monospace" }}/>
                  <Tooltip content={<OrangeTooltip/>}/>
                  <Line type="monotone" dataKey="idleWorthScore" name="Score"
                    stroke="#FF5722" strokeWidth={2}
                    dot={{ fill:"#FF5722", r: isMobile?3:4 }} activeDot={{ r:6 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Bar */}
            <div style={{ background:"#0a0a0a", border:"0.5px solid rgba(255,255,255,0.07)", borderRadius:12, padding: isMobile?"14px":"20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <BarChart2 size={13} color="#FF5722"/>
                <span style={{ fontFamily:"monospace", fontSize:9, letterSpacing:"1.5px", color:"#555" }}>USAGE BY CATEGORY</span>
              </div>
              <ResponsiveContainer width="100%" height={isMobile?150:190}>
                <BarChart data={usageData.appUsage} layout={isMobile?"vertical":"horizontal"}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                  {isMobile
                    ? <><XAxis type="number" tick={{ fill:"#444",fontSize:9,fontFamily:"monospace" }}/><YAxis type="category" dataKey="category" tick={{ fill:"#555",fontSize:9,fontFamily:"monospace" }} width={75}/></>
                    : <><XAxis dataKey="category" tick={{ fill:"#444",fontSize:9,fontFamily:"monospace" }}/><YAxis tick={{ fill:"#444",fontSize:9,fontFamily:"monospace" }}/></>
                  }
                  <Tooltip content={<OrangeTooltip/>}/>
                  <Bar dataKey="usageTimeMinutes" name="Minutes" fill="#FF5722" radius={isMobile?[0,4,4,0]:[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── ACTIVITY LOG ── */}
          <div className="fu4" style={{ background:"#0a0a0a", border:"0.5px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding: isMobile?"12px 16px":"14px 20px", borderBottom:"0.5px solid rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontFamily:"monospace", fontSize:9, letterSpacing:"1.5px", color:"#555" }}>ACTIVITY LOG — ALL TIME</span>
              <span style={{ fontFamily:"monospace", fontSize:10, color:"#333" }}>{usageData.stats.length} entries</span>
            </div>

            {isMobile ? (
              /* ── MOBILE: card list ── */
              <div>
                {[...usageData.stats].reverse().map((s,i) => (
                  <div key={s.date} style={{ padding:"14px 16px", borderBottom: i < usageData.stats.length-1 ? "0.5px solid rgba(255,255,255,0.04)":"none" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color: s.idleWorthScore>=8?"#FF5722":s.idleWorthScore>=6?"#FF9800":"#F44336" }}>
                        {s.idleWorthScore} <span style={{ color:"#333", fontWeight:400, fontSize:11 }}>/10</span>
                      </span>
                      <span style={{ fontFamily:"monospace", fontSize:11, color:"#3a3a3a" }}>{s.date}</span>
                    </div>
                    <div style={{ display:"flex", gap:16, marginBottom:6 }}>
                      <span style={{ fontFamily:"monospace", fontSize:11, color:"#555" }}>📱 {s.unlockCount}×</span>
                      <span style={{ fontFamily:"monospace", fontSize:11, color:"#555" }}>⏱ {s.screenTimeMinutes}m</span>
                    </div>
                    {s.aiInsight && <p style={{ fontSize:12, color:"#555", lineHeight:1.55 }}>{s.aiInsight}</p>}
                  </div>
                ))}
              </div>
            ) : (
              /* ── TABLET/DESKTOP: table ── */
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      {["DATE","SCREEN TIME","UNLOCKS","IDLEWORTH","AI INSIGHT"].map(h=>(
                        <th key={h} style={{ textAlign:"left", padding:"10px 18px", fontFamily:"monospace", fontSize:9, letterSpacing:"1.5px", color:"#444", borderBottom:"0.5px solid rgba(255,255,255,0.05)", whiteSpace:"nowrap", fontWeight:400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...usageData.stats].reverse().map(s=>(
                      <tr key={s.date}
                        onMouseEnter={e=>e.currentTarget.style.background="#0d0d0d"}
                        onMouseLeave={e=>e.currentTarget.style.background="none"}
                        style={{ borderBottom:"0.5px solid rgba(255,255,255,0.03)", transition:"background 0.15s" }}>
                        <td style={{ padding:"13px 18px", fontFamily:"monospace", fontSize:12, color:"#444", whiteSpace:"nowrap" }}>{s.date}</td>
                        <td style={{ padding:"13px 18px", fontFamily:"monospace", fontSize:13, color:"#777" }}>
                          {s.screenTimeMinutes}m <span style={{ color:"#333", fontSize:11 }}>({Math.floor(s.screenTimeMinutes/60)}h {s.screenTimeMinutes%60}m)</span>
                        </td>
                        <td style={{ padding:"13px 18px", fontFamily:"monospace", fontSize:13, color:"#777" }}>{s.unlockCount}</td>
                        <td style={{ padding:"13px 18px", fontFamily:"monospace", fontSize:15, fontWeight:700, color: s.idleWorthScore>=8?"#FF5722":s.idleWorthScore>=6?"#FF9800":"#F44336" }}>{s.idleWorthScore}</td>
                        <td style={{ padding:"13px 18px", fontSize:12, color:"#555", lineHeight:1.55, maxWidth: isTablet?200:400 }}>{s.aiInsight||"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
