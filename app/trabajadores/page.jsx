'use client';
import { useState, useEffect } from 'react';
import { 
    obtenerTrabajadores, 
    registrarTrabajador, 
    actualizarTrabajador, 
    alternarEstadoTrabajador 
} from '@/app/actions/trabajadoresActions';
import SelectPremium from '@/components/SelectPremium';
import Modal from '@/components/Modal';

export default function TrabajadoresPage() {
  const [trabajadores, setTrabajadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Estados del Formulario Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rol, setRol] = useState('Cajero');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const res = await obtenerTrabajadores();
    if (res.success) setTrabajadores(res.datos || []);
    setCargando(false);
  };

  const limpiarFormulario = () => {
    setIdEditando(null);
    setNombre('');
    setCedula('');
    setCorreo('');
    setContrasena('');
    setRol('Cajero');
  };

  const abrirModalNuevo = () => {
    limpiarFormulario();
    setIsModalOpen(true);
  };

  const abrirModalEditar = (trabajador) => {
    setIdEditando(trabajador.id);
    setNombre(trabajador.nombre);
    setCedula(trabajador.cedula || '');
    setCorreo(trabajador.correo);
    setRol(trabajador.rol);
    setContrasena(''); // Se deja en blanco por seguridad, solo se llena si se quiere cambiar
    setIsModalOpen(true);
  };

  const manejarGuardar = async (e) => {
    e.preventDefault();
    if (!nombre || !correo || !cedula || !rol) return alert('Complete los campos obligatorios de la ficha.');
    
    // Si es nuevo, la contraseña es obligatoria
    if (!idEditando && !contrasena) return alert('Debe asignar una contraseña inicial para el nuevo perfil.');

    const res = idEditando
        ? await actualizarTrabajador(idEditando, nombre, correo, rol, cedula, contrasena)
        : await registrarTrabajador(nombre, correo, contrasena, rol, cedula);

    if (res.success) {
        alert(idEditando ? 'Ficha de empleado actualizada.' : 'Nuevo trabajador integrado al sistema.');
        setIsModalOpen(false);
        cargarDatos();
    } else {
        alert('Error: ' + res.error);
    }
  };

  const manejarSuspension = async (id, nombreAct, estadoAct) => {
      const accion = estadoAct ? 'suspender' : 'reactivar';
      if(window.confirm(`¿Está seguro de que desea ${accion} el acceso de ${nombreAct} al sistema?`)) {
          const res = await alternarEstadoTrabajador(id);
          if (res.success) cargarDatos();
          else alert('Fallo al actualizar estado: ' + res.error);
      }
  };

  const trabajadoresFiltrados = trabajadores.filter(t => 
      t.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
      t.cedula?.includes(busqueda) ||
      t.rol.toLowerCase().includes(busqueda.toLowerCase())
  );

  const opcionesRol = [
      { valor: 'Cajero', etiqueta: 'Cajero Operativo' },
      { valor: 'Auditor', etiqueta: 'Auditor de Sistemas' },
      { valor: 'Administrador', etiqueta: 'Administrador Maestro' }
  ];

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* CABECERA Y BUSCADOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
            <h2 style={{ color: 'var(--x-text-main)', margin: 0 }}>Control de Personal y Accesos</h2>
            <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: 'var(--x-text-muted)' }}>Gestión de credenciales, roles y firmas electrónicas.</p>
        </div>
        <button 
          onClick={abrirModalNuevo} 
          style={{ backgroundColor: 'var(--x-primary)', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
            + Nuevo Empleado
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input 
            type="text" 
            placeholder="Buscar por nombre, cédula o rol..." 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            className="crud-input-style" 
            style={{ maxWidth: '400px' }}
        />
      </div>

      {/* TABLA DE PERSONAL */}
      <div style={{ background: 'var(--x-bg-card)', padding: '0', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
        {cargando ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>Sincronizando nómina...</div>
        ) : trabajadoresFiltrados.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>No se encontraron perfiles de personal.</div>
        ) : (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                  <th style={{ padding: '15px' }}>Ficha Personal</th>
                  <th style={{ padding: '15px' }}>Credenciales Acceso</th>
                  <th style={{ padding: '15px' }}>Nivel de Acceso</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Administración</th>
                </tr>
              </thead>
              <tbody>
                {trabajadoresFiltrados.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: t.activo ? 1 : 0.5 }}>
                    <td style={{ padding: '15px' }}>
                        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '15px' }}>{t.nombre}</div>
                        <div style={{ fontSize: '12px', color: 'var(--x-text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>CI: {t.cedula}</div>
                    </td>
                    <td style={{ padding: '15px', color: 'var(--x-text-muted)' }}>{t.correo}</td>
                    <td style={{ padding: '15px' }}>
                        <span style={{ 
                            color: t.rol === 'Administrador' ? 'var(--x-primary)' : t.rol === 'Auditor' ? '#ffad1f' : 'var(--success-green)', 
                            fontWeight: 'bold', fontSize: '13px' 
                        }}>
                            {t.rol}
                        </span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                        <span style={{ 
                            backgroundColor: t.activo ? 'rgba(0, 186, 124, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                            color: t.activo ? 'var(--success-green)' : 'var(--danger-red)', 
                            padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' 
                        }}>
                            {t.activo ? 'VIGENTE' : 'SUSPENDIDO'}
                        </span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => abrirModalEditar(t)} style={{ backgroundColor: 'transparent', border: '1px solid var(--x-border)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                Editar
                            </button>
                            <button onClick={() => manejarSuspension(t.id, t.nombre, t.activo)} style={{ backgroundColor: 'transparent', border: t.activo ? '1px solid var(--danger-red)' : '1px solid var(--success-green)', color: t.activo ? 'var(--danger-red)' : 'var(--success-green)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                {t.activo ? 'Bloquear' : 'Restaurar'}
                            </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN / CREACIÓN */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={manejarGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px' }}>
          <div style={{ borderBottom: '1px solid var(--x-border)', paddingBottom: '10px', marginBottom: '5px' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
              {idEditando ? 'Modificar Credenciales' : 'Alta de Nuevo Empleado'}
            </h3>
          </div>
          
          <div className="form-grid-2">
            <div>
                <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Nombre Completo</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="crud-input-style" required />
            </div>
            <div>
                <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Cédula de Identidad</label>
                <input type="text" value={cedula} onChange={e => setCedula(e.target.value)} className="crud-input-style" required />
            </div>
          </div>

          <div>
              <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Correo Institucional</label>
              <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} className="crud-input-style" required />
          </div>

          <div className="form-grid-2">
            <div>
                <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Nivel de Jerarquía</label>
                <div style={{ zIndex: 10 }}>
                    <SelectPremium opciones={opcionesRol} valorSeleccionado={rol} alCambiar={setRol} />
                </div>
            </div>
            <div>
                <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Contraseña de Sistema</label>
                <input 
                    type="text" 
                    placeholder={idEditando ? "Dejar en blanco para conservar" : "Contraseña requerida"} 
                    value={contrasena} 
                    onChange={e => setContrasena(e.target.value)} 
                    className="crud-input-style" 
                />
            </div>
          </div>

          <button type="submit" style={{ backgroundColor: idEditando ? 'var(--x-primary)' : 'var(--success-green)', color: '#fff', border: 'none', padding: '16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {idEditando ? 'Asentar Modificaciones' : 'Crear Perfil y Otorgar Acceso'}
          </button>
        </form>
      </Modal>

    </main>
  );
}