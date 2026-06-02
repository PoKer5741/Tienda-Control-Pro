'use client';
import { useState, useEffect } from 'react';
import { obtenerProductos } from '@/app/actions/inventarioActions';
import { procesarVentaTransaccional } from '@/app/actions/ventasActions';

export default function FacturacionPage() {
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [idSeleccionado, setIdSeleccionado] = useState('');
  const [cantidadVenta, setCantidadVenta] = useState(1);

  useEffect(() => {
    cargarInventario();
  }, []);

  const cargarInventario = async () => {
    setCargando(true);
    const respuesta = await obtenerProductos();
    if (respuesta.success) {
      setInventario(respuesta.datos || []);
    } else {
      alert('Fallo al cargar inventario: ' + respuesta.error);
    }
    setCargando(false);
  };

  const manejarBusqueda = (e) => {
    setBusqueda(e.target.value);
    setIdSeleccionado('');
  };

  const productosFiltrados = inventario.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const agregarAlCarrito = (e) => {
    e.preventDefault();
    if (!idSeleccionado || !cantidadVenta) return alert('Seleccione un producto del menu desplegable y especifique la cantidad.');

    const producto = inventario.find(p => String(p.id) === String(idSeleccionado));
    if (!producto) return alert('Producto no valido. Asegurese de hacer clic en la opcion del menu desplegable.');

    if (producto.cantidad < parseInt(cantidadVenta)) {
      return alert('Stock insuficiente en base de datos.');
    }

    const nuevoItem = {
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: parseInt(cantidadVenta)
    };

    setCarrito([...carrito, nuevoItem]);
    setIdSeleccionado('');
    setCantidadVenta(1);
    setBusqueda('');
  };

  const procesarFactura = async () => {
    if (carrito.length === 0) return alert('El carrito esta vacio.');

    for (const item of carrito) {
      const respuesta = await procesarVentaTransaccional(item.id, item.cantidad, item.precio);
      if (!respuesta.success) {
         return alert('Error al procesar ' + item.nombre + ': ' + respuesta.error);
      }
    }

    alert('Facturacion asentada exitosamente en el motor SQL.');
    setCarrito([]);
    cargarInventario();
  };

  const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const impuesto = subtotal * 0.13;
  const total = subtotal + impuesto;

  return (
    <main style={{ padding: '2rem' }}>
      <h2>Modulo de Facturacion y Ventas</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <h3 style={{ marginTop: 0 }}>Seleccionar Producto</h3>
          
          <input 
            type="text" 
            placeholder="Buscar producto por nombre..." 
            value={busqueda} 
            onChange={manejarBusqueda} 
            className="crud-input-style"
            style={{ marginBottom: '15px' }}
          />

          <form onSubmit={agregarAlCarrito} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <select 
              value={idSeleccionado} 
              onChange={e => setIdSeleccionado(e.target.value)}
              className="crud-input-style"
            >
              <option value="">Seleccione el producto del listado</option>
              {productosFiltrados.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} - ₡{p.precio} (Disp: {p.cantidad})
                </option>
              ))}
            </select>
            
            <input 
              type="number" 
              min="1" 
              placeholder="Cantidad"
              value={cantidadVenta} 
              onChange={e => setCantidadVenta(e.target.value)} 
              className="crud-input-style"
            />
            
            <button type="submit" style={{ backgroundColor: 'var(--x-primary)', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              Agregar a la Factura
            </button>
          </form>
        </div>

        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <h3 style={{ marginTop: 0 }}>Detalle de Venta</h3>
          
          <ul style={{ listStyle: 'none', padding: 0, minHeight: '150px' }}>
            {carrito.map((c, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--x-border)', padding: '10px 0' }}>
                <span>{c.cantidad}x {c.nombre}</span>
                <span style={{ fontWeight: 'bold' }}>₡{(c.precio * c.cantidad).toLocaleString()}</span>
              </li>
            ))}
            {carrito.length === 0 && <p style={{ color: 'var(--x-text-muted)' }}>No hay elementos en la factura.</p>}
          </ul>

          <div style={{ borderTop: '2px dashed var(--x-border)', paddingTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal:</span> <span>₡{subtotal.toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--x-text-muted)' }}><span>IVA (13%):</span> <span>₡{impuesto.toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', marginTop: '10px', color: 'var(--success-green)' }}>
              <span>Total a Cobrar:</span> <span>₡{total.toLocaleString()}</span>
            </div>
          </div>

          <button onClick={procesarFactura} style={{ width: '100%', backgroundColor: 'var(--success-green)', color: '#fff', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }}>
            Confirmar y Registrar Venta
          </button>
        </div>
      </div>
    </main>
  );
}