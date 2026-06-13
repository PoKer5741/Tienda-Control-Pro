'use server'
import { poolPromise, sql } from '@/lib/db';

export async function obtenerTrabajadores() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerTrabajadoresCRUD');
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function registrarTrabajador(nombre, correo, contrasena, rol, cedula) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('nombre', sql.VarChar(100), nombre)
            .input('correo', sql.VarChar(100), correo)
            .input('contrasena', sql.VarChar(255), contrasena)
            .input('rol', sql.VarChar(50), rol)
            .input('cedula', sql.VarChar(20), cedula)
            .execute('sp_RegistrarTrabajador');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function actualizarTrabajador(id, nombre, correo, rol, cedula, contrasena) {
    try {
        const pool = await poolPromise;
        const request = pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('nombre', sql.VarChar(100), nombre)
            .input('correo', sql.VarChar(100), correo)
            .input('rol', sql.VarChar(50), rol)
            .input('cedula', sql.VarChar(20), cedula);
            
        
        if (contrasena) {
            request.input('contrasena', sql.VarChar(255), contrasena);
        }

        await request.execute('sp_ActualizarTrabajador');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function alternarEstadoTrabajador(id) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .execute('sp_AlternarEstadoTrabajador');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function validarAccesoAdministrador(correo, contrasena) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('correo', sql.VarChar(100), correo)
            .input('contrasena', sql.VarChar(255), contrasena)
            .execute('sp_ValidarAccesoAdmin');
            
        return { success: true };
    } catch (err) {
        console.error('[SEGURIDAD] Intento de acceso fallido:', err.message);
        return { success: false, error: err.message };
    }
}