'use server'
import { poolPromise, sql } from '@/lib/db';

// Recupera el catalogo completo de categorias ordenado alfabeticamente.
export async function obtenerCategorias() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT id, nombre FROM Categorias ORDER BY nombre ASC');
        return { success: true, datos: result.recordset };
    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo al recuperar categorias:', err.message);
        return { success: false, error: err.message };
    }
}

// Registra una nueva categoria en el sistema relacional.
export async function registrarCategoria(nombre) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('nombre', sql.VarChar(50), nombre)
            .query('INSERT INTO Categorias (nombre) VALUES (@nombre)');
        return { success: true };
    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo al registrar categoria:', err.message);
        return { success: false, error: err.message };
    }
}