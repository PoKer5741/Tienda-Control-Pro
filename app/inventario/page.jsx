'use client';
import { useState, useEffect } from 'react';
import { obtenerProductos, registrarNuevoProducto, actualizarProducto, eliminarProducto } from '@/app/actions/inventarioActions';
import { obtenerCategorias } from '@/app/actions/categoriasActions';
import SelectPremium from '@/components/SelectPremium';

export default function InventarioPage() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState('Todos');

  const [idEditando, setIdEditando] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [costo, setCosto] = useState('');
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [iva, setIva] = useState('13');
  const [minimo, setMinimo] = useState('5');
  const [maximo, setMaximo] = useState('100');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [estadoComercial, setEstadoComercial] = useState('Activo');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const [respProd, respCat] = await Promise.all([obtenerProductos(), obtenerCategorias()]);
    if (respProd.success) setProductos(respProd.datos || []);
    if (respCat.success) setCategorias(respCat.datos || []);
    setCargando(false);
  };

  const limpiarFormulario = () => {
    setIdEditando(null);
    setCodigo(''); setNombre(''); setCategoriaId(''); setCosto(''); 
    setPrecio(''); setCantidad(''); setIva('13'); setMinimo('5'); setMaximo('100');
    setFechaVencimiento(''); setEstadoComercial('Activo');
  };

  const manejarDobleClick = (prod) => {
    setIdEditando(prod.id);
    setCodigo(prod.codigo || '');
    setNombre(prod.nombre);
    setCategoriaId(prod.categoria_id ? prod.categoria_id.toString() : '');
    setCosto(prod.costo);
    setPrecio(prod.precio);
    setCantidad(prod.cantidad);
    setIva(prod.porcentaje_iva ? prod.porcentaje_iva.toString() : '13');
    setMinimo(prod.stock_minimo || 5);
    setMaximo(prod.stock_maximo || 100);
    setFechaVencimiento(prod.fecha_vencimiento ? prod.fecha_vencimiento.split('T')[0] : '');
    setEstadoComercial(prod.estado_comercial || 'Activo');

    // Nivel 7 UX: Auto-scroll suave hacia el formulario al hacer doble clic
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const manejarGuardar = async (e) => {
    e.preventDefault();
    if (!codigo || !nombre || !categoriaId || !costo || !precio) return alert('Complete los campos obligatorios.');

    let respuesta;
    if (idEditando) {
        respuesta = await actualizarProducto(idEditando, codigo, nombre, categoriaId, costo, precio, cantidad, iva, minimo, maximo, fechaVencimiento, estadoComercial);
    } else {
        respuesta = await registrarNuevoProducto(codigo, nombre, categoriaId, costo, precio, cantidad, iva, minimo, maximo, fechaVencimiento, estadoComercial);
    }
    
    if (respuesta.success) {
      alert(idEditando ? 'Ficha actualizada.' : 'Producto ingresado al catálogo.');
      limpiarFormulario();
      cargarDatos();
    } else {
      alert('Error transaccional: ' + respuesta.error);
    }
  };

  // 1. Filtrar los productos
  // 2. Ordenar inteligentemente (Vencimientos primero, descontinuados al final)
  const productosFiltrados = productos.filter(p => {
      const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo?.toLowerCase().includes(busqueda.toLowerCase());
      const coincideCategoria = filtroCat === 'Todos' || p.categoria === filtroCat;
      return coincideBusqueda && coincideCategoria;
  }).sort((a, b) => {
      // Regla A: Los descontinuados siempre van al fondo del barril
      if (a.estado_comercial === 'Descontinuado' && b.estado_comercial !== 'Descontinuado') return 1;
      if (a.estado_comercial !== 'Descontinuado' && b.estado_comercial === 'Descontinuado') return -1;

      // Regla B: Prioridad de Fecha de Vencimiento (Más cercano a vencer va arriba)
      if (a.fecha_vencimiento && b.fecha_vencimiento) {
          return new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento);
      }
      
      // Regla C: Los que tienen fecha de vencimiento van antes que los que no tienen (perecederos primero)
      if (a.fecha_vencimiento && !b.fecha_vencimiento) return -1;
      if (!a.fecha_vencimiento && b.fecha_vencimiento) return 1;

      // Regla D: Si ninguno es perecedero, ordenar alfabéticamente
      return a.nombre.localeCompare(b.nombre);
  });

  // Lógica de fechas para insignias
  const hoy = new Date();
  const limiteVencimiento = new Date();
  limiteVencimiento.setDate(hoy.getDate() + 30); // 30 días de holgura

  // Arreglos de Opciones para los SelectPremium
  const opcionesFiltroCategoria = [
    { valor: 'Todos', etiqueta: 'Todas las categorías' },
    ...categorias.map(c => ({ valor: c.nombre, etiqueta: c.nombre }))
  ];

  const opcionesFormCategoria = [
    { valor: '', etiqueta: 'Seleccione Categoría' },
    ...categorias.map(c => ({ valor: c.id.toString(), etiqueta: c.nombre }))
  ];

  const opcionesIva = [
    { valor: '0', etiqueta: '0%' },
    { valor: '1', etiqueta: '1%' },
    { valor: '2', etiqueta: '2%' },
    { valor: '4', etiqueta: '4%' },
    { valor: '13', etiqueta: '13%' }
  ];

  const opcionesEstado = [
    { valor: 'Activo', etiqueta: 'ACTIVO' },
    { valor: 'Descontinuado', etiqueta: 'DESCONTINUADO' }
  ];

  return (
    <main style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: 'var(--x-text-main)' }}>Gestión Maestra de Catálogo y Bodega</h2>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
            type="text" 
            placeholder="Buscar por código o nombre..." 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            className="crud-input-style" 
            style={{ flex: 1, minWidth: '250px', maxWidth: '400px' }}
        />
        <div style={{ flex: 1, minWidth: '200px', maxWidth: '250px', zIndex: 10 }}>
            <SelectPremium 
                opciones={opcionesFiltroCategoria}
                valorSeleccionado={filtroCat}
                alCambiar={setFiltroCat}
            />
        </div>
      </div>

      <div className="responsive-grid-inventario" style={{ gridTemplateColumns: '1fr 2.8fr' }}>
        
        {/* PANEL IZQUIERDO: FORMULARIO */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <form onSubmit={manejarGuardar} style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: idEditando ? '2px solid var(--x-primary)' : '1px solid var(--x-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {idEditando ? (
                <div style={{ backgroundColor: 'rgba(29, 161, 242, 0.15)', border: '1px solid var(--x-primary)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>MODO EDICIÓN</span>
                    <button type="button" onClick={limpiarFormulario} style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Cancelar</button>
                </div>
            ) : <h3 style={{ margin: 0, marginBottom: '5px' }}>Registrar Ficha</h3>}
            
            <input type="text" placeholder="Código Único" value={codigo} onChange={e => setCodigo(e.target.value)} className="crud-input-style" disabled={!!idEditando} />
            <input type="text" placeholder="Nombre / Descripción" value={nombre} onChange={e => setNombre(e.target.value)} className="crud-input-style" />
            
            <div style={{ zIndex: 9 }}>
                <SelectPremium 
                    opciones={opcionesFormCategoria}
                    valorSeleccionado={categoriaId}
                    alCambiar={setCategoriaId}
                />
            </div>
            
            <div className="form-grid-2">
                <div>
                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)' }}>Costo (₡)</label>
                    <input type="number" step="0.01" value={costo} onChange={e => setCosto(e.target.value)} className="crud-input-style" />
                </div>
                <div>
                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)' }}>Precio Sugerido (₡)</label>
                    <input type="number" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} className="crud-input-style" />
                </div>
            </div>

            <div className="form-grid-2">
                <div>
                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)' }}>Stock Físico</label>
                    <input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} className="crud-input-style" disabled={!!idEditando} title="El stock se afecta vía Compras o Facturas" />
                </div>
                <div style={{ zIndex: 8 }}>
                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', display: 'block', marginBottom: '3px' }}>% IVA</label>
                    <SelectPremium 
                        opciones={opcionesIva}
                        valorSeleccionado={iva}
                        alCambiar={setIva}
                    />
                </div>
            </div>

            <div className="form-grid-2">
                <div>
                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)' }}>Alarma Mínima</label>
                    <input type="number" value={minimo} onChange={e => setMinimo(e.target.value)} className="crud-input-style" />
                </div>
                <div>
                    <label style={{ fontSize: '11px', color: 'var(--x-text-muted)' }}>Límite Máximo</label>
                    <input type="number" value={maximo} onChange={e => setMaximo(e.target.value)} className="crud-input-style" />
                </div>
            </div>

            <div style={{ padding: '15px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginTop: '5px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#fff' }}>Ciclo de Vida del Producto</h4>
                <div className="form-grid-2">
                    <div>
                        <label style={{ fontSize: '11px', color: 'var(--x-text-muted)' }}>Vencimiento (Opcional)</label>
                        <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} className="crud-input-style" style={{ padding: '10.5px 12px' }} />
                    </div>
                    <div style={{ zIndex: 7 }}>
                        <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', display: 'block', marginBottom: '3px' }}>Estado Comercial</label>
                        <SelectPremium 
                            opciones={opcionesEstado}
                            valorSeleccionado={estadoComercial}
                            alCambiar={setEstadoComercial}
                        />
                    </div>
                </div>
            </div>
            
            <button type="submit" style={{ backgroundColor: idEditando ? 'var(--x-primary)' : 'var(--success-green)', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {idEditando ? 'Asentar Cambios' : 'Generar Ficha'}
            </button>
          </form>
        </div>

        {/* PANEL DERECHO: CATÁLOGO */}
        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '5px' }}>Catálogo de Existencias</h3>
          <p style={{ fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '15px' }}>Doble clic para auditar producto.</p>
          
          {cargando ? (
            <p style={{ color: 'var(--x-text-muted)' }}>Sincronizando con motor SQL...</p>
          ) : (
            <div className="table-wrapper" style={{ overflowX: 'visible' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                        <th style={{ padding: '12px 8px' }}>Código</th>
                        <th style={{ padding: '12px 8px' }}>Nombre</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>Costo</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>Precio</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center' }}>Stock Físico</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center' }}>Salud Operativa</th>
                    </tr>
                </thead>
                <tbody>
                    {productosFiltrados.map(p => {
                        const esSeleccionado = idEditando === p.id;
                        const esDescontinuado = p.estado_comercial === 'Descontinuado';
                        const esSobrestock = p.cantidad > p.stock_maximo;
                        const esCritico = p.cantidad <= p.stock_minimo;
                        
                        let badgeFecha = null;
                        if (p.fecha_vencimiento) {
                            const fechaVen = new Date(p.fecha_vencimiento);
                            if (fechaVen < hoy) {
                                badgeFecha = <span style={{ display: 'block', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger-red)', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>VENCIDO</span>;
                            } else if (fechaVen <= limiteVencimiento) {
                                badgeFecha = <span style={{ display: 'block', backgroundColor: 'rgba(255, 173, 31, 0.15)', color: '#ffad1f', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>POR VENCER</span>;
                            }
                        }

                        return (
                            <tr 
                                key={p.id} 
                                onDoubleClick={() => manejarDobleClick(p)}
                                style={{ 
                                    borderBottom: '1px solid rgba(56,68,77,0.4)', 
                                    cursor: 'pointer', 
                                    transition: 'all 0.2s',
                                    opacity: esDescontinuado ? 0.4 : 1,
                                    backgroundColor: esSeleccionado ? 'rgba(29, 161, 242, 0.15)' : (esDescontinuado ? 'rgba(0,0,0,0.2)' : 'transparent'),
                                    borderLeft: esSeleccionado ? '3px solid var(--x-primary)' : '3px solid transparent'
                                }}
                                onMouseOver={e => { if(!esSeleccionado && !esDescontinuado) e.currentTarget.style.backgroundColor = 'var(--x-bg-card-hover)' }}
                                onMouseOut={e => { if(!esSeleccionado && !esDescontinuado) e.currentTarget.style.backgroundColor = 'transparent' }}
                            >
                                <td style={{ padding: '12px 8px', fontFamily: 'monospace', textDecoration: esDescontinuado ? 'line-through' : 'none' }}>{p.codigo}</td>
                                <td style={{ padding: '12px 8px', fontWeight: '500' }}>
                                    {p.nombre}
                                    <span style={{ color: 'var(--x-text-muted)', fontSize: '11px', display: 'block', marginTop: '3px' }}>{p.categoria}</span>
                                </td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--x-text-muted)' }}>₡{p.costo?.toLocaleString()}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--success-green)', fontWeight: 'bold' }}>₡{p.precio?.toLocaleString()}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '15px', color: esCritico ? 'var(--danger-red)' : 'inherit', fontWeight: 'bold' }}>{p.cantidad}</span>
                                    <div style={{ color: 'var(--x-text-muted)', fontSize: '10px', marginTop: '2px' }}>Min: {p.stock_minimo} | Max: {p.stock_maximo}</div>
                                </td>
                                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                    {esDescontinuado ? (
                                        <span style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--x-text-muted)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>DESCONTINUADO</span>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                            {esSobrestock && <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--x-primary)', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>SOBRESTOCK</span>}
                                            {badgeFecha}
                                            {!esSobrestock && !badgeFecha && !esCritico && <span style={{ color: 'var(--success-green)', fontSize: '11px' }}>Óptimo</span>}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
                </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}