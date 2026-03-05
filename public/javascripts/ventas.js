// --- Lógica Integral del Historial: Buscador, Gráfico Circular y Reportes PDF ---

document.addEventListener('DOMContentLoaded', () => {
    // Referencias del DOM
    const filasVentas = document.querySelectorAll('#salesTable tbody tr.sales-row');
    const searchInput = document.getElementById('searchInput');
    const selectorGrupo = document.getElementById('chartGroupSelector');
    const modalGrafica = document.getElementById('chartModal');
    const btnAbrir = document.getElementById('openChartModal');
    const btnCerrar = document.getElementById('closeModal');
    let chartInstance = null;

    // 1. Buscador en Tiempo Real
    if (searchInput) {
        const tbody = document.querySelector('#salesTable tbody');
        
        // Creamos la fila de "No encontrado" solo si no existe ya
        let noResultRow = document.getElementById('noResultRow');
        if (!noResultRow) {
            noResultRow = document.createElement('tr');
            noResultRow.id = 'noResultRow'; // Le asignamos un ID para identificarla
            noResultRow.innerHTML = `<td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8; font-style: italic;">No se encontraron productos o categorías coincidentes.</td>`;
            noResultRow.style.display = 'none';
            tbody.appendChild(noResultRow);
        }

        searchInput.addEventListener('keyup', function() {
            const filter = this.value.toLowerCase();
            let hayResultados = false;

            filasVentas.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(filter)) {
                    row.style.display = "";
                    hayResultados = true;
                } else {
                    row.style.display = "none";
                }
            });

            // Mostramos u ocultamos la fila de "No encontrado"
            noResultRow.style.display = hayResultados ? "none" : "table-row";
        });
    }

    // 2. Función para procesar datos según el criterio (Producto o Categoría)
    function obtenerDatosAgrupados(criterio) {
        const conteo = {};
        // En tu estructura: Índice 1 = Categoría, Índice 2 = Producto, Índice 5 = Total
        const indiceColumna = (criterio === 'categoria') ? 1 : 2;

        filasVentas.forEach(fila => {
            // Solo procesamos filas visibles (que pasaron el filtro del buscador)
            if (fila.style.display !== 'none' && fila.cells.length > 1) {
                const etiqueta = fila.cells[indiceColumna].innerText.trim();
                const textoTotal = fila.cells[5].innerText.replace('$', '').replace(',', '').trim();
                const total = parseFloat(textoTotal) || 0;
                
                conteo[etiqueta] = (conteo[etiqueta] || 0) + total;
            }
        });
        return conteo;
    }

    // 3. Renderizado del gráfico
    function renderizarGrafico() {
        const canvas = document.getElementById('ventasChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const criterio = selectorGrupo ? selectorGrupo.value : 'producto';
        const datos = obtenerDatosAgrupados(criterio);
        
        const etiquetas = Object.keys(datos);
        const valores = etiquetas.map(e => datos[e]);

        if (chartInstance) chartInstance.destroy();
        
        // Nota: Asegúrate de tener chartjs-plugin-datalabels cargado en tu EJS
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: etiquetas,
                datasets: [{
                    data: valores,
                    backgroundColor: ['#4361ee', '#06d6a0', '#ef233c', '#ffd166', '#073b4c', '#8338ec', '#fb5607'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    title: {
                        display: true,
                        text: `Ventas Totales por ${criterio.toUpperCase()}`,
                        font: { size: 16, weight: 'bold' }
                    }
                },
                cutout: '60%'
            }
        });
    }

    // 4. Control de Eventos del Modal
    if (btnAbrir && modalGrafica) {
        btnAbrir.onclick = () => {
            modalGrafica.style.display = "flex";
            renderizarGrafico();
        };
    }

    if (selectorGrupo) {
        selectorGrupo.onchange = renderizarGrafico;
    }

    if (btnCerrar) btnCerrar.onclick = () => modalGrafica.style.display = "none";
    
    window.onclick = (e) => { 
        if (e.target == modalGrafica) modalGrafica.style.display = "none"; 
    };

    // 5. Generación de PDF con Datos Completos
    const btnPDF = document.getElementById('exportVentasPDF');
    if (btnPDF) {
        btnPDF.onclick = function(e) {
            e.preventDefault();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const f = new Date();
            const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
            
            doc.setFontSize(18);
            doc.setTextColor(67, 97, 238);
            doc.text("REPORTE ESTRATÉGICO DE VENTAS", 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generado el: ${f.toLocaleDateString()} a las ${f.getHours()}:${f.getMinutes()}`, 14, 28);

            doc.autoTable({
                html: '#salesTable',
                startY: 35,
                theme: 'striped',
                headStyles: { fillColor: [67, 97, 238], halign: 'center' },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 40 },
                    3: { halign: 'center' },
                    5: { halign: 'right', fontStyle: 'bold' }
                }
            });

            doc.save(`reporte-ventas-${meses[f.getMonth()]}-${f.getFullYear()}.pdf`);
        };
    }
});