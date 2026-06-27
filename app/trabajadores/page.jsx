'use client';
import { useState, useEffect } from 'react';
import { obtenerTrabajadores, registrarTrabajador, actualizarTrabajador, alternarEstadoTrabajador } from '@/app/actions/trabajadoresActions';
import { obtenerClientes, registrarCliente, actualizarCliente, obtenerExoneracionesCliente, guardarExoneracion } from '@/app/actions/clientesActions';
import AccesoAdministrador from '@/components/AccesoAdministrador';
import Modal from '@/components/Modal';

export default function TrabajadoresPage() {
    // --- ESTADOS GLOBALES DE LA PANTALLA ---
    const [trabajadores, setTrabajadores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [pestañaActiva, setPestañaActiva] = useState('Personal'); // 'Personal' o 'Clientes'
    
    // --- ESTADOS DEL MODAL Y FORMULARIO BASE ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [cargandoModal, setCargandoModal] = useState(false);
    const [idEditando, setIdEditando] = useState(null);
    const [tipoPersona, setTipoPersona] = useState('Trabajador'); // Para saber qué tabla usar
    
    // --- DATOS PERSONALES / IDENTIDAD ---
    const [nombre, setNombre] = useState('');
    const [cedula, setCedula] = useState('');
    const [correo, setCorreo] = useState('');
    const [telefono, setTelefono] = useState('');
    const [direccion, setDireccion] = useState('');
    const [tipoIdentificacion, setTipoIdentificacion] = useState('01');
    
    // --- DATOS LABORALES (Solo Trabajadores) ---
    const [rol, setRol] = useState('Cajero');
    const [contrasena, setContrasena] = useState('');

    // --- DATOS FISCALES / EXONERACIONES (Solo Clientes) ---
    const [aplicaExoneracion, setAplicaExoneracion] = useState(false);
    const [exoneraciones, setExoneraciones] = useState([]);
    const [exoTipo, setExoTipo] = useState('05');
    const [exoNumero, setExoNumero] = useState('');
    const [exoPorcentaje, setExoPorcentaje] = useState('13');
    const [exoFechaEmision, setExoFechaEmision] = useState('');
    const [exoFechaVencimiento, setExoFechaVencimiento] = useState('');

    // =====================================================================
    // 1. CARGA UNIFICADA DE DATOS (SQL Server hace el trabajo pesado)
    // =====================================================================
    const cargarDatos = async () => {
        setCargando(true);
        try {
            const resTrabajadores = await obtenerTrabajadores();
            const resClientes = await obtenerClientes();

            const listaTrabajadores = resTrabajadores.success ? resTrabajadores.datos : [];
            const listaClientes = resClientes.success ? resClientes.datos : [];

            setTrabajadores([...listaTrabajadores, ...listaClientes]);
        } catch (error) {
            console.error("Error al cargar el directorio unificado:", error);
        }
        setCargando(false);
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // =====================================================================
    // 2. FUNCIONES DE MÚLTIPLES EXONERACIONES (Mini-CRUD en memoria)
    // =====================================================================
    const agregarExoneracion = () => {
        if (!exoNumero || !exoFechaEmision) {
            return alert('El número de documento y la fecha de emisión son obligatorios.');
        }
        const nuevaExo = {
            tipo_documento: exoTipo,
            numero_documento: exoNumero,
            porcentaje_exonerado: exoPorcentaje,
            fecha_emision: exoFechaEmision,
            fecha_vencimiento: exoFechaVencimiento || null
        };
        setExoneraciones([...exoneraciones, nuevaExo]);
        
        // Limpiamos los campos
        setExoNumero('');
        setExoFechaEmision('');
        setExoFechaVencimiento('');
    };

    const quitarExoneracion = (index) => {
        setExoneraciones(exoneraciones.filter((_, i) => i !== index));
    };

    const editarExoneracion = (index) => {
        const exo = exoneraciones[index];
        setExoTipo(exo.tipo_documento);
        setExoNumero(exo.numero_documento);
        setExoPorcentaje(exo.porcentaje_exonerado);
        setExoFechaEmision(exo.fecha_emision);
        setExoFechaVencimiento(exo.fecha_vencimiento || '');
        quitarExoneracion(index);
    };

    // =====================================================================
    // 3. ABRIR EDICIÓN (Con inteligencia de Base de Datos)
    // =====================================================================
    const manejarEditar = async (persona) => {
        setIdEditando(persona.id);
        setNombre(persona.nombre || '');
        setCedula(persona.cedula || '');
        setCorreo(persona.correo || '');
        setTelefono(persona.telefono || '');
        setDireccion(persona.direccion || '');
        setTipoIdentificacion(persona.tipo_identificacion || '01');
        
        if (persona.tipoPersona === 'Cliente') {
            setTipoPersona('Cliente');
            setRol('Cliente Comercial');
            setContrasena('');
            
            try {
                const res = await obtenerExoneracionesCliente(persona.id);
                if (res.success && res.datos.length > 0) {
                    setExoneraciones(res.datos);
                    setAplicaExoneracion(true);
                } else {
                    setExoneraciones([]);
                    setAplicaExoneracion(false);
                }
            } catch (err) {
                console.error("Error al sincronizar historial fiscal:", err);
            }
        } else {
            setTipoPersona('Trabajador');
            setRol(persona.rol || 'Cajero');
            setContrasena('');
            setExoneraciones([]);
            setAplicaExoneracion(false);
        }

        setIsModalOpen(true);
    };

    // =====================================================================
    // 4. SUSPENDER / ACTIVAR (Solo para personal)
    // =====================================================================
    const manejarSuspension = async (id, nombrePersona, estadoActual) => {
        const accion = estadoActual ? 'suspender' : 'restaurar';
        if (!confirm(`¿Estás seguro de que deseas ${accion} el acceso de ${nombrePersona}?`)) return;

        const res = await alternarEstadoTrabajador(id);
        if (res.success) {
            cargarDatos();
        } else {
            alert('Error al modificar el estado: ' + res.error);
        }
    };

    // =====================================================================
    // 5. GUARDADO BIFURCADO (Maneja las reglas de SQL correctamente)
    // =====================================================================
    const manejarGuardar = async (e) => {
        e.preventDefault();
        setCargandoModal(true);

        try {
            if (tipoPersona === 'Trabajador') {
                // --- CAMINO A: TRABAJADORES ---
                if (idEditando) {
                    const res = await actualizarTrabajador(idEditando, nombre, correo, rol, cedula, contrasena);
                    if (!res.success) throw new Error(res.error);
                } else {
                    if (!contrasena) throw new Error("La contraseña es obligatoria para un trabajador nuevo.");
                    const res = await registrarTrabajador(nombre, correo, contrasena, rol, cedula);
                    if (!res.success) throw new Error(res.error);
                }
            } else {
                // --- CAMINO B: CLIENTES ---
                let clienteIdFinal = idEditando;
                
                if (idEditando) {
                    const res = await actualizarCliente(idEditando, nombre, cedula, correo, telefono);
                    if (!res.success) throw new Error(res.error);
                } else {
                    const res = await registrarCliente(nombre, cedula, correo, telefono);
                    if (!res.success) throw new Error(res.error);
                    // Si tu API devuelve el ID del nuevo cliente, lo tomamos aquí
                    clienteIdFinal = res.datos?.id || res.id; 
                }

                // Guardar las exoneraciones asociadas a este cliente
                if (clienteIdFinal && aplicaExoneracion && exoneraciones.length > 0) {
                    for (const exo of exoneraciones) {
                        await guardarExoneracion(clienteIdFinal, exo);
                    }
                }
            }

            await cargarDatos();
            setIsModalOpen(false);
            
            // Limpiar todo el estado
            setIdEditando(null); setNombre(''); setCorreo(''); setContrasena(''); 
            setRol('Cajero'); setCedula(''); setTelefono(''); setExoneraciones([]); 
            setAplicaExoneracion(false);

        } catch (error) {
            console.error("Error al asentar registro:", error);
            alert('Fallo de integridad: ' + error.message);
        }

        setCargandoModal(false);
    };

    // =====================================================================
    // 6. FILTRADO PARA LA INTERFAZ
    // =====================================================================
    const trabajadoresFiltrados = trabajadores.filter(persona => {
        const coincideBusqueda = persona.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
                                 persona.cedula?.includes(busqueda);
        
        if (!coincideBusqueda) return false;

        if (pestañaActiva === 'Personal') return persona.tipoPersona === 'Trabajador' || !persona.tipoPersona;
        if (pestañaActiva === 'Clientes') return persona.tipoPersona === 'Cliente';
        return true;
    });

    // =====================================================================
    // 7. RENDERIZADO VISUAL (JSX)
    // =====================================================================
    return (
        <AccesoAdministrador>
            <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
                
                {/* CABECERA */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', margin: '0 0 5px 0' }}>Control de Directorio Maestro</h1>
                        <p style={{ margin: 0, color: 'var(--x-text-muted)', fontSize: '14px' }}>Gestión unificada de personal y cartera de clientes comerciales.</p>
                    </div>
                    <button 
                        onClick={() => {
                            setIdEditando(null); setNombre(''); setCorreo(''); setContrasena(''); setCedula(''); setTelefono(''); setExoneraciones([]); setAplicaExoneracion(false); setIsModalOpen(true);
                        }} 
                        style={{ backgroundColor: 'var(--success-green)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        + Nuevo Registro
                    </button>
                </div>

                {/* BUSCADOR */}
                <div style={{ marginBottom: '20px' }}>
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o documento de identidad..." 
                        value={busqueda} 
                        onChange={(e) => setBusqueda(e.target.value)} 
                        className="crud-input-style"
                        style={{ width: '100%', maxWidth: '400px' }}
                    />
                </div>

                {/* TABS DE FILTRADO */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--x-border)', paddingBottom: '10px' }}>
                    <button 
                        onClick={() => setPestañaActiva('Personal')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: pestañaActiva === 'Personal' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                            border: 'none',
                            borderBottom: pestañaActiva === 'Personal' ? '2px solid var(--x-primary)' : '2px solid transparent',
                            color: pestañaActiva === 'Personal' ? 'var(--x-primary)' : 'var(--x-text-muted)',
                            cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s'
                        }}
                    >
                        Personal Interno ({trabajadores.filter(p => p.tipoPersona === 'Trabajador').length})
                    </button>
                    <button 
                        onClick={() => setPestañaActiva('Clientes')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: pestañaActiva === 'Clientes' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                            border: 'none',
                            borderBottom: pestañaActiva === 'Clientes' ? '2px solid var(--success-green)' : '2px solid transparent',
                            color: pestañaActiva === 'Clientes' ? 'var(--success-green)' : 'var(--x-text-muted)',
                            cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s'
                        }}
                    >
                        Cartera de Clientes ({trabajadores.filter(p => p.tipoPersona === 'Cliente').length})
                    </button>
                </div>

                {/* TABLA PRINCIPAL */}
                <div style={{ background: 'var(--x-bg-card)', padding: '0', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
                    {cargando ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>Sincronizando directorio...</div>
                    ) : trabajadoresFiltrados.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>No hay perfiles registrados en la categoría de {pestañaActiva}.</div>
                    ) : (
                        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                                        <th style={{ padding: '15px' }}>{pestañaActiva === 'Clientes' ? 'Ficha Cliente' : 'Ficha Personal'}</th>
                                        <th style={{ padding: '15px' }}>Contacto / Correo</th>
                                        <th style={{ padding: '15px' }}>{pestañaActiva === 'Clientes' ? 'Clasificación' : 'Nivel de Acceso'}</th>
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
                                            <td style={{ padding: '15px', color: 'var(--x-text-muted)' }}>
                                                <div>{t.correo}</div>
                                                {t.telefono && <div style={{ fontSize: '11px', marginTop: '3px' }}>Tel: {t.telefono}</div>}
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                <span style={{ 
                                                    color: t.rol === 'Administrador' ? 'var(--x-primary)' : t.rol === 'Auditor' ? '#ffad1f' : 'var(--success-green)', 
                                                    fontWeight: 'bold', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px'
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
                                                    <button onClick={() => manejarEditar(t)} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--x-border)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                        Editar
                                                    </button>
                                                    {t.tipoPersona === 'Trabajador' && (
                                                        <button onClick={() => manejarSuspension(t.id, t.nombre, t.activo)} style={{ backgroundColor: 'transparent', border: t.activo ? '1px solid var(--danger-red)' : '1px solid var(--success-green)', color: t.activo ? 'var(--danger-red)' : 'var(--success-green)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                            {t.activo ? 'Bloquear' : 'Restaurar'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODAL MAESTRO */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                    <form onSubmit={manejarGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px', width: '100%', maxWidth: '750px' }}>
                        
                        <div style={{ borderBottom: '1px solid var(--x-border)', paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
                                {idEditando ? 'Auditar Registro Maestro' : 'Alta en Directorio Unificado'}
                            </h3>
                        </div>

                        {/* SECTOR DE CLASIFICACIÓN GLOBAL */}
                        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid var(--x-primary)' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--x-primary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Tipo de Perfil en Sistema</label>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <label style={{ color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                    <input type="radio" value="Trabajador" checked={tipoPersona === 'Trabajador'} onChange={() => setTipoPersona('Trabajador')} style={{ accentColor: 'var(--x-primary)', width: '18px', height: '18px' }} />
                                    Personal Interno
                                </label>
                                <label style={{ color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                    <input type="radio" value="Cliente" checked={tipoPersona === 'Cliente'} onChange={() => setTipoPersona('Cliente')} style={{ accentColor: 'var(--success-green)', width: '18px', height: '18px' }} />
                                    Cliente Comercial
                                </label>
                            </div>
                        </div>

                        {/* SECCIÓN 1: DATOS PERSONALES */}
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--x-border)' }}>
                            <h4 style={{ margin: '0 0 15px 0', color: 'var(--x-primary)', fontSize: '13px', textTransform: 'uppercase' }}>1. Identidad y Contacto</h4>
                            <div className="form-grid-2">
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Tipo Identificación</label>
                                    <select value={tipoIdentificacion} onChange={e => setTipoIdentificacion(e.target.value)} className="crud-input-style" style={{ width: '100%', backgroundColor: 'var(--x-bg-base)' }}>
                                        <option value="01">Cédula Física</option>
                                        <option value="02">Cédula Jurídica</option>
                                        <option value="03">DIMEX (Extranjero)</option>
                                        <option value="04">NITE</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Identificación</label>
                                    <input type="text" value={cedula} onChange={e => setCedula(e.target.value)} className="crud-input-style" required />
                                </div>
                            </div>
                            <div style={{ marginTop: '15px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Nombre Completo / Razón Social</label>
                                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="crud-input-style" required />
                            </div>
                            <div className="form-grid-2" style={{ marginTop: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Correo Electrónico</label>
                                    <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} className="crud-input-style" required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Teléfono</label>
                                    <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} className="crud-input-style" />
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: PERFIL LABORAL (Solo Trabajador) */}
                        {tipoPersona === 'Trabajador' && (
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--x-border)' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: 'var(--success-green)', fontSize: '13px', textTransform: 'uppercase' }}>2. Perfil Laboral y Accesos</h4>
                                <div className="form-grid-2">
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Jerarquía</label>
                                        <select value={rol} onChange={e => setRol(e.target.value)} className="crud-input-style" style={{ width: '100%', backgroundColor: 'var(--x-bg-base)' }}>
                                            <option value="Cajero">Cajero Operativo</option>
                                            <option value="Auditor">Auditor de Sistemas</option>
                                            <option value="Administrador">Administrador Maestro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Contraseña</label>
                                        <input type="text" placeholder={idEditando ? "Dejar vacío para mantener" : "Requerida"} value={contrasena} onChange={e => setContrasena(e.target.value)} className="crud-input-style" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN 3: EXONERACIONES (Solo Clientes) */}
                        {tipoPersona === 'Cliente' && (
                            <div style={{ backgroundColor: 'rgba(255, 173, 31, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255, 173, 31, 0.3)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h4 style={{ margin: 0, color: '#ffad1f', fontSize: '13px', textTransform: 'uppercase' }}>3. Cartas de Exoneración (Hacienda)</h4>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>
                                        <input type="checkbox" checked={aplicaExoneracion} onChange={e => setAplicaExoneracion(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#ffad1f' }} />
                                        Aplica Exoneración
                                    </label>
                                </div>

                                {aplicaExoneracion && (
                                    <>
                                        {/* TABLA DE EXONERACIONES */}
                                        {exoneraciones.length > 0 && (
                                            <div style={{ marginBottom: '20px', border: '1px solid rgba(255,173,31,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
                                                <table style={{ width: '100%', fontSize: '12px', color: '#fff', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                    <thead style={{ backgroundColor: 'rgba(255,173,31,0.1)' }}>
                                                        <tr>
                                                            <th style={{ padding: '8px' }}>Doc.</th>
                                                            <th style={{ padding: '8px' }}>Número</th>
                                                            <th style={{ padding: '8px' }}>%</th>
                                                            <th style={{ padding: '8px' }}>Vencimiento</th>
                                                            <th style={{ padding: '8px', textAlign: 'center' }}>X</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {exoneraciones.map((exo, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <td style={{ padding: '8px', color: 'var(--x-text-muted)' }}>{exo.tipo_documento}</td>
                                                                <td style={{ padding: '8px', fontWeight: 'bold' }}>{exo.numero_documento}</td>
                                                                <td style={{ padding: '8px', color: 'var(--success-green)' }}>{exo.porcentaje_exonerado}%</td>
                                                                <td style={{ padding: '8px' }}>{exo.fecha_vencimiento || 'Sin fecha'}</td>
                                                                <td style={{ padding: '8px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                                    <button type="button" onClick={() => editarExoneracion(idx)} style={{ color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>✏️</button>
                                                                    <button type="button" onClick={() => quitarExoneracion(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>⊗</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* FORMULARIO DE EXONERACIÓN */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', borderTop: '1px dashed rgba(255, 173, 31, 0.3)', paddingTop: '15px' }}>
                                            <div className="form-grid-2">
                                                <div>
                                                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Tipo Documento</label>
                                                    <select value={exoTipo} onChange={e => setExoTipo(e.target.value)} className="crud-input-style" style={{ width: '100%', backgroundColor: 'var(--x-bg-base)' }}>
                                                        <option value="01">01 - Compras Autorizadas</option>
                                                        <option value="02">02 - Diplomáticos</option>
                                                        <option value="03">03 - Ley Especial</option>
                                                        <option value="04">04 - Dir. Gen. Hacienda</option>
                                                        <option value="05">05 - Zonas Francas</option>
                                                        <option value="99">99 - Otros</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Número (Resolución)</label>
                                                    <input type="text" value={exoNumero} onChange={e => setExoNumero(e.target.value)} className="crud-input-style" />
                                                </div>
                                            </div>
                                            <div className="form-grid-2">
                                                <div>
                                                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>% Exonerado</label>
                                                    <input type="number" min="1" max="13" step="0.01" value={exoPorcentaje} onChange={e => setExoPorcentaje(e.target.value)} className="crud-input-style" />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Fecha de Emisión</label>
                                                    <input type="date" value={exoFechaEmision} onChange={e => setExoFechaEmision(e.target.value)} className="crud-input-style" style={{ colorScheme: 'dark' }} />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Fecha Vencimiento (Opcional)</label>
                                                <input type="date" value={exoFechaVencimiento} onChange={e => setExoFechaVencimiento(e.target.value)} className="crud-input-style" style={{ colorScheme: 'dark' }} />
                                            </div>
                                            <button type="button" onClick={agregarExoneracion} style={{ backgroundColor: 'rgba(255, 173, 31, 0.1)', color: '#ffad1f', border: '1px dashed #ffad1f', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px', transition: 'all 0.2s' }}>
                                                + Adjuntar Documento
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <button type="submit" disabled={cargandoModal} style={{ backgroundColor: idEditando ? 'var(--x-primary)' : 'var(--success-green)', color: '#fff', border: 'none', padding: '16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '1px', opacity: cargandoModal ? 0.7 : 1 }}>
                            {cargandoModal ? 'Guardando...' : idEditando ? 'Asentar Modificaciones' : 'Crear Perfil Maestro'}
                        </button>
                    </form>
                </Modal>
                
            </main>
        </AccesoAdministrador>
    );
}