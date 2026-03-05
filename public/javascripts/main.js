// main.js - Gestión Integral de Inventario
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const editForm = document.getElementById('editForm');
    const tableBody = document.querySelector('#inventoryTable tbody');

    // --- 1. Lógica de Filtrado en Tiempo Real ---
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const filter = this.value.toLowerCase().trim();
            const rows = document.querySelectorAll('.product-row');
            let foundAny = false;

            rows.forEach(row => {
                const name = row.querySelector('.product-name').textContent.toLowerCase();
                const category = row.querySelector('[data-label="Categoría"]').textContent.toLowerCase();
                
                if (name.includes(filter) || category.includes(filter)) {
                    row.style.display = "";
                    foundAny = true;
                } else {
                    row.style.display = "none";
                }
            });

            const existingMsg = document.getElementById('no-results-msg');
            if (existingMsg) existingMsg.remove();

            if (!foundAny && filter !== "") {
                const noResultsHTML = `
                    <tr id="no-results-msg">
                        <td colspan="7" style="text-align: center; padding: 40px; background: #ffffff;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">🔍</div>
                            <h3 style="color: #64748b; margin: 0;">No se encontraron productos</h3>
                            <p style="color: #94a3b8; margin: 5px 0 0;">Intenta con otro nombre o categoría</p>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', noResultsHTML);
                const emptyMsg = document.getElementById('emptyMessage');
                if (emptyMsg) emptyMsg.style.display = "none";
            }
        });
    }

    // --- 2. Lógica de Actualización Automática (Polling) ---
    // Colocado aquí, se ejecuta UNA sola vez al cargar la página
    setInterval(async () => {
        try {
            const response = await fetch('/api/check-updates');
            const data = await response.json();
            if (data.necesitaActualizar) {
                window.location.reload();
            }
        } catch (err) {
            console.log("Esperando conexión con el servidor...");
        }
    }, 5000); 

    // --- 3. Lógica del Formulario de Edición ---
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            const nombre = document.getElementById('nombre').value;
            alert(`🔄 Actualizando "${nombre}"... Por favor, espera.`);
        });
    }

    // --- 4. Generador de Nombres Dinámicos ---
    const getNombreReporte = (prefijo) => {
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const fecha = new Date();
        const mesNombre = meses[fecha.getMonth()];
        const anio = fecha.getFullYear();
        return `${prefijo}_${mesNombre}_${anio}`;
    };

    // --- 5. EXPORTAR A PDF ---
    document.getElementById('exportPDF')?.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const nombreBase = getNombreReporte('inventario');
        doc.setFontSize(18);
        doc.text("Sistema de Gestión de Inventario", 14, 20);
        try {
            doc.autoTable({ 
                html: '#inventoryTable',
                startY: 35,
                didParseCell: function(data) { if (data.column.index === 6) data.cell.text = ['']; }
            });
            doc.save(`${nombreBase}.pdf`);
        } catch (err) { alert("No se pudo generar el PDF."); }
    });

    // --- 6. EXPORTAR A EXCEL ---
    document.getElementById('exportExcel')?.addEventListener('click', () => {
        const table = document.getElementById('inventoryTable');
        const nombreBase = getNombreReporte('reporte_inventario');
        const tableClone = table.cloneNode(true);
        tableClone.querySelectorAll('tr').forEach(row => {
            if (row.style.display === 'none' || row.id === 'no-results-msg' || row.id === 'emptyMessage') row.remove();
            else if (row.lastElementChild) row.removeChild(row.lastElementChild);
        });
        const ws = XLSX.utils.table_to_sheet(tableClone);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
        XLSX.writeFile(wb, `${nombreBase}.xlsx`);
    });
});

// --- 7. LÓGICA DE VENTAS (Global) ---
async function venderProducto(id, nombre, categoria, precio, stockActual) {
    const cantidad = prompt(`VENDIENDO: ${nombre} (${categoria})\nStock disponible: ${stockActual}\n\n¿Cuántas unidades deseas vender?`);
    if (cantidad === null || cantidad === "") return; 
    const cantNum = parseInt(cantidad);
    if (isNaN(cantNum) || cantNum <= 0) { alert("Cantidad inválida."); return; }
    if (cantNum > stockActual) { alert("❌ Error: Stock insuficiente."); return; }

    try {
        const response = await fetch(`/vender/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cantidad: cantNum, nombre_producto: nombre, categoria_producto: categoria, precio_unitario: precio })
        });
        if (response.ok) {
            alert(`✅ Venta exitosa.`);
            window.location.reload(); // Recarga inmediata tras la venta
        } else {
            alert("Error al procesar la venta.");
        }
    } catch (error) { alert("Error de conexión."); }
}