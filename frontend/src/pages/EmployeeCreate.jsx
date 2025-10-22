import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

const ROLES = [
  { value: 'administrador',   label: 'Administrador' },
  { value: 'empleado',        label: 'Empleado' },
  { value: 'chofer',          label: 'Chofer' },
  { value: 'operario_carga',  label: 'Operario de Carga y Descarga' },
  { value: 'encargado',       label: 'Encargado' },
  { value: 'limpieza',        label: 'Personal de Limpieza' },
  { value: 'lavanderia',      label: 'Operaria de Lavandería' },
  { value: 'cajero',          label: 'Cajero' },
];

export default function EmployeeCreate(){
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // credenciales (solo crear)
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  // datos
  const [nombre,   setNombre]   = useState('');
  const [apellido, setApellido] = useState('');
  const [dni,      setDni]      = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion,setDireccion]= useState('');
  const [fechaIng, setFechaIng] = useState('');
  const [fechaEgr, setFechaEgr] = useState('');
  const [rol,      setRol]      = useState('empleado');
  const [activo,   setActivo]   = useState(true); // solo edición

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Prefill si edición
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await axios.get(`/api/gestion-empleados/${id}/`);
        setNombre(data.nombre || '');
        setApellido(data.apellido || '');
        setDni(data.dni || '');
        setTelefono(data.telefono || '');
        setDireccion(data.direccion || '');
        setFechaIng(data.fecha_ingreso || '');
        setFechaEgr(data.fecha_egreso || '');
        setActivo(Boolean(data.activo));
        if (data.rol) setRol(data.rol);
      } catch {
        setMsg('No se pudo cargar el empleado.');
      }
    })();
  }, [id, isEdit]);

  if (!isAdmin) {
    return (
      <Layout>
        <div className="card"><h3>Acceso restringido</h3>
          <p className="muted">Solo los administradores pueden gestionar empleados.</p>
        </div>
      </Layout>
    );
  }

  const reset = () => {
    setUsername(''); setEmail(''); setPassword('');
    setNombre(''); setApellido(''); setDni('');
    setTelefono(''); setDireccion('');
    setFechaIng(''); setFechaEgr('');
    setRol('empleado'); setActivo(true); setMsg('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      setLoading(true);
      if (!isEdit) {
        if (password.length < 6) {
          setMsg('La contraseña debe tener al menos 6 caracteres.');
          setLoading(false); return;
        }
        const payload = {
          datos_usuario: { username, email, password },
          nombre, apellido, dni, telefono, direccion,
          fecha_ingreso: fechaIng || null,
          fecha_egreso : fechaEgr || null,
          rol_asignado : rol,
        };
        await axios.post('/api/gestion-empleados/', payload);
        // volver con toast
        navigate('/empleados', { replace:true, state: { created:true, username } });
      } else {
        const payload = {
          nombre, apellido, dni, telefono, direccion,
          fecha_ingreso: fechaIng || null,
          fecha_egreso : fechaEgr || null,
          activo,
          rol_cambio: rol,
        };
        await axios.patch(`/api/gestion-empleados/${id}/`, payload);
        navigate('/empleados', { replace:true, state: { updated:true } });
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
          <Link to="/empleados" className="backlink">
            <ArrowLeft size={16} /> Volver
          </Link>
          <h3 style={{margin:'0 0 0 8px'}}>{isEdit ? 'Editar empleado' : 'Crear empleado'}</h3>
        </div>

        <form onSubmit={onSubmit} style={{display:'grid', gap:16, marginTop:12, maxWidth:720}}>
          {!isEdit && (
            <fieldset className="fieldbox">
              <legend>Credenciales</legend>

              <label className="underline-field">
                <input type="text" placeholder="Nombre de usuario"
                  value={username} onChange={e=>setUsername(e.target.value)} required />
              </label>

              <label className="underline-field">
                <input type="email" placeholder="Email"
                  value={email} onChange={e=>setEmail(e.target.value)} />
              </label>

              <label className="underline-field">
                <input type="password" placeholder="Contraseña (mín. 6)"
                  value={password} onChange={e=>setPassword(e.target.value)} required />
              </label>
            </fieldset>
          )}

          <fieldset className="fieldbox">
            <legend>Datos del empleado</legend>

            <div className="two-cols">
              <label className="underline-field">
                <input type="text" placeholder="Nombre"
                  value={nombre} onChange={e=>setNombre(e.target.value)} required />
              </label>
              <label className="underline-field">
                <input type="text" placeholder="Apellido"
                  value={apellido} onChange={e=>setApellido(e.target.value)} required />
              </label>
            </div>

            <div className="two-cols">
              <label className="underline-field">
                <input type="text" placeholder="DNI"
                  value={dni} onChange={e=>setDni(e.target.value)} />
              </label>
              <label className="underline-field">
                <input type="text" placeholder="Teléfono"
                  value={telefono} onChange={e=>setTelefono(e.target.value)} />
              </label>
            </div>

            <label className="underline-field">
              <input type="text" placeholder="Dirección"
                value={direccion} onChange={e=>setDireccion(e.target.value)} />
            </label>

            <div className="two-cols">
              <label className="underline-field">
                <input type="date" placeholder="Fecha de ingreso"
                  value={fechaIng} onChange={e=>setFechaIng(e.target.value)} required={!isEdit} />
              </label>
              <label className="underline-field">
                <input type="date" placeholder="Fecha de egreso (opcional)"
                  value={fechaEgr} onChange={e=>setFechaEgr(e.target.value)} />
              </label>
            </div>

            <div className="two-cols">
              <label className="underline-field">
                <select value={rol} onChange={e=>setRol(e.target.value)} className="select-clean">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>

              {isEdit && (
                <label className="underline-field" style={{display:'flex', alignItems:'center', gap:10}}>
                  <input type="checkbox" checked={activo} onChange={e=>setActivo(e.target.checked)} />
                  Activo
                </label>
              )}
            </div>
          </fieldset>

          <div style={{display:'flex', gap:8}}>
            <button className="btn" disabled={loading}>
              {loading ? (isEdit ? 'Guardando…' : 'Creando…') : (isEdit ? 'Guardar cambios' : 'Crear empleado')}
            </button>
            <Link to="/empleados" className="btn" style={{background:'#333', color:'#eee'}}>Cancelar</Link>
          </div>

          {msg && (
            <p style={{marginTop:8, color: msg.includes('fallida') ? '#ff7a7a' : '#3ecf8e'}}>
              {msg}
            </p>
          )}
        </form>
      </div>
    </Layout>
  );
}
