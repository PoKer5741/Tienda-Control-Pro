'use server'
import { poolPromise, sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { verificarSesionActiva } from './trabajadoresActions'; 

export async function verificarCajaAbierta() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_VerificarCajaAbierta');
        
        return { success: true, caja: result.recordset[0] || null };
        
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function abrirCajaTransaccional(correo, contrasena, montoApertura) {
    try {
        
        const montoSeguro = parseFloat(montoApertura) || 0;

         
        let responsable = correo;
        try {
            const sesion = await verificarSesionActiva();
            if (sesion?.autenticado) responsable = sesion.usuario.nombre;
        } catch(e) { }

        const pool = await poolPromise;
        await pool.request()
             
            .input('trabajador_nombre', sql.VarChar(100), responsable)
            .input('monto_inicial', sql.Decimal(10, 2), montoSeguro)
            .execute('sp_AbrirCaja');

        
        revalidatePath('/caja');
        revalidatePath('/facturacion');

        return { success: true };
    } catch (err) {
        console.error('[Error al abrir caja]:', err.message);
        return { success: false, error: err.message };
    }
}

export async function cerrarCajaTransaccional(cajaId, montoFisicoReal) {
    try {
        const montoSeguro = parseFloat(montoFisicoReal) || 0;
        const cajaIdSeguro = parseInt(cajaId);

        const pool = await poolPromise;
        await pool.request()
            .input('caja_id', sql.Int, cajaIdSeguro)
            .input('monto_final_real', sql.Decimal(10, 2), montoSeguro)
            .execute('sp_CerrarCaja'); 
            
        return { success: true };
    } catch (err) {
        console.error('[Error al cerrar caja]:', err.message);
        return { success: false, error: err.message };
    }
}

export async function obtenerHistorialArqueos() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerHistorialArqueos');
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function obtenerDesgloseMetodosTurno(cajaId) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            // 👇 AQUÍ ESTABA EL ERROR: Cambiamos 'caja_turno_id' por 'caja_id' 👇
            .input('caja_id', sql.Int, parseInt(cajaId))
            .execute('sp_ObtenerDesgloseMetodosTurno');
            
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        console.error('[Error en Desglose de Caja]:', err.message);
        return { success: false, error: err.message };
    }
}