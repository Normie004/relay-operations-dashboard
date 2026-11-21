import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Summary = { total: number; completed: number; completionRate: number; averageHours: number };
type Category = { category: string; total: number; completed: number };
type Week = { week: string; total: number; completed: number };
type Dashboard = { summary: Summary; categories: Category[]; weeks: Week[] };

async function loadJson<T>(endpoint: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(endpoint, { signal });
  if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

const themes = ['Copper', 'Lagoon', 'Porcelain'] as const;
type Theme = typeof themes[number];
const shortDate = (day: string) => new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', {month:'short',day:'numeric',timeZone:'UTC'});
function initialTheme(): Theme {
  try { return themes.find(t => t === localStorage.getItem('relay-theme')) ?? 'Copper'; }
  catch { return 'Copper'; }
}

export default function App() {
  const [theme,setTheme] = useState<Theme>(initialTheme);
  const [data,setData] = useState<Dashboard|null>(null);
  const [error,setError] = useState('');
  const [revision,refresh] = useState(0);
  const [series,setSeries] = useState<'total'|'completed'>('total');
  useEffect(() => {
    const ctl = new AbortController();
    setError('');
    Promise.all([loadJson<Summary>('/api/summary',ctl.signal), loadJson<Category[]>('/api/by-category',ctl.signal), loadJson<Week[]>('/api/by-week',ctl.signal)])
      .then(([summary,categories,weeks]) => {if (!ctl.signal.aborted) setData({summary,categories,weeks});})
      .catch(e => {if (!ctl.signal.aborted) setError(String(e));});
    return () => ctl.abort();
  },[revision]);
  const s=data?.summary;
  const weeks=[...(data?.weeks ?? [])].sort((a,b)=>a.week.localeCompare(b.week));
  const cats=[...(data?.categories ?? [])].sort((a,b)=>b.total-a.total || a.category.localeCompare(b.category));
  const rate=s?.completionRate ?? 0;
  return <div className="app" data-theme={theme}>
    <header><div className="wordmark"><b className="mark" aria-hidden="true">≋</b>Relay<span>/</span><small>Operations</small></div>
      <label className="palette">Theme <select value={theme} onChange={e=>{const t=e.target.value as Theme;setTheme(t);try{localStorage.setItem('relay-theme',t)}catch{/* Storage is optional. */}}}>{themes.map(t=><option key={t}>{t}</option>)}</select></label></header>
    <main><div className="title"><div><p className="overline">OPERATIONS REPORT</p><h1>Workload overview<span>.</span></h1></div>
      {weeks.length>0 && <p className="period">Week of {shortDate(weeks[0].week)} — {shortDate(weeks[weeks.length-1].week)}, {weeks[weeks.length-1].week.slice(0,4)}</p>}</div>
    {error ? <section role="alert" className="message"><h2>Couldn’t load the report</h2><p>Check that Spring Boot is running on port 8080.</p><code>{error}</code><p><button onClick={()=>refresh(n=>n+1)}>Try again</button></p></section> : !data || !s ? <p role="status">Loading request data…</p> : <>
    <section className="hero"><div className="heroText"><p className="overline">COMPLETION RATE</p><div className="big">{rate.toFixed(1)}<em>%</em></div>
      <p>{s.completed} of {s.total} requests completed</p></div>
      <div className="dial" aria-hidden="true"><div className="arc" style={{background:'conic-gradient(from 225deg, var(--accent) 0 '+ Math.min(100,Math.max(0,rate))*2.7 +'deg, var(--track) 0 270deg, transparent 0)'}}/><i style={{transform:'rotate('+(-135+Math.min(100,Math.max(0,rate))*2.7)+'deg)'}}/><span>COMPLETION</span></div></section>
    <section className="metrics">{[['Total requests',s.total],['Completed',s.completed],['Open requests',s.total-s.completed],['Average effort',s.averageHours.toFixed(1)]].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}{label==='Average effort'&&<em> h</em>}</strong></div>)}</section>
    <section className="charts"><article><div className="chartHead"><h2>Weekly activity</h2><div className="switch">{(['total','completed'] as const).map(k=><button key={k} aria-pressed={k===series} onClick={()=>setSeries(k)}>{k==='total'?'Total':'Completed'}</button>)}</div></div>
    {weeks.length ? <ResponsiveContainer width="100%" height={210}><AreaChart data={weeks} margin={{top:15,right:18,left:-21,bottom:4}}>
    <defs><linearGradient id="wash" x1="0" x2="0" y1="0" y2="1"><stop stopColor="var(--accent)" stopOpacity=".32"/><stop offset="1" stopColor="var(--accent)" stopOpacity=".01"/></linearGradient></defs>
    <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 6"/><XAxis dataKey="week" tickFormatter={shortDate} tickLine={false} axisLine={false} tickMargin={10} tick={{fontSize:11,fill:'var(--muted)'}}/><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{fontSize:11,fill:'var(--muted)'}}/>
    <Tooltip labelFormatter={v=>shortDate(String(v))} contentStyle={{background:'var(--panel)',border:'1px solid var(--line)',color:'var(--ink)'}}/>
    <Area type="linear" dataKey={series} name={series==='total'?'Total requests':'Completed'} stroke="var(--accent)" strokeWidth={3} fill="url(#wash)" dot={{r:4,fill:'var(--panel)',strokeWidth:2}} isAnimationActive={false}/></AreaChart></ResponsiveContainer>:<p>No weekly activity yet.</p>}</article>
    <article><div className="chartHead"><h2>Category workload</h2></div><div className="legend"><b/>Completed <b/>Open</div>
    {cats.map(c=><div className="category" key={c.category}><div><span>{c.category}</span><small>{c.completed} / {c.total} complete</small></div><div className="bar" style={{width:100*c.total/Math.max(1,cats[0].total)+'%'}}><i style={{width:100*c.completed/Math.max(1,c.total)+'%'}}/></div></div>)}{!cats.length&&<p>No categories yet.</p>}</article></section></>}
    <footer>Relay <span>/</span> Operations reporting</footer></main></div>
}
