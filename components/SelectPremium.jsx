'use client';
import { useState, useRef, useEffect } from 'react';

export default function SelectPremium({ 
    opciones = [], 
    valorSeleccionado, 
    alCambiar, 
    placeholder = "Seleccionar opción...",
    disabled = false
}) {
    const [abierto, setAbierto] = useState(false);
    const contenedorRef = useRef(null);

    // Detectar clics fuera del componente para cerrar el menú automáticamente
    useEffect(() => {
        function manejarClicAfuera(event) {
            if (contenedorRef.current && !contenedorRef.current.contains(event.target)) {
                setAbierto(false);
            }
        }
        document.addEventListener("mousedown", manejarClicAfuera);
        return () => document.removeEventListener("mousedown", manejarClicAfuera);
    }, []);

     
    const opcionActual = opciones.find(opt => opt.valor === valorSeleccionado);

    return (
        <div ref={contenedorRef} style={{ position: 'relative', width: '100%' }}>
            
            {/* El botón que el usuario ve (Reemplaza al input select nativo) */}
            <div 
                onClick={() => !disabled && setAbierto(!abierto)}
                style={{
                    backgroundColor: disabled ? 'rgba(0,0,0,0.2)' : 'var(--x-bg-base)',
                    border: '1px solid',
                    borderColor: abierto ? 'var(--x-primary)' : 'var(--x-border)',
                    color: opcionActual ? '#fff' : 'var(--x-text-muted)',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    transition: 'all 0.2s ease',
                    opacity: disabled ? 0.6 : 1
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opcionActual ? opcionActual.etiqueta : placeholder}
                </span>
                
                {/* Flecha animada pura con CSS (sin íconos SVG pesados) */}
                <span style={{ 
                    transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)', 
                    transition: 'transform 0.3s ease', 
                    fontSize: '10px', 
                    color: 'var(--x-text-muted)',
                    marginLeft: '10px'
                }}>
                    ▼
                </span>
            </div>

            {/* El Menú Desplegable Flotante */}
            {abierto && !disabled && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '6px',
                    backgroundColor: 'var(--x-bg-card)',
                    border: '1px solid var(--x-border)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 9999, // Para que siempre flote sobre tablas u otros elementos
                    maxHeight: '260px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {opciones.length === 0 ? (
                        <div style={{ padding: '12px 15px', fontSize: '13px', color: 'var(--x-text-muted)' }}>Sin opciones...</div>
                    ) : (
                        opciones.map((opt, index) => {
                            const esSeleccionado = valorSeleccionado === opt.valor;
                            
                            return (
                                <div 
                                    key={index}
                                    onClick={() => { 
                                        alCambiar(opt.valor); 
                                        setAbierto(false); 
                                    }}
                                    style={{
                                        padding: '12px 15px',
                                        fontSize: '13px',
                                        color: esSeleccionado ? 'var(--x-primary)' : '#fff',
                                        backgroundColor: esSeleccionado ? 'rgba(29, 161, 242, 0.1)' : 'transparent',
                                        cursor: 'pointer',
                                        borderBottom: index < opciones.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                        transition: 'background-color 0.2s',
                                        fontWeight: esSeleccionado ? 'bold' : 'normal'
                                    }}
                                    onMouseOver={e => { if (!esSeleccionado) e.currentTarget.style.backgroundColor = 'var(--x-bg-card-hover)'; }}
                                    onMouseOut={e => { if (!esSeleccionado) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                    {opt.etiqueta}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}