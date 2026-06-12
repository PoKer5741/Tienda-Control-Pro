'use client';
import { useState, useEffect } from 'react';
import { obtenerCompras, registrarNuevaCompra } from '@/app/actions/comprasActions';
import { obtenerProveedores } from '@/app/actions/proveedoresActions';
import { obtenerCategorias } from '@/app/actions/categoriasActions';
import BuscadorPremium from '@/components/BuscadorPremium';

export default function ComprasPage() {
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Inputs del Formulario Unificado
  const [proveedorId, setProveedorId] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');

  useEffect(() => {
    cargarComponentes();
  }, []);

  const cargarComponentes = async () => {
    setCargando(true);
    const [resCom, resProv, resCat] = await Promise.all([
      obtenerCompras(),
      obtenerProveedores(),
      obtenerCategorias()
    ]);
    if (resCom.success) setCompras(resCom.datos || []);
    if (resProv.success) setProveedores(resProv.datos || []);
    if (resCat.success) setCategorias(resCat.datos || []);
    setCargando(false);
  };

  const ejecutarAsentamiento = async (e) => {
    e.preventDefault();
    if (!proveedorId || !codigo || !nombre || !categoriaId || !cantidad || !costoUnitario || !precioVenta) {
      return alert('Todos los campos operacionales son obligatorios.');
    }

    const respuesta = await registrarNuevaCompra(proveedorId, codigo, nombre, categoriaId, cantidad, costoUnitario, precioVenta);
    if (respuesta.success) {
      alert('Orden de Compra asentada en SQL Server. Inventario actualizado.');
      setCodigo(''); setNombre(''); setCategoriaId(''); setCantidad(''); setCostoUnitario(''); setPrecioVenta('');
      cargarComponentes();
    } else {
      alert('Error al procesar abastecimiento: ' + respuesta.error);
    }
  };

  // Mapeamos las opciones puras para los buscadores (el placeholder ahora lo maneja el componente)
  const opcionesProveedores = proveedores.map(p => ({ 
      valor: p.id.toString(), 
      etiqueta: p.nombre.toUpperCase() 
  }));

  const opcionesCategorias = categorias.map(c => ({ 
      valor: c.id.toString(), 
      etiqueta: c.nombre 
  }));

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: 'var(--x-text-main)' }}>Módulo de Abastecimiento y Órdenes de Compra</h2>

      <div className="responsive-grid" style={{ gridTemplateColumns: '1.1fr 2fr', gap: '30px', marginBottom: '40px' }}>
        
        {/* PANEL IZQUIERDO: FORMULARIO DE INGRESO */}
        <form onSubmit={ejecutarAsentamiento} style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>Nueva Adquisición de Lote</h3>
          
          <div style={{ zIndex: 20 }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Entidad Proveedora</label>
            <BuscadorPremium 
              opciones={opcionesProveedores}
              valorSeleccionado={proveedorId}
              alCambiar={setProveedorId}
              placeholder="Escriba para buscar proveedor..."
            />
          </div>

          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Datos de Catálogo</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Código de Barras / SKU" value={codigo} onChange={e => setCodigo(e.target.value)} className="crud-input-style" />
              <input type="text" placeholder="Descripción del Artículo" value={nombre} onChange={e => setNombre(e.target.value)} className="crud-input-style" />
              
              <div style={{ zIndex: 19 }}>
                <BuscadorPremium 
                  opciones={opcionesCategorias}
                  valorSeleccionado={categoriaId}
                  alCambiar={setCategoriaId}
                  placeholder="Asignar familia contable..."
                />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Costos y Valores de Salida</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <input type="number" placeholder="Cantidad" value={cantidad} onChange={e => setCantidad(e.target.value)} className="crud-input-style" />
              </div>
              <div>
                <input type="number" step="0.01" placeholder="Costo Unit. (₡)" value={costoUnitario} onChange={e => setCostoUnitario(e.target.value)} className="crud-input-style" />
              </div>
            </div>
            <input type="number" step="0.01" placeholder="Precio Venta Público (₡)" value={precioVenta} onChange={e => setPrecioVenta(e.target.value)} className="crud-input-style" style={{ marginTop: '10px' }} />
          </div>

          <button type="submit" style={{ backgroundColor: 'var(--success-green)', color: '#000', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Asentar Compra e Inyectar Stock
          </button>
        </form>

        {/* PANEL DERECHO: HISTÓRICO DE MOVIMIENTOS */}
        <div style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#fff', marginBottom: '5px' }}>Bitácora de Lotes Recibidos</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'var(--x-text-muted)' }}>Historial de compras registradas en el libro diario de inventario.</p>

          {cargando ? (
            <div style={{ padding: '20px', color: 'var(--x-text-muted)', fontSize: '13px' }}>Consultando base de datos...</div>
          ) : compras.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--x-text-muted)', fontSize: '13px', textAlign: 'center' }}>No hay registros de abastecimiento asentados.</div>
          ) : (
            <div className="table-wrapper" style={{ flex: 1, maxHeight: '460px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Fecha</th>
                    <th style={{ padding: '10px' }}>Artículo</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Cant.</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Costo Unit.</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Inversión Total</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(56,68,77,0.3)' }}>
                      <td style={{ padding: '12px 10px', color: 'var(--x-text-muted)' }}>{c.fecha ? c.fecha.split(' ')[0] : 'N/A'}</td>
                      <td style={{ padding: '12px 10px', fontWeight: '500' }}>
                        {c.producto_nombre}
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--x-primary)' }}>Prov: {c.proveedor_nombre}</span>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 'bold' }}>{c.cantidad}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--x-text-muted)' }}>₡{(c.costo_unitario || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--success-green)', fontWeight: 'bold' }}>₡{((c.cantidad || 0) * (c.costo_unitario || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
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