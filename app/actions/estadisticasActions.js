'use server'
import { poolPromise } from '@/lib/db';

export async function obtenerMetricasDashboard() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerMetricasDashboard');

        // Validacion estructural para evitar lecturas de propiedades indefinidas
        if (!result || !result.recordsets || result.recordsets.length < 5) {
            throw new Error('El procedimiento almacenado no devolvio los conjuntos de datos esperados.');
        }

        // Extraccion segura de datos con operadores de encadenamiento opcional y valores por defecto
        return {
            success: true,
            datos: {
                valorTotalInventario: result.recordsets[0]?.[0]?.valor_total || 0,
                totalProductos: result.recordsets[1]?.[0]?.total_productos || 0,
                ingresosTotales: result.recordsets[2]?.[0]?.ingresos_totales || 0,
                topProductos: result.recordsets[3] || [],
                stockCritico: result.recordsets[4] || []
            }
        };

    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo al calcular metricas:', err.message);
        return { success: false, error: err.message };
    }
}