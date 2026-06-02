'use server'
import { poolPromise, sql } from '@/lib/db';

/* QUERY DE LECTURA: SELECT id, nombre FROM Proveedores ORDER BY nombre ASC */
export async function obtenerProveedores() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT id, nombre FROM Proveedores ORDER BY nombre ASC');
        return { success: true, datos: result.recordset };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/* QUERY DE INSERCION: INSERT INTO Proveedores (nombre, contacto) VALUES (@nombre, @contacto) */
export async function registrarProveedor(nombre, contacto) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('nombre', sql.VarChar(100), nombre)
            .input('contacto', sql.VarChar(50), contacto || 'Sin contacto')
            .query('INSERT INTO Proveedores (nombre, contacto) VALUES (@nombre, @contacto)');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}