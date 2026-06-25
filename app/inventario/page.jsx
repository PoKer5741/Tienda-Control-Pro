'use client';
import { useState, useEffect } from 'react';
import { obtenerProductos, registrarNuevoProducto, actualizarProducto } from '@/app/actions/inventarioActions';
import { obtenerCategorias } from '@/app/actions/categoriasActions';
import SelectPremium from '@/components/SelectPremium';
import Modal from '@/components/Modal';
import BotonExportar from '@/components/BotonExportar';  

export default function InventarioPage() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
   
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState('Todos');
  const [filtroEstadoBusqueda, setFiltroEstadoBusqueda] = useState('Activos'); 
 
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
    
    // CORRECCIÓN APLICADA: Conversión segura del objeto Date a String
    setFechaVencimiento(prod.fecha_vencimiento ? new Date(prod.fecha_vencimiento).toISOString().split('T')[0] : '');
    
    setEstadoComercial(prod.estado_comercial || 'Activo');
    setIsModalOpen(true);
  };

  const manejarGuardar = async (e) => {
    e.preventDefault();
    if (!codigo || !nombre || !categoriaId || !costo || !precio) return alert('Complete los campos obligatorios.');

    const respuesta = idEditando 
      ? await actualizarProducto(idEditando, codigo, nombre, categoriaId, costo, precio, cantidad, iva, minimo, maximo, fechaVencimiento, estadoComercial)
      : await registrarNuevoProducto(codigo, nombre, categoriaId, costo, precio, cantidad, iva, minimo, maximo, fechaVencimiento, estadoComercial);
    
    if (respuesta.success) {
      alert(idEditando ? 'Ficha actualizada correctamente.' : 'Producto ingresado al catálogo.');
      setIsModalOpen(false);
      limpiarFormulario();
      cargarDatos();
    } else {
      alert('Error transaccional: ' + respuesta.error);
    }
  };

  // Variables de tiempo para cálculos de vencimiento
  const hoy = new Date();
  const limiteVencimiento = new Date();
  limiteVencimiento.setDate(hoy.getDate() + 30); // 30 días para alerta naranja

  // Motor de Filtrado y Ordenamiento FIFO (Ahora incluye el 3er filtro)
  const productosFiltrados = productos.filter(p => {
      const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo?.toLowerCase().includes(busqueda.toLowerCase());
      const coincideCategoria = filtroCat === 'Todos' || p.categoria === filtroCat;
      
      // Lógica del nuevo menú desplegable
      let coincideEstado = true;
      if (filtroEstadoBusqueda === 'Activos') coincideEstado = p.estado_comercial !== 'Descontinuado';
      if (filtroEstadoBusqueda === 'Descontinuados') coincideEstado = p.estado_comercial === 'Descontinuado';
      if (filtroEstadoBusqueda === 'Critico') coincideEstado = p.cantidad <= p.stock_minimo;
      if (filtroEstadoBusqueda === 'Vencidos') {
          if (!p.fecha_vencimiento) return false;
          coincideEstado = new Date(p.fecha_vencimiento) <= limiteVencimiento;
      }

      return coincideBusqueda && coincideCategoria && coincideEstado;
  }).sort((a, b) => {
      if (a.estado_comercial === 'Descontinuado' && b.estado_comercial !== 'Descontinuado') return 1;
      if (a.estado_comercial !== 'Descontinuado' && b.estado_comercial === 'Descontinuado') return -1;
      if (a.fecha_vencimiento && b.fecha_vencimiento) return new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento);
      if (a.fecha_vencimiento && !b.fecha_vencimiento) return -1;
      if (!a.fecha_vencimiento && b.fecha_vencimiento) return 1;
      return a.nombre.localeCompare(b.nombre);
  });

  // Mapeo de opciones para los menús premium
  const opcionesFiltroCategoria = [
    { valor: 'Todos', etiqueta: 'Todas las categorías' },
    ...categorias.map(c => ({ valor: c.nombre, etiqueta: c.nombre }))
  ];

  const opcionesFiltroAvanzado = [
    { valor: 'Todos', etiqueta: 'Mostrar Todo el Catálogo' },
    { valor: 'Activos', etiqueta: 'Solo Artículos Activos' },
    { 
      valor: 'Descontinuados', 
      etiqueta: <span style={{ color: 'var(--x-text-muted)' }}>Solo Descontinuados</span> 
    },
    { 
      valor: 'Critico', 
      etiqueta: <span style={{ color: 'var(--danger-red)', fontWeight: 'bold' }}>Alerta: Stock Crítico</span> 
    },
    { 
      valor: 'Vencidos', 
      etiqueta: <span style={{ color: '#ffad1f', fontWeight: 'bold' }}>Alerta: Vencimientos</span> 
    }
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

  const columnasExportacion = [
    { encabezado: 'Código', llave: 'codigo' },
    { encabezado: 'Descripción', llave: 'nombre' },
    { encabezado: 'Categoría', llave: 'categoria' },
    { encabezado: 'Costo Unit.', llave: 'costo' },
    { encabezado: 'Precio Venta', llave: 'precio' },
    { encabezado: 'Stock Físico', llave: 'cantidad' },
    { encabezado: 'Estado', llave: 'estado_comercial' }
];
  return (
    <main style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* CABECERA Y FILTROS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: 'var(--x-text-main)', margin: 0 }}>Gestión Maestra de Inventario</h2>
        <button 
          onClick={() => { limpiarFormulario(); setIsModalOpen(true); }} 
          style={{ backgroundColor: 'var(--x-primary)', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
            + Nuevo Producto
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
            type="text" 
            placeholder="Buscar por código o nombre..." 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            className="crud-input-style" 
            style={{ flex: 1, minWidth: '250px', maxWidth: '400px' }}
        />
        
        {/* DESPLEGABLE 1: CATEGORÍAS */}
        <div style={{ flex: 1, minWidth: '200px', maxWidth: '250px', zIndex: 10 }}>
            <SelectPremium 
                opciones={opcionesFiltroCategoria}
                valorSeleccionado={filtroCat}
                alCambiar={setFiltroCat}
            />
        </div>

        {/* DESPLEGABLE 2: NUEVO FILTRO DE SALUD OPERATIVA */}
        <div style={{ flex: 1, minWidth: '200px', maxWidth: '250px', zIndex: 9 }}>
            <SelectPremium 
                opciones={opcionesFiltroAvanzado}
                valorSeleccionado={filtroEstadoBusqueda}
                alCambiar={setFiltroEstadoBusqueda}
            />
        </div>
      </div>

      {/* MODAL DEL FORMULARIO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={manejarGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px' }}>
          
          <div style={{ borderBottom: '1px solid var(--x-border)', paddingBottom: '10px', marginBottom: '5px' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
              {idEditando ? 'Auditar y Editar Ficha' : 'Generar Nueva Ficha'}
            </h3>
          </div>
          
          <input type="text" placeholder="Código Único / SKU" value={codigo} onChange={e => setCodigo(e.target.value)} className="crud-input-style" disabled={!!idEditando} />
          <input type="text" placeholder="Nombre / Descripción del Artículo" value={nombre} onChange={e => setNombre(e.target.value)} className="crud-input-style" />
          
          <div style={{ zIndex: 9 }}>
              <SelectPremium 
                  opciones={opcionesFormCategoria}
                  valorSeleccionado={categoriaId}
                  alCambiar={setCategoriaId}
              />
          </div>
          
          <div className="form-grid-2">
              <div>
                  <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block' }}>Costo Adquisición (₡)</label>
                  <input type="number" step="0.01" value={costo} onChange={e => setCosto(e.target.value)} className="crud-input-style" />
              </div>
              <div>
                  <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block' }}>Precio Venta (₡)</label>
                  <input type="number" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} className="crud-input-style" />
              </div>
          </div>

          <div className="form-grid-2">
              <div>
                  <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block' }}>Stock Físico Bodega</label>
                  <input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} className="crud-input-style" disabled={!!idEditando} title="Para afectar el stock de un producto existente, use el módulo de Compras o Facturación." />
              </div>
              <div style={{ zIndex: 8 }}>
                  <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block' }}>Tasa Impuesto (IVA)</label>
                  <SelectPremium 
                      opciones={opcionesIva}
                      valorSeleccionado={iva}
                      alCambiar={setIva}
                  />
              </div>
          </div>

          <div className="form-grid-2">
              <div>
                  <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block' }}>Alarma Reorden (Mín)</label>
                  <input type="number" value={minimo} onChange={e => setMinimo(e.target.value)} className="crud-input-style" />
              </div>
              <div>
                  <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block' }}>Límite Máximo (Max)</label>
                  <input type="number" value={maximo} onChange={e => setMaximo(e.target.value)} className="crud-input-style" />
              </div>
          </div>

          <div style={{ padding: '15px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#fff' }}>Ciclo de Vida y Logística</h4>
              <div className="form-grid-2">
                  <div>
                      <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block' }}>Fecha Caducidad</label>
                      <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} className="crud-input-style" style={{ padding: '10.5px 12px', colorScheme: 'dark' }} />
                  </div>
                  <div style={{ zIndex: 7 }}>
                      <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block' }}>Estado Comercial</label>
                      <SelectPremium 
                          opciones={opcionesEstado}
                          valorSeleccionado={estadoComercial}
                          alCambiar={setEstadoComercial}
                      />
                  </div>
              </div>
          </div>
          
          <button type="submit" style={{ backgroundColor: idEditando ? 'var(--x-primary)' : 'var(--success-green)', color: '#fff', border: 'none', padding: '16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {idEditando ? 'Asentar Cambios' : 'Generar Ficha'}
          </button>
        </form>
      </Modal>

      {/* TABLA CATÁLOGO CENTRAL */}
      <div style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
        
        {/* CABECERA CON EXPORTACIÓN */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Inventario Valorado</h3>
            <BotonExportar 
                datos={productosFiltrados} 
                columnas={columnasExportacion} 
                titulo="Reporte de Inventario Valorado y Existencias" 
                nombreArchivo="Inventario_TCP" 
            />
        </div>

        {cargando ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>Sincronizando existencias...</div>
        ) : productosFiltrados.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>No se encontraron artículos con los criterios actuales.</div>
        ) : (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                  <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                      <th style={{ padding: '15px 12px' }}>Código</th>
                      <th style={{ padding: '15px 12px' }}>Descripción</th>
                      <th style={{ padding: '15px 12px', textAlign: 'right' }}>Costo</th>
                      <th style={{ padding: '15px 12px', textAlign: 'right' }}>Precio Venta</th>
                      <th style={{ padding: '15px 12px', textAlign: 'center' }}>Stock Físico</th>
                      <th style={{ padding: '15px 12px', textAlign: 'center' }}>Salud Operativa</th>
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
                              badgeFecha = <span style={{ display: 'block', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger-red)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>VENCIDO</span>;
                          } else if (fechaVen <= limiteVencimiento) {
                              badgeFecha = <span style={{ display: 'block', backgroundColor: 'rgba(255, 173, 31, 0.15)', color: '#ffad1f', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>POR VENCER</span>;
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
                              title="Doble clic para editar"
                          >
                              <td style={{ padding: '15px 12px', fontFamily: 'monospace', textDecoration: esDescontinuado ? 'line-through' : 'none', color: 'var(--x-text-muted)' }}>{p.codigo}</td>
                              <td style={{ padding: '15px 12px', fontWeight: 'bold', color: '#fff' }}>
                                  {p.nombre}
                                  <span style={{ color: 'var(--x-text-muted)', fontSize: '11px', display: 'block', marginTop: '4px', fontWeight: 'normal' }}>{p.categoria}</span>
                              </td>
                              <td style={{ padding: '15px 12px', textAlign: 'right', color: 'var(--x-text-muted)' }}>₡{p.costo?.toLocaleString()}</td>
                              <td style={{ padding: '15px 12px', textAlign: 'right', color: 'var(--success-green)', fontWeight: 'bold' }}>₡{p.precio?.toLocaleString()}</td>
                              <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                                  <span style={{ fontSize: '16px', color: esCritico ? 'var(--danger-red)' : '#fff', fontWeight: 'bold' }}>{p.cantidad}</span>
                                  <div style={{ color: 'var(--x-text-muted)', fontSize: '10px', marginTop: '4px' }}>Mín: {p.stock_minimo} | Máx: {p.stock_maximo}</div>
                              </td>
                              <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                                  {esDescontinuado ? (
                                      <span style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--x-text-muted)', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>DESCONTINUADO</span>
                                  ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                          {esSobrestock && <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--x-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>SOBRESTOCK</span>}
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
    </main>
  );
}