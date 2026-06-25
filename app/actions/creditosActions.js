'use server'
import { poolPromise, sql } from '@/lib/db';
import { verificarSesionActiva } from './trabajadoresActions';
import { registrarLogAuditoria } from './auditoriaActions';

export async function obtenerCuentasPendientes() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerCuentasPorCobrar');
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function asentarAbonoCredito(cuentaId, montoAbono) {
    try {
        const sesion = await verificarSesionActiva();
        const responsable = sesion.autenticado ? sesion.usuario.nombre : 'Operador POS';

        const pool = await poolPromise;
        await pool.request()
            .input('cuenta_id', sql.Int, parseInt(cuentaId))
            .input('monto_abono', sql.Decimal(10, 2), parseFloat(montoAbono))
            .input('trabajador_nombre', sql.VarChar(100), responsable)
            .execute('sp_RegistrarAbono');

        await registrarLogAuditoria('Créditos', 'ABONO RECIBIDO', `Abono de ₡${montoAbono} a la cuenta #${cuentaId} procesado.`);
        return { success: true };
    } catch (err) {
        console.error('[SQL ERROR - ABONO]:', err.message);
        return { success: false, error: err.message };
    }
}