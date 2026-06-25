'use server'
import { poolPromise } from '@/lib/db';

export async function obtenerMetricasDashboard() {
    try {
        const pool = await poolPromise;
        
        // Ejecutamos el SP que ahora sí devuelve las 6 tablas
        const result = await pool.request().execute('sp_ObtenerMetricasDashboard');
        
        // Mapeamos cada uno de los 6 recordsets a los nombres que tu frontend espera
        return { 
            success: true, 
            datos: {
                valorTotalInventario: result.recordsets[0]?.[0]?.valor_total || 0,
                totalProductos: result.recordsets[1]?.[0]?.total_productos || 0,
                ingresosTotales: result.recordsets[2]?.[0]?.ingresos_totales || 0,
                topProductos: result.recordsets[3] || [],
                stockCritico: result.recordsets[4] || [],
                ventasSieteDias: result.recordsets[5] || []
            }
        };
    } catch (err) {
        console.error('[Estadísticas Error]:', err.message);
        return { success: false, error: err.message };
    }
}