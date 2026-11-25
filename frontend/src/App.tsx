import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import Requests from './Requests';
import {comparison, loadJson, recordsUrl, weeklyBrief, type Category, type Summary, type Week} from './report';

type Dashboard = { summary: Summary; categories: Category[]; weeks: Week[] };
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
  const query = new URLSearchParams(window.location.search);
  const week = query.get('week') || '';
  const selectedStatus = query.get('status') || '';
  const selectedCategory = query.get('category') || '';
  const [copyState, setCopyState] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [draft, setDraft] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');
  useEffect(() => {
    const ctl = new AbortController();
    loadJson<{aiEnabled: boolean}>('/api/handover/options', ctl.signal)
      .then(v => { if (!ctl.signal.aborted) setAiEnabled(v.aiEnabled); })
      .catch(() => { /* The standard brief is always available. */ });
    return () => ctl.abort();
  }, []);
  async function generateDraft() {
    setDrafting(true);
    setDraftError('');
    try {
      const response = await fetch('/api/handover/draft?' + new URLSearchParams({week}), {method:'POST'});
      if (!response.ok) throw Error();
      const result: {draft: string} = await response.json();
      setDraft(result.draft);
      setCopyState('');
    } catch { setDraftError('Could not draft the summary. Check that Ollama is running and the configured model is installed.'); }
    finally { setDrafting(false); }
  }
  useEffect(() => {
    const ctl = new AbortController();
    setError('');
    const filter = week ? '?' + new URLSearchParams({week}) : '';
    Promise.all([loadJson<Summary>('/api/summary'+filter,ctl.signal), loadJson<Category[]>('/api/by-category'+filter,ctl.signal), loadJson<Week[]>('/api/by-week',ctl.signal)])
      .then(([summary,categories,weeks]) => {if (!ctl.signal.aborted) setData({summary,categories,weeks});})
      .catch(e => {if (!ctl.signal.aborted) setError(String(e));});
    return () => ctl.abort();
  },[revision,week]);
  const s=data?.summary;
  const allWeeks=[...(data?.weeks ?? [])].sort((a,b)=>a.week.localeCompare(b.week));
  const weeks=allWeeks.filter(w => !week || w.week === week);
  const cats=[...(data?.categories ?? [])].sort((a,b)=>b.total-a.total || a.category.localeCompare(b.category));
  const rate=s?.completionRate ?? 0;
  const brief = week && s ? weeklyBrief(week, s, allWeeks, cats) : '';
  const handover = draft.trim() ? draft.trim() + '\n\n' + brief : brief;
  async function copyBrief() {
    try { await navigator.clipboard.writeText(handover); setCopyState('Copied'); }
    catch { setCopyState('Select and copy the brief below.'); }
  }
  return <div className="app" data-theme={theme}>
    <header><div className="wordmark"><b className="mark" aria-hidden="true">≋</b>Relay<span>/</span><small>Operations</small></div>
      <label className="palette">Theme <select value={theme} onChange={e=>{const t=e.target.value as Theme;setTheme(t);try{localStorage.setItem('relay-theme',t)}catch{/* Storage is optional. */}}}>{themes.map(t=><option key={t}>{t}</option>)}</select></label></header>
    <main><div className="title"><div><p className="overline">OPERATIONS REPORT</p><h1>Workload overview<span>.</span></h1></div>
      <label className="palette">Reporting week <select value={week} onChange={e=>{
        const url = new URL(window.location.href);
        if(e.target.value) url.searchParams.set('week',e.target.value); else url.searchParams.delete('week');
        window.location.assign(url.href);
      }}><option value="">All weeks</option>{allWeeks.map(w=><option key={w.week}>{w.week}</option>)}</select></label></div>
    {error ? <section role="alert" className="message"><h2>Couldn’t load the report</h2><p>Check that Spring Boot is running on port 8080.</p><code>{error}</code><p><button onClick={()=>refresh(n=>n+1)}>Try again</button></p></section> : !data || !s ? <p role="status">Loading request data…</p> : <>
    <section className="hero"><div className="heroText"><p className="overline">COMPLETION RATE</p><div className="big">{rate.toFixed(1)}<em>%</em></div>
      <p>{s.completed} of {s.total} requests completed</p></div>
      <div className="dial" aria-hidden="true"><div className="arc" style={{background:'conic-gradient(from 225deg, var(--accent) 0 '+ Math.min(100,Math.max(0,rate))*2.7 +'deg, var(--track) 0 270deg, transparent 0)'}}/><i style={{transform:'rotate('+(-135+Math.min(100,Math.max(0,rate))*2.7)+'deg)'}}/><span>COMPLETION</span></div></section>
    <section className="metrics">
      {[{label:'Total requests', value:s.total, status:''}, {label:'Completed', value:s.completed, status:'Completed'},
        {label:'Open requests', value:s.total-s.completed, status:'Open'}].map(k=>
        <div key={k.label}><a href={recordsUrl(week,k.status)}><small>{k.label} ↗</small><strong>{k.value}</strong></a></div>)}
      <div><small>Average effort</small><strong>{s.averageHours.toFixed(1)}<em> h</em></strong></div>
    </section>
    {week && <section className="reportBox"><h2>Week over week</h2><p>{comparison(week,s,allWeeks)}</p></section>}
    <section className="charts"><article><div className="chartHead"><h2>Weekly activity</h2><div className="switch">{(['total','completed'] as const).map(k=><button key={k} aria-pressed={k===series} onClick={()=>setSeries(k)}>{k==='total'?'Total':'Completed'}</button>)}</div></div>
    {weeks.length ? <ResponsiveContainer width="100%" height={210}><AreaChart data={weeks} margin={{top:15,right:18,left:-21,bottom:4}}>
    <defs><linearGradient id="wash" x1="0" x2="0" y1="0" y2="1"><stop stopColor="var(--accent)" stopOpacity=".32"/><stop offset="1" stopColor="var(--accent)" stopOpacity=".01"/></linearGradient></defs>
    <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 6"/><XAxis dataKey="week" tickFormatter={shortDate} tickLine={false} axisLine={false} tickMargin={10} tick={{fontSize:11,fill:'var(--muted)'}}/><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{fontSize:11,fill:'var(--muted)'}}/>
    <Tooltip labelFormatter={v=>shortDate(String(v))} contentStyle={{background:'var(--panel)',border:'1px solid var(--line)',color:'var(--ink)'}}/>
    <Area type="linear" dataKey={series} name={series==='total'?'Total requests':'Completed'} stroke="var(--accent)" strokeWidth={3} fill="url(#wash)" dot={{r:4,fill:'var(--panel)',strokeWidth:2}} isAnimationActive={false}/></AreaChart></ResponsiveContainer>:<p>No weekly activity yet.</p>}</article>
    <article><div className="chartHead"><h2>Category workload</h2></div><div className="legend"><b/>Completed <b/>Open</div>
    {cats.map(c=><div className="category" key={c.category}><div><span>{c.category}</span><small>{c.completed} / {c.total} complete</small></div><div className="bar" style={{width:100*c.total/Math.max(1,cats[0].total)+'%'}}><i style={{width:100*c.completed/Math.max(1,c.total)+'%'}}/></div></div>)}{!cats.length&&<p>No categories yet.</p>}</article></section>
    {week && <section className="reportBox"><div className="chartHead"><h2>Weekly handover</h2>
      <button onClick={copyBrief}>Copy weekly brief</button></div>
      <p>{s.completed} completed · {s.total-s.completed} open</p>
      {cats.filter(c=>c.total>c.completed).map(c=><a className="categoryLink" key={c.category} href={recordsUrl(week,'Open',c.category)}>{c.category} ({c.total-c.completed} open)</a>)}
      {aiEnabled && <div><button disabled={drafting} onClick={generateDraft}>{drafting ? 'Drafting…' : 'Draft management summary'}</button>
        {draftError && <p role="alert">{draftError}</p>}
        {draft && <label className="draftLabel">Review and edit AI draft<textarea value={draft} onChange={e=>{setDraft(e.target.value);setCopyState('');}} rows={4}/></label>}
      </div>}
      <details open={copyState.startsWith('Select') || undefined}><summary>Preview brief</summary><pre>{handover}</pre></details><span role="status">{copyState}</span>
    </section>}
    {query.get('view')==='requests' && <Requests week={week} status={selectedStatus} category={selectedCategory}/>}
    </>}
    <footer>Relay <span>/</span> Operations reporting</footer></main></div>
}
