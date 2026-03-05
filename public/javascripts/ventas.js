// --- Lógica del Historial: Gráfico Circular Dinámico y Reportes PDF ---

document.addEventListener('DOMContentLoaded', () => {
    const filasVentas = document.querySelectorAll('#salesTable tbody tr');
    const selectorGrupo = document.getElementById('chartGroupSelector');
    const modalGrafica = document.getElementById('chartModal');
    const btnAbrir = document.getElementById('openChartModal');
    const btnCerrar = document.getElementById('closeModal');
    let chartInstance = null;

    // 1. Función para procesar datos según el criterio (Producto o Categoría)
    function obtenerDatosAgrupados(criterio) {
        const conteo = {};
        // Columna 1: Categoría, Columna 2: Producto (según el nuevo historial.ejs)
        const indiceColumna = (criterio === 'categoria') ? 1 : 2;

        filasVentas.forEach(fila => {
            if (fila.cells.length > 1) {
                const etiqueta = fila.cells[indiceColumna].innerText.trim();
                const textoTotal = fila.cells[5].innerText.replace('$', '').replace(',', '').trim();
                const total = parseFloat(textoTotal) || 0;
                
                conteo[etiqueta] = (conteo[etiqueta] || 0) + total;
            }
        });
        return conteo;
    }

    // 2. Función para renderizar el gráfico
    function renderizarGrafico() {
        const ctx = document.getElementById('ventasChart').getContext('2d');
        const criterio = selectorGrupo ? selectorGrupo.value : 'producto';
        const datos = obtenerDatosAgrupados(criterio);
        
        const etiquetas = Object.keys(datos);
        const valores = etiquetas.map(e => datos[e]);

        if (chartInstance) chartInstance.destroy();

        // Registrar plugin de etiquetas de datos
        Chart.register(ChartDataLabels);

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
                    },
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold', size: 12 },
                        formatter: (value, context) => {
                            let sum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            return ((value * 100) / sum).toFixed(1) + "%";
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    // 3. Control de Eventos del Modal
    if (btnAbrir && modalGrafica) {
        btnAbrir.onclick = () => {
            modalGrafica.style.display = "flex";
            renderizarGrafico();
        };
    }

    if (selectorGrupo) {
        selectorGrupo.onchange = () => {
            if (modalGrafica.style.display === "flex") renderizarGrafico();
        };
    }

    if (btnCerrar) btnCerrar.onclick = () => modalGrafica.style.display = "none";
    
    window.onclick = (e) => { 
        if (e.target == modalGrafica) modalGrafica.style.display = "none"; 
    };

    // 4. Generación de PDF con Datos Completos
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
                    0: { cellWidth: 40 }, // Fecha
                    3: { halign: 'center' }, // Cant
                    5: { halign: 'right', fontStyle: 'bold' } // Total
                }
            });

            const nombreArchivo = `reporte-ventas-${meses[f.getMonth()]}-${f.getFullYear()}.pdf`;
            doc.save(nombreArchivo);
        };
    }
});