'use client';
import { useState, useEffect } from 'react';
import { obtenerProductos, registrarProducto, actualizarProducto } from '@/app/actions/inventarioActions';
import { obtenerCategorias, registrarCategoria, actualizarCategoria, aplicarDescuentoCategoria, desvincularProductoDeCategoria } from '@/app/actions/categoriasActions';
import AccesoAdministrador from '@/components/AccesoAdministrador';
import Modal from '@/components/Modal';

export default function InventarioUnificadoPage() {
    // --- ESTADOS GLOBALES ---
    const [cargando, setCargando] = useState(true);
    const [pestañaActiva, setPestañaActiva] = useState('Productos'); 
    const [busqueda, setBusqueda] = useState('');
    
    // --- DATOS MAESTROS ---
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);

    // --- ESTADOS DE MODALES ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tipoModal, setTipoModal] = useState('Producto'); 
    const [cargandoModal, setCargandoModal] = useState(false);
    const [idEditando, setIdEditando] = useState(null);

    // --- ESTADOS: FORMULARIO PRODUCTO (Sincronizado con tus columnas de SQL) ---
    const [prodNombre, setProdNombre] = useState('');
    const [prodCodigo, setProdCodigo] = useState('');
    const [prodPrecio, setProdPrecio] = useState('');
    const [prodCantidad, setProdCantidad] = useState(''); // Mapped to 'cantidad'
    const [prodCategoriaId, setProdCategoriaId] = useState('');

    // --- ESTADOS: FORMULARIO CATEGORÍA ---
    const [catNombre, setCatNombre] = useState('');
    const [catDescuento, setCatDescuento] = useState('');
    const [productosEnEstaCategoria, setProductosEnEstaCategoria] = useState([]);

    // =====================================================================
    // 1. CARGA UNIFICADA DE DATOS
    // =====================================================================
    const cargarDatos = async () => {
        setCargando(true);
        try {
            const resProds = await obtenerProductos();
            const resCats = await obtenerCategorias();
            
            if (resProds?.success) setProductos(resProds.datos || []);
            if (resCats?.success) setCategorias(resCats.datos || []);
        } catch (error) {
            console.error("Error cargando maestro de inventario:", error);
        }
        setCargando(false);
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // =====================================================================
    // 2. LÓGICA CORREGIDA PARA NUEVOS REGISTROS (Limpieza Absoluta de Estados)
    // =====================================================================
    const prepararNuevoProducto = () => {
        setTipoModal('Producto');
        setIdEditando(null);
        
        // Limpiamos minuciosamente el formulario para evitar conflictos
        setProdNombre('');
        setProdCodigo('');
        setProdPrecio('');
        setProdCantidad('');
        setProdCategoriaId(categorias[0]?.id || ''); // Defectua la primera categoría disponible
        
        setIsModalOpen(true);
    };

    const prepararNuevaCategoria = () => {
        setTipoModal('Categoria');
        setIdEditando(null);
        
        // Limpiamos campos de categoría
        setCatNombre('');
        setCatDescuento('');
        setProductosEnEstaCategoria([]);
        
        setIsModalOpen(true);
    };

    // =====================================================================
    // 3. FUNCIONES DE EDICIÓN
    // =====================================================================
    const manejarEditarProducto = (producto) => {
        setTipoModal('Producto');
        setIdEditando(producto.id);
        
        setProdNombre(producto.nombre || '');
        setProdCodigo(producto.codigo || '');
        setProdPrecio(producto.precio || '');
        setProdCantidad(producto.cantidad || ''); // Base de datos 'cantidad'
        setProdCategoriaId(producto.categoria_id || '');
        
        setIsModalOpen(true);
    };

    const manejarEditarCategoria = (categoria) => {
        setTipoModal('Categoria');
        setIdEditando(categoria.id);
        setCatNombre(categoria.nombre || '');
        setCatDescuento(''); 
        
        // Relación robusta forzando strings para la auditoría en el modal
        const prods = productos.filter(p => String(p.categoria_id) === String(categoria.id));
        setProductosEnEstaCategoria(prods);
        
        setIsModalOpen(true);
    };

    // =====================================================================
    // 4. ACCIONES MASIVAS
    // =====================================================================
    const manejarDesvincular = async (productoId) => {
        if(!confirm('¿Quitar este producto de la categoría?')) return;
        await desvincularProductoDeCategoria(productoId);
        setProductosEnEstaCategoria(productosEnEstaCategoria.filter(p => p.id !== productoId));
        cargarDatos();
    };

    const manejarDescuentoMasivo = async () => {
        if (!catDescuento || catDescuento <= 0 || catDescuento > 100) {
            return alert('Ingrese un porcentaje válido.');
        }
        if(!confirm(`¿Aplicar descuento masivo a la familia ${catNombre}?`)) return;

        setCargandoModal(true);
        await aplicarDescuentoCategoria(idEditando, parseFloat(catDescuento));
        await cargarDatos();
        setCargandoModal(false);
        alert('Descuento aplicado.');
        setIsModalOpen(false);
    };

    // =====================================================================
    // 5. GUARDADO INTELIGENTE (Bifurcado por Tipo)
    // =====================================================================
    const manejarGuardar = async (e) => {
        e.preventDefault();
        setCargandoModal(true);
        try {
            if (tipoModal === 'Producto') {
                if (idEditando) {
                    await actualizarProducto(idEditando, prodNombre, prodCodigo, prodPrecio, prodCantidad, prodCategoriaId);
                } else {
                    await registrarProducto(prodNombre, prodCodigo, prodPrecio, prodCantidad, prodCategoriaId);
                }
            } else {
                if (idEditando) {
                    await actualizarCategoria(idEditando, catNombre);
                } else {
                    await registrarCategoria(catNombre);
                }
            }
            await cargarDatos();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error en persistencia:", error);
            alert("Error al procesar los cambios en el servidor.");
        }
        setCargandoModal(false);
    };

    const itemsFiltrados = pestañaActiva === 'Productos' 
        ? productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo?.includes(busqueda))
        : categorias.filter(c => c.nombre?.toLowerCase().includes(busqueda.toLowerCase()));

    return (
        <AccesoAdministrador>
            <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
                
                {/* CABECERA CON BOTONES CORREGIDOS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', margin: '0 0 5px 0' }}>Inventario Maestro</h1>
                        <p style={{ margin: 0, color: 'var(--x-text-muted)', fontSize: '14px' }}>Control de existencias y familias de productos.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={prepararNuevaCategoria} style={{ backgroundColor: 'transparent', color: '#fff', border: '1px solid var(--x-border)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                            + Nueva Familia
                        </button>
                        <button onClick={prepararNuevoProducto} style={{ backgroundColor: 'var(--success-green)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                            + Nuevo Producto
                        </button>
                    </div>
                </div>

                {/* BUSCADOR */}
                <div style={{ marginBottom: '20px' }}>
                    <input type="text" placeholder={`Buscar en ${pestañaActiva.toLowerCase()}...`} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="crud-input-style" style={{ width: '100%', maxWidth: '400px' }} />
                </div>

                {/* TABS */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--x-border)', paddingBottom: '10px' }}>
                    <button onClick={() => setPestañaActiva('Productos')} style={{ padding: '10px 20px', backgroundColor: pestañaActiva === 'Productos' ? 'rgba(59, 130, 246, 0.15)' : 'transparent', border: 'none', borderBottom: pestañaActiva === 'Productos' ? '2px solid var(--x-primary)' : '2px solid transparent', color: pestañaActiva === 'Productos' ? 'var(--x-primary)' : 'var(--x-text-muted)', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                        Existencias ({productos.length})
                    </button>
                    <button onClick={() => setPestañaActiva('Categorias')} style={{ padding: '10px 20px', backgroundColor: pestañaActiva === 'Categorias' ? 'rgba(16, 185, 129, 0.15)' : 'transparent', border: 'none', borderBottom: pestañaActiva === 'Categorias' ? '2px solid var(--success-green)' : '2px solid transparent', color: pestañaActiva === 'Categorias' ? 'var(--success-green)' : 'var(--x-text-muted)', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                        Familias / Categorías ({categorias.length})
                    </button>
                </div>

                {/* TABLA PRINCIPAL CON RELACIONES CORREGIDAS */}
                <div style={{ background: 'var(--x-bg-card)', borderRadius: '12px', border: '1px solid var(--x-border)', overflow: 'hidden' }}>
                    {cargando ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>Sincronizando almacén...</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    {pestañaActiva === 'Productos' ? (
                                        <>
                                            <th style={{ padding: '15px' }}>Código / Producto</th>
                                            <th style={{ padding: '15px' }}>Categoría</th>
                                            <th style={{ padding: '15px' }}>Precio Unit.</th>
                                            <th style={{ padding: '15px', textAlign: 'center' }}>Disponibles</th>
                                        </>
                                    ) : (
                                        <>
                                            <th style={{ padding: '15px' }}>ID</th>
                                            <th style={{ padding: '15px' }}>Nombre de Familia</th>
                                            <th style={{ padding: '15px', textAlign: 'center' }}>Variedad de Ítems</th>
                                        </>
                                    )}
                                    <th style={{ padding: '15px', textAlign: 'right' }}>Administración</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsFiltrados.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        {pestañaActiva === 'Productos' ? (
                                            <>
                                                <td style={{ padding: '15px' }}>
                                                    <div style={{ fontWeight: 'bold' }}>{item.nombre}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--x-text-muted)', fontFamily: 'monospace' }}>{item.codigo}</div>
                                                </td>
                                                <td style={{ padding: '15px' }}>
                                                    <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                                        {categorias.find(c => String(c.id) === String(item.categoria_id))?.nombre || 'Sin categoría'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '15px', color: 'var(--success-green)', fontWeight: 'bold' }}>₡{item.precio}</td>
                                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                                    <span style={{ color: item.cantidad > 5 ? '#fff' : 'var(--danger-red)', fontWeight: 'bold' }}>{item.cantidad}</span>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ padding: '15px', color: 'var(--x-text-muted)' }}>#{item.id}</td>
                                                <td style={{ padding: '15px', fontWeight: 'bold', fontSize: '15px' }}>{item.nombre}</td>
                                                <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: 'var(--x-primary)' }}>
                                                    {/* Prioriza el conteo real del SP, si no, usa el fallback de memoria */}
                                                    {item.total_productos !== undefined ? item.total_productos : productos.filter(p => String(p.categoria_id) === String(item.id)).length} ítems
                                                </td>
                                            </>
                                        )}
                                        <td style={{ padding: '15px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => pestañaActiva === 'Productos' ? manejarEditarProducto(item) : manejarEditarCategoria(item)} 
                                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--x-border)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                                Administrar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* MODAL MAESTRO REESTRUCTURADO */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                    {tipoModal === 'Producto' ? (
                        <form onSubmit={manejarGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '25px', padding: '10px', width: '100%', maxWidth: '550px' }}>
                            <div style={{ borderBottom: '1px solid var(--x-border)', paddingBottom: '10px' }}>
                                <h3 style={{ margin: 0, color: '#fff' }}>{idEditando ? 'Modificar Producto de Catálogo' : 'Dar de Alta Nuevo Producto'}</h3>
                            </div>
                            
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Nombre del Artículo</label>
                                <input type="text" value={prodNombre} onChange={e => setProdNombre(e.target.value)} className="crud-input-style" required />
                            </div>

                            <div className="form-grid-2">
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Código de Barras / SKU</label>
                                    <input type="text" value={prodCodigo} onChange={e => setProdCodigo(e.target.value)} className="crud-input-style" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Familia / Categoría Asignada</label>
                                    <select value={prodCategoriaId} onChange={e => setProdCategoriaId(e.target.value)} className="crud-input-style" style={{ width: '100%', backgroundColor: 'var(--x-bg-base)' }}>
                                        <option value="">-- Seleccionar Familia --</option>
                                        {categorias.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-grid-2">
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Precio de Venta (₡)</label>
                                    <input type="number" step="0.01" value={prodPrecio} onChange={e => setProdPrecio(e.target.value)} className="crud-input-style" required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Cantidad Inicial en Stock</label>
                                    <input type="number" value={prodCantidad} onChange={e => setProdCantidad(e.target.value)} className="crud-input-style" required />
                                </div>
                            </div>

                            <button type="submit" disabled={cargandoModal} style={{ backgroundColor: 'var(--x-primary)', color: '#fff', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {cargandoModal ? 'Registrando en SQL...' : idEditando ? 'Asentar Cambios de Producto' : 'Inyectar Producto a Inventario'}
                            </button>
                        </form>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px', width: '100%', maxWidth: '650px' }}>
                            <div style={{ borderBottom: '1px solid var(--x-border)', paddingBottom: '10px' }}>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>{idEditando ? `Familia: ${catNombre}` : 'Crear Nueva Familia de Productos'}</h3>
                                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: 'var(--x-text-muted)' }}>Configuración de estantería virtual y herramientas masivas.</p>
                            </div>

                            <form onSubmit={manejarGuardar} style={{ display: 'flex', gap: '10px' }}>
                                <input type="text" value={catNombre} onChange={e => setCatNombre(e.target.value)} className="crud-input-style" style={{ flex: 1 }} placeholder="Ej: Bebidas Energéticas" required />
                                <button type="submit" style={{ backgroundColor: 'var(--x-primary)', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    {idEditando ? 'Renombrar' : 'Crear Categoría'}
                                </button>
                            </form>

                            {idEditando && (
                                <>
                                    {/* SECCIÓN DESCUENTO MASIVO */}
                                    <div style={{ backgroundColor: 'rgba(255, 173, 31, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255, 173, 31, 0.3)' }}>
                                        <h4 style={{ margin: '0 0 10px 0', color: '#ffad1f', fontSize: '13px', textTransform: 'uppercase' }}>Herramienta de Descuento Global</h4>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input type="number" min="1" max="100" placeholder="% Descuento" value={catDescuento} onChange={e => setCatDescuento(e.target.value)} className="crud-input-style" style={{ width: '150px' }} />
                                            <button onClick={manejarDescuentoMasivo} type="button" style={{ backgroundColor: 'rgba(255, 173, 31, 0.2)', color: '#ffad1f', border: '1px dashed #ffad1f', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                Aplicar a toda la categoría
                                            </button>
                                        </div>
                                    </div>

                                    {/* LISTA INTERACTIVA DE AUDITORÍA */}
                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--x-border)' }}>
                                        <h4 style={{ margin: '0 0 10px 0', color: 'var(--x-primary)', fontSize: '13px', textTransform: 'uppercase' }}>Artículos Vinculados ({productosEnEstaCategoria.length})</h4>
                                        
                                        {productosEnEstaCategoria.length === 0 ? (
                                            <div style={{ fontSize: '12px', color: 'var(--x-text-muted)' }}>No hay productos en este estante.</div>
                                        ) : (
                                            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                                <table style={{ width: '100%', fontSize: '12px', color: '#fff', borderCollapse: 'collapse' }}>
                                                    <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)', position: 'sticky', top: 0 }}>
                                                        <tr>
                                                            <th style={{ padding: '8px', textAlign: 'left' }}>Producto</th>
                                                            <th style={{ padding: '8px', textAlign: 'center' }}>Existencias</th>
                                                            <th style={{ padding: '8px', textAlign: 'center' }}>Desvincular</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {productosEnEstaCategoria.map(p => (
                                                            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <td style={{ padding: '8px' }}>{p.nombre}</td>
                                                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{p.cantidad}</td>
                                                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                                                    <button onClick={() => manejarDesvincular(p.id)} style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                                                                        Quitar de Familia
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </Modal>
                
            </main>
        </AccesoAdministrador>
    );
}