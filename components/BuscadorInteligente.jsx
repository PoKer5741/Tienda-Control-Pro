"use client";

import { useState, useEffect } from "react";
import { buscarProducto } from "@/lib/funciones";

export default function BuscadorInteligente({ productos = [], onSeleccion }) {
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);

  useEffect(() => {
    if (termino.length < 2) {
      setMostrarDropdown(false);
      setResultados([]);
      return;
    }

    const timer = setTimeout(() => {
      const filtrados = buscarProducto(productos, termino);
      setResultados(filtrados);
      setMostrarDropdown(filtrados.length > 0);
    }, 400);

    return () => clearTimeout(timer);
  }, [termino, productos]);

  const manejarSeleccion = (producto) => {
    setTermino(producto.nombre);
    setMostrarDropdown(false);
    if (onSeleccion) onSeleccion(producto);
  };

  return (
    <div style={{ position: "relative", marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "var(--x-bg-card)",
          borderRadius: "9999px",
          padding: "12px 20px",
          border: "1px solid var(--x-border)",
        }}
      >
        <input
          type="text"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Buscar producto por nombre o categoría..."
          style={{
            background: "transparent",
            border: "none",
            color: "var(--x-text-main)",
            width: "100%",
            outline: "none",
          }}
        />
        <button
          type="button"
          style={{
            backgroundColor: "var(--x-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "9999px",
            padding: "6px 16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Buscar
        </button>
      </div>

      {mostrarDropdown && (
        <div
          style={{
            position: "absolute",
            top: "55px",
            left: "10px",
            right: "10px",
            backgroundColor: "var(--x-bg-card)",
            border: "1px solid var(--x-border)",
            borderRadius: "12px",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {resultados.map((prod) => (
            <div
              key={prod.id}
              onClick={() => manejarSeleccion(prod)}
              onKeyDown={(e) => e.key === "Enter" && manejarSeleccion(prod)}
              role="button"
              tabIndex={0}
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid rgba(56, 68, 77, 0.4)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ fontWeight: "bold" }}>{prod.nombre}</span>
              <span style={{ fontSize: "13px", color: "var(--x-text-muted)" }}>
                Categoría: {prod.categoria}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
