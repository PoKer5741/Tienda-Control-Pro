import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // <-- IMPORTACIÓN CORREGIDA

export const exportarAExcel = (datos, columnas, nombreArchivo = 'Reporte') => {
    if (!datos || datos.length === 0) return;

    const dataFormateada = datos.map(item => {
        let fila = {};
        columnas.forEach(col => {
            fila[col.encabezado] = item[col.llave] !== null && item[col.llave] !== undefined ? item[col.llave] : 'N/A';
        });
        return fila;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataFormateada);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
    
    const colWidths = columnas.map(col => ({ wch: Math.max(col.encabezado.length, 15) }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportarAPDF = (datos, columnas, titulo = 'Reporte Gerencial', nombreArchivo = 'Reporte') => {
    if (!datos || datos.length === 0) return;

    const doc = new jsPDF('landscape'); 
    
    doc.setFontSize(18);
    doc.setTextColor(11, 14, 20);
    doc.text('TIENDA CONTROL PRO', 14, 15);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(titulo, 14, 22);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-CR')}`, 14, 28);

    const tableColumn = columnas.map(col => col.encabezado);
    const tableRows = datos.map(item => 
        columnas.map(col => {
            const valor = item[col.llave];
            const esMoneda = typeof valor === 'number' && 
                (col.llave.includes('precio') || col.llave.includes('costo') || col.llave.includes('total') || col.llave.includes('monto') || col.llave.includes('saldo'));
            
            if (esMoneda) {
                return `₡ ${valor.toLocaleString('es-CR', {minimumFractionDigits: 2})}`;
            }
            return valor !== null && valor !== undefined ? String(valor) : 'N/A';
        })
    );

    // <-- EJECUCIÓN CORREGIDA: Se usa la función importada directamente
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [29, 161, 242], textColor: 255, fontStyle: 'bold' }, 
        alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`${nombreArchivo}_${new Date().toISOString().split('T')[0]}.pdf`);
};