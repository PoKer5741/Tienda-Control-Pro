export default function Tarjeta({ titulo, valor, descripcion, icono }) {
  return (
    <article className="tarjeta-kpi">
      {icono && <span className="tarjeta-icono">{icono}</span>}
      <h3 className="tarjeta-titulo">{titulo}</h3>
      <p className="tarjeta-valor">{valor}</p>
      {descripcion && <p className="tarjeta-descripcion">{descripcion}</p>}
    </article>
  );
}
