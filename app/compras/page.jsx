'use client';
import { useState, useEffect } from 'react';
import { obtenerProductos, registrarNuevoProducto } from '@/app/actions/inventarioActions';
import { procesarCompraTransaccional } from '@/app/actions/comprasActions';
import { obtenerProveedores, registrarProveedor } from '@/app/actions/proveedoresActions';
import { obtenerCategorias } from '@/app/actions/categoriasActions';

export default function ComprasPage() {
  const [inventario, setInventario] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [busquedaProveedor, setBusquedaProveedor] = useState('');
  
  const [proveedorId, setProveedorId] = useState('');
  const [idProducto, setIdProducto] = useState('');
  const [cantidadReposicion, setCantidadReposicion] = useState('');

  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState('');
  const [nuevoProveedorContacto, setNuevoProveedorContacto] = useState('');

  const [nuevoProdNombre, setNuevoProdNombre] = useState('');
  const [nuevoProdCategoria, setNuevoProdCategoria] = useState('');
  const [nuevoProdPrecio, setNuevoProdPrecio] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const [respProd, respProv, respCat] = await Promise.all([
      obtenerProductos(),
      obtenerProveedores(),
      obtenerCategorias()
    ]);
    
    if (respProd.success) setInventario(respProd.datos || []);
    if (respProv.success) setProveedores(respProv.datos || []);
    if (respCat.success) setCategorias(respCat.datos || []);
    setCargando(false);
  };

  const manejarBusquedaProducto = (e) => {
    setBusquedaProducto(e.target.value);
    setIdProducto(''); 
  };

  const manejarBusquedaProveedor = (e) => {
    setBusquedaProveedor(e.target.value);
    setProveedorId(''); 
  };

  const productosFiltrados = inventario.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  const proveedoresFiltrados = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProveedor.toLowerCase())
  );

  const procesarCompra = async (e) => {
    e.preventDefault();
    if (!proveedorId || !idProducto || !cantidadReposicion) {
      return alert('Debe seleccionar un proveedor, un producto y especificar la cantidad.');
    }

    const respuesta = await procesarCompraTransaccional(idProducto, cantidadReposicion, proveedorId);
    
    if (respuesta.success) {
      alert(respuesta.mensaje);
      setProveedorId('');
      setIdProducto('');
      setCantidadReposicion('');
      setBusquedaProducto('');
      setBusquedaProveedor('');
      cargarDatos();
    } else {
      alert('Error en base de datos: ' + respuesta.error);
    }
  };

  const manejarAgregarProveedor = async (e) => {
    e.preventDefault();
    if (!nuevoProveedorNombre) return alert('El nombre del proveedor es obligatorio.');
    
    const respuesta = await registrarProveedor(nuevoProveedorNombre, nuevoProveedorContacto);
    if (respuesta.success) {
      alert('Proveedor registrado en el sistema.');
      setNuevoProveedorNombre('');
      setNuevoProveedorContacto('');
      cargarDatos();
    } else {
      alert('Error al registrar proveedor: ' + respuesta.error);
    }
  };

  const manejarAgregarProducto = async (e) => {
    e.preventDefault();
    if (!nuevoProdNombre || !nuevoProdCategoria || !nuevoProdPrecio) {
      return alert('Complete nombre, categoria y precio para el nuevo producto.');
    }
    
    // Se inicializa con cantidad 0 porque la mercaderia entrara al procesar la compra principal
    const respuesta = await registrarNuevoProducto(nuevoProdNombre, nuevoProdCategoria, nuevoProdPrecio, 0);
    if (respuesta.success) {
      alert('Producto registrado en BD. Ahora puede seleccionarlo para ingresar su stock mediante la compra.');
      setNuevoProdNombre('');
      setNuevoProdCategoria('');
      setNuevoProdPrecio('');
      cargarDatos();
    } else {
      alert('Error al registrar producto: ' + respuesta.error);
    }
  };

  return (
    <main style={{ padding: '2rem' }}>
      <h2>Reposicion de Inventario y Compras</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Panel Izquierdo: Operacion Principal de Compra */}
        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <h3 style={{ marginTop: 0 }}>Registrar Compra al Core</h3>
          
          {cargando ? (
            <p style={{ color: 'var(--x-text-muted)' }}>Sincronizando con base de datos...</p>
          ) : (
            <form onSubmit={procesarCompra} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--x-text-muted)' }}>Paso 1: Proveedor</label>
                <input 
                  type="text" 
                  placeholder="Buscar proveedor..." 
                  value={busquedaProveedor} 
                  onChange={manejarBusquedaProveedor} 
                  className="crud-input-style"
                  style={{ marginBottom: '10px', marginTop: '5px' }}
                />
                <select 
                  value={proveedorId} 
                  onChange={e => setProveedorId(e.target.value)}
                  className="crud-input-style"
                >
                  <option value="">Seleccione el proveedor</option>
                  {proveedoresFiltrados.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--x-text-muted)' }}>Paso 2: Producto a Reabastecer</label>
                <input 
                  type="text" 
                  placeholder="Buscar producto..." 
                  value={busquedaProducto} 
                  onChange={manejarBusquedaProducto} 
                  className="crud-input-style"
                  style={{ marginBottom: '10px', marginTop: '5px' }}
                />
                <select 
                  value={idProducto} 
                  onChange={e => setIdProducto(e.target.value)}
                  className="crud-input-style"
                >
                  <option value="">Seleccione el producto</option>
                  {productosFiltrados.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock actual: {p.cantidad})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--x-text-muted)' }}>Paso 3: Cantidad Entrante</label>
                <input 
                  type="number" 
                  min="1"
                  placeholder="Cantidad recibida" 
                  value={cantidadReposicion} 
                  onChange={e => setCantidadReposicion(e.target.value)} 
                  className="crud-input-style"
                  style={{ marginTop: '5px' }}
                />
              </div>

              <button type="submit" style={{ backgroundColor: 'var(--success-green)', color: '#fff', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                Procesar Compra y Actualizar Stock
              </button>
            </form>
          )}
        </div>

        {/* Panel Derecho: Formularios de Creacion Rapida */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <form onSubmit={manejarAgregarProveedor} style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '5px' }}>Registrar Nuevo Proveedor</h3>
            <input 
              type="text" 
              placeholder="Nombre del proveedor" 
              value={nuevoProveedorNombre} 
              onChange={e => setNuevoProveedorNombre(e.target.value)} 
              className="crud-input-style" 
            />
            <input 
              type="text" 
              placeholder="Contacto (Telefono/Email)" 
              value={nuevoProveedorContacto} 
              onChange={e => setNuevoProveedorContacto(e.target.value)} 
              className="crud-input-style" 
            />
            <button type="submit" style={{ backgroundColor: 'var(--x-primary)', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              Guardar Proveedor
            </button>
          </form>

          <form onSubmit={manejarAgregarProducto} style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '5px' }}>Registrar Nuevo Producto</h3>
            <input 
              type="text" 
              placeholder="Nombre del nuevo producto" 
              value={nuevoProdNombre} 
              onChange={e => setNuevoProdNombre(e.target.value)} 
              className="crud-input-style" 
            />
            <select 
              value={nuevoProdCategoria} 
              onChange={e => setNuevoProdCategoria(e.target.value)}
              className="crud-input-style"
            >
              <option value="">Seleccione una categoria</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
            <input 
              type="number" 
              step="0.01"
              placeholder="Precio de Venta (₡)" 
              value={nuevoProdPrecio} 
              onChange={e => setNuevoProdPrecio(e.target.value)} 
              className="crud-input-style" 
            />
            <button type="submit" style={{ backgroundColor: 'var(--x-primary)', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              Guardar Producto en BD
            </button>
          </form>

        </div>

      </div>
    </main>
  );
}