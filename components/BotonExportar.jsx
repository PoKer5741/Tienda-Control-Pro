'use client';
import { exportarAExcel, exportarAPDF } from '@/lib/exportador';

export default function BotonExportar({ datos, columnas, titulo, nombreArchivo }) {
    
    const manejarExportacionExcel = () => {
        if (!datos || datos.length === 0) return alert('No hay datos para exportar.');
        exportarAExcel(datos, columnas, nombreArchivo);
    };

    const manejarExportacionPDF = () => {
        if (!datos || datos.length === 0) return alert('No hay datos para exportar.');
        exportarAPDF(datos, columnas, titulo, nombreArchivo);
    };

    return (
        <div style={{ display: 'flex', gap: '10px' }}>
            <button 
                onClick={manejarExportacionExcel}
                style={{ 
                    backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                    border: '1px solid var(--success-green)', 
                    color: 'var(--success-green)', 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
            >
                <span style={{ fontSize: '14px' }}>📊</span> Descargar Excel
            </button>

            <button 
                onClick={manejarExportacionPDF}
                style={{ 
                    backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                    border: '1px solid var(--danger-red)', 
                    color: 'var(--danger-red)', 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
            >
                <span style={{ fontSize: '14px' }}>📄</span> Generar PDF
            </button>
        </div>
    );
}