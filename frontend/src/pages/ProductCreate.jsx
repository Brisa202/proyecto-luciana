import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { CATEGORIAS } from './products/categories';
import { ArrowLeft } from 'lucide-react';

export default function ProductCreate(){
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('vajilla');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [activo, setActivo] = useState(true);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await axios.get(`/api/productos/${id}/`);
        setNombre(data.nombre || '');
        setDescripcion(data.descripcion || '');
        setCategoria(data.categoria || 'vajilla');
        setPrecio(String(data.precio || ''));
        setStock(String(data.stock || ''));
        setImagenUrl(data.imagen_url || '');
        setActivo(Boolean(data.activo));
      } catch {
        setMsg('No se pudo cargar el producto.');
      }
    })();
  }, [id, isEdit]);

  if (!isAdmin) {
    return (
      <Layout>
        <div className="card"><h3>Acceso restringido</h3>
          <p className="muted">Solo los administradores pueden gestionar productos.</p>
        </div>
      </Layout>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      setLoading(true);
      const payload = {
        nombre,
        descripcion,
        categoria,
        precio: Number(precio || 0),
        stock: Number(stock || 0),
        imagen_url: imagenUrl,
        activo,
      };
      if (!isEdit) {
        await axios.post('/api/productos/', payload);
        navigate('/productos', { replace:true, state: { created:true, name: nombre } });
      } else {
        await axios.patch(`/api/productos/${id}/`, payload);
        navigate('/productos', { replace:true, state: { updated:true, name: nombre } });
      }
    } catch (err) {
      const m = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMsg(`Operación fallida. ${m}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="card">
        <div className="form-header">
          <Link to="/productos" className="backlink"><ArrowLeft size={16}/> Volver</Link>
          <h3 style={{margin:'0 0 0 8px'}}>{isEdit ? 'Editar producto' : 'Añadir producto'}</h3>
        </div>

        <form onSubmit={onSubmit} style={{display:'grid', gap:16, marginTop:12, maxWidth:840}}>
          <div className="two-cols">
            <label className="underline-field">
              <input type="text" placeholder="Nombre del producto"
                     value={nombre} onChange={e=>setNombre(e.target.value)} required />
            </label>
            <label className="underline-field">
              <select value={categoria} onChange={e=>setCategoria(e.target.value)} className="select-clean">
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
          </div>

          <label className="underline-field">
            <textarea placeholder="Descripción del producto" rows={3}
                      style={{width:'100%', background:'transparent', border:0, outline:'none', color:'var(--text)', padding:'12px 2px'}}
                      value={descripcion} onChange={e=>setDescripcion(e.target.value)} />
          </label>

          <div className="two-cols">
            <label className="underline-field">
              <input type="number" step="0.01" min="0" placeholder="Precio"
                     value={precio} onChange={e=>setPrecio(e.target.value)} required />
            </label>
            <label className="underline-field">
              <input type="number" step="1" min="0" placeholder="Stock"
                     value={stock} onChange={e=>setStock(e.target.value)} required />
            </label>
          </div>

          <div className="two-cols" style={{alignItems:'start'}}>
            <label className="underline-field" style={{gridColumn:'1 / span 1'}}>
              <input type="url" placeholder="URL de la imagen"
                     value={imagenUrl} onChange={e=>setImagenUrl(e.target.value)} />
            </label>

            <div style={{border:'1px dashed #333', borderRadius:12, minHeight:160, display:'grid', placeItems:'center', overflow:'hidden'}}>
              {imagenUrl
                ? <img src={imagenUrl} alt="preview" style={{width:'100%', maxHeight:240, objectFit:'contain'}} />
                : <span className="muted">Preview de la imagen</span>}
            </div>
          </div>

          <label style={{display:'flex', alignItems:'center', gap:10}}>
            <input type="checkbox" checked={activo} onChange={e=>setActivo(e.target.checked)} />
            Activo
          </label>

          <div style={{display:'flex', gap:8}}>
            <button className="btn" disabled={loading}>
              {loading ? (isEdit ? 'Guardando…' : 'Creando…') : (isEdit ? 'Guardar cambios' : 'Guardar producto')}
            </button>
            <Link to="/productos" className="btn" style={{background:'#333', color:'#eee'}}>Cancelar</Link>
          </div>

          {msg && <p style={{marginTop:8, color: msg.includes('fallida') ? '#ff7a7a' : '#3ecf8e'}}>{msg}</p>}
        </form>
      </div>
    </Layout>
  );
}
