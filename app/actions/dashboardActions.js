'use server'
import { poolPromise } from '@/lib/db';

export async function obtenerDatosDashboard() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerDashboardInicio');
        
        return {
            success: true,
            metricas: result.recordsets[0][0] || { ingresos_totales: 0, total_facturas: 0, capital_inventario: 0, total_productos: 0 },
            alertasStock: result.recordsets[1] || []
        };
    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo en dashboard:', err.message);
        return { success: false, error: err.message };
    }
}