'use server'
import { poolPromise, sql } from '@/lib/db';
import { verificarSesionActiva } from './trabajadoresActions';

export async function registrarLogAuditoria(modulo, accion, detalles) {
    try {
        // 1. Extraer la identidad del usuario desde el JWT en las cookies
        const sesion = await verificarSesionActiva();
        
        
        const responsable = sesion.autenticado ? sesion.usuario.nombre : 'Operación Local / POS';

        const pool = await poolPromise;
        await pool.request()
            .input('trabajador_nombre', sql.VarChar(100), responsable)
            .input('modulo', sql.VarChar(50), modulo)
            .input('accion', sql.VarChar(50), accion)
            .input('detalles', sql.VarChar(sql.MAX), detalles)
            .execute('sp_RegistrarAuditoria');

    } catch (error) {
         
        console.error('[FALLO DE AUDITORÍA]:', error.message);
    }
}

export async function obtenerBitacora() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT TOP 200 * FROM BitacoraAuditoria ORDER BY id DESC');
        return { success: true, datos: result.recordset };
    } catch (error) {
        return { success: false, error: error.message };
    }
}