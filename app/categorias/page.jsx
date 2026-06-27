'use client';
import { useState, useEffect } from 'react';
import { obtenerCategorias, registrarCategoria, actualizarCategoria, eliminarCategoria } from '@/app/actions/categoriasActions';

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [idEditando, setIdEditando] = useState(null);
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    setCargando(true);
    const respuesta = await obtenerCategorias();
    if (respuesta.success) {
      setCategorias(respuesta.datos || []);
    } else {
      alert('Error al sincronizar categorías: ' + respuesta.error);
    }
    setCargando(false);
  };

  const limpiarFormulario = () => {
    setIdEditando(null);
    setNombre('');
  };

  const manejarDobleClick = (cat) => {
    setIdEditando(cat.id);
    setNombre(cat.nombre);
  };

  const manejarGuardar = async (e) => {
    e.preventDefault();
    if (!nombre) return alert('Escriba el nombre de la categoría.');

    let respuesta;
    if (idEditando) {
      respuesta = await actualizarCategoria(idEditando, nombre);
    } else {
      respuesta = await registrarCategoria(nombre);
    }

    if (respuesta.success) {
      alert(idEditando ? 'Categoría actualizada.' : 'Categoría registrada.');
      limpiarFormulario();
      cargarCategorias();
    } else {
      alert('Error transaccional: ' + respuesta.error);
    }
  };

  const manejarEliminar = async () => {
    if (!idEditando) return;
    if (window.confirm(`¿Desea eliminar la categoría "${nombre}"? Esta acción fallará si existen productos vinculados a ella.`)) {
      const respuesta = await eliminarCategoria(idEditando);
      if (respuesta.success) {
        alert('Categoría removida del sistema.');
        limpiarFormulario();
        cargarCategorias();
      } else {
        alert('Restricción de integridad: No se puede eliminar una categoría en uso.');
      }
    }
  };

  const filtradas = categorias.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: 'var(--x-text-main)' }}>Administración de Categorías / Familias</h2>

      <div style={{ marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Filtrar categorías por nombre..." 
          value={busqueda} 
          onChange={e => setBusqueda(e.target.value)} 
          className="crud-input-style"
          style={{ maxWidth: '400px' }}
        />
      </div>

      <div className="responsive-grid">
        
        <form onSubmit={manejarGuardar} style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: idEditando ? '1px solid var(--x-primary)' : '1px solid var(--x-border)', display: 'flex', flexDirection: 'column', gap: '15px', height: 'fit-content' }}>
          
          {idEditando ? (
            <div style={{ backgroundColor: 'rgba(29, 161, 242, 0.12)', border: '1px solid var(--x-primary)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>MODO EDICIÓN</span>
              <button type="button" onClick={limpiarFormulario} style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                Cancelar
              </button>
            </div>
          ) : (
            <h3 style={{ margin: 0 }}>Nueva Categoría</h3>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12px', color: 'var(--x-text-muted)' }}>Nombre de la Familia</label>
            <input 
              type="text" 
              placeholder="Ej: Canasta Básica" 
              value={nombre} 
              onChange={e => setNombre(e.target.value)} 
              className="crud-input-style" 
            />
          </div>

          <button type="submit" style={{ backgroundColor: idEditando ? 'var(--x-primary)' : 'var(--success-green)', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>
            {idEditando ? 'Guardar Cambios' : 'Registrar Categoría'}
          </button>

          {idEditando && (
            <button type="button" onClick={manejarEliminar} style={{ backgroundColor: 'transparent', color: 'var(--danger-red)', border: '1px solid var(--danger-red)', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              Eliminar Registro
            </button>
          )}
        </form>

        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '5px' }}>Familias Activas</h3>
          <p style={{ fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '15px' }}>Doble clic para cargar datos en el panel de control.</p>
          
          {cargando ? (
            <p style={{ color: 'var(--x-text-muted)' }}>Cargando registros...</p>
          ) : (
            <div className="table-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>ID Interno</th>
                    <th style={{ padding: '10px' }}>Nombre de Categoría</th>
                    </tr>
                </thead>
                <tbody>
                    {filtradas.map(c => (
                    <tr 
                        key={c.id}
                        onDoubleClick={() => manejarDobleClick(c)}
                        style={{ borderBottom: '1px solid rgba(56,68,77,0.3)', cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--x-bg-card-hover)'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <td style={{ padding: '10px', fontFamily: 'monospace', color: 'var(--x-text-muted)' }}>#{c.id}</td>
                        <td style={{ padding: '10px', fontWeight: '500' }}>{c.nombre}</td>
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