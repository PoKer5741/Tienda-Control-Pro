'use client';
import { useState, useRef, useEffect } from 'react';

export default function BuscadorPremium({ 
    opciones = [], 
    valorSeleccionado, 
    alCambiar, 
    placeholder = "Escriba para buscar..."
}) {
    const [abierto, setAbierto] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const contenedorRef = useRef(null);

    // Sincronizar el texto con la opción seleccionada si viene de afuera
    useEffect(() => {
        const seleccion = opciones.find(opt => opt.valor === valorSeleccionado);
        if (seleccion) {
            setBusqueda(seleccion.etiqueta);
        } else {
            setBusqueda('');
        }
    }, [valorSeleccionado, opciones]);

    // Manejar clics fuera del componente
    useEffect(() => {
        function manejarClicAfuera(event) {
            if (contenedorRef.current && !contenedorRef.current.contains(event.target)) {
                setAbierto(false);
                // Si el usuario escribió algo pero no seleccionó nada, restauramos el texto correcto
                const seleccion = opciones.find(opt => opt.valor === valorSeleccionado);
                setBusqueda(seleccion ? seleccion.etiqueta : '');
            }
        }
        document.addEventListener("mousedown", manejarClicAfuera);
        return () => document.removeEventListener("mousedown", manejarClicAfuera);
    }, [valorSeleccionado, opciones]);

    // Filtrar opciones basado en lo que escribe el usuario
    const opcionesFiltradas = opciones.filter(opt => 
        opt.etiqueta.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div ref={contenedorRef} style={{ position: 'relative', width: '100%' }}>
            <input 
                type="text"
                value={busqueda}
                placeholder={placeholder}
                className="crud-input-style"
                onChange={(e) => {
                    setBusqueda(e.target.value);
                    setAbierto(true);
                    // Si borra todo, limpiamos el valor seleccionado real
                    if (e.target.value === '') alCambiar('');
                }}
                onFocus={() => setAbierto(true)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} // Evita que se envíe el formulario al dar Enter
                style={{ 
                    width: '100%', 
                    borderColor: abierto ? 'var(--x-primary)' : 'var(--x-border)',
                    paddingRight: '35px',
                    boxSizing: 'border-box'
                }}
            />
            
            <span style={{ position: 'absolute', right: '12px', top: '14px', fontSize: '10px', color: 'var(--x-text-muted)', pointerEvents: 'none' }}>
                ▼
            </span>

            {abierto && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px',
                    backgroundColor: 'var(--x-bg-card)', border: '1px solid var(--x-border)',
                    borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 9999, maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column'
                }}>
                    {opcionesFiltradas.length === 0 ? (
                        <div style={{ padding: '12px 15px', fontSize: '13px', color: 'var(--x-text-muted)' }}>
                            No se encontraron resultados...
                        </div>
                    ) : (
                        opcionesFiltradas.map((opt, index) => (
                            <div 
                                key={index}
                                onClick={() => { 
                                    alCambiar(opt.valor);
                                    setBusqueda(opt.etiqueta);
                                    setAbierto(false); 
                                }}
                                style={{
                                    padding: '12px 15px', fontSize: '13px', cursor: 'pointer',
                                    color: valorSeleccionado === opt.valor ? 'var(--x-primary)' : '#fff',
                                    backgroundColor: valorSeleccionado === opt.valor ? 'rgba(29, 161, 242, 0.1)' : 'transparent',
                                    borderBottom: index < opcionesFiltradas.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                    fontWeight: valorSeleccionado === opt.valor ? 'bold' : 'normal',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={e => { if (valorSeleccionado !== opt.valor) e.currentTarget.style.backgroundColor = 'var(--x-bg-card-hover)'; }}
                                onMouseOut={e => { if (valorSeleccionado !== opt.valor) e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                {opt.etiqueta}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}