'use client';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav style={{
      backgroundColor: 'var(--x-bg-card)',
      borderBottom: '1px solid var(--x-border)',
      padding: '15px 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--x-primary)' }}>
        Tienda Control 
      </div>
      <div style={{ display: 'flex', gap: '20px' }}>
      <Link href="/" style={{ color: 'var(--x-text-main)', textDecoration: 'none', fontWeight: '500' }}>Inicio</Link>
      <Link href="/inventario" style={{ color: 'var(--x-text-main)', textDecoration: 'none', fontWeight: '500' }}>Inventario</Link>
      <Link href="/compras" style={{ color: 'var(--x-text-main)', textDecoration: 'none', fontWeight: '500' }}>Compras</Link>
      <Link href="/facturacion" style={{ color: 'var(--x-text-main)', textDecoration: 'none', fontWeight: '500' }}>Facturación</Link>
      <Link href="/ventas" style={{ color: 'var(--x-text-main)', textDecoration: 'none', fontWeight: '500' }}>Registro Ventas</Link>
      <Link href="/estadisticas" style={{ color: 'var(--x-text-main)', textDecoration: 'none', fontWeight: '500' }}>Estadísticas</Link>
      </div>
    </nav>
  );
}