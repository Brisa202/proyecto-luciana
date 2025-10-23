import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { Search, CheckCircle2, AlertTriangle, Plus, Trash2, Pencil } from 'lucide-react';

export default function Rentals(){
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [details, setDetails] = useState(null); // modal ver items
  const location = useLocation();
  const navigate = useNavigate();

  const pushToast = (type, msg) => { setToast({type, msg}); setTimeout(()=>setToast(null), 2200); };

  const fetchList = async () => {
    try{
      const { data } = await axios.get('/api/alquileres/');
      setRows(Array.isArray(data) ? data : (data.results || []));
    }catch{
      /* ignore */
    } finally{
      setLoading(false);
    }
  };

  useEffect(()=>{ fetchList(); }, []);

  useEffect(()=>{
    if(location.state?.created){
      pushToast('success', `Alquiler #${location.state.id} creado.`);
      window.history.replaceState({}, document.title);
    }
    if(location.state?.updated){
      pushToast('success', `Alquiler #${location.state.id} actualizado.`);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filtered = useMemo(()=>{
    const t = q.trim().toLowerCase();
    if(!t) return rows;
    return rows.filter(r =>
      [r.id, r.cliente, r.creado_en].filter(Boolean)
        .some(v => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const onDelete = async (id) => {
    if(!window.confirm(`¿Borrar alquiler #${id}?`)) return;
    try{
      await axios.delete(`/api/alquileres/${id}/`);
      pushToast('success', 'Alquiler borrado.');
      fetchList();
    }catch(e){
      const code = e?.response?.status;
      if(code === 409) pushToast('error','No puede borrarse: hay incidentes abiertos.');
      else pushToast('error','No se pudo borrar.');
    }
  };

  // ⬇⬇⬇ AQUÍ el cambio: navegar a /alquileres/:id/editar
  const onEdit = (id) => {
    navigate(`/alquileres/${id}/editar`);
  };

  return (
    <Layout>
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type==='success'?<CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="card">
        <div className="emp-header">
          <div>
            <h3>Alquileres</h3>
            <p className="muted">Listado de alquileres creados.</p>
          </div>
        <div className="emp-actions">
            <div className="emp-search">
              <Search size={16} />
              <input
                placeholder="Buscar por cliente, fecha o #ID…"
                value={q}
                onChange={e=>setQ(e.target.value)}
              />
            </div>
            <Link to="/alquileres/nuevo" className="btn">
              <Plus size={16} style={{verticalAlign:'-2px'}}/> Nuevo alquiler
            </Link>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Creado</th>
                <th>Ítems</th>
                <th style={{width:220}}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="5" className="muted">Cargando…</td></tr>}

              {!loading && filtered.map(r=>(
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>{r.cliente || '—'}</td>
                  <td className="muted">
                    {r.creado_en ? new Date(r.creado_en).toLocaleString() : '—'}
                  </td>
                  <td>{Number.isFinite(r.items_count) ? r.items_count : (r.items?.length || 0)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-outline" onClick={()=>setDetails(r)}>Ver ítems</button>
                      <button className="btn-outline" onClick={()=>onEdit(r.id)}>
                        <Pencil size={14}/> Editar
                      </button>
                      <button className="btn-outline danger" onClick={()=>onDelete(r.id)}>
                        <Trash2 size={14}/> Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && filtered.length===0 && (
                <tr><td colSpan="5" className="muted">Sin resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ver ítems */}
      {details && (
        <>
          <div className="modal-overlay" onClick={()=>setDetails(null)} />
          <div className="modal" style={{maxWidth: 700}}>
            <h4 style={{marginTop:0}}>Ítems del alquiler #{details.id}</h4>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Producto</th><th>Cant.</th><th>Precio unit.</th></tr></thead>
                <tbody>
                  {(details.items || []).map(it=>(
                    <tr key={it.id}>
                      <td>{it.producto_nombre || it.producto}</td>
                      <td>{it.cantidad}</td>
                      <td>${it.precio_unit}</td>
                    </tr>
                  ))}
                  {(!details.items || details.items.length===0) && (
                    <tr><td colSpan="3" className="muted">No hay ítems.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="modal-actions" style={{marginTop:12}}>
              <button className="btn" style={{background:'#333', color:'#eee'}} onClick={()=>setDetails(null)}>Cerrar</button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
