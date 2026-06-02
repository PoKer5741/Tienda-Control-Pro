'use client';
import { useState, useEffect } from 'react';
import { obtenerProductos, registrarNuevoProducto } from '@/app/actions/inventarioActions';
import { obtenerCategorias, registrarCategoria } from '@/app/actions/categoriasActions';

export default function InventarioPage() {
  // Estados de carga e informacion
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados para parametros de busqueda
  const [filtroCat, setFiltroCat] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para insercion de productos
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState('');

  // Estado para insercion de categorias
  const [nuevaCategoria, setNuevaCategoria] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    // Ejecucion paralela para optimizar tiempos de respuesta desde el servidor
    const [respProd, respCat] = await Promise.all([
      obtenerProductos(),
      obtenerCategorias()
    ]);
    
    if (respProd.success) setProductos(respProd.datos || []);
    if (respCat.success) setCategorias(respCat.datos || []);
    setCargando(false);
  };

  const manejarAgregarProducto = async (e) => {
    e.preventDefault();
    if (!nombre || !categoriaId || !precio || !cantidad) {
        return alert('Complete todos los campos obligatorios del producto.');
    }

    const respuesta = await registrarNuevoProducto(nombre, categoriaId, precio, cantidad);
    
    if (respuesta.success) {
      alert('Producto registrado correctamente en el motor SQL.');
      setNombre(''); setPrecio(''); setCantidad('');
      cargarDatos();
    } else {
      alert('Fallo al registrar producto: ' + respuesta.error);
    }
  };

  const manejarAgregarCategoria = async (e) => {
    e.preventDefault();
    if (!nuevaCategoria) return alert('Ingrese un nombre para la categoria.');
    
    const respuesta = await registrarCategoria(nuevaCategoria);
    if (respuesta.success) {
      alert('Categoria registrada exitosamente.');
      setNuevaCategoria('');
      cargarDatos();
    } else {
      alert('Error al registrar categoria: ' + respuesta.error);
    }
  };

  // Rutinas de procesamiento en memoria para evitar saturar el motor SQL en busquedas continuas
  const buscarProductoLocal = (lista, term) => {
    if (!term) return lista;
    return lista.filter(p => p.nombre.toLowerCase().includes(term.toLowerCase()));
  };

  const filtrarPorCategoriaLocal = (lista, cat) => {
    if (!cat || cat === 'Todos') return lista;
    return lista.filter(p => p.categoria === cat);
  };

  const calcularValorInventarioLocal = (lista) => {
    if (!lista || !Array.isArray(lista)) return 0;
    return lista.reduce((total, p) => total + (p.precio * p.cantidad), 0);
  };

  const productosFiltrados = filtrarPorCategoriaLocal(buscarProductoLocal(productos, busqueda), filtroCat);
  const valorTotal = calcularValorInventarioLocal(productos);

  return (
    <main style={{ padding: '2rem' }}>
      <h2>Gestión de Inventario</h2>
      
      <div style={{ background: 'var(--x-bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--x-border)', marginBottom: '1.5rem' }}>
        <span style={{ color: 'var(--x-text-muted)', fontSize: '14px', textTransform: 'uppercase' }}>Valor Total del Inventario</span>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-green)', fontFamily: 'monospace' }}>
          ₡{valorTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="Buscar producto por nombre..." 
          value={busqueda} 
          onChange={(e) => setBusqueda(e.target.value)} 
          className="crud-input-style"
          style={{ flex: 1 }}
        />
        <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)} className="crud-input-style" style={{ maxWidth: '250px' }}>
          <option value="Todos">Todas las categorías</option>
          {categorias.map(c => (
            <option key={c.id} value={c.nombre}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        
        {/* Panel Lateral: Operaciones de Insercion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <form onSubmit={manejarAgregarProducto} style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '5px' }}>Registrar Producto</h3>
            
            <input type="text" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} className="crud-input-style" />
            
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="crud-input-style">
              <option value="">Seleccione una categoría</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
            
            <input type="number" placeholder="Precio (₡)" value={precio} onChange={e => setPrecio(e.target.value)} className="crud-input-style" step="0.01" />
            <input type="number" placeholder="Stock Inicial" value={cantidad} onChange={e => setCantidad(e.target.value)} className="crud-input-style" />
            
            <button type="submit" style={{ backgroundColor: 'var(--success-green)', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>
              Agregar al Inventario
            </button>
          </form>

          <form onSubmit={manejarAgregarCategoria} style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '5px', fontSize: '16px' }}>Nueva Categoría</h3>
            <input type="text" placeholder="Nombre de categoría" value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)} className="crud-input-style" />
            <button type="submit" style={{ backgroundColor: 'var(--x-primary)', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              Guardar Categoría
            </button>
          </form>

        </div>

        {/* Panel Central: Renderizado de Datos */}
        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', overflowX: 'auto' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Catálogo de Productos</h3>
          {cargando ? (
            <p style={{ color: 'var(--x-text-muted)' }}>Sincronizando con motor SQL...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                  <th style={{ padding: '12px 10px' }}>Nombre</th>
                  <th style={{ padding: '12px 10px' }}>Categoría</th>
                  <th style={{ padding: '12px 10px' }}>Precio</th>
                  <th style={{ padding: '12px 10px' }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--x-text-muted)' }}>No se encontraron registros activos.</td>
                  </tr>
                ) : (
                  productosFiltrados.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(56,68,77,0.4)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: '500' }}>{p.nombre}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                          {p.categoria}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--success-green)', fontWeight: 'bold', fontFamily: 'monospace' }}>
                        ₡{p.precio.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 10px', color: p.cantidad <= p.punto_reorden ? 'var(--danger-red)' : 'inherit', fontWeight: p.cantidad <= p.punto_reorden ? 'bold' : 'normal' }}>
                        {p.cantidad}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </main>
  );
}