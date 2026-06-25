'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { validarAccesoAdministrador, verificarSesionActiva } from '@/app/actions/trabajadoresActions';

export default function AccesoAdministrador({ children }) {
  const [autenticado, setAutenticado] = useState(false);
  const [verificando, setVerificando] = useState(true); // Nuevo estado de carga inicial
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();

  // Comprobar la cookie de sesión al montar el componente
  useEffect(() => {
    const comprobarSesion = async () => {
      const res = await verificarSesionActiva();
      if (res.autenticado) {
        setAutenticado(true);
      }
      setVerificando(false);
    };
    comprobarSesion();
  }, []);

  const verificarAcceso = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    const correoLimpio = correo.trim().toLowerCase();
    const contrasenaLimpia = contrasena.trim();

    const res = await validarAccesoAdministrador(correoLimpio, contrasenaLimpia);

    if (res.success) {
      setAutenticado(true);
    } else {
      setError(res.error);
      setContrasena(''); 
    }
    setCargando(false);
  };

  // Mostrar una pantalla vacía o de carga mientras verifica la cookie
  if (verificando) return <div style={{ backgroundColor: '#0B0E14', height: '100vh' }} />;
  if (autenticado) return <>{children}</>;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#0B0E14', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <form onSubmit={verificarAcceso} style={{ background: 'var(--x-bg-card)', padding: '40px', borderRadius: '12px', border: '1px solid var(--x-border)', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--x-primary)', margin: '0 0 10px 0' }}>Acceso Restringido</h2>
            <p style={{ fontSize: '13px', color: 'var(--x-text-muted)', margin: 0 }}>Módulo de Recursos Humanos. Requiere credenciales de nivel Administrador.</p>
        </div>

        {error && (
            <div style={{ backgroundColor: 'rgba(244, 33, 46, 0.1)', border: '1px solid var(--danger-red)', color: 'var(--danger-red)', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '20px', textAlign: 'center' }}>
                {error}
            </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
            <div>
                <label style={{ fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Correo Institucional</label>
                <input type="email" placeholder="ejemplo@tienda.com" value={correo} onChange={e => setCorreo(e.target.value)} className="crud-input-style" required />
            </div>
            <div>
                <label style={{ fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Contraseña de Seguridad</label>
                <input type="password" placeholder="••••••••" value={contrasena} onChange={e => setContrasena(e.target.value)} className="crud-input-style" required />
            </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button type="submit" disabled={cargando} style={{ width: '100%', padding: '14px', backgroundColor: 'var(--x-primary)', border: 'none', color: '#fff', borderRadius: '8px', cursor: cargando ? 'wait' : 'pointer', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {cargando ? 'Verificando Firmas...' : 'Autorizar Acceso'}
            </button>
            
            <button type="button" onClick={() => router.push('/')} style={{ width: '100%', padding: '14px', backgroundColor: 'transparent', border: '1px solid var(--x-border)', color: 'var(--x-text-main)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Volver a Inicio
            </button>
        </div>
      </form>
    </div>
  );
}