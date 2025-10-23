import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../api/axios';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { hasMinItems, isNonNegNumber, isPositiveInt, isRequired, firstError } from '../utils/validators';

export default function RentalCreate() {
  const navigate = useNavigate();

  // ---------- clientes ----------
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [filteredClientes, setFilteredClientes] = useState([]); // Para la búsqueda de clientes
  const [searchTerm, setSearchTerm] = useState(''); // Término de búsqueda
  const [showNewClient, setShowNewClient] = useState(false);
  const [cForm, setCForm] = useState({ nombre: '', apellido: '', documento: '', telefono: '', email: '' });

  const [clienteError, setClienteError] = useState(''); // Error si el cliente no es encontrado

  // ---------- items ----------
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]); // {producto, cantidad, precio_unit, producto_nombre}

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [errs, setErrs] = useState({});     // errores de cabecera
  const [itemErrs, setItemErrs] = useState([]); // errores por fila

  // cargar clientes y productos
  useEffect(() => {
    (async () => {
      try {
        const [{ data: cl }, { data: pr }] = await Promise.all([
          axios.get('/api/clientes/'),
          axios.get('/api/productos/')
        ]);
        setClientes(Array.isArray(cl) ? cl : (cl.results || []));
        setProductos(Array.isArray(pr) ? pr : (pr.results || []));
      } catch { }
    })();
  }, []);

  // Filtrar clientes basado en el término de búsqueda
  useEffect(() => {
    if (!searchTerm) {
      setFilteredClientes(clientes);
      setClienteError('');
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filtered = clientes.filter(c =>
        `${c.nombre} ${c.apellido} ${c.documento}`.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredClientes(filtered);
      
      if (filtered.length === 0) {
        setClienteError('No se encontró ningún cliente con ese nombre');
      } else {
        setClienteError('');
      }
    }
  }, [searchTerm, clientes]);

  const addItem = () => setItems([...items, { producto: null, cantidad: 1, precio_unit: '', producto_nombre: '' }]);
  const rmItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const updItem = (idx, patch) => setItems(items.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const onSelectProd = (idx, pid) => {
    const p = productos.find(pr => pr.id === Number(pid));
    // si la cantidad actual supera el stock del producto elegido, la recortamos
    const nextCant = Math.min(Number(items[idx]?.cantidad || 1), Number(p?.stock ?? 1) || 1);
    updItem(idx, {
      producto: p?.id ?? null,
      producto_nombre: p?.nombre ?? '',
      precio_unit: p ? String(p.precio) : '',
      cantidad: nextCant < 1 ? 1 : nextCant
    });
  };

  const quickCreateClient = async (e) => {
    e.preventDefault();
    if (!cForm.nombre.trim()) {
      return setMsg('Poné al menos el nombre del cliente.');
    }
    try {
      setSaving(true);
      const { data } = await axios.post('/api/clientes/', cForm); // permitido para cualquier autenticado
      setClientes(prev => [data, ...prev]);
      setClienteId(String(data.id));
      setShowNewClient(false);
      setCForm({ nombre: '', apellido: '', documento: '', telefono: '', email: '' });
      setMsg('');
    } catch (err) {
      const m = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMsg(`No se pudo crear el cliente. ${m}`);
    } finally { setSaving(false); }
  };

  // VALIDACIÓN
  const validate = () => {
    const eCab = {};
    const eRows = [];

    // cliente requerido
    if (!isRequired(clienteId)) eCab.cliente = 'Seleccioná un cliente.';

    // items requeridos
    if (!hasMinItems(items, 1)) eCab.items = 'Agregá al menos un ítem.';

    items.forEach((it, idx) => {
      const er = {};
      if (!it.producto) er.producto = 'Seleccioná un producto.';
      if (!isPositiveInt(it.cantidad)) er.cantidad = 'Cantidad debe ser > 0.';

      // precio puede ser 0 — si querés obligatorio, reemplazá por isNonNegNumber(it.precio_unit) sin allowEmpty
      if (!isNonNegNumber(it.precio_unit, true)) er.precio_unit = 'Precio ≥ 0.';

      // límite por stock
      const p = productos.find(x => x.id === Number(it.producto));
      if (p && Number(it.cantidad) > Number(p.stock)) {
        er.cantidad = `No puede superar el stock (${p.stock}).`;
      }
      if (Object.keys(er).length) eRows[idx] = er;
    });

    return { eCab, eRows };
  };

  const onSubmit = async (e) => {
    e.preventDefault(); setMsg('');
    const { eCab, eRows } = validate();
    setErrs(eCab);
    setItemErrs(eRows);
    if (Object.keys(eCab).length || (eRows && eRows.length)) return;

    try {
      setSaving(true);
      const cli = clientes.find(c => c.id === Number(clienteId));
      const nombreCliente = cli ? `${cli.nombre} ${cli.apellido ?? ''}`.trim() : '';

      // 1) crear cabecera
      const { data: cab } = await axios.post('/api/alquileres/', { cliente: nombreCliente });

      // 2) crear ítems
      for (const it of items) {
        if (!it.producto || !it.cantidad) continue;
        await axios.post('/api/det-alquileres/', {
          alquiler: cab.id,
          producto: it.producto,
          cantidad: Number(it.cantidad),
          precio_unit: String(it.precio_unit || 0)
        });
      }
      navigate('/alquileres', { replace: true, state: { created: true, id: cab.id } });
    } catch (err) {
      const m = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMsg(`No se pudo crear el alquiler. ${m}`);
    } finally { setSaving(false); }
  };

  return (
    <Layout>
      <div className="card">
        <div className="form-header">
          <Link to="/alquileres" className="backlink"><ArrowLeft size={16} /> Volver</Link>
          <h3 style={{ margin: '0 0 0 8px' }}>Nuevo alquiler</h3>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16, marginTop: 12, maxWidth: 980 }}>
          {/* Cliente */}
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr auto' }}>
            <label className={`underline-field ${errs.cliente ? 'field-error' : ''}`}>
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} // Actualizamos el término de búsqueda
              />
              <select
                className="select-clean"
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
              >
                <option value="">— Seleccionar cliente —</option>
                {filteredClientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellido} {c.documento ? `(${c.documento})` : ''}
                  </option>
                ))}
              </select>
            </label>
            {clienteError && <div className="error-text">{clienteError}</div>} {/* Mostrar error si no hay clientes encontrados */}
            {errs.cliente && <div className="error-text">{errs.cliente}</div>}
            <button type="button" className="btn" onClick={() => setShowNewClient(true)}>
              <Plus size={16} style={{ verticalAlign: '-2px' }} /> Nuevo cliente
            </button>
          </div>

          {/* Ítems */}
          <div className="card" style={{ background: '#0d0d0d', border: '1px dashed #333' }}>
            <h4 style={{ marginTop: 0 }}>Ítems</h4>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Producto</th>
                    <th style={{ width: 120 }}>Cantidad</th>
                    <th style={{ width: 160 }}>Precio unit.</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const p = productos.find(p => p.id === Number(it.producto));
                    const max = p ? Number(p.stock) : undefined;
                    const rowErr = itemErrs[idx] || {};
                    return (
                      <tr key={idx}>
                        <td>
                          <label className={`underline-field ${rowErr.producto ? 'field-error' : ''}`} style={{ margin: 0 }}>
                            <select
                              className="select-clean"
                              value={it.producto || ''}
                              onChange={e => onSelectProd(idx, e.target.value)}
                            >
                              <option value="">— Seleccionar —</option>
                              {productos.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre} ({p.categoria_display}) — stock {p.stock}
                                </option>
                              ))}
                            </select>
                          </label>
                          {rowErr.producto && <div className="error-text">{rowErr.producto}</div>}
                        </td>
                        <td>
                          <label className={`underline-field ${rowErr.cantidad ? 'field-error' : ''}`} style={{ margin: 0 }}>
                            <input
                              type="number"
                              min="1"
                              max={max || undefined}
                              value={it.cantidad}
                              onChange={e => {
                                const val = Number(e.target.value);
                                let next = val;
                                if (max && val > max) next = max;
                                if (val < 1) next = 1;
                                updItem(idx, { cantidad: next });
                              }}
                            />
                          </label>
                          {rowErr.cantidad && <div className="error-text">{rowErr.cantidad}</div>}
                        </td>
                        <td>
                          <label className={`underline-field ${rowErr.precio_unit ? 'field-error' : ''}`} style={{ margin: 0 }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={it.precio_unit}
                              onChange={e => updItem(idx, { precio_unit: e.target.value })}
                            />
                          </label>
                          {rowErr.precio_unit && <div className="error-text">{rowErr.precio_unit}</div>}
                        </td>
                        <td>
                          <button type="button" className="btn-outline danger" onClick={() => rmItem(idx)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button type="button" className="btn" onClick={addItem}>
              <Plus size={16} style={{ verticalAlign: '-2px' }} /> Agregar ítem
            </button>
          </div>

          {errs.items && <div className="error-text">{errs.items}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" disabled={saving}>{saving ? 'Creando…' : 'Guardar alquiler'}</button>
            <Link to="/alquileres" className="btn" style={{ background: '#333', color: '#eee' }}>Cancelar</Link>
          </div>

          {msg && <p style={{ marginTop: 8, color: '#ff7a7a' }}>{msg}</p>}
        </form>
      </div>

      {/* Modal Nuevo Cliente */}
      {showNewClient && (
        <>
          <div className="modal-overlay" onClick={() => setShowNewClient(false)} />
          <div className="modal" style={{ maxWidth: 520 }}>
            <h4 style={{ marginTop: 0 }}>Nuevo cliente</h4>
            <form onSubmit={quickCreateClient} style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                <label className="underline-field">
                  <input placeholder="Nombre *" value={cForm.nombre} onChange={e => setCForm(s => ({ ...s, nombre: e.target.value }))} required />
                </label>
                <label className="underline-field">
                  <input placeholder="Apellido" value={cForm.apellido} onChange={e => setCForm(s => ({ ...s, apellido: e.target.value }))} />
                </label>
              </div>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                <label className="underline-field">
                  <input placeholder="Documento" value={cForm.documento} onChange={e => setCForm(s => ({ ...s, documento: e.target.value }))} />
                </label>
                <label className="underline-field">
                  <input placeholder="Teléfono" value={cForm.telefono} onChange={e => setCForm(s => ({ ...s, telefono: e.target.value }))} />
                </label>
              </div>
              <label className="underline-field">
                <input type="email" placeholder="Email" value={cForm.email} onChange={e => setCForm(s => ({ ...s, email: e.target.value }))} />
              </label>

              <div className="modal-actions">
                <button className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
                <button type="button" className="btn" style={{ background: '#333', color: '#eee' }} onClick={() => setShowNewClient(false)}>Cancelar</button>
              </div>
            </form>
            {msg && <p style={{ marginTop: 8, color: '#ff7a7a' }}>{msg}</p>}
          </div>
        </>
      )}
    </Layout>
  );
}
