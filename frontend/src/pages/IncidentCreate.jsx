import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { ArrowLeft } from 'lucide-react';

const TIPOS = [
  { value: 'irreparable', label: 'Daño irreparable (rotura, pérdida)' },
  { value: 'reparable',   label: 'Daño reparable (se repone/limpia)' },
];

export default function IncidentCreate(){
  const navigate = useNavigate();

  // selects en cascada
  const [alquileres, setAlquileres] = useState([]);
  const [alquilerId, setAlquilerId] = useState('');
  const [detalles, setDetalles] = useState([]);
  const [detId, setDetId] = useState('');

  // resto del formulario
  const [tipo, setTipo] = useState('irreparable');
  const [cantidad, setCantidad] = useState(1);
  const [descripcion, setDescripcion] = useState('');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // info para topes
  const [abiertos, setAbiertos] = useState([]); // incidentes abiertos del det seleccionado

  // 1) cargar alquileres
  useEffect(()=>{
    (async ()=>{
      try{
        const { data } = await axios.get('/api/alquileres/', { params:{ ordering: '-id' }});
        setAlquileres(Array.isArray(data) ? data : (data.results || []));
      }catch{/* ignore */}
    })();
  }, []);

  // 2) al cambiar alquiler → cargar detalles
  useEffect(()=>{
    setDetId('');
    setDetalles([]);
    if(!alquilerId) return;
    (async ()=>{
      try{
        const { data } = await axios.get('/api/det-alquileres/', { params:{ alquiler: alquilerId }});
        setDetalles(Array.isArray(data) ? data : (data.results || []));
      }catch{/* ignore */}
    })();
  }, [alquilerId]);

  // 3) al cambiar detalle → traer incidentes abiertos de ese detalle para calcular disponible
  useEffect(()=>{
    setAbiertos([]);
    if(!detId) return;
    (async ()=>{
      try{
        // si tu API no soporta filtros, trae todo y filtrá en cliente
        const { data } = await axios.get('/api/incidentes/', { params:{ det_alquiler: detId }});
        const arr = Array.isArray(data) ? data : (data.results || []);
        setAbiertos(arr.filter(x => x.estado_incidente !== 'resuelto'));
      }catch{/* ignore */}
    })();
  }, [detId]);

  // cálculo de disponible máximo = cantidad del detalle - sum(cantidades afectadas de incidentes abiertos)
  const maxDisponible = useMemo(()=>{
    const det = detalles.find(d => String(d.id) === String(detId));
    if(!det) return 0;
    const usados = abiertos.reduce((acc, it) => acc + Number(it.cantidad_afectada || 0), 0);
    return Math.max(0, Number(det.cantidad || 0) - usados);
  }, [detalles, detId, abiertos]);

  const onSubmit = async (e) => {
    e.preventDefault(); setMsg('');

    if(!alquilerId || !detId){
      setMsg('Seleccioná el alquiler y el ítem.');
      return;
    }
    if(maxDisponible <= 0){
      setMsg('Ese ítem ya no tiene disponibilidad para incidentar.');
      return;
    }
    const cant = Number(cantidad);
    if(!Number.isInteger(cant) || cant <= 0){
      setMsg('La cantidad afectada debe ser un entero mayor a 0.');
      return;
    }
    if(cant > maxDisponible){
      setMsg(`No podés incidentar más de ${maxDisponible}.`);
      return;
    }

    try{
      setSaving(true);
      await axios.post('/api/incidentes/', {
        det_alquiler: Number(detId),
        tipo_incidente: tipo,                  // 👈 nombre correcto
        cantidad_afectada: Number(cantidad),   // 👈 nombre correcto
        descripcion
        // estado_incidente por defecto es 'abierto' en el back
      });
      navigate('/incidentes', { replace:true, state:{ created:true } });
    }catch(err){
      const m = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMsg(`No se pudo registrar el incidente. ${m}`);
    }finally{
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="card">
        <div className="form-header">
          <Link to="/incidentes" className="backlink"><ArrowLeft size={16}/> Volver</Link>
          <h3 style={{margin:'0 0 0 8px'}}>Registrar incidente</h3>
        </div>

        <form onSubmit={onSubmit} style={{display:'grid', gap:16, marginTop:12, maxWidth:720}}>
          {/* Alquiler */}
          <label className="underline-field">
            <select
              className="select-clean"
              value={alquilerId}
              onChange={e=>setAlquilerId(e.target.value)}
            >
              <option value="">— Seleccionar alquiler —</option>
              {alquileres.map(a=>(
                <option key={a.id} value={a.id}>
                  #{a.id} · {a.cliente || 'sin cliente'}
                </option>
              ))}
            </select>
          </label>

          {/* Ítem del alquiler */}
          <label className="underline-field">
            <select
              className="select-clean"
              value={detId}
              disabled={!alquilerId}
              onChange={e=>setDetId(e.target.value)}
            >
              <option value="">— Seleccionar ítem —</option>
              {detalles.map(d=>(
                <option key={d.id} value={d.id}>
                  #{d.id} · {d.producto_nombre || `Prod ${d.producto}`} · x{d.cantidad}
                </option>
              ))}
            </select>
          </label>

          {/* Tipo de daño y cantidad */}
          <div style={{display:'grid', gap:12, gridTemplateColumns:'1fr 160px'}}>
            <label className="underline-field">
              <select className="select-clean" value={tipo} onChange={e=>setTipo(e.target.value)}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="underline-field">
              <input
                type="number"
                min="1"
                max={Math.max(1, maxDisponible)}
                value={cantidad}
                onChange={e=>setCantidad(e.target.value)}
              />
            </label>
          </div>
          {!!detId && (
            <small className="muted">
              Disponible para incidentar: <b>{maxDisponible}</b>
            </small>
          )}

          {/* Descripción */}
          <label className="underline-field">
            <textarea
              rows={3}
              placeholder="Descripción (opcional)"
              value={descripcion}
              onChange={e=>setDescripcion(e.target.value)}
              style={{width:'100%', background:'transparent', border:0, outline:'none', color:'var(--text)', padding:'12px 2px'}}
            />
          </label>

          <div style={{display:'flex', gap:8}}>
            <button className="btn" disabled={saving}>{saving ? 'Registrando…' : 'Registrar'}</button>
            <Link to="/incidentes" className="btn" style={{background:'#333', color:'#eee'}}>Cancelar</Link>
          </div>

          {msg && <p style={{marginTop:8, color:'#ff7a7a'}}>{msg}</p>}
        </form>
      </div>
    </Layout>
  );
}
