'use server'
import { poolPromise, sql } from '@/lib/db';

/**
 * Recupera el catalogo completo de productos con su respectiva categoria.
 * Resuelve el requerimiento minimo de operacion de listado (Punto 6.7).
 */
export async function obtenerProductos() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT p.id, p.nombre, p.precio, p.cantidad, c.nombre AS categoria
            FROM Productos p
            INNER JOIN Categorias c ON p.categoria_id = c.id
            ORDER BY p.nombre ASC
        `);
        return { success: true, datos: result.recordset };
    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo al recuperar productos:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Inserta un nuevo producto utilizando consultas parametrizadas.
 * Resuelve el requerimiento de formulario funcional e insercion (Punto 6.5 y 6.7).
 */
export async function registrarNuevoProducto(nombre, categoriaId, precio, cantidad) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('nombre', sql.VarChar(100), nombre)
            .input('categoria_id', sql.Int, parseInt(categoriaId))
            .input('precio', sql.Decimal(10, 2), parseFloat(precio))
            .input('cantidad', sql.Int, parseInt(cantidad))
            .query(`
                INSERT INTO Productos (nombre, categoria_id, precio, cantidad)
                VALUES (@nombre, @categoria_id, @precio, @cantidad)
            `);
        return { success: true };
    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo al registrar producto:', err.message);
        return { success: false, error: err.message };
    }
}