import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Search, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Incidents(){
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [details, setDetails] = useState(null);
  const [closing, setClosing] = useState(null); // incidente a cerrar
  const [closeResult, setCloseResult] = useState('reintegrado');
  const [cantidadRep, setCantidadRep] = useState(0);
  const [err, setErr] = useState('');

  const pushToast = (type, msg) => { setToast({ type, msg }); setTimeout(()=>setToast(null), 2400); };

  const fetchList = async () => {
    try {
      const { data } = await axios.get('/api/incidentes/');
      setRows(Array.isArray(data) ? data : (data.results || []));
      setErr('');
    } catch {
      setErr('No se pudo cargar el listado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ fetchList(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return rows.filter(r =>
      [
        r.producto_nombre, r.descripcion, r.estado_incidente, r.tipo_incidente
      ].filter(Boolean).some(v => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const openDetails = (row) => setDetails(row);

  const openCloseModal = (row) => {
    setClosing(row);
    // por defecto: si es irreparable, no tiene sentido “reintegrado”
    setCloseResult(row.tipo_incidente === 'irreparable' ? 'repuesto' : 'reintegrado');
    setCantidadRep(0);
  };

  const doClose = async () => {
    if(!closing) return;

    // Validaciones de UI antes del PATCH
    if (closeResult === 'reintegrado' && closing.tipo_incidente === 'irreparable') {
      pushToast('error', 'Un incidente irreparable no puede reintegrarse.');
      return;
    }
    if (closeResult === 'repuesto') {
      const n = Number(cantidadRep);
      if (!Number.isInteger(n) || n <= 0) {
        pushToast('error', 'Indicá una cantidad repuesta válida (> 0).');
        return;
      }
      if (n > Number(closing.cantidad_afectada || 0)) {
        pushToast('error', `No podés reponer más de ${closing.cantidad_afectada}.`);
        return;
      }
    }

    try {
      const payload = { estado_incidente: 'resuelto', resultado_final: closeResult };
      if (closeResult === 'repuesto') payload.cantidad_repuesta = Number(cantidadRep || 0);
      await axios.patch(`/api/incidentes/${closing.id}/`, payload);
      setClosing(null);
      await fetchList();
      pushToast('success', 'Incidente cerrado.');
    } catch (e) {
      // el backend igual lo valida; mostramos su motivo si viene
      const m = e?.response?.data ? JSON.stringify(e.response.data) : 'No se pudo cerrar el incidente.';
      pushToast('error', m);
    }
  };

  return (
    <Layout>
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="card">
        <div className="emp-header">
          <div>
            <h3>Incidentes</h3>
            <p className="muted">Escribí para buscar. Recién entonces se mostrará la información.</p>
          </div>
          <div className="emp-actions">
            <div className="emp-search">
              <Search size={16} />
              <input placeholder="Buscar por producto, estado o descripción…" value={q} onChange={e=>setQ(e.target.value)} />
            </div>
            <Link to="/incidentes/nuevo" className="btn">Registrar incidente</Link>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th><th>Tipo</th><th>Estado</th><th>Afectado</th><th>Descripción</th><th style={{width:220}}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="6" className="muted">Cargando…</td></tr>}
              {!loading && !q.trim() && (
                <tr><td colSpan="6" className="muted">La información se muestra sólo al buscar.</td></tr>
              )}
              {!loading && q.trim() && err && <tr><td colSpan="6" className="muted">{err}</td></tr>}
              {!loading && q.trim() && !err && filtered.length === 0 && (
                <tr><td colSpan="6" className="muted">Sin resultados para “{q}”.</td></tr>
              )}
              {!loading && q.trim() && !err && filtered.map(r => (
                <tr key={r.id}>
                  <td>{r.producto_nombre || '—'}</td>
                  <td>{r.tipo_incidente}</td>
                  <td>{r.estado_incidente}</td>
                  <td>{r.cantidad_afectada}</td>
                  <td className="muted">{r.descripcion || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-outline" onClick={()=>openDetails(r)}>Ver detalles</button>
                      {(isAdmin || true) && r.estado_incidente !== 'resuelto' && (
                        <button className="btn-outline" onClick={()=>openCloseModal(r)}>Cerrar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalles */}
      {details && (
        <>
          <div className="modal-overlay" onClick={()=>setDetails(null)} />
          <div className="modal" style={{maxWidth: '720px', width:'min(720px, 96vw)'}}>
            <h4 style={{marginTop:0}}>Detalle del incidente</h4>
            <div className="events" style={{marginTop:10}}>
              <div><b>Producto:</b> {details.producto_nombre}</div>
              <div><b>Tipo:</b> {details.tipo_incidente}</div>
              <div><b>Estado:</b> {details.estado_incidente}</div>
              <div><b>Cantidad afectada:</b> {details.cantidad_afectada}</div>
              <div><b>Descripción:</b><br/>{details.descripcion || '—'}</div>
              <div className="muted">Fecha: {new Date(details.fecha_incidente).toLocaleString()}</div>
            </div>
            <div className="modal-actions" style={{marginTop:16}}>
              <button className="btn" style={{background:'#333', color:'#eee'}} onClick={()=>setDetails(null)}>Cerrar</button>
            </div>
          </div>
        </>
      )}

      {/* Cierre */}
      {closing && (
        <>
          <div className="modal-overlay" onClick={()=>setClosing(null)} />
          <div className="modal" style={{maxWidth: 520}}>
            <h4 style={{marginTop:0}}>Cerrar incidente</h4>
            <p className="muted" style={{marginTop:0}}>
              Elegí el resultado. Si es “repuesto”, indicá la cantidad comprada.
            </p>
            <div style={{display:'grid', gap:12}}>
              <label className="underline-field">
                <select
                  value={closeResult}
                  onChange={e=>setCloseResult(e.target.value)}
                  className="select-clean"
                >
                  {/* si es irreparable, no ofrecemos reintegrado */}
                  {closing.tipo_incidente !== 'irreparable' && (
                    <option value="reintegrado">Reintegrado al stock (reparado)</option>
                  )}
                  <option value="repuesto">Repuesto por compra</option>
                  <option value="sin_accion">Sin acción (no vuelve)</option>
                </select>
              </label>
              {closeResult === 'repuesto' && (
                <label className="underline-field">
                  <input
                    type="number"
                    min="1"
                    max={Number(closing.cantidad_afectada || 0)}
                    placeholder={`Cantidad repuesta (máx. ${closing.cantidad_afectada})`}
                    value={cantidadRep}
                    onChange={e=>setCantidadRep(e.target.value)}
                  />
                </label>
              )}
            </div>
            <div className="modal-actions" style={{marginTop:16}}>
              <button className="btn" style={{background:'#333', color:'#eee'}} onClick={()=>setClosing(null)}>Cancelar</button>
              <button className="btn" onClick={doClose}>Confirmar</button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
