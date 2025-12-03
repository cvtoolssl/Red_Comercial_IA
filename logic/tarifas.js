// logic/tarifas.js

// --- INICIALIZACIÓN SEGURA DE JSPDF ---
// Intentamos cargar la librería de varias formas para asegurar compatibilidad
window.jsPDF = window.jspdf ? window.jspdf.jsPDF : null;

// --- FUNCIÓN DE CARGA ---
async function loadTariffForPdf(tariffFile) {
    // ALERT 1: Iniciando
    // alert("Intentando cargar: " + tariffFile); 

    try {
        // Usamos la ruta relativa desde el HTML (que está en la raíz) hacia la carpeta src
        const url = `src/${tariffFile}?v=${new Date().getTime()}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} al buscar ${url}`);
        }
        
        const dataObject = await response.json();
        
        // ALERT 2: JSON Cargado
        // alert("JSON cargado correctamente. Procesando...");

        // Detectar si es array directo o objeto con clave
        if (Array.isArray(dataObject)) {
            return dataObject;
        } else {
            const sheetName = Object.keys(dataObject)[0];
            return dataObject[sheetName];
        }
        
    } catch (error) {
        alert(`❌ ERROR DE CARGA:\nNo se pudo leer el archivo: ${tariffFile}\n\nDetalle: ${error.message}\n\nComprueba que el archivo existe en la carpeta 'src'.`);
        console.error(error);
        return null;
    }
}

// --- FUNCIÓN GENERAR PDF ---
function generatePdf(title, head, bodyData, button) {
    if (!window.jsPDF) {
        alert("❌ ERROR CRÍTICO: La librería jsPDF no se ha cargado.\nComprueba tu conexión a internet o el archivo tarifas.html.");
        return;
    }

    if (!bodyData || bodyData.length === 0) {
        alert("⚠️ AVISO: El archivo de tarifa está vacío o no tiene datos válidos.");
        return;
    }
    
    const originalText = button.textContent;
    button.textContent = 'Generando...';
    button.disabled = true;

    try {
        const doc = new window.jsPDF({ orientation: 'landscape' });
        
        // Comprobar plugin autotable
        if (typeof doc.autoTable !== 'function') {
            alert("❌ ERROR: El plugin AutoTable no se ha cargado.");
            throw new Error("AutoTable missing");
        }

        // Título
        doc.setFontSize(14);
        doc.text(title, 14, 15);
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 20);

        // Tabla
        doc.autoTable({
            head: [head], 
            body: bodyData, 
            startY: 25, 
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1.5, valign: 'middle' }, 
            headStyles: { fillColor: [0, 122, 255], fontSize: 7, halign: 'center' },
            columnStyles: {
                0: { cellWidth: 25 }, // Ref
                2: { halign: 'right' }, // PVP
                3: { halign: 'center' }, // Dto
                4: { halign: 'right', fontStyle: 'bold' } // Final
            }
        });

        doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
        // alert("✅ PDF Generado. Debería descargarse ahora.");

    } catch (error) {
        alert("❌ ERROR AL CREAR PDF:\n" + error.message);
        console.error(error);
    }

    button.textContent = originalText;
    button.disabled = false;
}

// Cabecera común
const head = ['Ref.', 'Descripción', 'PVP Base', 'Dto.', 'Precio Final', 'Condiciones / Neto'];

// --- EVENT LISTENERS ---

document.getElementById('pdf-general').addEventListener('click', async (e) => {
    const products = await loadTariffForPdf('Tarifa_General.json');
    if (!products) return;
    
    const body = products.map(p => {
        const precioFinal = parseFloat(p.PRECIO_ESTANDAR) || 0;
        const pvpBase = (precioFinal > 0) ? (precioFinal / 0.50).toFixed(2) : '0.00';
        
        if (p.NETOS) {
            return [p.Referencia, p.Descripcion, `${pvpBase} €`, 'Neto', '-', p.CONDICIONES_NETO];
        }
        return [p.Referencia, p.Descripcion, `${pvpBase} €`, '50%', `${precioFinal.toFixed(2)} €`, '-'];
    });
    generatePdf('Tarifa General', head, body, e.target);
});

document.getElementById('pdf-bigmat').addEventListener('click', async (e) => {
    const products = await loadTariffForPdf('Tarifa_Bigmat.json');
    if (!products) return;
    
    const body = products.map(p => {
        const precioFinal = parseFloat(p.PRECIO_ESTANDAR) || 0;
        const pvpBase = (precioFinal > 0) ? (precioFinal / 0.50).toFixed(2) : '0.00';
        
        if (p.NETOS) {
            return [p.Referencia, p.Descripcion, `${pvpBase} €`, 'Neto', '-', p.CONDICIONES_NETO];
        }
        return [p.Referencia, p.Descripcion, `${pvpBase} €`, '50%', `${precioFinal.toFixed(2)} €`, '-'];
    });
    generatePdf('Tarifa BigMat', head, body, e.target);
});

document.getElementById('pdf-neopro').addEventListener('click', async (e) => {
    const products = await loadTariffForPdf('Tarifa_Neopro.json');
    if (!products) return;
    
    const body = products.map(p => {
        const precioFinal = parseFloat(p.PRECIO_GRUPO1) || 0;
        const pvpBase = (precioFinal > 0) ? (precioFinal / 0.48).toFixed(2) : '0.00';
        return [p.Referencia, p.Descripcion, `${pvpBase} €`, '52%', `${precioFinal.toFixed(2)} €`, '-'];
    });
    generatePdf('Tarifa Neopro', head, body, e.target);
});

document.getElementById('pdf-ehlis').addEventListener('click', async (e) => {
    const products = await loadTariffForPdf('Tarifa_Ehlis.json');
    if (!products) return;
    const body = products.map(p => {
        const precioFinal = parseFloat(p.PRECIO_GRUPO1) || 0;
        const pvpBase = (precioFinal > 0) ? (precioFinal / 0.48).toFixed(2) : '0.00';
        return [p.Referencia, p.Descripcion, `${pvpBase} €`, '52%', `${precioFinal.toFixed(2)} €`, '-'];
    });
    generatePdf('Tarifa Ehlis', head, body, e.target);
});

document.getElementById('pdf-cecofersa').addEventListener('click', async (e) => {
    const products = await loadTariffForPdf('Tarifa_Cecofersa.json');
    if (!products) return;
    const body = products.map(p => {
        const precioFinal = parseFloat(p.PRECIO_CECOFERSA) || 0;
        const pvpBase = (precioFinal > 0) ? (precioFinal / 0.48).toFixed(2) : '0.00';
        if (p.NETOS) return [p.Referencia, p.Descripcion, `${pvpBase} €`, 'Neto', '-', p.CONDICIONES_NETO];
        return [p.Referencia, p.Descripcion, `${pvpBase} €`, '52%', `${precioFinal.toFixed(2)} €`, '-'];
    });
    generatePdf('Tarifa Cecofersa', head, body, e.target);
});

document.getElementById('pdf-synergas').addEventListener('click', async (e) => {
    const products = await loadTariffForPdf('Tarifa_Synergas.json');
    if (!products) return;
    const body = products.map(p => {
        const precioFinal = parseFloat(p.PRECIO_GRUPO1) || 0;
        const pvpBase = (precioFinal > 0) ? (precioFinal / 0.48).toFixed(2) : '0.00';
        return [p.Referencia, p.Descripcion, `${pvpBase} €`, '52%', `${precioFinal.toFixed(2)} €`, '-'];
    });
    generatePdf('Tarifa Synergas', head, body, e.target);
});

document.getElementById('pdf-grandes-cuentas').addEventListener('click', async (e) => {
    const products = await loadTariffForPdf('Tarifa_Grandes_Cuentas.json');
    if (!products) return;
    const body = products.map(p => {
        const precioFinal = parseFloat(p.PRECIO_ESTANDAR) || 0;
        const pvpBase = (precioFinal > 0) ? (precioFinal / 0.50).toFixed(2) : '0.00';
        if (p.NETOS_GRANDE_CUENTAS) return [p.Referencia, p.Descripcion, `${pvpBase} €`, 'Neto G.C.', '-', p.CONDICION_NETO_GC];
        return [p.Referencia, p.Descripcion, `${pvpBase} €`, '50%', `${precioFinal.toFixed(2)} €`, '-'];
    });
    generatePdf('Tarifa Grandes Cuentas', head, body, e.target);
});

document.getElementById('pdf-coferdroza').addEventListener('click', async (e) => {
    const products = await loadTariffForPdf('Tarifa_Coferdroza.json');
    if (!products) return;
    const body = products.map(p => {
        const precioFinal = parseFloat(p.PRECIO_GRUPO3) || 0;
        const pvpBase = (precioFinal > 0) ? (precioFinal / 0.50).toFixed(2) : '0.00';
        return [p.Referencia, p.Descripcion, `${pvpBase} €`, '50%', `${precioFinal.toFixed(2)} €`, '-'];
    });
    generatePdf('Tarifa Coferdroza', head, body, e.target);
});

document.getElementById('pdf-industrial-pro').addEventListener('click', async (e) => {
    const products = await loadTariffForPdf('Tarifa_IndustrialPro.json');
    if (!products) return;
    const body = products.map(p => {
        const precioFinal = parseFloat(p.PRECIO_ESTANDAR || p.PRECIO_CECOFERSA || p.PRECIO) || 0;
        const pvpBase = (precioFinal > 0) ? (precioFinal / 0.48).toFixed(2) : '0.00';
        if (p.NETOS) return [p.Referencia, p.Descripcion, `${pvpBase} €`, 'Neto', '-', p.CONDICIONES_NETO];
        return [p.Referencia, p.Descripcion, `${pvpBase} €`, '52%', `${precioFinal.toFixed(2)} €`, '-'];
    });
    generatePdf('Tarifa Industrial Pro', head, body, e.target);
});