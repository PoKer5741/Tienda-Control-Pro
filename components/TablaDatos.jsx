export default function TablaDatos({ columnas, filas, mensajeVacio = "No hay datos para mostrar." }) {
  if (!filas?.length) {
    return <p className="tabla-vacia">{mensajeVacio}</p>;
  }

  return (
    <div className="tabla-contenedor">
      <table className="tabla-datos">
        <thead>
          <tr>
            {columnas.map((col) => (
              <th key={col.clave}>{col.etiqueta}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={fila.id ?? i}>
              {columnas.map((col) => (
                <td key={col.clave}>
                  {col.render ? col.render(fila) : fila[col.clave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
