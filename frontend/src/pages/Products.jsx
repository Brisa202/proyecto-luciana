import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { CATEGORIAS } from './products/categories';
import { Plus, Search, Pencil, Trash2, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';

export default function Products(){
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [toast, setToast] = useState(null);
  const pushToast = (type, msg) => { setToast({ type, msg }); setTimeout(()=>setToast(null), 2400); };

  const [confirming, setConfirming] = useState(false);
  const [targetId, setTargetId] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState(null);

  const fetchList = async () => {
    try {
      const { data } = await axios.get('/api/productos/');
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
      [r.nombre, r.descripcion, r.categoria_display]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const askDelete = (id) => { setTargetId(id); setConfirming(true); };

  const doDelete = async () => {
    try {
      await axios.delete(`/api/productos/${targetId}/`);
      setConfirming(false); setTargetId(null);
      await fetchList();
      pushToast('success', 'Producto eliminado.');
    } catch {
      pushToast('error', 'No se pudo eliminar.');
    }
  };

  const openDetails = async (id) => {
    try {
      const { data } = await axios.get(`/api/productos/${id}/`);
      setDetails(data);
      setDetailsOpen(true);
    } catch {
      pushToast('error', 'No se pudo obtener el detalle.');
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
            <h3>Gestión de Productos</h3>
            <p className="muted">Escribí para buscar. Recién entonces se mostrará la información.</p>
          </div>
          <div className="emp-actions">
            <div className="emp-search">
              <Search size={16} />
              <input placeholder="Buscar por nombre, descripción o categoría…" value={q} onChange={e=>setQ(e.target.value)} />
            </div>
            {isAdmin && (
              <Link to="/productos/nuevo" className="btn">
                <Plus size={16} style={{verticalAlign:'-2px'}} /> Agregar un nuevo producto
              </Link>
            )}
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Imagen</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th style={{width:240}}></th>
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
                  <td>
                    {r.imagen_url
                      ? <img src={r.imagen_url} alt="" style={{width:44, height:44, objectFit:'cover', borderRadius:8, border:'1px solid #222'}} />
                      : <span className="muted">—</span>
                    }
                  </td>
                  <td>{r.nombre}</td>
                  <td>{r.categoria_display}</td>
                  <td>${Number(r.precio).toLocaleString()}</td>
                  <td>{r.stock}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-outline" onClick={()=>openDetails(r.id)}><Eye size={14}/> Ver detalles</button>
                      {isAdmin && (
                        <>
                          <button className="btn-outline" onClick={()=>navigate(`/productos/${r.id}/editar`)}><Pencil size={14}/> Editar</button>
                          <button className="btn-outline danger" onClick={()=>askDelete(r.id)}><Trash2 size={14}/> Borrar</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirming && (
        <>
          <div className="modal-overlay" onClick={()=>setConfirming(false)} />
          <div className="modal">
            <div className="modal-icon warn"><AlertTriangle size={22}/></div>
            <h4>Eliminar producto</h4>
            <p className="muted">Esta acción no se puede deshacer. ¿Deseás continuar?</p>
            <div className="modal-actions">
              <button className="btn" style={{background:'#333', color:'#eee'}} onClick={()=>setConfirming(false)}>Cancelar</button>
              <button className="btn" onClick={doDelete}>Eliminar</button>
            </div>
          </div>
        </>
      )}

      {detailsOpen && details && (
        <>
          <div className="modal-overlay" onClick={()=>setDetailsOpen(false)} />
          <div className="modal" style={{maxWidth: '720px', width:'min(720px, 96vw)'}}>
            <h4 style={{marginTop:0}}>Detalle del producto</h4>
            <div className="events" style={{marginTop:10}}>
              <div><b>Nombre:</b> {details.nombre}</div>
              <div><b>Categoría:</b> {details.categoria_display}</div>
              <div><b>Precio:</b> ${Number(details.precio).toLocaleString()}</div>
              <div><b>Stock:</b> {details.stock}</div>
              <div><b>Imagen:</b> {details.imagen_url ? <a href={details.imagen_url} target="_blank" rel="noreferrer">abrir</a> : '—'}</div>
              <div><b>Descripción:</b><br/>{details.descripcion || '—'}</div>
              <div><b>Estado:</b> {details.activo ? 'Activo' : 'Inactivo'}</div>
              <div className="muted">Creado: {new Date(details.created_at).toLocaleString()}</div>
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
