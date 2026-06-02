export default function Resumen({ subtotal, iva, total, porcentajeIva = 16 }) {
  const formato = (n) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  return (
    <aside className="resumen-factura">
      <h3>Resumen</h3>
      <dl>
        <div className="resumen-linea">
          <dt>Subtotal</dt>
          <dd>{formato(subtotal)}</dd>
        </div>
        <div className="resumen-linea">
          <dt>IVA ({porcentajeIva}%)</dt>
          <dd>{formato(iva)}</dd>
        </div>
        <div className="resumen-linea resumen-total">
          <dt>Total</dt>
          <dd>{formato(total)}</dd>
        </div>
      </dl>
    </aside>
  );
}
