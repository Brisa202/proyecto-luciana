import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { DollarSign, Boxes, Hourglass, AlertTriangle, ChevronRight } from 'lucide-react';

const Stat = ({ Icon, title, value }) => (
  <div className="card stat">
    <div className="stat-ic"><Icon size={20} strokeWidth={2.4} /></div>
    <div>
      <small>{title}</small>
      <h3>{value}</h3>
    </div>
  </div>
);

const Event = ({ tone='ok', title, refid, time, amount, badge }) => (
  <div className="event">
    <div className={'event-dot '+tone} />
    <div className="event-body">
      <div className="event-title">
        {title} {refid && <span className="ref">{refid}</span>}
      </div>
      <small className="muted">{time}</small>
    </div>
    {badge && <span className="badge">{badge}</span>}
    {amount && <b className="amount">{amount}</b>}
    <ChevronRight size={16} className="muted" />
  </div>
);

export default function Dashboard(){
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    (async () => {
      const m = await axios.get('/api/metrics/summary/');
      setStats(m.data);
      const a = await axios.get('/api/activity/recent/');
      setActivity(a.data.items);
    })();
  }, []);

  return (
    <Layout>
      <div className="grid">
        <Stat Icon={DollarSign}    title="Ingresos del Mes"    value={stats?.ingresos_mes ?? '—'} />
        <Stat Icon={Boxes}         title="Alquileres Activos"  value={stats?.alquileres_activos ?? '—'} />
        <Stat Icon={Hourglass}     title="Pedidos Pendientes"  value={stats?.pedidos_pendientes ?? '—'} />
        <Stat Icon={AlertTriangle} title="Incidentes Abiertos" value={stats?.incidentes_abiertos ?? '—'} />
      </div>

      <div className="card">
        <h3>Resumen de Actividad Reciente</h3>
        <div className="events">
          {activity.map((ev,i)=>(
            <Event key={i} tone={ev.tone} title={ev.title} refid={ev.ref} time={ev.time} amount={ev.amount} badge={ev.badge} />
          ))}
          {activity.length === 0 && <p className="muted">Sin actividad.</p>}
        </div>
      </div>
    </Layout>
  );
}
