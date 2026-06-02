import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--x-primary)', fontSize: '2.5rem', marginBottom: '1rem' }}>
        Sistema de Gestión Comercial
      </h1>
      <p style={{ color: 'var(--x-text-muted)', fontSize: '1.2rem', marginBottom: '3rem', lineHeight: '1.6' }}>
        Solución tecnológica integrada al motor SQL Server para el control de inventarios, procesamiento de ventas y administración de proveedores.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '3rem' }}>
        <div style={{ background: 'var(--x-bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--x-text-main)' }}>Inventario y Compras</h3>
          <p style={{ color: 'var(--x-text-muted)', fontSize: '14px' }}>
            Gestión de catálogo, actualización de existencias y registro de operaciones.
          </p>
          <Link href="/inventario">
            <button style={{ width: '100%', padding: '12px', marginTop: '15px', backgroundColor: 'var(--x-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Ir a Inventario
            </button>
          </Link>
        </div>
        
        <div style={{ background: 'var(--x-bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--x-text-main)' }}>Facturación y Operaciones</h3>
          <p style={{ color: 'var(--x-text-muted)', fontSize: '14px' }}>
            Asentamiento de ventas transaccionales en el motor de base de datos.
          </p>
          <Link href="/facturacion">
            <button style={{ width: '100%', padding: '12px', marginTop: '15px', backgroundColor: 'var(--success-green)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Ir a Facturación
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}