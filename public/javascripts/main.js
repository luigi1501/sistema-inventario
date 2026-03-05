// main.js - Gestión Integral de Inventario
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const editForm = document.getElementById('editForm');
    const socket = io();

    // --- 1. Lógica de Filtrado en Tiempo Real (Nombre + Categoría) ---
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const filter = this.value.toLowerCase();
            const rows = document.querySelectorAll('.product-row');
            rows.forEach(row => {
                const name = row.querySelector('.product-name').textContent.toLowerCase();
                const category = row.cells[1].textContent.toLowerCase();
                
                if (name.includes(filter) || category.includes(filter)) {
                    row.style.display = "";
                } else {
                    row.style.display = "none";
                }
            });
        });
    }

    // --- 2. Lógica del Formulario de Edición (Feedback Visual) ---
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            const nombre = document.getElementById('nombre').value;
            // No detenemos el evento (submit normal), solo avisamos al usuario
            alert(`🔄 Actualizando "${nombre}"... Por favor, espera.`);
        });
    }

    // --- 3. Lógica de Socket.io (Actualización Automática) ---
    socket.on('producto-actualizado', () => {
        console.log("🔄 Sincronizando cambios con el servidor...");
        // Pequeño delay para asegurar que la DB terminó el proceso
        setTimeout(() => {
            window.location.reload(); 
        }, 500);
    });

    // --- 4. Generador de Nombres Dinámicos ---
    const getNombreReporte = (prefijo) => {
        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        const fecha = new Date();
        const mes = meses[fecha.getMonth()];
        const anio = fecha.getFullYear(); 
        return `${prefijo}_${mes}_${anio}`;
    };

    // --- 5. EXPORTAR A PDF (Estilo Azul Premium con Categoría) ---
    document.getElementById('exportPDF')?.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const nombreBase = getNombreReporte('inventario');
        
        doc.setFontSize(18);
        doc.setTextColor(67, 97, 238); 
        doc.text("Sistema de Gestión de Inventario", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Reporte generado: ${nombreBase.split('_').slice(1).join(' ')}`, 14, 28);
        
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
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { 
                fillColor: [67, 97, 238], 
                textColor: [255, 255, 255], 
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'center' },
                4: { halign: 'right' },
                5: { halign: 'center' }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });
        
        doc.save(`${nombreBase}.pdf`);
    });

    // --- 6. EXPORTAR A EXCEL (Incluyendo Categoría) ---
    document.getElementById('exportExcel')?.addEventListener('click', () => {
        const table = document.getElementById('inventoryTable');
        const nombreBase = getNombreReporte('reporte_inventario');
        const tableClone = table.cloneNode(true);
        
        const allRows = tableClone.querySelectorAll('tr');
        allRows.forEach(row => {
            if (row.lastElementChild) {
                row.removeChild(row.lastElementChild);
            }
        });

        const ws = XLSX.utils.table_to_sheet(tableClone);
        ws['!cols'] = [
            { wch: 6 },  { wch: 18 }, { wch: 30 }, { wch: 45 }, { wch: 12 }, { wch: 10 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
        XLSX.writeFile(wb, `${nombreBase}.xlsx`);
    });
});

// --- 7. LÓGICA DE VENTAS (Fuera del DOMContentLoaded para acceso global) ---
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
            // Socket.io se encargará del reload
        } else {
            const errorData = await response.json();
            alert("Error: " + (errorData.message || "No se pudo procesar la venta."));
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error de conexión con el servidor.");
    }
}