import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { isEmail, isRequired, isDniOrCuit, isPhone } from '../utils/validators';

export default function ClientForm(){
  const { isAdmin } = useAuth();
  const { id } = useParams(); // undefined = nuevo
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre:'', apellido:'', documento:'', telefono:'', email:'', direccion:'', notas:'', activo:true
  });
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');
  const [errs, setErrs]       = useState({}); // ✅ errores

  useEffect(()=>{
    if(!id) return;
    (async ()=>{
      try{
        const { data } = await axios.get(`/api/clientes/${id}/`);
        setForm({ ...data });
      }catch{
        setMsg('No se pudo cargar el cliente.');
      }finally{
        setLoading(false);
      }
    })();
  }, [id]);

  const onChange = (k,v)=> { setForm(s=>({...s, [k]:v})); setErrs(e=>({...e, [k]:undefined})); };

  const validate = () => {
    const e = {};
    if(!isRequired(form.nombre)) e.nombre = 'Nombre requerido.';
    if(!isEmail(form.email)) e.email = 'Email inválido.';

    // ✅ NUEVO: Documento como DNI (7–8 dígitos) o CUIT (11 con dígito verificador)
    if(!isDniOrCuit(form.documento, false)) e.documento = 'Documento debe ser DNI (7–8 dígitos) o CUIT válido (11).';

    // ✅ NUEVO: Teléfono
    if(!isPhone(form.telefono)) e.telefono = 'Teléfono inválido.';
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault(); setMsg('');
    const eMap = validate(); setErrs(eMap);
    if(Object.keys(eMap).length) return;

    try{
      setSaving(true);
      if(id) await axios.patch(`/api/clientes/${id}/`, form);
      else   await axios.post('/api/clientes/', form);
      navigate('/clientes', { replace:true, state: { saved:true } });
    }catch(err){
      const m = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMsg(`No se pudo guardar. ${m}`);
    }finally{
      setSaving(false);
    }
  };

  if(!isAdmin) {
    return (
      <Layout>
        <div className="card">
          <h3>Acceso restringido</h3>
          <p className="muted">Solo administradores pueden gestionar clientes.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="card">
        <div className="form-header">
          <Link to="/clientes" className="backlink"><ArrowLeft size={16}/> Volver</Link>
          <h3 style={{margin:'0 0 0 8px'}}>{id ? 'Editar cliente' : 'Nuevo cliente'}</h3>
        </div>

        {loading ? <p className="muted">Cargando…</p> : (
          <form onSubmit={onSubmit} style={{display:'grid', gap:16, marginTop:12, maxWidth:720}}>
            <div style={{display:'grid', gap:12, gridTemplateColumns:'1fr 1fr'}}>
              <label className={`underline-field ${errs.nombre?'field-error':''}`}>
                <input
                  value={form.nombre}
                  onChange={e=>onChange('nombre', e.target.value)}
                  placeholder="Nombre"
                />
              </label>
              {errs.nombre && <div className="error-text">{errs.nombre}</div>}

              <label className="underline-field">
                <input
                  value={form.apellido}
                  onChange={e=>onChange('apellido', e.target.value)}
                  placeholder="Apellido"
                />
              </label>
            </div>

            <div style={{display:'grid', gap:12, gridTemplateColumns:'1fr 1fr'}}>
              <label className={`underline-field ${errs.documento?'field-error':''}`}>
                <input
                  inputMode="numeric" pattern="[0-9\-\.]*"
                  value={form.documento}
                  onChange={e=>onChange('documento', e.target.value)}
                  placeholder="DNI / CUIT"
                />
              </label>
              {errs.documento && <div className="error-text">{errs.documento}</div>}

              <label className={`underline-field ${errs.telefono?'field-error':''}`}>
                <input
                  value={form.telefono}
                  onChange={e=>onChange('telefono', e.target.value)}
                  placeholder="Teléfono"
                />
              </label>
              {errs.telefono && <div className="error-text">{errs.telefono}</div>}
            </div>

            <label className={`underline-field ${errs.email?'field-error':''}`}>
              <input
                value={form.email}
                onChange={e=>onChange('email', e.target.value)}
                type="email"
                placeholder="Email"
              />
            </label>
            {errs.email && <div className="error-text">{errs.email}</div>}

            <label className="underline-field">
              <input
                value={form.direccion}
                onChange={e=>onChange('direccion', e.target.value)}
                placeholder="Dirección"
              />
            </label>

            <label className="underline-field">
              <textarea
                rows={3}
                value={form.notas}
                onChange={e=>onChange('notas', e.target.value)}
                placeholder="Notas"
                style={{width:'100%', background:'transparent', border:0, outline:'none', color:'var(--text)', padding:'12px 2px'}}
              />
            </label>

            <div style={{display:'flex', gap:8}}>
              <button className="btn" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <Link to="/clientes" className="btn" style={{background:'#333', color:'#eee'}}>Cancelar</Link>
            </div>

            {msg && <p style={{marginTop:8, color:'#ff7a7a'}}>{msg}</p>}
          </form>
        )}
      </div>
    </Layout>
  );
}
