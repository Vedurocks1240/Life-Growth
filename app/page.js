"use client";
// app/page.js  —  Life Growth Web Dashboard
// Handles login (with local SHA-256 hashing) and the full dashboard.

import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Shield, LogOut, Clock, Smartphone, TrendingUp,
  AlertCircle, Loader2, ChevronRight, Zap, Lock,
} from "lucide-react";

// ─── Hashing (mirrors Android exactly) ─────────────────────────────────────
async function computePasswordHash(password, username) {
  const salt = username.split("").reverse().join("") + "LifeGrowth_2024";
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Custom Tooltip for charts ──────────────────────────────────────────────
function OrangeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#111", border: "0.5px solid rgba(255,87,34,0.3)",
      borderRadius: 8, padding: "8px 12px", fontFamily: "monospace", fontSize: 12,
    }}>
      <p style={{ color: "#888", marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: "#FF5722" }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Radial gauge ───────────────────────────────────────────────────────────
function IdleWorthGauge({ score }) {
  const r = 52, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score / 10, 1);
  const dash = pct * circ;
  const color = score >= 8 ? "#FF5722" : score >= 6 ? "#FF9800" : "#F44336";

  return (
    <div className="relative w-32 h-32">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash.toFixed(2)} ${(circ - dash).toFixed(2)}`}
          strokeDashoffset={(circ * 0.25).toFixed(2)}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-mono" style={{ color }}>
          {score.toFixed(1)}
        </span>
        <span className="text-xs font-mono" style={{ color: "#444" }}>/10</span>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]       = useState("login"); // login | loading | dash | nodata | error
  const [formState, setFormState] = useState({ username: "", password: "" });
  const [formError, setFormError] = useState("");
  const [busy, setBusy]           = useState(false);
  const [profile, setProfile]     = useState(null);
  const [usageData, setUsageData] = useState({ stats: [], appUsage: [] });

  // ─── Login handler ─────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setFormError("");
    const { username, password } = formState;

    if (!username.trim() || !password)
      return setFormError("Username and password are required.");

    setBusy(true);
    try {
      const passwordHash = await computePasswordHash(password, username.trim().toLowerCase());

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), passwordHash }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Login failed.");
        setBusy(false);
        return;
      }

      setProfile(data);
      setScreen("loading");

      // Fetch usage data
      const [usageRes] = await Promise.all([
        fetch(`/api/sync/usage?userId=${data.userId}&days=7`),
      ]);

      const usageJson = await usageRes.json();

      if (!usageRes.ok || !usageJson.stats?.length) {
        setScreen("nodata");
        setBusy(false);
        return;
      }

      setUsageData(usageJson);
      setScreen("dash");
    } catch (err) {
      setFormError("Network error — check your connection.");
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    setProfile(null);
    setUsageData({ stats: [], appUsage: [] });
    setFormState({ username: "", password: "" });
    setFormError("");
    setScreen("login");
  }

  // ─── Derived values ────────────────────────────────────────────────────
  const today        = usageData.stats[usageData.stats.length - 1] ?? {};
  const currentScore = today.idleWorthScore ?? profile?.monthlyScore ?? 0;
  const catColors    = {
    Productivity: "#FF5722", Entertainment: "#555", Social: "#444",
    Health: "#333", Other: "#222",
  };

  // ═══════════════════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === "login") return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "#000" }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 35% at 50% 0%, rgba(255,87,34,0.07), transparent 70%)" }} />

      <div className="mb-8 flex flex-col items-center">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
          style={{ background: "#FF5722" }}>
          <Shield size={28} color="#fff" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#fff", fontFamily: "system-ui" }}>
          Life Growth
        </h1>
        <p className="mt-1 font-mono text-xs tracking-widest" style={{ color: "#555" }}>
          DISCIPLINE TRACKER
        </p>
      </div>

      <form onSubmit={handleLogin}
        className="w-full max-w-sm rounded-xl p-8"
        style={{ background: "#0a0a0a", border: "0.5px solid rgba(255,255,255,0.1)" }}>

        <div className="mb-5">
          <label className="block font-mono text-xs tracking-widest mb-2" style={{ color: "#666" }}>
            USERNAME
          </label>
          <input
            type="text" autoComplete="username" spellCheck={false}
            value={formState.username}
            onChange={(e) => setFormState((s) => ({ ...s, username: e.target.value }))}
            placeholder="your_username"
            className="w-full rounded-lg px-4 py-3 font-mono text-sm outline-none"
            style={{
              background: "#111", border: "0.5px solid rgba(255,255,255,0.12)",
              color: "#fff", transition: "border-color 0.2s",
            }}
          />
        </div>

        <div className="mb-5">
          <label className="block font-mono text-xs tracking-widest mb-2" style={{ color: "#666" }}>
            PASSWORD
          </label>
          <input
            type="password" autoComplete="current-password"
            value={formState.password}
            onChange={(e) => setFormState((s) => ({ ...s, password: e.target.value }))}
            placeholder="••••••••"
            className="w-full rounded-lg px-4 py-3 font-mono text-sm outline-none"
            style={{
              background: "#111", border: "0.5px solid rgba(255,255,255,0.12)",
              color: "#fff",
            }}
          />
        </div>

        {formError && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg"
            style={{ background: "rgba(255,87,34,0.1)", border: "0.5px solid rgba(255,87,34,0.3)" }}>
            <AlertCircle size={14} color="#FF5722" />
            <span className="text-xs font-mono" style={{ color: "#FF5722" }}>{formError}</span>
          </div>
        )}

        <button type="submit" disabled={busy}
          className="w-full rounded-lg py-3 font-semibold flex items-center justify-center gap-2"
          style={{
            background: busy ? "#332211" : "#FF5722", color: "#fff",
            border: "none", cursor: busy ? "default" : "pointer", transition: "background 0.2s",
          }}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
          {busy ? "Authenticating..." : "Access Dashboard"}
        </button>

        <p className="text-center font-mono text-xs mt-4" style={{ color: "#333" }}>
          Use your Life Growth Android credentials
        </p>
      </form>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // LOADING
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === "loading") return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "#000" }}>
      <Loader2 size={32} color="#FF5722" className="animate-spin" />
      <p className="font-mono text-sm" style={{ color: "#555" }}>Fetching your data...</p>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // NO DATA STATE
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === "nodata") return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: "#000" }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "#111", border: "0.5px solid rgba(255,255,255,0.1)" }}>
        <Zap size={24} color="#333" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2" style={{ color: "#fff" }}>No data synced yet</h2>
        <p className="font-mono text-sm" style={{ color: "#555" }}>
          Open the Life Growth app and start tracking to see your stats here.
        </p>
      </div>
      <button onClick={handleLogout}
        className="px-6 py-2 rounded-lg font-mono text-sm"
        style={{ background: "#111", color: "#888", border: "0.5px solid rgba(255,255,255,0.1)" }}>
        Back to Login
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ background: "#000", minHeight: "100vh" }}>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4"
        style={{ background: "#0a0a0a", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "#FF5722" }}>
            <Shield size={16} color="#fff" />
          </div>
          <span className="font-bold text-base tracking-tight" style={{ color: "#fff" }}>Life Growth</span>
          <span className="font-mono text-xs px-2 py-1 rounded-full"
            style={{ background: "rgba(255,87,34,0.15)", color: "#FF5722", border: "0.5px solid rgba(255,87,34,0.3)" }}>
            LVL {profile?.level}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs px-3 py-1 rounded-lg"
            style={{ background: "#111", color: "#555", border: "0.5px solid rgba(255,255,255,0.08)" }}>
            @{profile?.username}
          </span>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs"
            style={{ background: "none", color: "#666", border: "0.5px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
            <LogOut size={12} /> Logout
          </button>
        </div>
      </header>

      <main className="px-6 py-6 flex flex-col gap-4">

        {/* ── Stats Row ── */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>

          {/* IdleWorth card */}
          <div className="rounded-xl p-5 flex items-center gap-5"
            style={{ background: "#0a0a0a", border: "0.5px solid rgba(255,255,255,0.07)" }}>
            <IdleWorthGauge score={currentScore} />
            <div>
              <p className="font-mono text-xs tracking-widest mb-1" style={{ color: "#555" }}>IDLEWORTH SCORE</p>
              <p className="text-4xl font-bold font-mono" style={{ color: "#FF5722", lineHeight: 1 }}>
                {currentScore.toFixed(1)}
                <span className="text-base" style={{ color: "#333" }}>/10</span>
              </p>
              <p className="font-mono text-xs mt-2" style={{ color: "#444" }}>
                Monthly avg: <span style={{ color: "#FF5722" }}>{profile?.monthlyScore?.toFixed(1)}</span>
              </p>
              {today.aiInsight && (
                <p className="text-xs mt-2" style={{ color: "#555", maxWidth: 260 }}>
                  {today.aiInsight}
                </p>
              )}
            </div>
          </div>

          {/* Screen time */}
          <div className="rounded-xl p-5"
            style={{ background: "#0a0a0a", border: "0.5px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} color="#555" />
              <p className="font-mono text-xs tracking-widest" style={{ color: "#555" }}>SCREEN TIME</p>
            </div>
            <p className="text-3xl font-bold font-mono" style={{ color: "#fff" }}>
              {today.screenTimeMinutes ?? "—"}
              <span className="text-base" style={{ color: "#333" }}>m</span>
            </p>
            <p className="font-mono text-xs mt-1" style={{ color: "#444" }}>
              {today.screenTimeMinutes
                ? `${Math.floor(today.screenTimeMinutes / 60)}h ${today.screenTimeMinutes % 60}m`
                : "No data"}
            </p>
          </div>

          {/* Unlocks */}
          <div className="rounded-xl p-5"
            style={{ background: "#0a0a0a", border: "0.5px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Smartphone size={14} color="#555" />
              <p className="font-mono text-xs tracking-widest" style={{ color: "#555" }}>UNLOCKS</p>
            </div>
            <p className="text-3xl font-bold font-mono" style={{ color: "#FF5722" }}>
              {today.unlockCount ?? "—"}
            </p>
            <p className="font-mono text-xs mt-1" style={{ color: "#444" }}>times today</p>
          </div>
        </div>

        {/* ── Charts Row ── */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "3fr 2fr" }}>

          {/* Line chart */}
          <div className="rounded-xl p-5"
            style={{ background: "#0a0a0a", border: "0.5px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} color="#FF5722" />
              <p className="font-mono text-xs tracking-widest" style={{ color: "#555" }}>
                IDLEWORTH TREND — 7 DAYS
              </p>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={usageData.stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 10, fontFamily: "monospace" }}
                  tickFormatter={(v) => v?.slice(5)} />
                <YAxis domain={[5, 10]} tick={{ fill: "#444", fontSize: 10, fontFamily: "monospace" }} />
                <Tooltip content={<OrangeTooltip />} />
                <Line type="monotone" dataKey="idleWorthScore" name="Score"
                  stroke="#FF5722" strokeWidth={2} dot={{ fill: "#FF5722", r: 4 }}
                  activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart */}
          <div className="rounded-xl p-5"
            style={{ background: "#0a0a0a", border: "0.5px solid rgba(255,255,255,0.07)" }}>
            <p className="font-mono text-xs tracking-widest mb-3" style={{ color: "#555" }}>
              APP USAGE BY CATEGORY
            </p>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-3">
              {usageData.appUsage.slice(0, 5).map((a) => (
                <span key={a.category} className="flex items-center gap-1 font-mono text-xs" style={{ color: "#666" }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 2, display: "inline-block",
                    background: catColors[a.category] ?? "#333",
                  }} />
                  {a.category}
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={usageData.appUsage.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="category" tick={{ fill: "#444", fontSize: 9, fontFamily: "monospace" }} />
                <YAxis tick={{ fill: "#444", fontSize: 9, fontFamily: "monospace" }} />
                <Tooltip content={<OrangeTooltip />} />
                <Bar dataKey="usageTimeMinutes" name="Minutes" radius={[3, 3, 0, 0]}
                  fill="#FF5722"
                  label={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── AI Insights Log ── */}
        <div className="rounded-xl p-5"
          style={{ background: "#0a0a0a", border: "0.5px solid rgba(255,255,255,0.07)" }}>
          <p className="font-mono text-xs tracking-widest mb-4" style={{ color: "#555" }}>
            AI INSIGHTS — RECENT LOGS
          </p>
          <div className="flex flex-col">
            {[...usageData.stats].reverse().map((s, i) => (
              <div key={s.date}
                className="flex items-start gap-3 py-3"
                style={{ borderBottom: i < usageData.stats.length - 1 ? "0.5px solid rgba(255,255,255,0.05)" : "none" }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: "#FF5722" }} />
                <span className="font-mono text-xs flex-shrink-0 mt-0.5" style={{ color: "#444", minWidth: 60 }}>
                  {s.date?.slice(5)}
                </span>
                <div className="flex-1">
                  <p className="text-sm" style={{ color: "#888", lineHeight: 1.5 }}>{s.aiInsight}</p>
                  <div className="flex gap-4 mt-1">
                    <span className="font-mono text-xs" style={{ color: "#FF5722" }}>
                      SCORE {s.idleWorthScore}
                    </span>
                    <span className="font-mono text-xs" style={{ color: "#333" }}>
                      {s.screenTimeMinutes}m screen · {s.unlockCount} unlocks
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} color="#333" />
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
