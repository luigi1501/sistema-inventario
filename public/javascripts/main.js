// main.js - Gestión Integral de Inventario
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const editForm = document.getElementById('editForm');
    const tableBody = document.querySelector('#inventoryTable tbody');
    const socket = io();

    // --- 1. Lógica de Filtrado en Tiempo Real (Nombre + Categoría) ---
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const filter = this.value.toLowerCase().trim();
            const rows = document.querySelectorAll('.product-row');
            let foundAny = false;

            rows.forEach(row => {
                const name = row.querySelector('.product-name').textContent.toLowerCase();
                // Ajustamos para que busque en la celda de categoría (celda 1 o data-label)
                const category = row.querySelector('[data-label="Categoría"]').textContent.toLowerCase();
                
                if (name.includes(filter) || category.includes(filter)) {
                    row.style.display = "";
                    foundAny = true;
                } else {
                    row.style.display = "none";
                }
            });

            // --- LÓGICA DE MENSAJE "NO ENCONTRADO" ---
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
                
                // Ocultar el mensaje de "Inventario vacío" original si existe
                const emptyMsg = document.getElementById('emptyMessage');
                if (emptyMsg) emptyMsg.style.display = "none";
            }
        });
    }

    // --- 2. Lógica del Formulario de Edición (Feedback Visual) ---
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            const nombre = document.getElementById('nombre').value;
            alert(`🔄 Actualizando "${nombre}"... Por favor, espera.`);
        });
    }

    // --- 3. Lógica de Socket.io (Actualización Automática) ---
    socket.on('producto-actualizado', () => {
        console.log("🔄 Sincronizando cambios con el servidor...");
        setTimeout(() => {
            window.location.reload(); 
        }, 500);
    });

    // --- 4. Generador de Nombres Dinámicos ---
    const getNombreReporte = (prefijo) => {
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const fecha = new Date();
        return `${prefijo}_${meses[fecha.getMonth()]}_${fecha.getFullYear()}`;
    };

    // --- 5. EXPORTAR A PDF ---
    document.getElementById('exportPDF')?.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const nombreBase = getNombreReporte('inventario');
        
        doc.setFontSize(18);
        doc.setTextColor(67, 97, 238); 
        doc.text("Sistema de Gestión de Inventario", 14, 20);
        
        doc.autoTable({ 
            html: '#inventoryTable',
            startY: 35,
            columns: [
                { header: '#', dataKey: 0 },
                { header: 'Tipo', dataKey: 1 },
                { header: 'Nombre', dataKey: 2 },
                { header: 'Descripción', dataKey: 3 },
                { header: 'Precio', dataKey: 4 },
                { header: 'Stock', dataKey: 5 }
            ],
            headStyles: { fillColor: [67, 97, 238] }
        });
        doc.save(`${nombreBase}.pdf`);
    });

    // --- 6. EXPORTAR A EXCEL ---
    document.getElementById('exportExcel')?.addEventListener('click', () => {
        const table = document.getElementById('inventoryTable');
        const nombreBase = getNombreReporte('reporte_inventario');
        const tableClone = table.cloneNode(true);
        
        tableClone.querySelectorAll('tr').forEach(row => {
            if (row.lastElementChild) row.removeChild(row.lastElementChild);
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

    if (isNaN(cantNum) || cantNum <= 0) {
        alert("Por favor, ingresa una cantidad válida.");
        return;
    }

    if (cantNum > stockActual) {
        alert("❌ Error: No hay suficiente stock disponible.");
        return;
    }

    try {
        const response = await fetch(`/vender/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                cantidad: cantNum,
                nombre_producto: nombre,
                categoria_producto: categoria,
                precio_unitario: precio
            })
        });

        if (response.ok) {
            alert(`✅ Venta exitosa: ${cantNum} unidad(es) de ${nombre}.`);
        } else {
            const errorData = await response.json();
            alert("Error: " + (errorData.message || "No se pudo procesar la venta."));
        }
    } catch (error) {
        alert("Error de conexión con el servidor.");
    }
}