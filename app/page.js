"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Shield, LogOut, Clock, Smartphone, TrendingUp,
  AlertCircle, Loader2, Zap, Lock, Download,
  FileText, FileJson, Table2, ChevronDown,
  BarChart2, Settings, CheckSquare, Info,
  MessageSquare, Star, Trophy, Send, User,
  Medal, Crown, Award, RefreshCw, ChevronUp,
} from "lucide-react";

// ── Hash ─────────────────────────────────────────────────────────────────────
async function computePasswordHash(password, username) {
  // Strip ALL spaces before hashing — must match Android app exactly
  const cleanUser = username.replace(/\s+/g, "").toLowerCase();
  const cleanPass = password.replace(/\s+/g, "");
  const salt = cleanUser.split("").reverse().join("") + "LifeGrowth_2024";
  const data = new TextEncoder().encode(cleanPass + salt);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

// ── useDevice ─────────────────────────────────────────────────────────────────
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

// ── Gauge ─────────────────────────────────────────────────────────────────────
function Gauge({ score, size = 120 }) {
  const r = size*0.38, cx = size/2, cy = size/2, circ = 2*Math.PI*r;
  const dash = (Math.min(score,10)/10)*circ;
  const color = score >= 8 ? "#FF5722" : score >= 6 ? "#FF9800" : "#F44336";
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size*0.065}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size*0.065}
          strokeDasharray={`${dash.toFixed(1)} ${(circ-dash).toFixed(1)}`}
          strokeDashoffset={(circ*0.25).toFixed(1)} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{transition:"stroke-dasharray 1s ease"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontFamily:"monospace",fontWeight:700,fontSize:size*0.18,color,lineHeight:1}}>{score.toFixed(1)}</span>
        <span style={{fontFamily:"monospace",fontSize:size*0.1,color:"#444"}}>/10</span>
      </div>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function OTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:"#111",border:"0.5px solid rgba(255,87,34,0.3)",borderRadius:8,padding:"8px 12px",fontFamily:"monospace",fontSize:11}}>
      <p style={{color:"#666",marginBottom:4}}>{label}</p>
      {payload.map(p=><p key={p.name} style={{color:"#FF5722"}}>{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  );
}

// ── Export helpers ────────────────────────────────────────────────────────────
function dl(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=name; a.click();
  URL.revokeObjectURL(url);
}
function exportJSON(stats, appUsage, profile) {
  dl(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),user:profile,dailyStats:stats,appUsage},null,2)],{type:"application/json"}),"life-growth-logs.json");
}
function exportCSV(stats, appUsage) {
  const rows=[["Date","Screen Time (min)","Unlocks","IdleWorth Score","AI Insight"],...stats.map(s=>[s.date,s.screenTimeMinutes,s.unlockCount,s.idleWorthScore,`"${(s.aiInsight||"").replace(/"/g,'""')}"`]),[],["Category","Usage (min)"],...appUsage.map(a=>[a.category,a.usageTimeMinutes])];
  dl(new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"}),"life-growth-logs.csv");
}
function exportHTML(stats, appUsage, profile) {
  const sr=stats.map(s=>`<tr><td>${s.date}</td><td>${s.screenTimeMinutes}m</td><td>${s.unlockCount}</td><td style="color:#FF5722;font-weight:700">${s.idleWorthScore}</td><td>${s.aiInsight||"-"}</td></tr>`).join("");
  const ar=appUsage.map(a=>`<tr><td>${a.category}</td><td>${a.usageTimeMinutes}m</td></tr>`).join("");
  dl(new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Life Growth Log</title><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#000;color:#fff;font-family:monospace;padding:2rem}h1{color:#FF5722;margin-bottom:.2rem}.meta{color:#555;font-size:.75rem;margin-bottom:2rem}h2{color:#666;font-size:.7rem;letter-spacing:.12em;margin:1.5rem 0 .6rem}table{width:100%;border-collapse:collapse;font-size:.8rem}th{text-align:left;color:#444;border-bottom:1px solid #1a1a1a;padding:.5rem .75rem;font-size:.7rem;letter-spacing:.08em}td{padding:.55rem .75rem;border-bottom:1px solid #111;color:#aaa}</style></head><body><h1>Life Growth — Activity Log</h1><p class="meta">@${profile?.username} · Level ${profile?.level} · Exported ${new Date().toLocaleString()}</p><h2>DAILY STATS</h2><table><thead><tr><th>DATE</th><th>SCREEN TIME</th><th>UNLOCKS</th><th>IDLEWORTH</th><th>AI INSIGHT</th></tr></thead><tbody>${sr}</tbody></table><h2>APP USAGE</h2><table><thead><tr><th>CATEGORY</th><th>USAGE</th></tr></thead><tbody>${ar}</tbody></table></body></html>`],{type:"text/html"}),"life-growth-report.html");
}

// ── AI Chat — Sarvam streaming ────────────────────────────────────────────────
async function askAISarvam(messages, model, onChunk) {
  const res = await fetch("/api/ai", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ messages, model }),
  });
  if (!res.ok) throw new Error("AI API error");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream:true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data: ")) continue;
      const d = t.slice(6);
      if (d === "[DONE]") return;
      try { const c = JSON.parse(d); if (c.text) onChunk(c.text); } catch {}
    }
  }
}

// ── TABS config ───────────────────────────────────────────────────────────────
const TABS = [
  { id:"data",        label:"Data",        Icon:BarChart2 },
  { id:"score",       label:"Score",       Icon:Star },
  { id:"leaderboard", label:"Rankings",    Icon:Trophy },
  { id:"tasks",       label:"Tasks",       Icon:CheckSquare },
  { id:"ai",          label:"AI Chat",     Icon:MessageSquare },
  { id:"about",       label:"About",       Icon:Info },
  { id:"settings",    label:"Settings",    Icon:Settings },
];

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
// ── AIChatTab — top-level component so input never loses focus ────────────────
const AI_MODELS = [
  { id:"SARVAM-M",    label:"Sarvam M",    desc:"Fast · Multilingual" },
  { id:"sarvam-105b", label:"Sarvam 105B", desc:"Powerful · Deep reasoning" },
];
const AI_PROMPTS = [
  "How can I improve my score?",
  "Why is my unlock count high?",
  "Give me a 7-day plan",
  "Analyze my screen time patterns",
];

function AIChatTab({ card, mono, orange, isMobile, aiMessages, aiInput, setAiInput, aiLoading, aiModel, setAiModel, sendAI, chatEndRef, profile }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Model selector */}
      <div style={{display:"flex",gap:8}}>
        {AI_MODELS.map(m=>(
          <button key={m.id} onClick={()=>setAiModel(m.id)}
            style={{flex:1,padding:"12px 16px",borderRadius:12,cursor:"pointer",textAlign:"left",
              background:aiModel===m.id?"rgba(255,87,34,0.12)":"#0a0a0a",
              border:`0.5px solid ${aiModel===m.id?"rgba(255,87,34,0.4)":"rgba(255,255,255,0.07)"}`,
              transition:"all 0.2s"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:aiModel===m.id?orange:"#333",transition:"background 0.2s"}}/>
              <span style={{...mono,fontWeight:600,fontSize:12,color:aiModel===m.id?orange:"#888"}}>{m.label}</span>
            </div>
            <span style={{...mono,fontSize:10,color:"#444",paddingLeft:16}}>{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div style={{...card,padding:20,display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:13,color:orange}}>💬</span>
            <span style={{...mono,fontSize:10,letterSpacing:"0.1em",color:"#555"}}>AI DISCIPLINE COACH</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:aiLoading?"#FF9800":orange,
              animation:aiLoading?"pulse 1s ease-in-out infinite":"none"}}/>
            <span style={{...mono,fontSize:10,color:"#444"}}>{aiLoading?"thinking...":aiModel}</span>
          </div>
        </div>

        <div style={{overflowY:"auto",display:"flex",flexDirection:"column",gap:12,marginBottom:16,minHeight:280,maxHeight:420}}>
          {aiMessages.length===0&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:16,padding:"30px 0"}}>
              <div style={{width:52,height:52,borderRadius:15,overflow:"hidden",border:"0.5px solid rgba(255,87,34,0.3)"}}>
                <img src="/iw-icon.png" alt="AI" width={52} height={52} style={{objectFit:"cover"}}/>
              </div>
              <div style={{textAlign:"center"}}>
                <p style={{fontSize:14,fontWeight:600,color:"#888",marginBottom:6}}>Life Growth Coach</p>
                <p style={{...mono,fontSize:11,color:"#444"}}>Powered by {aiModel}</p>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",maxWidth:400}}>
                {AI_PROMPTS.map(p=>(
                  <button key={p} onClick={()=>setAiInput(p)}
                    style={{padding:"7px 14px",background:"none",border:"0.5px solid rgba(255,255,255,0.1)",
                      borderRadius:100,...mono,fontSize:11,color:"#666",cursor:"pointer",transition:"all 0.2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,87,34,0.3)";e.currentTarget.style.color=orange}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="#666"}}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {aiMessages.map((m,i)=>(
            <div key={i} style={{display:"flex",gap:10,justifyContent:m.role==="user"?"flex-end":"flex-start",alignItems:"flex-end"}}>
              {m.role==="assistant"&&(
                <div style={{width:26,height:26,borderRadius:8,overflow:"hidden",flexShrink:0,border:"0.5px solid rgba(255,87,34,0.2)"}}>
                  <img src="/iw-icon.png" alt="AI" width={26} height={26} style={{objectFit:"cover"}}/>
                </div>
              )}
              <div style={{maxWidth:"78%",padding:"11px 15px",fontSize:13,lineHeight:1.6,
                borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",
                background:m.role==="user"?orange:"#141414",
                color:m.role==="user"?"#fff":"#ccc",
                border:m.role==="assistant"?"0.5px solid rgba(255,255,255,0.07)":"none"}}>
                {m.content || (m.role==="assistant" && aiLoading && i===aiMessages.length-1
                  ? <span style={{display:"inline-flex",gap:4}}>
                      {[0,1,2].map(d=><span key={d} style={{width:6,height:6,borderRadius:"50%",background:"#555",
                        display:"inline-block",animation:`bounce 1.2s ${d*0.2}s ease-in-out infinite`}}/>)}
                    </span>
                  : "")}
              </div>
              {m.role==="user"&&(
                <div style={{width:26,height:26,borderRadius:"50%",background:"rgba(255,87,34,0.2)",
                  border:"0.5px solid rgba(255,87,34,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:11,color:orange}}>👤</span>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef}/>
        </div>

        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input
            value={aiInput}
            onChange={e=>setAiInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendAI()}
            placeholder={`Ask ${aiModel}...`}
            style={{flex:1,background:"#111",border:"0.5px solid rgba(255,255,255,0.1)",borderRadius:12,
              padding:"13px 16px",...mono,fontSize:13,color:"#fff",outline:"none"}}
          />
          <button onClick={sendAI} disabled={aiLoading||!aiInput.trim()}
            style={{width:46,height:46,background:aiInput.trim()&&!aiLoading?orange:"#1a1a1a",color:"#fff",
              border:"none",borderRadius:12,cursor:aiInput.trim()&&!aiLoading?"pointer":"default",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background 0.2s"}}>
            {aiLoading
              ? <span style={{width:16,height:16,border:"2px solid #555",borderTopColor:orange,borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite"}}/>
              : <span style={{fontSize:16}}>➤</span>}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>
    </div>
  );
}

export default function App() {
  const [screen, setScreen]   = useState("login");
  const [form, setForm]       = useState({username:"",password:""});
  const [formError, setFormError] = useState("");
  const [busy, setBusy]       = useState(false);
  const [profile, setProfile] = useState(null);
  const [usage, setUsage]     = useState({stats:[],appUsage:[]});
  const [tab, setTab]         = useState("data");
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading]     = useState(false);
  const [aiMessages, setAiMessages]   = useState([]);
  const [aiInput, setAiInput]         = useState("");
  const [aiLoading, setAiLoading]     = useState(false);
  const [tasks, setTasks]     = useState([
    {id:1,text:"Keep screen time under 3 hours",done:false},
    {id:2,text:"Less than 40 phone unlocks today",done:false},
    {id:3,text:"Maintain IdleWorth above 8.0",done:false},
    {id:4,text:"No phone in first hour of morning",done:false},
    {id:5,text:"No phone in last hour before sleep",done:false},
  ]);
  const [exportOpen, setExportOpen] = useState(false);
  const chatEndRef = useRef(null);
  const device = useDevice();
  const isMobile = device === "mobile";

  const today = usage.stats[usage.stats.length-1] ?? {};
  const currentScore = today.idleWorthScore ?? profile?.monthlyScore ?? 0;

  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [aiMessages]);

  // ── Login ──────────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault(); setFormError("");
    const {username,password} = form;
    if (!username.trim()||!password) return setFormError("Username and password are required.");
    setBusy(true);
    try {
      const cleanUsername = username.replace(/\s+/g, "").toLowerCase();
      const passwordHash = await computePasswordHash(password, cleanUsername);
      const res = await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:cleanUsername,passwordHash})});
      const data = await res.json();
      if (!res.ok) { setFormError(data.error||"Login failed."); setBusy(false); return; }
      setProfile(data);
      setScreen("loading");
      const uRes = await fetch(`/api/sync/usage?userId=${data.userId}&days=7`);
      const uJson = await uRes.json();
      if (!uRes.ok||!uJson.stats?.length) { setScreen("nodata"); setBusy(false); return; }
      setUsage(uJson);
      setScreen("dash");
    } catch { setFormError("Network error — check your connection."); }
    finally { setBusy(false); }
  }

  function handleLogout() {
    setProfile(null); setUsage({stats:[],appUsage:[]}); setForm({username:"",password:""});
    setFormError(""); setScreen("login"); setTab("data"); setAiMessages([]); setLeaderboard([]);
  }

  // ── Leaderboard fetch ──────────────────────────────────────────────────────
  async function fetchLeaderboard() {
    setLbLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?limit=50&userId=${profile?.userId}`);
      const data = await res.json();
      setLeaderboard(data.leaderboard||[]);
    } catch {}
    finally { setLbLoading(false); }
  }

  useEffect(() => { if (tab==="leaderboard"&&profile) fetchLeaderboard(); }, [tab]);

  // ── AI Chat ────────────────────────────────────────────────────────────────
  const [aiModel, setAiModel] = useState("SARVAM-M");

  async function sendAI() {
    if (!aiInput.trim()||aiLoading) return;
    const context = `[User stats] IdleWorth today: ${currentScore}, Screen time: ${today.screenTimeMinutes}min, Unlocks: ${today.unlockCount}, Level: ${profile?.level}, Monthly avg: ${profile?.monthlyScore}. `;
    const userMsg = {role:"user", content: context + aiInput.trim()};
    const newMsgs = [...aiMessages, userMsg];
    setAiMessages([...newMsgs, {role:"assistant", content:""}]);
    setAiInput(""); setAiLoading(true);
    try {
      let full = "";
      await askAISarvam(newMsgs, aiModel, (chunk) => {
        full += chunk;
        setAiMessages(m => {
          const updated = [...m];
          updated[updated.length-1] = {role:"assistant", content: full};
          return updated;
        });
      });
    } catch {
      setAiMessages(m => {
        const updated = [...m];
        updated[updated.length-1] = {role:"assistant", content:"Connection error. Try again."};
        return updated;
      });
    }
    finally { setAiLoading(false); }
  }

  // ── Common styles ──────────────────────────────────────────────────────────
  const card = {background:"#0a0a0a",border:"0.5px solid rgba(255,255,255,0.07)",borderRadius:14};
  const mono = {fontFamily:"monospace"};
  const orange = "#FF5722";

  function CardLabel({icon:Icon,text}) {
    return (
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        {Icon && <Icon size={13} color={orange}/>}
        <span style={{...mono,fontSize:10,letterSpacing:"0.1em",color:"#555"}}>{text}</span>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ══════════════════════════════════════════════════════════════════════════
  if (screen==="login") return (
    <div style={{background:"#000",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:isMobile?"1.5rem":"2rem",position:"relative"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 70% 35% at 50% 0%, rgba(255,87,34,0.07), transparent 70%)",pointerEvents:"none"}}/>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:36}}>
        <div style={{width:72,height:72,borderRadius:20,overflow:"hidden",marginBottom:16,border:"0.5px solid rgba(255,87,34,0.3)"}}>
          <img src="/iw-icon.png" alt="Life Growth" width={72} height={72} style={{objectFit:"cover"}}/>
        </div>
        <h1 style={{fontSize:isMobile?28:26,fontWeight:700,color:"#fff",letterSpacing:"-0.5px"}}>Life Growth</h1>
        <p style={{...mono,fontSize:10,letterSpacing:"0.2em",color:"#444",marginTop:6}}>IDLEWORTH DASHBOARD</p>
      </div>
      <form onSubmit={handleLogin} style={{...card,width:"100%",maxWidth:isMobile?"100%":400,padding:isMobile?"28px 24px":"32px"}}>
        {[["USERNAME","text","username","your_username","username"],["PASSWORD","password","current-password","••••••••","password"]].map(([lbl,type,ac,ph,key])=>(
          <div key={key} style={{marginBottom:20}}>
            <label style={{display:"block",...mono,fontSize:10,letterSpacing:"0.15em",color:"#666",marginBottom:8}}>{lbl}</label>
            <input type={type} autoComplete={ac} value={form[key]} placeholder={ph} spellCheck={false}
              onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
              style={{width:"100%",background:"#111",border:"0.5px solid rgba(255,255,255,0.12)",borderRadius:10,
                padding:isMobile?"14px 16px":"12px 16px",...mono,fontSize:14,color:"#fff",outline:"none"}}/>
          </div>
        ))}
        {formError&&(
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,padding:"10px 14px",
            background:"rgba(255,87,34,0.08)",border:"0.5px solid rgba(255,87,34,0.3)",borderRadius:8}}>
            <AlertCircle size={14} color={orange}/>
            <span style={{...mono,fontSize:12,color:orange}}>{formError}</span>
          </div>
        )}
        <button type="submit" disabled={busy} style={{width:"100%",background:busy?"#331a10":orange,color:"#fff",border:"none",borderRadius:10,
          padding:isMobile?"16px":"13px",fontWeight:600,fontSize:15,cursor:busy?"default":"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background 0.2s"}}>
          {busy?<Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>:<Lock size={16}/>}
          {busy?"Authenticating...":"Access Dashboard"}
        </button>
        <p style={{textAlign:"center",...mono,fontSize:11,color:"#333",marginTop:14}}>Use your Life Growth Android credentials</p>
      </form>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (screen==="loading") return (
    <div style={{background:"#000",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <img src="/iw-icon.png" alt="Life Growth" width={60} height={60} style={{borderRadius:14,opacity:0.7}}/>
      <Loader2 size={28} color={orange} style={{animation:"spin 1s linear infinite"}}/>
      <p style={{...mono,fontSize:12,color:"#555"}}>Fetching your data...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (screen==="nodata") return (
    <div style={{background:"#000",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
      <Zap size={32} color="#333"/>
      <div style={{textAlign:"center"}}>
        <h2 style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:8}}>No data synced yet</h2>
        <p style={{...mono,fontSize:13,color:"#555",maxWidth:300}}>Open the Life Growth app and start tracking.</p>
      </div>
      <button onClick={handleLogout} style={{padding:"10px 24px",background:"#111",color:"#888",border:"0.5px solid rgba(255,255,255,0.1)",borderRadius:8,...mono,fontSize:13,cursor:"pointer"}}>Back to Login</button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  // ── Tab: DATA ──────────────────────────────────────────────────────────────
  function TabData() {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Gauge + stats */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":device==="tablet"?"1.8fr 1fr 1fr":"2fr 1fr 1fr",gap:12}}>
          <div style={{...card,padding:20,display:"flex",alignItems:"center",gap:isMobile?16:20}}>
            <Gauge score={currentScore} size={isMobile?90:120}/>
            <div>
              <p style={{...mono,fontSize:10,letterSpacing:"0.1em",color:"#555",marginBottom:6}}>IDLEWORTH SCORE</p>
              <p style={{...mono,fontWeight:700,fontSize:isMobile?28:36,color:orange,lineHeight:1}}>
                {currentScore.toFixed(1)}<span style={{fontSize:13,color:"#333",fontWeight:400}}>/10</span>
              </p>
              <p style={{...mono,fontSize:11,color:"#444",marginTop:6}}>Monthly avg: <span style={{color:orange}}>{profile?.monthlyScore?.toFixed(1)}</span></p>
              {today.aiInsight&&!isMobile&&<p style={{fontSize:12,color:"#555",marginTop:8,maxWidth:260,lineHeight:1.55}}>{today.aiInsight}</p>}
            </div>
          </div>
          {[
            {icon:<Clock size={12}/>,label:"SCREEN TIME",val:`${today.screenTimeMinutes??"-"}`,unit:"m",sub:today.screenTimeMinutes?`${Math.floor(today.screenTimeMinutes/60)}h ${today.screenTimeMinutes%60}m`:"No data"},
            {icon:<Smartphone size={12}/>,label:"UNLOCKS",val:`${today.unlockCount??"-"}`,accent:orange,sub:"times today"},
          ].map((s,i)=>(
            <div key={i} style={{...card,padding:isMobile?14:20}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                <span style={{color:"#444"}}>{s.icon}</span>
                <span style={{...mono,fontSize:10,letterSpacing:"0.1em",color:"#555"}}>{s.label}</span>
              </div>
              <div style={{...mono,fontWeight:700,fontSize:isMobile?22:28,color:s.accent||"#fff",lineHeight:1}}>
                {s.val}<span style={{fontSize:13,color:"#333",fontWeight:400}}>{s.unit||""}</span>
              </div>
              <div style={{...mono,fontSize:11,color:"#444",marginTop:6}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":device==="desktop"?"3fr 2fr":"1fr",gap:12}}>
          <div style={{...card,padding:20}}>
            <CardLabel icon={TrendingUp} text="IDLEWORTH TREND — 7 DAYS"/>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={usage.stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                <XAxis dataKey="date" tick={{fill:"#444",fontSize:9,fontFamily:"monospace"}} tickFormatter={v=>v?.slice(5)}/>
                <YAxis domain={[5,10]} tick={{fill:"#444",fontSize:9,fontFamily:"monospace"}} width={28}/>
                <Tooltip content={<OTip/>}/>
                <Line type="monotone" dataKey="idleWorthScore" name="Score" stroke={orange} strokeWidth={2} dot={{fill:orange,r:4}} activeDot={{r:6}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{...card,padding:20}}>
            <CardLabel icon={BarChart2} text="APP USAGE BY CATEGORY"/>
            <ResponsiveContainer width="100%" height={isMobile?160:180}>
              <BarChart data={usage.appUsage.slice(0,6)} layout={isMobile?"vertical":"horizontal"}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                {isMobile
                  ? <><XAxis type="number" tick={{fill:"#444",fontSize:9,fontFamily:"monospace"}}/><YAxis type="category" dataKey="category" tick={{fill:"#444",fontSize:9,fontFamily:"monospace"}} width={80}/></>
                  : <><XAxis dataKey="category" tick={{fill:"#444",fontSize:9,fontFamily:"monospace"}}/><YAxis tick={{fill:"#444",fontSize:9,fontFamily:"monospace"}} width={28}/></>
                }
                <Tooltip content={<OTip/>}/>
                <Bar dataKey="usageTimeMinutes" name="Minutes" fill={orange} radius={isMobile?[0,4,4,0]:[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Logs */}
        <div style={{...card,padding:20}}>
          <CardLabel text="AI INSIGHTS — RECENT LOGS"/>
          {[...usage.stats].reverse().map((s,i)=>(
            <div key={s.date} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",
              borderBottom:i<usage.stats.length-1?"0.5px solid rgba(255,255,255,0.05)":"none"}}>
              <div style={{width:6,height:6,background:orange,borderRadius:"50%",marginTop:6,flexShrink:0}}/>
              <span style={{...mono,fontSize:11,color:"#444",flexShrink:0,minWidth:52,marginTop:2}}>{s.date?.slice(5)}</span>
              <div style={{flex:1}}>
                <p style={{fontSize:12,color:"#888",lineHeight:1.55}}>{s.aiInsight}</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:5}}>
                  <span style={{...mono,fontSize:10,color:orange}}>SCORE {s.idleWorthScore}</span>
                  <span style={{...mono,fontSize:10,color:"#444"}}>{s.screenTimeMinutes}m screen</span>
                  <span style={{...mono,fontSize:10,color:"#444"}}>{s.unlockCount} unlocks</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Export */}
        <div style={{...card,padding:20}}>
          <CardLabel icon={Download} text="EXPORT ACTIVITY LOGS"/>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {[
              {label:"JSON",icon:<FileJson size={14}/>,fn:()=>exportJSON(usage.stats,usage.appUsage,profile)},
              {label:"CSV / Excel",icon:<Table2 size={14}/>,fn:()=>exportCSV(usage.stats,usage.appUsage)},
              {label:"HTML Report",icon:<FileText size={14}/>,fn:()=>exportHTML(usage.stats,usage.appUsage,profile)},
            ].map(b=>(
              <button key={b.label} onClick={b.fn} style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:130,
                padding:"11px 16px",background:"none",border:"0.5px solid rgba(255,255,255,0.1)",borderRadius:10,
                color:"#888",...mono,fontSize:12,cursor:"pointer",justifyContent:"center",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,87,34,0.1)";e.currentTarget.style.color=orange;e.currentTarget.style.borderColor="rgba(255,87,34,0.3)"}}
                onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="#888";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"}}>
                <span style={{color:orange}}>{b.icon}</span>{b.label}
              </button>
            ))}
          </div>
          <p style={{...mono,fontSize:10,color:"#333",marginTop:10}}>Downloads all synced phone activity logs.</p>
        </div>
      </div>
    );
  }

  // ── Tab: SCORE ─────────────────────────────────────────────────────────────
  function TabScore() {
    const best = Math.max(...usage.stats.map(s=>s.idleWorthScore),0);
    const worst = Math.min(...usage.stats.map(s=>s.idleWorthScore),10);
    const avg = usage.stats.length ? (usage.stats.reduce((a,s)=>a+s.idleWorthScore,0)/usage.stats.length).toFixed(2) : "—";
    const trend = usage.stats.length>=2 ? (usage.stats[usage.stats.length-1].idleWorthScore - usage.stats[0].idleWorthScore).toFixed(1) : 0;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{...card,padding:24,display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
          <Gauge score={currentScore} size={160}/>
          <div style={{textAlign:"center"}}>
            <p style={{...mono,fontSize:10,letterSpacing:"0.15em",color:"#555",marginBottom:8}}>TODAY'S IDLEWORTH SCORE</p>
            <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
              {parseFloat(trend)>0
                ? <><ChevronUp size={18} color="#4CAF50"/><span style={{...mono,fontSize:13,color:"#4CAF50"}}>+{trend} vs 7 days ago</span></>
                : <><ChevronDown size={18} color={orange}/><span style={{...mono,fontSize:13,color:orange}}>{trend} vs 7 days ago</span></>
              }
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[
            {label:"7-DAY AVG",val:avg,color:"#fff"},
            {label:"BEST THIS WEEK",val:best.toFixed(1),color:"#4CAF50"},
            {label:"WORST THIS WEEK",val:worst.toFixed(1),color:orange},
            {label:"MONTHLY SCORE",val:profile?.monthlyScore?.toFixed(1)||"—",color:"#2196F3"},
          ].map(s=>(
            <div key={s.label} style={{...card,padding:18}}>
              <p style={{...mono,fontSize:10,letterSpacing:"0.1em",color:"#555",marginBottom:8}}>{s.label}</p>
              <p style={{...mono,fontWeight:700,fontSize:28,color:s.color,lineHeight:1}}>{s.val}</p>
            </div>
          ))}
        </div>
        <div style={{...card,padding:20}}>
          <CardLabel icon={TrendingUp} text="SCORE HISTORY"/>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={usage.stats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="date" tick={{fill:"#444",fontSize:9,fontFamily:"monospace"}} tickFormatter={v=>v?.slice(5)}/>
              <YAxis domain={[0,10]} tick={{fill:"#444",fontSize:9,fontFamily:"monospace"}} width={28}/>
              <Tooltip content={<OTip/>}/>
              <Line type="monotone" dataKey="idleWorthScore" name="Score" stroke={orange} strokeWidth={2.5} dot={{fill:orange,r:5}} activeDot={{r:7}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ── Tab: LEADERBOARD ───────────────────────────────────────────────────────
  function TabLeaderboard() {
    const rankIcon = (rank) => {
      if (rank===1) return <Crown size={16} color="#FFD700"/>;
      if (rank===2) return <Medal size={16} color="#C0C0C0"/>;
      if (rank===3) return <Award size={16} color="#CD7F32"/>;
      return <span style={{...mono,fontSize:12,color:"#444",minWidth:16,textAlign:"center"}}>{rank}</span>;
    };
    return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:4}}>Global Rankings</h2>
            <p style={{...mono,fontSize:11,color:"#555"}}>Based on average IdleWorth score (last 7 days)</p>
          </div>
          <button onClick={fetchLeaderboard} disabled={lbLoading}
            style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"none",
              border:"0.5px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#666",...mono,fontSize:12,cursor:"pointer"}}>
            <RefreshCw size={13} style={lbLoading?{animation:"spin 1s linear infinite"}:{}}/> Refresh
          </button>
        </div>

        {lbLoading ? (
          <div style={{...card,padding:40,display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
            <Loader2 size={20} color={orange} style={{animation:"spin 1s linear infinite"}}/> 
            <span style={{...mono,fontSize:12,color:"#555"}}>Loading rankings...</span>
          </div>
        ) : leaderboard.length===0 ? (
          <div style={{...card,padding:40,textAlign:"center"}}>
            <Trophy size={32} color="#333" style={{margin:"0 auto 12px"}}/>
            <p style={{...mono,fontSize:12,color:"#555"}}>No rankings yet. Sync data from the app to appear here.</p>
          </div>
        ) : (
          <div style={{...card,overflow:"hidden"}}>
            {/* Top 3 */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:1,background:"rgba(255,255,255,0.04)",marginBottom:1}}>
              {leaderboard.slice(0,3).map((u,i)=>(
                <div key={u.username} style={{background:u.isCurrentUser?"rgba(255,87,34,0.1)":"#0a0a0a",
                  padding:isMobile?"14px 12px":"18px",textAlign:"center",
                  borderBottom:i===1?"2px solid rgba(255,215,0,0.3)":"none"}}>
                  <div style={{marginBottom:8}}>{rankIcon(u.rank)}</div>
                  <div style={{width:36,height:36,borderRadius:"50%",background:u.isCurrentUser?"rgba(255,87,34,0.3)":"rgba(255,255,255,0.08)",
                    display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px"}}>
                    <User size={16} color={u.isCurrentUser?orange:"#666"}/>
                  </div>
                  <p style={{...mono,fontSize:11,color:u.isCurrentUser?orange:"#ccc",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {u.isCurrentUser?"You":u.username}
                  </p>
                  <p style={{...mono,fontWeight:700,fontSize:18,color:u.rank===1?"#FFD700":u.rank===2?"#C0C0C0":"#CD7F32"}}>{u.avgScore7d}</p>
                  <p style={{...mono,fontSize:9,color:"#555",marginTop:2}}>LVL {u.level}</p>
                </div>
              ))}
            </div>
            {/* Rest */}
            {leaderboard.slice(3).map((u,i)=>(
              <div key={u.username} style={{display:"flex",alignItems:"center",gap:14,padding:isMobile?"12px 14px":"14px 20px",
                background:u.isCurrentUser?"rgba(255,87,34,0.08)":"transparent",
                borderBottom:"0.5px solid rgba(255,255,255,0.04)"}}>
                <div style={{width:20,textAlign:"center",flexShrink:0}}>{rankIcon(u.rank)}</div>
                <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.06)",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <User size={14} color={u.isCurrentUser?orange:"#555"}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{...mono,fontSize:12,color:u.isCurrentUser?orange:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {u.isCurrentUser?"You ("+u.username+")":u.username}
                  </p>
                  <p style={{...mono,fontSize:10,color:"#555"}}>Lv.{u.level} · {u.daysTracked}d tracked</p>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <p style={{...mono,fontWeight:700,fontSize:16,color:orange}}>{u.avgScore7d}</p>
                  <p style={{...mono,fontSize:9,color:"#444"}}>avg score</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Tab: TASKS ─────────────────────────────────────────────────────────────
  function TabTasks() {
    const [newTask, setNewTask] = useState("");
    function toggle(id) { setTasks(t=>t.map(x=>x.id===id?{...x,done:!x.done}:x)); }
    function remove(id) { setTasks(t=>t.filter(x=>x.id!==id)); }
    function add() {
      if (!newTask.trim()) return;
      setTasks(t=>[...t,{id:Date.now(),text:newTask.trim(),done:false}]);
      setNewTask("");
    }
    const done = tasks.filter(t=>t.done).length;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{...card,padding:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div>
              <h3 style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:4}}>Daily Discipline Tasks</h3>
              <p style={{...mono,fontSize:11,color:"#555"}}>{done}/{tasks.length} completed today</p>
            </div>
            <div style={{width:48,height:48,position:"relative"}}>
              <svg width={48} height={48} viewBox="0 0 48 48">
                <circle cx={24} cy={24} r={20} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4}/>
                <circle cx={24} cy={24} r={20} fill="none" stroke={orange} strokeWidth={4}
                  strokeDasharray={`${(done/Math.max(tasks.length,1))*125.7} 125.7`}
                  strokeDashoffset={31.4} strokeLinecap="round" transform="rotate(-90 24 24)"/>
              </svg>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{...mono,fontSize:11,fontWeight:700,color:orange}}>{Math.round(done/Math.max(tasks.length,1)*100)}%</span>
              </div>
            </div>
          </div>
          {tasks.map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",
              borderBottom:"0.5px solid rgba(255,255,255,0.05)"}}>
              <button onClick={()=>toggle(t.id)} style={{width:22,height:22,borderRadius:6,border:`0.5px solid ${t.done?orange:"rgba(255,255,255,0.2)"}`,
                background:t.done?"rgba(255,87,34,0.2)":"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {t.done&&<span style={{color:orange,fontSize:14}}>✓</span>}
              </button>
              <span style={{flex:1,fontSize:13,color:t.done?"#444":"#ccc",textDecoration:t.done?"line-through":"none"}}>{t.text}</span>
              <button onClick={()=>remove(t.id)} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}
              placeholder="Add a new task..." style={{flex:1,background:"#111",border:"0.5px solid rgba(255,255,255,0.1)",
                borderRadius:8,padding:"10px 14px",...mono,fontSize:12,color:"#fff",outline:"none"}}/>
            <button onClick={add} style={{padding:"10px 18px",background:orange,color:"#fff",border:"none",borderRadius:8,...mono,fontSize:12,cursor:"pointer"}}>Add</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Tab: AI CHAT — rendered from outer component (fixes input focus) ────────
  function TabAI() { return <AIChatTab card={card} mono={mono} orange={orange} isMobile={isMobile} aiMessages={aiMessages} aiInput={aiInput} setAiInput={setAiInput} aiLoading={aiLoading} aiModel={aiModel} setAiModel={setAiModel} sendAI={sendAI} chatEndRef={chatEndRef} profile={profile}/>; }
  // placeholder   // ── Tab: ABOUT ─────────────────────────────────────────────────────────────
  function TabAbout() {
    const RUBRICS = [
      { label:"IdleWorth App Usage",    color:"#FF5722", icon:"📱", rate:"−0.5 pts",  per:"every 5 min",   note:"Time spent inside the Life Growth app itself" },
      { label:"General Screen Time",    color:"#FF9800", icon:"⏱",  rate:"−1.0 pts",  per:"every 20 min",  note:"Remaining screen time after subtracting tracked categories" },
      { label:"Phone Unlocks",          color:"#F44336", icon:"🔓", rate:"−0.01 pts", per:"per unlock",    note:"Every check-in slowly chips away at your score" },
      { label:"Entertainment Apps",     color:"#9C27B0", icon:"🎬", rate:"−1.0 pts",  per:"every 15 min",  note:"YouTube, Netflix, streaming, media" },
      { label:"Communication Apps",     color:"#2196F3", icon:"💬", rate:"−0.1 pts",  per:"every 5 min",   note:"WhatsApp, SMS, messaging apps" },
      { label:"Browser Usage",          color:"#FF5722", icon:"🌐", rate:"−2.0 pts",  per:"every 20 min",  note:"Chrome, Firefox, and other browsers" },
      { label:"Games",                  color:"#E91E63", icon:"🎮", rate:"−0.2 pts",  per:"every 5 min",   note:"All game apps and casual gaming" },
    ];
    return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {/* Hero */}
        <div style={{...card,padding:24,textAlign:"center"}}>
          <div style={{width:80,height:80,borderRadius:22,overflow:"hidden",margin:"0 auto 16px",border:"0.5px solid rgba(255,87,34,0.3)"}}>
            <img src="/iw-icon.png" alt="Life Growth" width={80} height={80} style={{objectFit:"cover"}}/>
          </div>
          <h2 style={{fontSize:22,fontWeight:700,color:"#fff",marginBottom:4}}>Life Growth</h2>
          <p style={{...mono,fontSize:11,color:"#555",letterSpacing:"0.1em",marginBottom:16}}>IDLEWORTH DISCIPLINE TRACKER</p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            {[["Web Version","1.0.0"],["DB Schema","v6"],["User Level","Lv."+profile?.level]].map(([l,v])=>(
              <div key={l} style={{padding:"6px 16px",background:"rgba(255,87,34,0.1)",borderRadius:100,border:"0.5px solid rgba(255,87,34,0.2)"}}>
                <span style={{...mono,fontSize:11,color:"#666"}}>{l}: </span>
                <span style={{...mono,fontSize:11,color:orange}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Score formula */}
        <div style={{...card,padding:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <Star size={13} color={orange}/>
            <span style={{...mono,fontSize:10,letterSpacing:"0.1em",color:"#555"}}>HOW YOUR SCORE IS CALCULATED</span>
          </div>
          <p style={{fontSize:13,color:"#666",lineHeight:1.65,marginBottom:16}}>
            Your IdleWorth score starts at <span style={{color:"#fff",fontWeight:600}}>10.0</span> each day.
            Points are deducted based on your phone usage habits below.
            The final score is always between <span style={{color:orange,fontWeight:600}}>0.0</span> and <span style={{color:"#4CAF50",fontWeight:600}}>10.0</span> — higher means more intentional, controlled phone use.
          </p>
          {/* Formula pill */}
          <div style={{background:"#111",borderRadius:10,padding:"12px 16px",...mono,fontSize:12,color:"#888",textAlign:"center",border:"0.5px solid rgba(255,255,255,0.06)"}}>
            Score = <span style={{color:"#4CAF50"}}>10.0</span> − app_deductions − screen_deductions − unlock_deductions
          </div>
        </div>

        {/* Rubrics table */}
        <div style={{...card,padding:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
            <BarChart2 size={13} color={orange}/>
            <span style={{...mono,fontSize:10,letterSpacing:"0.1em",color:"#555"}}>DEDUCTION RUBRICS</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {RUBRICS.map((r,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",
                background:"#111",borderRadius:10,border:`0.5px solid rgba(255,255,255,0.05)`}}>
                {/* Color bar */}
                <div style={{width:3,height:44,borderRadius:2,background:r.color,flexShrink:0}}/>
                {/* Icon */}
                <span style={{fontSize:18,flexShrink:0,lineHeight:1}}>{r.icon}</span>
                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:600,color:"#ddd",marginBottom:3}}>{r.label}</p>
                  <p style={{...mono,fontSize:11,color:"#555"}}>{r.note}</p>
                </div>
                {/* Deduction */}
                <div style={{textAlign:"right",flexShrink:0}}>
                  <p style={{...mono,fontWeight:700,fontSize:14,color:r.color}}>{r.rate}</p>
                  <p style={{...mono,fontSize:10,color:"#555"}}>{r.per}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Other info cards */}
        {[
          {title:"What is IdleWorth?",text:"IdleWorth is your digital discipline score, starting at 10.0. It decreases when you use your phone excessively, unlock it too often, or spend time on unproductive apps. The goal is to keep it high through mindful phone usage."},
          {title:"Leaderboard",text:"Rankings compare all users by their 7-day average IdleWorth score. Only users who have synced data in the last 7 days appear. Your rank updates each time you refresh."},
          {title:"AI Coach",text:"The AI coach analyzes your specific data — screen time patterns, unlock habits, and score trends — to give personalized advice for improving your digital discipline."},
        ].map(s=>(
          <div key={s.title} style={{...card,padding:20}}>
            <h3 style={{fontSize:14,fontWeight:600,color:"#fff",marginBottom:8}}>{s.title}</h3>
            <p style={{fontSize:13,color:"#666",lineHeight:1.65}}>{s.text}</p>
          </div>
        ))}
      </div>
    );
  }

  // ── Tab: SETTINGS ──────────────────────────────────────────────────────────
  function TabSettings() {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{...card,padding:20}}>
          <CardLabel icon={User} text="ACCOUNT"/>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
            <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(255,87,34,0.15)",
              border:"0.5px solid rgba(255,87,34,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <User size={22} color={orange}/>
            </div>
            <div>
              <p style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:2}}>@{profile?.username}</p>
              <p style={{...mono,fontSize:11,color:"#555"}}>Level {profile?.level} · Monthly score {profile?.monthlyScore}</p>
            </div>
          </div>
          {[["User ID",profile?.userId||"—"],["Account created",profile?.createdAt?new Date(profile.createdAt).toLocaleDateString():"—"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"0.5px solid rgba(255,255,255,0.05)"}}>
              <span style={{...mono,fontSize:12,color:"#555"}}>{l}</span>
              <span style={{...mono,fontSize:12,color:"#888",maxWidth:"60%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right"}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{...card,padding:20}}>
          <CardLabel text="SYNC INFORMATION"/>
          <p style={{fontSize:13,color:"#666",lineHeight:1.6,marginBottom:12}}>Data syncs automatically from your Android app. Sync triggers:</p>
          {["Every time your IdleWorth score updates","Every 100th background worker run","On manual sync from app settings"].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderTop:i>0?"0.5px solid rgba(255,255,255,0.05)":"none"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:orange,flexShrink:0}}/>
              <span style={{fontSize:13,color:"#777"}}>{s}</span>
            </div>
          ))}
        </div>
        <button onClick={handleLogout} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          padding:"14px",background:"rgba(255,87,34,0.08)",border:"0.5px solid rgba(255,87,34,0.2)",borderRadius:12,
          color:orange,...mono,fontSize:13,cursor:"pointer",transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,87,34,0.18)"}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,87,34,0.08)"}}>
          <LogOut size={15}/> Sign Out
        </button>
      </div>
    );
  }

  const tabContent = {data:<TabData/>,score:<TabScore/>,leaderboard:<TabLeaderboard/>,tasks:<TabTasks/>,ai:<TabAI/>,about:<TabAbout/>,settings:<TabSettings/>};

  // ── MAIN DASHBOARD LAYOUT ──────────────────────────────────────────────────
  return (
    <div style={{background:"#000",minHeight:"100vh"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>

      {/* Header */}
      <header style={{background:"#080808",borderBottom:"0.5px solid rgba(255,255,255,0.06)",
        padding:isMobile?"12px 16px":"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",
        position:"sticky",top:0,zIndex:30}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:9,overflow:"hidden",border:"0.5px solid rgba(255,87,34,0.3)"}}>
            <img src="/iw-icon.png" alt="Life Growth" width={32} height={32} style={{objectFit:"cover"}}/>
          </div>
          {!isMobile&&<span style={{fontWeight:700,fontSize:15,color:"#fff"}}>Life Growth</span>}
          <span style={{fontFamily:"monospace",fontSize:10,padding:"3px 10px",borderRadius:100,
            background:"rgba(255,87,34,0.15)",color:orange,border:"0.5px solid rgba(255,87,34,0.3)"}}>
            LVL {profile?.level}
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {!isMobile&&<span style={{fontFamily:"monospace",fontSize:11,padding:"5px 12px",borderRadius:8,
            background:"#111",color:"#555",border:"0.5px solid rgba(255,255,255,0.08)"}}>@{profile?.username}</span>}
          <button onClick={handleLogout} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",
            background:"none",color:"#555",border:"0.5px solid rgba(255,255,255,0.1)",borderRadius:8,cursor:"pointer",
            fontFamily:"monospace",fontSize:12}}>
            <LogOut size={13}/>{!isMobile&&" Logout"}
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div style={{background:"#060606",borderBottom:"0.5px solid rgba(255,255,255,0.06)",
        padding:"0 16px",overflowX:"auto",display:"flex",gap:0,position:"sticky",top:57,zIndex:29}}>
        {TABS.map(({id,label,Icon})=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{display:"flex",alignItems:"center",gap:6,padding:isMobile?"12px 12px":"13px 18px",
              background:"none",border:"none",borderBottom:`2px solid ${tab===id?orange:"transparent"}`,
              color:tab===id?orange:"#555",cursor:"pointer",fontFamily:"monospace",fontSize:isMobile?11:12,
              whiteSpace:"nowrap",transition:"color 0.2s",flexShrink:0}}>
            <Icon size={isMobile?13:14}/>{!isMobile||true?label:""}
          </button>
        ))}
      </div>

      {/* Content */}
      <main style={{padding:isMobile?"14px":"24px",maxWidth:1100,margin:"0 auto"}}>
        {tabContent[tab]}
      </main>
    </div>
  );
}
