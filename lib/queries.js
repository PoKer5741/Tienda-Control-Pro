/**
 * Consultas parametrizadas centralizadas (evitan SQL injection).
 * Los valores dinámicos van siempre como @param en pool.request().input(...)
 */
export const QUERIES = {
  SELECT_TODOS: `
    SELECT id, nombre, categoria, precio, cantidad
    FROM Productos
    ORDER BY nombre ASC
  `,
  SELECT_POR_ID: `
    SELECT id, nombre, categoria, precio, cantidad
    FROM Productos
    WHERE id = @id
  `,
  INSERT_PRODUCTO: `
    INSERT INTO Productos (nombre, categoria, precio, cantidad)
    VALUES (@nombre, @categoria, @precio, @cantidad)
  `,
  UPDATE_STOCK_SUMA: `
    UPDATE Productos
    SET cantidad = cantidad + @cantidad
    WHERE id = @id
  `,
  UPDATE_STOCK_RESTA: `
    UPDATE Productos
    SET cantidad = cantidad - @cantidad
    WHERE id = @id AND cantidad >= @cantidad
  `,
};

/**
 * Procedimientos almacenados esperados en SQL Server.
 * Ejecutar con pool.request().input(...).execute(PROCEDURES.NOMBRE)
 */
export const PROCEDURES = {
  REGISTRAR_VENTA: "dbo.sp_RegistrarVenta",
  REGISTRAR_COMPRA: "dbo.sp_RegistrarCompra",
};
