'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const enlaces = [
    { nombre: 'Inicio', ruta: '/' },
    { nombre: 'Control de Caja', ruta: '/caja' },
    { nombre: 'Clientes', ruta: '/clientes' },
    { nombre: 'Categorías', ruta: '/categorias' },
    { nombre: 'Inventario', ruta: '/inventario' },
    { nombre: 'Compras', ruta: '/compras' },
    { nombre: 'Facturación', ruta: '/facturacion' },
    { nombre: 'Registro Ventas', ruta: '/ventas' },
    { nombre: 'Estadísticas', ruta: '/estadisticas' },
  ];

  return (
    <nav style={{
      backgroundColor: 'var(--x-bg-card)',
      borderBottom: '1px solid var(--x-border)',
      padding: '0 2rem',
      height: '65px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(10px)', 
      boxSizing: 'border-box'
    }}>
      {/* Marca / Logo */}
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--x-primary)', letterSpacing: '0.5px' }}>
        Tienda Control
      </div>

      {/* Enlaces de Navegación con Scroll Horizontal en Móviles para que no se rompa */}
      <div className="nav-links-wrapper" style={{
        display: 'flex',
        gap: '8px',
        height: '100%',
        alignItems: 'center'
      }}>
        {enlaces.map((enlace) => {
          const esActivo = pathname === enlace.ruta;

          return (
            <Link 
              key={enlace.ruta} 
              href={enlace.ruta}
              style={{
                color: esActivo ? 'var(--x-primary)' : 'var(--x-text-muted)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: esActivo ? '600' : '500',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: esActivo ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                transition: 'all 0.2s ease',
                border: esActivo ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
                boxSizing: 'border-box'
              }}
              onMouseOver={e => {
                if (!esActivo) {
                  e.currentTarget.style.color = 'var(--x-text-main)';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                }
              }}
              onMouseOut={e => {
                if (!esActivo) {
                  e.currentTarget.style.color = 'var(--x-text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {enlace.nombre}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}