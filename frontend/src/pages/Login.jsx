import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';        // 👈 usa la instancia con baseURL y auth
import logo from '../assets/logo.png';

export default function Login() {
  const [login, setLogin] = useState('');  // email o username
  const [pass,  setPass]  = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      // 1) pedir tokens (el backend acepta email o username en "username")
      const { data } = await axios.post('/api/token/', {
        username: login,
        password: pass
      });
      const { access, refresh } = data;

      // 2) guardar tokens
      if (remember) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
      } else {
        sessionStorage.setItem('access_token', access);
        sessionStorage.setItem('refresh_token', refresh);
      }

      // 3) validar sesión con el backend antes de navegar (extra seguro)
      await axios.get('/api/perfil/');
      navigate('/dashboard');
    } catch (e) {
      const d = e?.response?.data;
      if (d?.locked_for_minutes) {
        setErr(`Demasiados intentos. Bloqueado por ${d.locked_for_minutes} min.`);
      } else if (d?.remaining_attempts !== undefined) {
        setErr(`Credenciales inválidas. Intentos restantes: ${d.remaining_attempts}.`);
      } else if (typeof d?.detail === 'string') {
        setErr(d.detail);
      } else {
        setErr('No se pudo iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="stage">
      <section className="frame">
        <div className="frame-bg" />
        <div className="frame-overlay" />

        <div className="login-card">
          <img src={logo} alt="HP" className="login-logo" />
          <h2 className="login-title">Iniciar sesión</h2>

          <form className="login-form" onSubmit={onSubmit}>
            <label className="underline-field">
              <input
                type="text"
                placeholder="Email o usuario"
                value={login}
                onChange={(e)=>setLogin(e.target.value)}
                required
              />
            </label>
            <label className="underline-field">
              <input
                type="password"
                placeholder="Contraseña"
                value={pass}
                onChange={(e)=>setPass(e.target.value)}
                required
              />
            </label>

            <div className="login-helper">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e)=>setRemember(e.target.checked)}
                />
                Recordar sesión
              </label>
              <a className="forgot" href="#">¿Olvidaste tu contraseña?</a>
            </div>

            <button className="pill-btn solid" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>

            {err && <p className="login-error">{err}</p>}
          </form>
        </div>
      </section>
    </main>
  );
}
