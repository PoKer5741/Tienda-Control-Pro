// 1. Filtrar productos por categoría (Usa parámetros, filter y retorna un resultado)
export function filtrarPorCategoria(productos, categoria) {
  if (!categoria || categoria === "Todos") return productos;
  return productos.filter((p) => p.categoria.toLowerCase() === categoria.toLowerCase());
}

// 2. Buscar productos por nombre (Usa filter / includes)
export function buscarProducto(productos, termino) {
  if (!termino) return productos;
  return productos.filter((p) => p.nombre.toLowerCase().includes(termino.toLowerCase()));
}

// 3. Calcular el valor total del inventario (Usa reduce y retorna un número)
export function calcularValorInventario(productos) {
  if (!productos || !Array.isArray(productos)) return 0;
  return productos.reduce((total, p) => total + (p.precio * p.cantidad), 0);
}

// 4. Calcular desglose de factura con impuestos (13% IVA Costa Rica)
export function calcularFactura(items) {
  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const impuesto = subtotal * 0.13;
  const total = subtotal + impuesto;
  return { subtotal, impuesto, total };
}

// 5. Validar si hay stock disponible antes de vender (Estructura de control if/else)
export function validarStock(producto, cantidadAComprar) {
  if (producto.cantidad >= cantidadAComprar) {
    return true;
  } else {
    return false;
  }
}
