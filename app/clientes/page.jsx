'use client';
import { useState, useEffect } from 'react';
import { obtenerClientes, registrarCliente, actualizarCliente } from '@/app/actions/clientesActions';

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [idEditando, setIdEditando] = useState(null);
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const respuesta = await obtenerClientes();
    if (respuesta.success) setClientes(respuesta.datos || []);
    setCargando(false);
  };

  const limpiarFormulario = () => {
    setIdEditando(null);
    setNombre(''); setCedula(''); setCorreo(''); setTelefono('');
  };

  const manejarDobleClick = (c) => {
    if(c.id === 1) return alert('El Cliente Contado base no se puede editar.');
    setIdEditando(c.id);
    setNombre(c.nombre);
    setCedula(c.cedula || '');
    setCorreo(c.correo || '');
    setTelefono(c.telefono || '');
  };

  const manejarGuardar = async (e) => {
    e.preventDefault();
    if (!nombre) return alert('El nombre es obligatorio.');

    let respuesta;
    if (idEditando) {
      respuesta = await actualizarCliente(idEditando, nombre, cedula, correo, telefono);
    } else {
      respuesta = await registrarCliente(nombre, cedula, correo, telefono);
    }

    if (respuesta.success) {
      alert(idEditando ? 'Cliente actualizado.' : 'Cliente registrado exitosamente.');
      limpiarFormulario();
      cargarDatos();
    } else {
      alert('Error en el servidor: ' + respuesta.error);
    }
  };

  const filtrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (c.cedula && c.cedula.includes(busqueda))
  );

  return (
    <main style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '20px', color: 'var(--x-text-main)' }}>Directorio de Clientes</h2>

      <div style={{ marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Buscar por nombre o cédula..." 
          value={busqueda} 
          onChange={e => setBusqueda(e.target.value)} 
          className="crud-input-style"
          style={{ maxWidth: '400px' }}
        />
      </div>

      <div className="responsive-grid">
        <form onSubmit={manejarGuardar} style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: idEditando ? '2px solid var(--x-primary)' : '1px solid var(--x-border)', display: 'flex', flexDirection: 'column', gap: '15px', height: 'fit-content' }}>
          
          {idEditando ? (
            <div style={{ backgroundColor: 'rgba(29, 161, 242, 0.12)', border: '1px solid var(--x-primary)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>MODO EDICIÓN</span>
              <button type="button" onClick={limpiarFormulario} style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                Cancelar
              </button>
            </div>
          ) : (
            <h3 style={{ margin: 0 }}>Nuevo Cliente</h3>
          )}

          <div className="form-grid-2">
            <input type="text" placeholder="Nombre Completo" value={nombre} onChange={e => setNombre(e.target.value)} className="crud-input-style" />
            <input type="text" placeholder="Cédula" value={cedula} onChange={e => setCedula(e.target.value)} className="crud-input-style" />
          </div>
          
          <div className="form-grid-2">
            <input type="email" placeholder="Correo Electrónico" value={correo} onChange={e => setCorreo(e.target.value)} className="crud-input-style" />
            <input type="text" placeholder="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} className="crud-input-style" />
          </div>

          <button type="submit" style={{ backgroundColor: idEditando ? 'var(--x-primary)' : 'var(--success-green)', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>
            {idEditando ? 'Actualizar Datos' : 'Registrar Cliente'}
          </button>
        </form>

        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '5px' }}>Cartera de Clientes</h3>
          <p style={{ fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '15px' }}>Doble clic para cargar datos.</p>
          
          {cargando ? (
            <p style={{ color: 'var(--x-text-muted)' }}>Cargando directorio...</p>
          ) : (
            <div className="table-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Nombre</th>
                    <th style={{ padding: '10px' }}>Cédula</th>
                    <th style={{ padding: '10px' }}>Correo</th>
                    <th style={{ padding: '10px' }}>Teléfono</th>
                    </tr>
                </thead>
                <tbody>
                    {filtrados.map(c => (
                    <tr 
                        key={c.id}
                        onDoubleClick={() => manejarDobleClick(c)}
                        style={{ borderBottom: '1px solid rgba(56,68,77,0.3)', cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--x-bg-card-hover)'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <td style={{ padding: '10px', fontWeight: c.id === 1 ? 'bold' : 'normal', color: c.id === 1 ? 'var(--x-primary)' : 'inherit' }}>{c.nombre}</td>
                        <td style={{ padding: '10px', color: 'var(--x-text-muted)' }}>{c.cedula || '-'}</td>
                        <td style={{ padding: '10px', color: 'var(--x-text-muted)' }}>{c.correo || '-'}</td>
                        <td style={{ padding: '10px', color: 'var(--x-text-muted)' }}>{c.telefono || '-'}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}