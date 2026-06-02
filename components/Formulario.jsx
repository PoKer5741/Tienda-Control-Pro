export default function Formulario({
  titulo,
  campos,
  valores,
  onChange,
  onSubmit,
  textoBoton = "Guardar",
}) {
  return (
    <form className="formulario" onSubmit={onSubmit}>
      {titulo && <h3>{titulo}</h3>}
      {campos.map((campo) => (
        <label key={campo.name} className="formulario-campo">
          {campo.label}
          <input
            type={campo.type ?? "text"}
            name={campo.name}
            placeholder={campo.placeholder}
            value={valores[campo.name] ?? ""}
            onChange={onChange}
            required={campo.required}
            min={campo.min}
            step={campo.step}
          />
        </label>
      ))}
      <button type="submit">{textoBoton}</button>
    </form>
  );
}
