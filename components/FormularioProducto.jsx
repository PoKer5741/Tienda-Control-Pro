"use client";

import { useState } from "react";

export default function FormularioProducto({ alGuardar, guardando = false }) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoria, setCategoria] = useState("Abarrotes");
  const [cantidad, setCantidad] = useState("");

  const procesarFormulario = (e) => {
    e.preventDefault();

    if (!nombre || !precio) {
      alert("Debe completar el nombre y el precio del producto.");
      return;
    }

    const nuevoProducto = {
      nombre,
      precio: parseFloat(precio),
      categoria,
      cantidad: cantidad ? parseInt(cantidad, 10) : 1,
    };

    alGuardar(nuevoProducto);

    setNombre("");
    setPrecio("");
    setCantidad("");
  };

  return (
    <form
      onSubmit={procesarFormulario}
      className="card-panel"
      style={{ margin: 0 }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Registrar Nuevo Producto</h3>

      <div style={{ display: "grid", gap: "15px" }}>
        <input
          type="text"
          className="crud-input-style"
          placeholder="Nombre del producto"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <select
          className="crud-input-style"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          <option value="Abarrotes">Abarrotes</option>
          <option value="Lácteos">Lácteos</option>
          <option value="Licores">Licores</option>
        </select>
        <input
          type="number"
          className="crud-input-style"
          placeholder="Precio unitario"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />
        <input
          type="number"
          className="crud-input-style"
          placeholder="Cantidad inicial"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
        <button
          type="submit"
          disabled={guardando}
          style={{
            backgroundColor: "var(--success-green)",
            color: "#fff",
            border: "none",
            padding: "12px",
            borderRadius: "8px",
            fontWeight: "bold",
            cursor: guardando ? "wait" : "pointer",
            opacity: guardando ? 0.7 : 1,
          }}
        >
          {guardando ? "Guardando..." : "Guardar en Inventario"}
        </button>
      </div>
    </form>
  );
}
