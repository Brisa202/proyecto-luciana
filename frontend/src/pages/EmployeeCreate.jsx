import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

import {
  inSet, isEmail, isRequired, minLen, notFuture,
  isDniOrCuit, isPhone
} from '../utils/validators';

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
const ROLES_VALUES = ROLES.map(r => r.value);

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
  const [errs, setErrs] = useState({});

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
    setErrs({});
  };

  const validate = () => {
    const e = {};
    if (!isEdit) {
      if (!isRequired(username) || !minLen(username,3)) e.username = 'Usuario (mín. 3).';
      if (!minLen(password,6)) e.password = 'Contraseña (mín. 6).';
      if (!isEmail(email)) e.email = 'Email inválido.';
    }
    if (!isRequired(nombre)) e.nombre = 'Nombre requerido.';
    if (!isRequired(apellido)) e.apellido = 'Apellido requerido.';
    if (!isRequired(fechaIng) || !notFuture(fechaIng)) e.fecha_ingreso = 'Fecha requerida y no futura.';
    if (fechaEgr && !notFuture(fechaEgr)) e.fecha_egreso = 'Fecha de egreso no puede ser futura.';

    // ✅ Documento OBLIGATORIO (DNI 7–8 dígitos o CUIT válido)
    if (!isDniOrCuit(dni, true)) e.dni = 'Documento requerido: DNI (7–8 dígitos) o CUIT válido (11).';

    // Teléfono básico (opcional)
    if (!isPhone(telefono)) e.telefono = 'Teléfono inválido.';

    if (!inSet(rol, ROLES_VALUES)) e.rol = 'Rol inválido.';
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    const eMap = validate();
    setErrs(eMap);
    if (Object.keys(eMap).length) return;

    try {
      setLoading(true);
      if (!isEdit) {
        const payload = {
          datos_usuario: { username, email, password },
          nombre, apellido,
          dni: dni.trim(),
          telefono,
          direccion,
          fecha_ingreso: fechaIng || null,   // el backend usará "hoy" si es null
          fecha_egreso : fechaEgr || null,
          rol_asignado : rol,
        };
        await axios.post('/api/gestion-empleados/', payload);
        navigate('/empleados', { replace:true, state: { created:true, username } });
      } else {
        const payload = {
          nombre, apellido,
          dni: dni.trim(),
          telefono, direccion,
          fecha_ingreso: fechaIng || null,
          fecha_egreso : fechaEgr || null,
          activo,
          rol_cambio: rol,
        };
        await axios.patch(`/api/gestion-empleados/${id}/`, payload);
        navigate('/empleados', { replace:true, state: { updated:true } });
      }
    } catch (err) {
      // Mostrar errores de campo específicos del backend (e.g. {'dni':['duplicado']})
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        setErrs(prev => ({ ...prev, ...data }));
      }
      const m = data ? JSON.stringify(data) : err.message;
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

              <label className={`underline-field ${errs.username?'field-error':''}`}>
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  value={username}
                  onChange={e=>setUsername(e.target.value)}
                />
              </label>
              {errs.username && <div className="error-text">{String(errs.username)}</div>}

              <label className={`underline-field ${errs.email?'field-error':''}`}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e=>setEmail(e.target.value)}
                />
              </label>
              {errs.email && <div className="error-text">{String(errs.email)}</div>}

              <label className={`underline-field ${errs.password?'field-error':''}`}>
                <input
                  type="password"
                  placeholder="Contraseña (mín. 6)"
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                />
              </label>
              {errs.password && <div className="error-text">{String(errs.password)}</div>}
            </fieldset>
          )}

          <fieldset className="fieldbox">
            <legend>Datos del empleado</legend>

            <div className="two-cols">
              <label className={`underline-field ${errs.nombre?'field-error':''}`}>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={nombre}
                  onChange={e=>setNombre(e.target.value)}
                />
              </label>
              {errs.nombre && <div className="error-text">{String(errs.nombre)}</div>}

              <label className={`underline-field ${errs.apellido?'field-error':''}`}>
                <input
                  type="text"
                  placeholder="Apellido"
                  value={apellido}
                  onChange={e=>setApellido(e.target.value)}
                />
              </label>
              {errs.apellido && <div className="error-text">{String(errs.apellido)}</div>}
            </div>

            <div className="two-cols">
              <label className={`underline-field ${errs.dni?'field-error':''}`}>
                <input
                  inputMode="numeric" pattern="[0-9\-\.]*"
                  type="text" placeholder="DNI / CUIT"
                  value={dni} onChange={e=>setDni(e.target.value)}
                />
              </label>
              {errs.dni && <div className="error-text">{Array.isArray(errs.dni) ? errs.dni[0] : String(errs.dni)}</div>}

              <label className={`underline-field ${errs.telefono?'field-error':''}`}>
                <input
                  type="text" placeholder="Teléfono"
                  value={telefono} onChange={e=>setTelefono(e.target.value)}
                />
              </label>
              {errs.telefono && <div className="error-text">{String(errs.telefono)}</div>}
            </div>

            <label className="underline-field">
              <input type="text" placeholder="Dirección"
                value={direccion} onChange={e=>setDireccion(e.target.value)} />
            </label>

            <div className="two-cols">
              <label className={`underline-field ${errs.fecha_ingreso?'field-error':''}`}>
                <input
                  type="date"
                  placeholder="Fecha de ingreso"
                  value={fechaIng}
                  onChange={e=>setFechaIng(e.target.value)}
                />
              </label>
              {errs.fecha_ingreso && <div className="error-text">{String(errs.fecha_ingreso)}</div>}

              <label className={`underline-field ${errs.fecha_egreso?'field-error':''}`}>
                <input
                  type="date"
                  placeholder="Fecha de egreso (opcional)"
                  value={fechaEgr}
                  onChange={e=>setFechaEgr(e.target.value)}
                />
              </label>
              {errs.fecha_egreso && <div className="error-text">{String(errs.fecha_egreso)}</div>}
            </div>

            <div className="two-cols">
              <label className={`underline-field ${errs.rol?'field-error':''}`}>
                <select value={rol} onChange={e=>setRol(e.target.value)} className="select-clean">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
              {errs.rol && <div className="error-text">{String(errs.rol)}</div>}

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
            <p style={{marginTop:8, color:'#ff7a7a'}}>
              {msg}
            </p>
          )}
        </form>
      </div>
    </Layout>
  );
}
