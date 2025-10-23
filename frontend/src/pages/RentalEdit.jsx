import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

export default function RentalEdit(){
  const { id } = useParams();
  const navigate = useNavigate();

  // -------- clientes ----------
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');    // id del cliente seleccionado
  const [clienteTexto, setClienteTexto] = useState(''); // nombre libre (fallback)
  const [showNewClient, setShowNewClient] = useState(false);
  const [cForm, setCForm] = useState({ nombre:'', apellido:'', documento:'', telefono:'', email:'' });

  // -------- productos / items ----------
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]); // {id?, producto, producto_nombre, cantidad, precio_unit, _dirty, _deleted}

  // -------- estados UI ----------
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');

  // cargar datos iniciales
  useEffect(()=>{
    (async ()=>{
      try{
        const [cab, prods, clis] = await Promise.all([
          axios.get(`/api/alquileres/${id}/`),
          axios.get('/api/productos/'),
          axios.get('/api/clientes/')
        ]);
        // productos
        const arrP = Array.isArray(prods.data) ? prods.data : (prods.data.results || []);
        setProductos(arrP);
        // clientes
        const arrC = Array.isArray(clis.data) ? clis.data : (clis.data.results || []);
        setClientes(arrC);
        // cabecera
        const a = cab.data;
        setClienteTexto(a.cliente || '');
        // intentar preseleccionar cliente por coincidencia exacta "Nombre Apellido"
        const match = arrC.find(c => `${c.nombre} ${c.apellido || ''}`.trim().toLowerCase() === (a.cliente || '').trim().toLowerCase());
        if (match) setClienteId(String(match.id));

        // items actuales del alquiler
        const its = (a.items || []).map(x => ({
          id: x.id,
          producto: x.producto,
          producto_nombre: x.producto_nombre,
          cantidad: x.cantidad,
          precio_unit: x.precio_unit,
          _dirty: false,
          _deleted: false,
        }));
        setItems(its);
      }catch(e){
        setMsg('No se pudo cargar el alquiler.');
      }finally{
        setLoading(false);
      }
    })();
  }, [id]);

  // utilidades de ítems
  const addItem = () => setItems([...items, { id:null, producto:null, producto_nombre:'', cantidad:1, precio_unit:'', _dirty:true }]);
  const rmItem  = (idx) => {
    const row = items[idx];
    if (row.id){ // marcar para borrar (se borrará al guardar)
      const copy = items.slice();
      copy[idx]._deleted = true;
      setItems(copy);
    } else {
      setItems(items.filter((_,i)=>i!==idx));
    }
  };
  const updItem = (idx, patch) => setItems(items.map((r,i)=> i===idx ? { ...r, ...patch, _dirty:true } : r));
  const onSelectProduct = (idx, pid) => {
    const p = productos.find(pr => pr.id === Number(pid));
    updItem(idx, {
      producto: p ? p.id : null,
      producto_nombre: p ? p.nombre : '',
      precio_unit: p ? String(p.precio) : ''
    });
  };
  const itemsActivos = useMemo(()=> items.filter(r => !r._deleted), [items]);

  // crear cliente rápido (modal)
  const quickCreateClient = async (e) => {
    e.preventDefault();
    if(!cForm.nombre.trim()){
      return setMsg('Poné al menos el nombre del cliente.');
    }
    try{
      setSaving(true);
      const { data } = await axios.post('/api/clientes/', cForm); // permitido para cualquier autenticado
      setClientes(prev => [data, ...prev]);
      setClienteId(String(data.id));
      setClienteTexto(`${data.nombre} ${data.apellido || ''}`.trim());
      setShowNewClient(false);
      setCForm({ nombre:'', apellido:'', documento:'', telefono:'', email:'' });
      setMsg('');
    }catch(err){
      const m = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMsg(`No se pudo crear el cliente. ${m}`);
    }finally{ setSaving(false); }
  };

  const onSubmit = async (e) => {
    e.preventDefault(); setMsg('');
    try{
      setSaving(true);

      // nombre final del cliente que guardará la cabecera
      const cli = clientes.find(c => c.id === Number(clienteId));
      const nombreCliente = cli
        ? `${cli.nombre} ${cli.apellido || ''}`.trim()
        : (clienteTexto || '').trim();

      // 1) actualizar cabecera (solo texto del cliente)
      await axios.patch(`/api/alquileres/${id}/`, { cliente: nombreCliente });

      // 2) reconciliar ítems: delete / patch / post
      for(const it of items){
        if (it._deleted && it.id){
          try{
            await axios.delete(`/api/det-alquileres/${it.id}/`);
          }catch(e){
            if(e?.response?.status === 409){
              setMsg('Un ítem no puede borrarse: tiene incidentes abiertos.');
            }else{
              setMsg('No se pudo borrar un ítem.');
            }
          }
          continue;
        }
        if (!it._dirty) continue;

        if (it.id){ // update
          await axios.patch(`/api/det-alquileres/${it.id}/`, {
            producto: it.producto,
            cantidad: Number(it.cantidad),
            precio_unit: String(it.precio_unit)
          });
        } else { // create
          await axios.post('/api/det-alquileres/', {
            alquiler: Number(id),
            producto: it.producto,
            cantidad: Number(it.cantidad),
            precio_unit: String(it.precio_unit)
          });
        }
      }

      navigate('/alquileres', { replace:true, state:{ updated:true, id } });
    }catch(e){
      const m = e?.response?.data ? JSON.stringify(e.response.data) : e.message;
      setMsg(`No se pudo guardar. ${m}`);
    }finally{
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="card">
        <div className="form-header">
          <Link to="/alquileres" className="backlink"><ArrowLeft size={16}/> Volver</Link>
          <h3 style={{margin:'0 0 0 8px'}}>Editar alquiler #{id}</h3>
        </div>

        {loading ? <p className="muted">Cargando…</p> : (
          <form onSubmit={onSubmit} style={{display:'grid', gap:16, marginTop:12, maxWidth:980}}>

            {/* Cliente: select + texto libre + nuevo cliente */}
            <div style={{display:'grid', gap:12, gridTemplateColumns:'1fr 1fr auto'}}>
              <label className="underline-field">
                <select className="select-clean" value={clienteId} onChange={e=>setClienteId(e.target.value)}>
                  <option value="">— Seleccionar cliente —</option>
                  {clientes.map(c=>(
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellido} {c.documento ? `(${c.documento})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="underline-field">
                <input
                  placeholder="Cliente (texto libre)"
                  value={clienteTexto}
                  onChange={e=>{ setClienteTexto(e.target.value); if (clienteId) setClienteId(''); }}
                />
              </label>
              <button type="button" className="btn" onClick={()=>setShowNewClient(true)}>
                <Plus size={16} style={{verticalAlign:'-2px'}}/> Nuevo
              </button>
            </div>

            {/* Ítems */}
            <div className="card" style={{background:'#0d0d0d', border:'1px dashed #333'}}>
              <h4 style={{marginTop:0}}>Ítems</h4>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{width:'40%'}}>Producto</th>
                      <th style={{width:120}}>Cantidad</th>
                      <th style={{width:160}}>Precio unit.</th>
                      <th style={{width:60}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsActivos.map((it, idxUI)=>{
                      const idx = items.findIndex(r=>!r._deleted && r===it);
                      return (
                        <tr key={`${it.id ?? 'new'}-${idx}`}>
                          <td>
                            <label className="underline-field" style={{margin:0}}>
                              <select className="select-clean"
                                      value={it.producto || ''}
                                      onChange={e=>onSelectProduct(idx, e.target.value)}>
                                <option value="">— Seleccionar —</option>
                                {productos.map(p=>(
                                  <option key={p.id} value={p.id}>
                                    {p.nombre} ({p.categoria_display}) — stock {p.stock}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </td>
                          <td>
                            <label className="underline-field" style={{margin:0}}>
                              <input type="number" min="1"
                                value={it.cantidad}
                                onChange={e=>updItem(idx, {cantidad: Number(e.target.value)})}/>
                            </label>
                          </td>
                          <td>
                            <label className="underline-field" style={{margin:0}}>
                              <input type="number" step="0.01" min="0"
                                value={it.precio_unit}
                                onChange={e=>updItem(idx, {precio_unit: e.target.value})}/>
                            </label>
                          </td>
                          <td>
                            <button type="button" className="btn-outline danger" onClick={()=>rmItem(idx)}>
                              <Trash2 size={14}/>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button type="button" className="btn" onClick={addItem}>
                <Plus size={16} style={{verticalAlign:'-2px'}}/> Agregar ítem
              </button>
            </div>

            <div style={{display:'flex', gap:8}}>
              <button className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
              <Link to="/alquileres" className="btn" style={{background:'#333', color:'#eee'}}>Cancelar</Link>
            </div>

            {msg && <p style={{marginTop:8, color:'#ff7a7a'}}>{msg}</p>}
          </form>
        )}
      </div>

      {/* Modal Nuevo Cliente */}
      {showNewClient && (
        <>
          <div className="modal-overlay" onClick={()=>setShowNewClient(false)} />
          <div className="modal" style={{maxWidth:520}}>
            <h4 style={{marginTop:0}}>Nuevo cliente</h4>
            <form onSubmit={quickCreateClient} style={{display:'grid', gap:12}}>
              <div style={{display:'grid', gap:12, gridTemplateColumns:'1fr 1fr'}}>
                <label className="underline-field">
                  <input placeholder="Nombre *" value={cForm.nombre} onChange={e=>setCForm(s=>({...s, nombre:e.target.value}))} required/>
                </label>
                <label className="underline-field">
                  <input placeholder="Apellido" value={cForm.apellido} onChange={e=>setCForm(s=>({...s, apellido:e.target.value}))}/>
                </label>
              </div>
              <div style={{display:'grid', gap:12, gridTemplateColumns:'1fr 1fr'}}>
                <label className="underline-field">
                  <input placeholder="Documento" value={cForm.documento} onChange={e=>setCForm(s=>({...s, documento:e.target.value}))}/>
                </label>
                <label className="underline-field">
                  <input placeholder="Teléfono" value={cForm.telefono} onChange={e=>setCForm(s=>({...s, telefono:e.target.value}))}/>
                </label>
              </div>
              <label className="underline-field">
                <input type="email" placeholder="Email" value={cForm.email} onChange={e=>setCForm(s=>({...s, email:e.target.value}))}/>
              </label>

              <div className="modal-actions">
                <button className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
                <button type="button" className="btn" style={{background:'#333', color:'#eee'}} onClick={()=>setShowNewClient(false)}>Cancelar</button>
              </div>
            </form>
            {msg && <p style={{marginTop:8, color:'#ff7a7a'}}>{msg}</p>}
          </div>
        </>
      )}
    </Layout>
  );
}
