'use server'
import { poolPromise, sql } from '@/lib/db';

export async function obtenerProveedores() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT id, nombre, cedula FROM Proveedores ORDER BY nombre ASC');
        return { success: true, datos: result.recordset };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function registrarProveedor(nombre, cedula, correo, direccion) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('nombre', sql.VarChar(100), nombre)
            .input('cedula', sql.VarChar(50), cedula || '')
            .input('correo', sql.VarChar(100), correo || '')
            .input('direccion', sql.VarChar(255), direccion || '')
            .query('INSERT INTO Proveedores (nombre, cedula, correo, direccion) VALUES (@nombre, @cedula, @correo, @direccion)');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}