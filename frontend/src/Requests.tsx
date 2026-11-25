import {useEffect, useState} from 'react';
import {loadJson, type RequestRow} from './report';

export default function Requests({week, status, category}: {week: string; status: string; category: string}) {
  const [rows, setRows] = useState<RequestRow[]>();
  const [error, setError] = useState('');
  const [attempt, retry] = useState(0);
  useEffect(() => {
    const ctl = new AbortController();
    const query = new URLSearchParams();
    if (week) query.set('week', week);
    if (status) query.set('status', status);
    if (category) query.set('category', category);
    setRows(undefined);
    setError('');
    loadJson<RequestRow[]>('/api/requests?' + query, ctl.signal)
      .then(value => { if (!ctl.signal.aborted) setRows(value); })
      .catch(err => { if (!ctl.signal.aborted) setError(String(err)); });
    return () => ctl.abort();
  }, [week, status, category, attempt]);

  useEffect(() => { document.getElementById('requests')?.scrollIntoView({block: 'start'}); }, []);
  return <section className="reportBox" id="requests">
    <h2>{status || 'All'} requests{category && ' · '+category}</h2>
    <p>{week || 'All reporting weeks'}{rows && ' · '+rows.length+' records'}</p>
    {error ? <p role="alert">{error} <button onClick={()=>retry(a=>a+1)}>Retry</button></p> :
      !rows ? <p role="status">Loading requests…</p> : !rows.length ? <p>No matching requests.</p> :
      <div className="recordsScroll"><table><thead><tr>{['Request ID','Reporting week','Category','Status','Effort'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>
        {rows.map(r=><tr key={r.id}><td>#{r.id}</td><td>{r.week}</td><td>{r.category}</td><td>{r.status}</td><td>{r.effortHours} h</td></tr>)}
      </tbody></table></div>}
  </section>;
}
