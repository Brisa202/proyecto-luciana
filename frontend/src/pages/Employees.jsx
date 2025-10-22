import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Search, Pencil, Trash2, AlertTriangle, CheckCircle2, Eye
} from 'lucide-react';

export default function Employees(){
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Toasts
  const [toast, setToast] = useState(null);
  const pushToast = (type, msg) => { setToast({ type, msg }); setTimeout(()=>setToast(null), 2400); };

  // Confirm delete
  const [confirming, setConfirming] = useState(false);
  const [targetId, setTargetId] = useState(null);

  // Detalles (modal)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState(null);

  // si venimos de crear, mostrar toast
  useEffect(() => {
    if (location.state?.created) {
      pushToast('success', `Usuario creado${location.state.username ? `: ${location.state.username}` : ''}.`);
      // limpiar state de navegación para no repetir toast en refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchList = async () => {
    try {
      const { data } = await axios.get('/api/gestion-empleados/');
      setRows(Array.isArray(data) ? data : (data.results || []));
      setErr('');
    } catch {
      setErr('No se pudo cargar el listado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) fetchList(); }, [isAdmin]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return rows.filter(r =>
      [r.nombre, r.apellido, r.dni, r.telefono, r.rol_display]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const askDelete = (id) => { setTargetId(id); setConfirming(true); };

  const doDelete = async () => {
    try {
      await axios.delete(`/api/gestion-empleados/${targetId}/`);
      setConfirming(false); setTargetId(null);
      await fetchList();
      pushToast('success', 'Empleado eliminado.');
    } catch {
      pushToast('error', 'No se pudo eliminar.');
    }
  };

  const openDetails = async (id) => {
    try {
      const { data } = await axios.get(`/api/gestion-empleados/${id}/`);
      setDetails(data);
      setDetailsOpen(true);
    } catch {
      pushToast('error', 'No se pudo obtener el detalle.');
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="card">
          <h3>Acceso restringido</h3>
          <p className="muted">Solo los administradores pueden ver y gestionar empleados.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="card">
        <div className="emp-header">
          <div>
            <h3>Gestión de Empleados</h3>
            <p className="muted">Escribí para buscar. Recién entonces se mostrará la información.</p>
          </div>

          <div className="emp-actions">
            <div className="emp-search">
              <Search size={16} />
              <input
                placeholder="Buscar por nombre, DNI, rol…"
                value={q}
                onChange={(e)=>setQ(e.target.value)}
              />
            </div>
            <Link to="/empleados/nuevo" className="btn">
              <Plus size={16} style={{verticalAlign:'-2px'}} /> Agregar un nuevo empleado
            </Link>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th><th>Apellido</th><th>DNI</th><th>Teléfono</th><th>Rol</th><th style={{width:240}}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="6" className="muted">Cargando…</td></tr>}

              {!loading && !q.trim() && (
                <tr>
                  <td colSpan="6" className="muted">
                    Para proteger datos, la información no se muestra hasta que escribas un término de búsqueda.
                  </td>
                </tr>
              )}

              {!loading && q.trim() && err && <tr><td colSpan="6" className="muted">{err}</td></tr>}
              {!loading && q.trim() && !err && filtered.length === 0 && (
                <tr><td colSpan="6" className="muted">Sin resultados para “{q}”.</td></tr>
              )}

              {!loading && q.trim() && !err && filtered.map(r => (
                <tr key={r.id}>
                  <td>{r.nombre}</td>
                  <td>{r.apellido}</td>
                  <td>{r.dni || '—'}</td>
                  <td>{r.telefono || '—'}</td>
                  <td>{r.rol_display || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-outline" onClick={()=>openDetails(r.id)}>
                        <Eye size={14}/> Ver detalles
                      </button>
                      <button className="btn-outline" onClick={()=>navigate(`/empleados/${r.id}/editar`)}>
                        <Pencil size={14}/> Editar
                      </button>
                      <button className="btn-outline danger" onClick={()=>askDelete(r.id)}>
                        <Trash2 size={14}/> Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal confirm delete */}
      {confirming && (
        <>
          <div className="modal-overlay" onClick={()=>setConfirming(false)} />
          <div className="modal">
            <div className="modal-icon warn"><AlertTriangle size={22}/></div>
            <h4>Eliminar empleado</h4>
            <p className="muted">Esta acción no se puede deshacer. ¿Deseás continuar?</p>
            <div className="modal-actions">
              <button className="btn" style={{background:'#333', color:'#eee'}} onClick={()=>setConfirming(false)}>Cancelar</button>
              <button className="btn" onClick={doDelete}>Eliminar</button>
            </div>
          </div>
        </>
      )}

      {/* Modal detalles */}
      {detailsOpen && details && (
        <>
          <div className="modal-overlay" onClick={()=>setDetailsOpen(false)} />
          <div className="modal" style={{maxWidth: '720px', width:'min(720px, 96vw)'}}>
            <h4 style={{marginTop:0}}>Detalle del empleado</h4>
            <div className="events" style={{marginTop:10}}>
              <div><b>Nombre:</b> {details.nombre} {details.apellido}</div>
              <div><b>Usuario:</b> {details.usuario?.username || '—'} &nbsp; <span className="muted">({details.usuario?.email || 'sin email'})</span></div>
              <div><b>Rol:</b> {details.rol_display || details.rol || '—'}</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                <div><b>DNI:</b> {details.dni || '—'}</div>
                <div><b>Teléfono:</b> {details.telefono || '—'}</div>
              </div>
              <div><b>Dirección:</b> {details.direccion || '—'}</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                <div><b>Ingreso:</b> {details.fecha_ingreso || '—'}</div>
                <div><b>Egreso:</b> {details.fecha_egreso || '—'}</div>
              </div>
              <div><b>Estado:</b> {details.activo ? 'Activo' : 'Inactivo'}</div>
            </div>
            <div className="modal-actions" style={{marginTop:16}}>
              <button className="btn" style={{background:'#333', color:'#eee'}} onClick={()=>setDetailsOpen(false)}>Cerrar</button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
