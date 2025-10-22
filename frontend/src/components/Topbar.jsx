import { useAuth } from '../context/AuthContext';
import { UserRound } from 'lucide-react';

export default function TopBar() {
  const { profile } = useAuth();
  return (
    <header className="topbar">
      <div className="tb-title">
        <h1>Panel de control</h1>
        <p>Resumen ejecutivo del estado de su negocio</p>
      </div>
      <div className="tb-user">
        <div className="tb-avatar"><UserRound size={18} /></div>
        <div className="tb-meta">
          <b>{profile?.is_superuser ? 'Administrador' : (profile?.username || '')}</b>
          <small>{profile?.email}</small>
        </div>
      </div>
    </header>
  );
}
