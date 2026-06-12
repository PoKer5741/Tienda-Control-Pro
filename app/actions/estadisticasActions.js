'use server'
import { poolPromise } from '@/lib/db';

export async function obtenerMetricasDashboard() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerMetricasDashboard');

        if (!result || !result.recordsets || result.recordsets.length < 6) {
            throw new Error('El procedimiento almacenado no devolvió los conjuntos de datos esperados.');
        }

        return {
            success: true,
            datos: {
                valorTotalInventario: result.recordsets[0]?.[0]?.valor_total || 0,
                totalProductos: result.recordsets[1]?.[0]?.total_productos || 0,
                ingresosTotales: result.recordsets[2]?.[0]?.ingresos_totales || 0,
                topProductos: result.recordsets[3] || [],
                stockCritico: result.recordsets[4] || [],
                ventasSieteDias: result.recordsets[5] || [] // <-- NUESTRO NUEVO GRÁFICO
            }
        };

    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo al calcular métricas:', err.message);
        return { success: false, error: err.message };
    }
}