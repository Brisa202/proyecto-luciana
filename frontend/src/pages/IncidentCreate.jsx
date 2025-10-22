import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { ArrowLeft } from 'lucide-react';

export default function IncidentCreate(){
  const navigate = useNavigate();

  const [detId, setDetId] = useState('');
  const [tipo, setTipo] = useState('reparable');
  const [cant, setCant] = useState(1);
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      setLoading(true);
      const payload = {
        det_alquiler: Number(detId),
        tipo_incidente: tipo,
        cantidad_afectada: Number(cant || 1),
        descripcion: desc,
        // estado_incidente: 'abierto' (default)
      };
      await axios.post('/api/incidentes/', payload);
      navigate('/incidentes', { replace:true, state:{ created: true } });
    } catch (err) {
      const m = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMsg(`No se pudo registrar el incidente. ${m}`);
    } finally {
      setLoading(false);
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
          <label className="underline-field">
            <input type="number" min="1" placeholder="ID del detalle de alquiler"
                   value={detId} onChange={e=>setDetId(e.target.value)} required />
          </label>

          <div className="two-cols">
            <label className="underline-field">
              <select value={tipo} onChange={e=>setTipo(e.target.value)} className="select-clean">
                <option value="reparable">Daño reparable (suciedad, arreglo)</option>
                <option value="irreparable">Daño irreparable (rotura, pérdida)</option>
              </select>
            </label>
            <label className="underline-field">
              <input type="number" min="1" placeholder="Cantidad afectada"
                     value={cant} onChange={e=>setCant(e.target.value)} required />
            </label>
          </div>

          <label className="underline-field">
            <textarea rows={3} placeholder="Descripción (opcional)"
                      style={{width:'100%', background:'transparent', border:0, outline:'none', color:'var(--text)', padding:'12px 2px'}}
                      value={desc} onChange={e=>setDesc(e.target.value)} />
          </label>

          <div style={{display:'flex', gap:8}}>
            <button className="btn" disabled={loading}>{loading ? 'Guardando…' : 'Registrar'}</button>
            <Link to="/incidentes" className="btn" style={{background:'#333', color:'#eee'}}>Cancelar</Link>
          </div>

          {msg && <p style={{marginTop:8, color:'#ff7a7a'}}>{msg}</p>}
        </form>
      </div>
    </Layout>
  );
}
