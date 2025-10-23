import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Eye, Search, Plus, Trash2, Pencil, CheckCircle2, AlertTriangle,
} from 'lucide-react';

export default function Clients() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState(null);
  const [details, setDetails] = useState(null);

  const pushToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2200);
  };

  const fetchList = async () => {
    try {
      const { data } = await axios.get('/api/clientes/');
      setRows(Array.isArray(data) ? data : (data.results || []));
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return rows.filter((r) =>
      [r.nombre, r.apellido, r.email, r.telefono, r.documento]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const onDelete = async (id) => {
    if (!window.confirm('¿Eliminar cliente?')) return;
    try {
      await axios.delete(`/api/clientes/${id}/`);
      pushToast('success', 'Cliente eliminado.');
      fetchList();
    } catch {
      pushToast('error', 'No se pudo eliminar el cliente.');
    }
  };

  return (
    <Layout>
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="card">
        <div className="emp-header">
          <div>
            <h3>Clientes</h3>
            <p className="muted">Escribí algo en el buscador; la información aparece cuando hay coincidencias.</p>
          </div>

          <div className="emp-actions">
            <div className="emp-search">
              <Search size={16} />
              <input
                placeholder="Buscar por nombre, email, documento…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Cualquier usuario autenticado puede crear clientes */}
            <Link to="/clientes/nuevo" className="btn">
              <Plus size={16} style={{ verticalAlign: '-2px' }} /> Nuevo cliente
            </Link>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th style={{ width: 210 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="5" className="muted">Cargando…</td>
                </tr>
              )}

              {!loading && !q.trim() && (
                <tr>
                  <td colSpan="5" className="muted">Escribí un término para ver resultados.</td>
                </tr>
              )}

              {!loading && q.trim() && filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="muted">Sin resultados.</td>
                </tr>
              )}

              {!loading && q.trim() && filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre} {c.apellido}</td>
                  <td>{c.documento || '—'}</td>
                  <td>{c.telefono || '—'}</td>
                  <td className="muted">{c.email || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-outline" onClick={() => setDetails(c)}>
                        <Eye size={14} /> Ver
                      </button>
                      {isAdmin && (
                        <button className="btn-outline" onClick={() => navigate(`/clientes/${c.id}/editar`)}>
                          <Pencil size={14} />
                        </button>
                      )}
                      {isAdmin && (
                        <button className="btn-outline danger" onClick={() => onDelete(c.id)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalles */}
      {details && (
        <>
          <div className="modal-overlay" onClick={() => setDetails(null)} />
          <div className="modal" style={{ maxWidth: 560 }}>
            <h4 style={{ marginTop: 0 }}>Detalles del cliente</h4>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <small className="muted">Nombre</small>
                <div>{details.nombre} {details.apellido}</div>
              </div>
              <div>
                <small className="muted">Documento</small>
                <div>{details.documento || '—'}</div>
              </div>

              <div>
                <small className="muted">Teléfono</small>
                <div>{details.telefono || '—'}</div>
              </div>
              <div>
                <small className="muted">Email</small>
                <div>{details.email || '—'}</div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <small className="muted">Dirección</small>
                <div>{details.direccion || '—'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <small className="muted">Notas</small>
                <div className="muted">{details.notas || '—'}</div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 12 }}>
              <button className="btn" style={{ background: '#333', color: '#eee' }} onClick={() => setDetails(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
