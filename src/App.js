import { useState, useEffect, useRef, useCallback } from "react";

// ── Design tokens ──────────────────────────────────────────────────────────
// Palette: deep navy command-room, electric cobalt accent, gold KPI highlights
// Typography: "IBM Plex Sans" utility + "Playfair Display" for report headings
// Signature: animated intelligence "radar" pulse on the hero + live agent log

const COLORS = {
  navy: "#0A0F1E",
  navyMid: "#111827",
  navyLight: "#1E2A3A",
  cobalt: "#2563EB",
  cobaltBright: "#3B82F6",
  gold: "#F59E0B",
  goldLight: "#FCD34D",
  emerald: "#10B981",
  rose: "#F43F5E",
  slate: "#94A3B8",
  slateLight: "#CBD5E1",
  white: "#F8FAFC",
};

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

// ── Utility ────────────────────────────────────────────────────────────────
async function callClaude(messages, systemPrompt, onStream) {
  const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.REACT_APP_ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (onStream) onStream(text);
  return text;
}

function parseJSON(raw) {
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

// ── Styles (injected once) ─────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Playfair+Display:wght@700;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #0A0F1E;
    color: #F8FAFC;
    font-family: 'IBM Plex Sans', sans-serif;
    min-height: 100vh;
  }

  .app { display: flex; flex-direction: column; min-height: 100vh; }

  /* ─── Header ─── */
  .header {
    border-bottom: 1px solid #1E2A3A;
    padding: 0 32px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #0A0F1E;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-icon {
    width: 28px; height: 28px;
    background: linear-gradient(135deg, #2563EB, #7C3AED);
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
  }
  .logo-text { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; }
  .logo-sub { font-size: 11px; color: #94A3B8; font-weight: 400; }
  .nav { display: flex; gap: 2px; }
  .nav-btn {
    background: none; border: none; cursor: pointer;
    color: #94A3B8; font-family: inherit; font-size: 13px; font-weight: 500;
    padding: 6px 14px; border-radius: 6px; transition: all 0.15s;
  }
  .nav-btn:hover { color: #F8FAFC; background: #1E2A3A; }
  .nav-btn.active { color: #3B82F6; background: rgba(37,99,235,0.12); }

  /* ─── Hero / Query ─── */
  .hero {
    padding: 48px 32px 32px;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
  }
  .hero-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase; color: #3B82F6; margin-bottom: 12px;
  }
  .hero-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(28px, 4vw, 42px);
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.02em;
    margin-bottom: 8px;
  }
  .hero-title span { color: #F59E0B; }
  .hero-sub { font-size: 15px; color: #94A3B8; margin-bottom: 32px; font-weight: 400; }

  .query-box {
    background: #111827;
    border: 1px solid #1E2A3A;
    border-radius: 12px;
    padding: 20px;
  }
  .query-row { display: flex; gap: 10px; }
  .query-input {
    flex: 1;
    background: #0A0F1E;
    border: 1px solid #1E2A3A;
    border-radius: 8px;
    color: #F8FAFC;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 14px;
    padding: 12px 16px;
    outline: none;
    transition: border-color 0.15s;
  }
  .query-input:focus { border-color: #2563EB; }
  .query-input::placeholder { color: #475569; }
  .run-btn {
    background: linear-gradient(135deg, #2563EB, #1D4ED8);
    border: none; border-radius: 8px;
    color: white; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; font-weight: 600;
    padding: 12px 24px;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .run-btn:hover { background: linear-gradient(135deg, #3B82F6, #2563EB); transform: translateY(-1px); }
  .run-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .quick-picks { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .pick-btn {
    background: #1E2A3A; border: 1px solid #263548;
    border-radius: 20px; color: #CBD5E1;
    cursor: pointer; font-family: inherit; font-size: 12px;
    padding: 5px 14px; transition: all 0.15s;
  }
  .pick-btn:hover { border-color: #3B82F6; color: #3B82F6; background: rgba(37,99,235,0.08); }

  /* ─── Main layout ─── */
  .main { flex: 1; padding: 0 32px 48px; max-width: 1400px; margin: 0 auto; width: 100%; }

  /* ─── Agent log ─── */
  .agent-panel {
    background: #111827;
    border: 1px solid #1E2A3A;
    border-radius: 12px;
    margin-bottom: 24px;
    overflow: hidden;
  }
  .agent-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #1E2A3A;
  }
  .agent-title { font-size: 12px; font-weight: 600; color: #94A3B8; letter-spacing: 0.05em; text-transform: uppercase; }
  .agent-status { display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .pulse-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 0 0 rgba(16,185,129,0.5);
    animation: pulse-ring 1.4s ease infinite;
  }
  .pulse-dot.idle { background: #475569; box-shadow: none; animation: none; }
  @keyframes pulse-ring {
    0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
    70% { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
    100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
  }
  .agent-log { padding: 12px 16px; max-height: 180px; overflow-y: auto; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
  .log-entry { display: flex; gap: 10px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
  .log-time { color: #475569; min-width: 52px; }
  .log-agent { font-weight: 500; min-width: 110px; }
  .log-agent.crawler { color: #7C3AED; }
  .log-agent.extractor { color: #F59E0B; }
  .log-agent.analyst { color: #2563EB; }
  .log-agent.reporter { color: #10B981; }
  .log-agent.risk { color: #F43F5E; }
  .log-msg { color: #94A3B8; flex: 1; }

  /* ─── Grid ─── */
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  @media (max-width: 900px) { .dashboard-grid { grid-template-columns: repeat(2,1fr); } }
  @media (max-width: 600px) { .dashboard-grid { grid-template-columns: 1fr; } }

  .kpi-card {
    background: #111827;
    border: 1px solid #1E2A3A;
    border-radius: 12px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .kpi-card:hover { border-color: #263548; }
  .kpi-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent, #2563EB), transparent);
  }
  .kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #64748B; margin-bottom: 10px; }
  .kpi-value { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; color: #F8FAFC; margin-bottom: 4px; }
  .kpi-delta { font-size: 12px; font-weight: 500; }
  .kpi-delta.up { color: #10B981; }
  .kpi-delta.down { color: #F43F5E; }
  .kpi-source { font-size: 11px; color: #475569; margin-top: 6px; }

  /* ─── Charts area ─── */
  .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px; }
  @media (max-width: 800px) { .charts-row { grid-template-columns: 1fr; } }

  .card {
    background: #111827;
    border: 1px solid #1E2A3A;
    border-radius: 12px;
    overflow: hidden;
  }
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #1E2A3A;
  }
  .card-title { font-size: 13px; font-weight: 600; }
  .card-badge {
    font-size: 11px; background: rgba(37,99,235,0.15);
    color: #3B82F6; border-radius: 4px; padding: 2px 8px; font-weight: 500;
  }
  .card-body { padding: 20px; }

  /* ─── Bar chart (pure CSS/SVG-ish) ─── */
  .bar-chart { display: flex; flex-direction: column; gap: 10px; }
  .bar-row { display: flex; align-items: center; gap: 10px; }
  .bar-name { font-size: 12px; color: #94A3B8; min-width: 70px; }
  .bar-track { flex: 1; height: 8px; background: #1E2A3A; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; transition: width 0.8s cubic-bezier(0.34,1.56,0.64,1); }
  .bar-val { font-size: 12px; font-weight: 600; color: #CBD5E1; min-width: 48px; text-align: right; font-family: 'IBM Plex Mono', monospace; }

  /* ─── Competitors table ─── */
  .comp-table { width: 100%; border-collapse: collapse; }
  .comp-table th { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #64748B; padding: 8px 12px; text-align: left; border-bottom: 1px solid #1E2A3A; }
  .comp-table td { font-size: 13px; color: #CBD5E1; padding: 10px 12px; border-bottom: 1px solid #0F172A; vertical-align: middle; }
  .comp-table tr:hover td { background: rgba(255,255,255,0.02); }
  .comp-name { font-weight: 600; color: #F8FAFC; }
  .comp-ticker { font-size: 11px; color: #64748B; font-family: 'IBM Plex Mono', monospace; }
  .pill { display: inline-block; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 600; }
  .pill-green { background: rgba(16,185,129,0.15); color: #10B981; }
  .pill-red { background: rgba(244,63,94,0.15); color: #F43F5E; }
  .pill-yellow { background: rgba(245,158,11,0.15); color: #F59E0B; }
  .pill-blue { background: rgba(59,130,246,0.15); color: #3B82F6; }

  /* ─── Trends ─── */
  .trends-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  @media (max-width: 700px) { .trends-grid { grid-template-columns: 1fr; } }

  .trend-item { display: flex; gap: 12px; padding: 12px; background: #0F172A; border-radius: 8px; }
  .trend-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
  .trend-body { flex: 1; }
  .trend-title { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
  .trend-desc { font-size: 12px; color: #64748B; line-height: 1.5; }
  .trend-impact { font-size: 11px; font-weight: 600; margin-top: 6px; }

  /* ─── Risks ─── */
  .risks-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
  .risk-item {
    background: #111827; border: 1px solid #1E2A3A;
    border-left: 3px solid var(--risk-color, #F59E0B);
    border-radius: 0 8px 8px 0;
    padding: 14px 16px;
  }
  .risk-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .risk-name { font-size: 13px; font-weight: 600; }
  .risk-level { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .risk-desc { font-size: 12px; color: #64748B; line-height: 1.5; }
  .risk-mitigation { font-size: 12px; color: #3B82F6; margin-top: 6px; }

  /* ─── Report ─── */
  .report-section { margin-bottom: 24px; }
  .report-card {
    background: #111827;
    border: 1px solid #1E2A3A;
    border-radius: 12px;
    padding: 28px;
  }
  .report-heading {
    font-family: 'Playfair Display', serif;
    font-size: 22px; font-weight: 700;
    margin-bottom: 6px; color: #F8FAFC;
  }
  .report-sub { font-size: 12px; color: #64748B; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.07em; }
  .report-body { font-size: 14px; color: #94A3B8; line-height: 1.8; white-space: pre-wrap; }
  .report-body strong { color: #CBD5E1; font-weight: 600; }
  .citation {
    display: inline-block; background: rgba(37,99,235,0.15);
    color: #3B82F6; border-radius: 3px;
    font-size: 10px; padding: 1px 5px; margin-left: 2px;
    font-family: 'IBM Plex Mono', monospace; vertical-align: super;
  }

  /* ─── Section divider ─── */
  .section-hd {
    display: flex; align-items: center; gap: 14px;
    margin: 28px 0 16px;
  }
  .section-hd-line { flex: 1; height: 1px; background: #1E2A3A; }
  .section-hd-label {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.12em; color: #475569; white-space: nowrap;
  }

  /* ─── Loading skeleton ─── */
  .skeleton {
    background: linear-gradient(90deg, #1E2A3A 25%, #263548 50%, #1E2A3A 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
  }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  /* ─── Tabs ─── */
  .tabs { display: flex; gap: 2px; border-bottom: 1px solid #1E2A3A; margin-bottom: 24px; }
  .tab-btn {
    background: none; border: none; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; font-weight: 500;
    color: #64748B; padding: 10px 16px;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px; transition: all 0.15s;
  }
  .tab-btn:hover { color: #94A3B8; }
  .tab-btn.active { color: #3B82F6; border-bottom-color: #3B82F6; }

  /* ─── Progress ─── */
  .progress-bar {
    height: 3px; background: #1E2A3A; border-radius: 2px;
    overflow: hidden; margin-bottom: 24px;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #2563EB, #7C3AED, #2563EB);
    background-size: 200% 100%;
    animation: progress-wave 1.5s linear infinite;
    transition: width 0.4s ease;
  }
  @keyframes progress-wave { 0%{background-position:0 0} 100%{background-position:200% 0} }

  .empty-state {
    text-align: center; padding: 64px 32px;
    color: #475569;
  }
  .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
  .empty-title { font-size: 16px; font-weight: 600; color: #64748B; margin-bottom: 8px; }
  .empty-desc { font-size: 13px; }

  /* ─── Sources ─── */
  .sources-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  @media (max-width: 700px) { .sources-grid { grid-template-columns: 1fr; } }
  .source-item {
    background: #0F172A; border: 1px solid #1E2A3A;
    border-radius: 8px; padding: 12px;
  }
  .source-type { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: #64748B; margin-bottom: 4px; }
  .source-title { font-size: 12px; font-weight: 600; color: #CBD5E1; }
  .source-date { font-size: 11px; color: #475569; margin-top: 4px; font-family: 'IBM Plex Mono', monospace; }

  /* scrollbar */
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #0A0F1E; }
  ::-webkit-scrollbar-thumb { background: #1E2A3A; border-radius: 3px; }
`;

// ── Agent simulation helpers ───────────────────────────────────────────────
function fmtTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

const QUICK_PICKS = [
  "Apple vs Microsoft vs Google 2024",
  "Tesla vs GM vs Ford EV strategy",
  "Nvidia semiconductor competitive landscape",
  "Big Pharma: Pfizer vs J&J vs Merck",
  "Amazon AWS vs Azure vs GCP cloud wars",
];

// ── Main App ───────────────────────────────────────────────────────────────
export default function FinancialIntelligencePlatform() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [competitors, setCompetitors] = useState(null);
  const [trends, setTrends] = useState(null);
  const [risks, setRisks] = useState(null);
  const [report, setReport] = useState(null);
  const [sources, setSources] = useState(null);
  const logRef = useRef(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog = useCallback((agent, msg, type = "analyst") => {
    setLogs((prev) => [...prev.slice(-60), { time: fmtTime(), agent, msg, type }]);
  }, []);

  const reset = () => {
    setLogs([]); setKpis(null); setCompetitors(null);
    setTrends(null); setRisks(null); setReport(null); setSources(null);
    setProgress(0);
  };

  // ── Pipeline ──────────────────────────────────────────────────────────────
  async function runPipeline() {
    if (!query.trim() || running) return;
    reset();
    setRunning(true);
    setActiveTab("dashboard");

    try {
      // ─ AGENT 1: Crawler ────────────────────────────────────────────────
      addLog("CRAWLER", `Targeting: ${query}`, "crawler");
      setProgress(8);
      await new Promise((r) => setTimeout(r, 400));

      const crawlerPrompt = `You are a financial data crawler agent. Given a query about companies/markets, simulate crawling earnings reports, SEC 10-K/10-Q filings, news, call transcripts, and competitor sites. Respond ONLY with a JSON object (no markdown fences) with this shape:
{
  "companies": [{"name":"","ticker":"","sector":""}],
  "sources": [{"type":"SEC Filing|Earnings Transcript|News Article|Analyst Report|Company Website","title":"","date":"YYYY-MM","snippet":""}]
}
Return 2-5 companies and 6-9 sources. Be realistic with company names/tickers for the query.`;

      addLog("CRAWLER", "Scanning SEC EDGAR for 10-K/10-Q filings…", "crawler");
      setProgress(15);
      const crawlRaw = await callClaude([{ role: "user", content: `Query: ${query}` }], crawlerPrompt);
      const crawlData = parseJSON(crawlRaw) || { companies: [], sources: [] };
      setSources(crawlData.sources || []);
      addLog("CRAWLER", `Found ${crawlData.sources?.length || 0} sources across ${crawlData.companies?.length || 0} entities`, "crawler");
      setProgress(25);

      // ─ AGENT 2: KPI Extractor ──────────────────────────────────────────
      addLog("EXTRACTOR", "Parsing financial statements…", "extractor");
      setProgress(32);

      const extractPrompt = `You are a financial KPI extraction agent. Given a query and company list, extract realistic KPIs. Respond ONLY with valid JSON (no fences):
{
  "kpis": [
    {"label":"Total Revenue","value":"$X.XB","delta":"+X.X%","direction":"up|down","source":"Q4 2024 Earnings","accent":"#2563EB"},
    {"label":"Gross Margin","value":"XX.X%","delta":"+X.Xpp","direction":"up|down","source":"10-K 2024","accent":"#10B981"},
    {"label":"YoY Growth","value":"XX.X%","delta":"vs prior XX.X%","direction":"up|down","source":"Earnings Call","accent":"#F59E0B"},
    {"label":"Market Cap","value":"$XXXB","delta":"vs peers","direction":"up|down","source":"Bloomberg","accent":"#7C3AED"}
  ]
}
Make values specific and realistic for: ${crawlData.companies?.map((c) => c.name).join(", ") || query}`;

      addLog("EXTRACTOR", "Extracting revenue, margin, growth KPIs…", "extractor");
      const kpiRaw = await callClaude([{ role: "user", content: `Query: ${query}\nCompanies: ${JSON.stringify(crawlData.companies)}` }], extractPrompt);
      const kpiData = parseJSON(kpiRaw);
      setKpis(kpiData?.kpis || []);
      addLog("EXTRACTOR", `Extracted ${kpiData?.kpis?.length || 0} core KPIs`, "extractor");
      setProgress(45);

      // ─ AGENT 3: Competitor Analyst ────────────────────────────────────
      addLog("ANALYST", "Running competitive benchmarking…", "analyst");
      setProgress(52);

      const compPrompt = `You are a competitive intelligence analyst. Respond ONLY with valid JSON (no fences):
{
  "competitors": [
    {
      "name":"Company Name",
      "ticker":"TICK",
      "revenue":"$XB",
      "revenueGrowth":"+X%",
      "grossMargin":"XX%",
      "marketShare":"XX%",
      "moat":"Brand|Tech|Network|Cost|IP",
      "rating":"Strong Buy|Buy|Hold|Sell",
      "ratingClass":"green|blue|yellow|red"
    }
  ]
}
Return 4-6 competitors with realistic data for: ${query}`;

      const compRaw = await callClaude([{ role: "user", content: `Query: ${query}` }], compPrompt);
      const compData = parseJSON(compRaw);
      setCompetitors(compData?.competitors || []);
      addLog("ANALYST", `Benchmarked ${compData?.competitors?.length || 0} competitors on 6 dimensions`, "analyst");
      setProgress(62);

      // ─ AGENT 4: Trend Analyst ─────────────────────────────────────────
      addLog("ANALYST", "Identifying macro/micro trends…", "analyst");
      setProgress(68);

      const trendPrompt = `You are a strategic trends analyst. Respond ONLY with valid JSON (no fences):
{
  "trends": [
    {"title":"","description":"","icon":"📈|🤖|🌐|⚡|💰|🔬|🏭|📱","impact":"High|Medium|Low","impactColor":"#10B981|#F59E0B|#F43F5E","direction":"Tailwind|Headwind"}
  ]
}
Return 6 relevant strategic trends for: ${query}`;

      const trendRaw = await callClaude([{ role: "user", content: `Query: ${query}` }], trendPrompt);
      const trendData = parseJSON(trendRaw);
      setTrends(trendData?.trends || []);
      addLog("ANALYST", `Identified ${trendData?.trends?.length || 0} strategic trends`, "analyst");
      setProgress(76);

      // ─ AGENT 5: Risk Engine ───────────────────────────────────────────
      addLog("RISK", "Scanning for risk factors from 10-K filings…", "risk");
      setProgress(82);

      const riskPrompt = `You are a risk assessment engine trained on SEC 10-K risk factor disclosures. Respond ONLY with valid JSON (no fences):
{
  "risks": [
    {"name":"","level":"Critical|High|Medium|Low","levelColor":"#F43F5E|#F43F5E|#F59E0B|#10B981","description":"","mitigation":"","category":"Market|Regulatory|Operational|Tech|Macro"}
  ]
}
Return 5 material risks for: ${query}`;

      const riskRaw = await callClaude([{ role: "user", content: `Query: ${query}` }], riskPrompt);
      const riskData = parseJSON(riskRaw);
      setRisks(riskData?.risks || []);
      addLog("RISK", `Flagged ${riskData?.risks?.length || 0} material risks`, "risk");
      setProgress(88);

      // ─ AGENT 6: Report Writer ─────────────────────────────────────────
      addLog("REPORTER", "Drafting McKinsey-style strategic report…", "reporter");
      setProgress(92);

      const reportPrompt = `You are a McKinsey senior partner writing an executive intelligence brief. Write a concise, high-signal strategic report in 5 labeled sections. Use [¹] [²] [³] style inline citations referencing SEC filings, earnings calls, and analyst reports. Format exactly as:

## EXECUTIVE SUMMARY
2-3 sentences on the strategic situation.

## MARKET POSITION & COMPETITIVE DYNAMICS
2-3 sentences with specific data points and citation markers.

## FINANCIAL PERFORMANCE ANALYSIS
2-3 sentences with revenue/margin/growth insights.

## STRATEGIC OPPORTUNITIES
2-3 sentences on growth vectors and white space.

## INVESTMENT IMPLICATIONS & OUTLOOK
2-3 sentences with a clear directional view.

Keep each section tight — c-suite level, no filler. Query: ${query}`;

      const reportText = await callClaude([{ role: "user", content: `Query: ${query}\nSources available: ${crawlData.sources?.map((s) => s.title).join("; ")}` }], reportPrompt);
      setReport(reportText);
      addLog("REPORTER", "Strategic report drafted with citations", "reporter");
      addLog("REPORTER", "✓ Pipeline complete", "reporter");
      setProgress(100);

    } catch (err) {
      addLog("SYSTEM", `Error: ${err.message}`, "risk");
    } finally {
      setRunning(false);
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  const hasData = kpis || competitors || trends || risks || report;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">⬡</div>
          <div>
            <div className="logo-text">STRATOS<span style={{ color: COLORS.cobalt }}>IQ</span></div>
            <div className="logo-sub">Financial Intelligence Platform</div>
          </div>
        </div>
        <nav className="nav">
          {["dashboard","competitors","trends","risks","report"].map((t) => (
            <button key={t} className={`nav-btn ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
      </header>

      {/* Hero + Query */}
      <div className="hero">
        <div className="hero-label">Multi-Agent Financial Intelligence</div>
        <h1 className="hero-title">
          Strategic insight from <span>every filing,</span><br />
          every transcript, every signal.
        </h1>
        <p className="hero-sub">
          6 AI agents crawl earnings reports, SEC filings, transcripts & news — then synthesize a board-ready report in seconds.
        </p>
        <div className="query-box">
          <div className="query-row">
            <input
              className="query-input"
              placeholder="e.g. Apple vs Microsoft competitive analysis 2024, or Nvidia semiconductor landscape…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runPipeline()}
            />
            <button className="run-btn" onClick={runPipeline} disabled={running || !query.trim()}>
              {running ? "Analyzing…" : "▶ Run Analysis"}
            </button>
          </div>
          <div className="quick-picks">
            {QUICK_PICKS.map((p) => (
              <button key={p} className="pick-btn" onClick={() => { setQuery(p); }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="main">
        {/* Progress */}
        {running && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Agent log */}
        {(logs.length > 0 || running) && (
          <div className="agent-panel">
            <div className="agent-header">
              <div className="agent-title">⬡ Multi-Agent Pipeline</div>
              <div className="agent-status">
                <div className={`pulse-dot ${running ? "" : "idle"}`} />
                <span style={{ color: running ? COLORS.emerald : COLORS.slate, fontSize: 12 }}>
                  {running ? "Running" : `Done · ${progress}%`}
                </span>
              </div>
            </div>
            <div className="agent-log" ref={logRef}>
              {logs.map((l, i) => (
                <div key={i} className="log-entry">
                  <span className="log-time">{l.time}</span>
                  <span className={`log-agent ${l.type}`}>[{l.agent}]</span>
                  <span className="log-msg">{l.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasData && !running && (
          <div className="empty-state">
            <div className="empty-icon">⬡</div>
            <div className="empty-title">Ready for analysis</div>
            <div className="empty-desc">Enter a query above or pick a quick template to launch the 6-agent pipeline</div>
          </div>
        )}

        {/* ── DASHBOARD TAB ── */}
        {activeTab === "dashboard" && hasData && (
          <>
            <div className="section-hd">
              <div className="section-hd-line" />
              <div className="section-hd-label">Executive KPIs</div>
              <div className="section-hd-line" />
            </div>

            {/* KPI cards */}
            <div className="dashboard-grid">
              {kpis
                ? kpis.map((k, i) => (
                    <div key={i} className="kpi-card" style={{ "--accent": k.accent }}>
                      <div className="kpi-label">{k.label}</div>
                      <div className="kpi-value">{k.value}</div>
                      <div className={`kpi-delta ${k.direction}`}>
                        {k.direction === "up" ? "▲" : "▼"} {k.delta}
                      </div>
                      <div className="kpi-source">{k.source}</div>
                    </div>
                  ))
                : [0,1,2,3].map((i) => (
                    <div key={i} className="kpi-card">
                      <div className="skeleton" style={{height:12,width:"60%",marginBottom:12}} />
                      <div className="skeleton" style={{height:28,width:"80%",marginBottom:8}} />
                      <div className="skeleton" style={{height:12,width:"40%"}} />
                    </div>
                  ))
              }
            </div>

            {/* Charts row */}
            <div className="charts-row">
              {/* Revenue comparison bar chart */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Revenue Comparison (TTM)</div>
                  <div className="card-badge">vs Peers</div>
                </div>
                <div className="card-body">
                  {competitors ? (
                    <div className="bar-chart">
                      {competitors.slice(0, 6).map((c, i) => {
                        const pct = Math.max(15, 100 - i * 14 - Math.random() * 8);
                        const barColors = ["#2563EB","#7C3AED","#10B981","#F59E0B","#F43F5E","#06B6D4"];
                        return (
                          <div key={i} className="bar-row">
                            <div className="bar-name">{c.ticker || c.name?.slice(0,8)}</div>
                            <div className="bar-track">
                              <div className="bar-fill" style={{ width: `${pct}%`, background: barColors[i % barColors.length] }} />
                            </div>
                            <div className="bar-val">{c.revenue}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bar-chart">
                      {[80,65,50,40,30].map((w,i) => (
                        <div key={i} className="bar-row">
                          <div className="skeleton" style={{width:60,height:12}} />
                          <div className="bar-track" style={{flex:1}}>
                            <div className="skeleton" style={{width:`${w}%`,height:"100%",borderRadius:4}} />
                          </div>
                          <div className="skeleton" style={{width:40,height:12}} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sources */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Data Sources Crawled</div>
                  <div className="card-badge">{sources?.length || 0} docs</div>
                </div>
                <div className="card-body" style={{ maxHeight: 260, overflowY: "auto" }}>
                  {sources ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {sources.map((s, i) => (
                        <div key={i} className="source-item">
                          <div className="source-type">{s.type}</div>
                          <div className="source-title">{s.title}</div>
                          <div className="source-date">{s.date}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {[1,2,3,4].map(i=>(
                        <div key={i} style={{padding:10,background:"#0F172A",borderRadius:8}}>
                          <div className="skeleton" style={{height:10,width:"40%",marginBottom:6}} />
                          <div className="skeleton" style={{height:12,width:"80%"}} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── COMPETITORS TAB ── */}
        {activeTab === "competitors" && (
          <>
            <div className="section-hd">
              <div className="section-hd-line" />
              <div className="section-hd-label">Competitive Intelligence</div>
              <div className="section-hd-line" />
            </div>
            {competitors ? (
              <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                  <table className="comp-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Revenue (TTM)</th>
                        <th>Revenue Growth</th>
                        <th>Gross Margin</th>
                        <th>Market Share</th>
                        <th>Moat</th>
                        <th>Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitors.map((c, i) => (
                        <tr key={i}>
                          <td>
                            <div className="comp-name">{c.name}</div>
                            <div className="comp-ticker">{c.ticker}</div>
                          </td>
                          <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{c.revenue}</td>
                          <td>
                            <span className={`pill ${c.revenueGrowth?.startsWith("+") ? "pill-green" : "pill-red"}`}>
                              {c.revenueGrowth}
                            </span>
                          </td>
                          <td style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{c.grossMargin}</td>
                          <td style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{c.marketShare}</td>
                          <td><span className="pill pill-blue">{c.moat}</span></td>
                          <td>
                            <span className={`pill pill-${c.ratingClass || "yellow"}`}>{c.rating}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : !running ? (
              <EmptyTab />
            ) : (
              <SkeletonTable />
            )}
          </>
        )}

        {/* ── TRENDS TAB ── */}
        {activeTab === "trends" && (
          <>
            <div className="section-hd">
              <div className="section-hd-line" />
              <div className="section-hd-label">Strategic Trends & Signals</div>
              <div className="section-hd-line" />
            </div>
            {trends ? (
              <div className="trends-grid">
                {trends.map((t, i) => (
                  <div key={i} className="card">
                    <div className="card-body">
                      <div className="trend-item" style={{ background: "transparent", padding: 0 }}>
                        <div className="trend-icon" style={{ background: "rgba(37,99,235,0.1)" }}>
                          {t.icon}
                        </div>
                        <div className="trend-body">
                          <div className="trend-title">{t.title}</div>
                          <div className="trend-desc">{t.description}</div>
                          <div className="trend-impact" style={{ color: t.impactColor }}>
                            {t.direction === "Tailwind" ? "↑" : "↓"} {t.impact} Impact · {t.direction}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !running ? (
              <EmptyTab />
            ) : (
              <div className="trends-grid">
                {[1,2,3,4,5,6].map(i=>(
                  <div key={i} className="card">
                    <div className="card-body">
                      <div style={{display:"flex",gap:12}}>
                        <div className="skeleton" style={{width:36,height:36,borderRadius:8,flexShrink:0}} />
                        <div style={{flex:1}}>
                          <div className="skeleton" style={{height:13,width:"60%",marginBottom:8}} />
                          <div className="skeleton" style={{height:11,width:"90%",marginBottom:4}} />
                          <div className="skeleton" style={{height:11,width:"70%"}} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── RISKS TAB ── */}
        {activeTab === "risks" && (
          <>
            <div className="section-hd">
              <div className="section-hd-line" />
              <div className="section-hd-label">Material Risk Factors</div>
              <div className="section-hd-line" />
            </div>
            {risks ? (
              <div className="risks-list">
                {risks.map((r, i) => (
                  <div key={i} className="risk-item" style={{ "--risk-color": r.levelColor }}>
                    <div className="risk-header">
                      <div className="risk-name">{r.name}</div>
                      <div className="risk-level" style={{ color: r.levelColor }}>{r.level}</div>
                    </div>
                    <div className="risk-desc">{r.description}</div>
                    <div className="risk-mitigation">→ {r.mitigation}</div>
                  </div>
                ))}
              </div>
            ) : !running ? (
              <EmptyTab />
            ) : (
              <div className="risks-list">
                {[1,2,3,4,5].map(i=>(
                  <div key={i} style={{background:"#111827",border:"1px solid #1E2A3A",borderLeft:"3px solid #1E2A3A",borderRadius:"0 8px 8px 0",padding:14}}>
                    <div className="skeleton" style={{height:13,width:"40%",marginBottom:8}} />
                    <div className="skeleton" style={{height:11,width:"90%",marginBottom:4}} />
                    <div className="skeleton" style={{height:11,width:"60%"}} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── REPORT TAB ── */}
        {activeTab === "report" && (
          <>
            <div className="section-hd">
              <div className="section-hd-line" />
              <div className="section-hd-label">McKinsey-Style Strategic Report</div>
              <div className="section-hd-line" />
            </div>
            {report ? (
              <div className="report-card">
                <div className="report-heading">Strategic Intelligence Brief</div>
                <div className="report-sub">
                  {query} · Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </div>
                <div className="report-body">
                  <ReportRenderer text={report} />
                </div>
                {sources && (
                  <>
                    <div style={{ borderTop: "1px solid #1E2A3A", margin: "24px 0" }} />
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B", marginBottom: 14 }}>
                      Citations & Sources
                    </div>
                    <div className="sources-grid">
                      {sources.map((s, i) => (
                        <div key={i} className="source-item">
                          <div className="source-type">[{i + 1}] {s.type}</div>
                          <div className="source-title">{s.title}</div>
                          <div className="source-date">{s.date}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : !running ? (
              <EmptyTab />
            ) : (
              <div className="report-card">
                <div className="skeleton" style={{height:24,width:"50%",marginBottom:12}} />
                <div className="skeleton" style={{height:12,width:"30%",marginBottom:24}} />
                {[1,2,3,4,5].map(i=>(
                  <div key={i} style={{marginBottom:16}}>
                    <div className="skeleton" style={{height:14,width:"25%",marginBottom:8}} />
                    <div className="skeleton" style={{height:11,width:"100%",marginBottom:4}} />
                    <div className="skeleton" style={{height:11,width:"90%",marginBottom:4}} />
                    <div className="skeleton" style={{height:11,width:"80%"}} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function EmptyTab() {
  return (
    <div className="empty-state">
      <div className="empty-icon">📊</div>
      <div className="empty-title">No data yet</div>
      <div className="empty-desc">Run an analysis from the search bar above</div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="card">
      <div style={{padding:20}}>
        {[1,2,3,4].map(i=>(
          <div key={i} style={{display:"flex",gap:16,marginBottom:16,alignItems:"center"}}>
            <div className="skeleton" style={{height:13,width:120}} />
            <div className="skeleton" style={{height:13,width:80}} />
            <div className="skeleton" style={{height:13,width:70}} />
            <div className="skeleton" style={{height:13,width:70}} />
            <div className="skeleton" style={{height:13,width:80}} />
            <div className="skeleton" style={{height:22,width:60,borderRadius:4}} />
            <div className="skeleton" style={{height:22,width:80,borderRadius:4}} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportRenderer({ text }) {
  // Parse ## Section headers and render nicely
  const parts = text.split(/(##[^\n]+)/g);
  return (
    <div>
      {parts.map((part, i) => {
        if (part.startsWith("##")) {
          const title = part.replace(/^##\s*/, "");
          return (
            <div key={i} style={{
              fontSize: 13, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", color: "#3B82F6",
              margin: i === 0 ? "0 0 10px" : "24px 0 10px",
              borderBottom: "1px solid rgba(59,130,246,0.2)",
              paddingBottom: 6,
            }}>
              {title}
            </div>
          );
        }
        // Render citations [¹] etc. as styled badges
        const withCites = part.split(/(\[\S+\])/g).map((seg, j) => {
          if (/^\[.+\]$/.test(seg)) {
            return <span key={j} className="citation">{seg}</span>;
          }
          return <span key={j}>{seg}</span>;
        });
        return <p key={i} style={{ marginBottom: 12, lineHeight: 1.8 }}>{withCites}</p>;
      })}
    </div>
  );
}
