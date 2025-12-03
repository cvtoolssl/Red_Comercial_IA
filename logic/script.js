// logic/script.js

const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('resultsContainer');
const tariffSelector = document.getElementById('tariffSelector');

let allProducts = [];
let stockMap = new Map();
let imagesMap = new Map(); // NUEVO: Mapa para las imágenes
let currentTariffFile = 'Tarifa_General.json'; 

// --- HERRAMIENTAS AUXILIARES ---

function extractMinQty(text) {
    if (!text || typeof text !== 'string') return 0;
    const t = text.toLowerCase();
    const qtyRegex = /(\d+)\s*(uds?|unid|pzs?|pza|cjs?|cajas?|estuches?|palets?)/;
    let match = t.match(qtyRegex);
    if (match) return parseInt(match[1]);
    const minRegex = /(?:partir de|min|mínimo)\s*:?\s*(\d+)/;
    match = t.match(minRegex);
    if (match) return parseInt(match[1]);
    const simpleNumRegex = /\b(\d{2,})\b/; 
    match = t.match(simpleNumRegex);
    if (match) return parseInt(match[0]);
    return 0;
}

function extractNetPrice(text) {
    if (!text || typeof text !== 'string') return 0;
    let match = text.match(/(\d+[.,]?\d*)\s*€/);
    if (match) return parseFloat(match[1].replace(',', '.'));
    match = text.match(/(\d+[.,]\d+)/);
    if (match) return parseFloat(match[0].replace(',', '.'));
    return 0;
}

// Función para sacar el ID de Google Drive
function getDriveId(url) {
    if (!url) return null;
    const match = url.match(/\/d\/(.+?)\//);
    return match ? match[1] : null;
}

// --- CARGA DE DATOS ---

// 1. Cargar Imágenes
async function loadImagesData() {
    try {
        const response = await fetch(`src/Foto_Articulos.json?v=${new Date().getTime()}`);
        if (!response.ok) throw new Error("No se pudo cargar Foto_Articulos.json");
        const data = await response.json();
        
        data.forEach(item => {
            // Quitamos la extensión (.jpg, .png) para quedarnos solo con la referencia
            const cleanRef = item.nombre.split('.')[0].toUpperCase();
            const fileId = getDriveId(item.url);
            
            if (fileId) {
                // Usamos el enlace de thumbnail de Google (carga más rápido que el full size)
                // sz=w400 pide una anchura de 400px
                const directUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
                imagesMap.set(String(cleanRef), directUrl);
            }
        });
        console.log("Imágenes cargadas:", imagesMap.size);
    } catch (error) {
        console.error('Error cargando imágenes:', error);
    }
}

// 2. Cargar Stock
async function loadStockData() {
    try {
        const response = await fetch(`src/Stock.json?v=${new Date().getTime()}`);
        if (!response.ok) throw new Error("No se pudo cargar el Stock");
        const data = await response.json();
        const stockArray = data.Stock || [];
        stockArray.forEach(item => {
            stockMap.set(String(item.Artículo), item);
        });
        console.log("Stock cargado:", stockMap.size, "artículos.");
    } catch (error) {
        console.error('Error cargando el stock:', error);
    }
}

// 3. Cargar Tarifas
async function loadTariffData(tariffFile) {
    searchInput.placeholder = 'Cargando datos...';
    resultsContainer.innerHTML = '<p style="text-align:center; padding: 2rem;">Cargando productos, stock e imágenes...</p>';
    
    try {
        const response = await fetch(`src/${tariffFile}?v=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const dataObject = await response.json();
        
        // Soporte para estructura { "Tarifa_X": [...] } o [...] directo
        if (Array.isArray(dataObject)) {
            allProducts = dataObject;
        } else {
            const sheetName = Object.keys(dataObject)[0]; 
            allProducts = dataObject[sheetName];
        }
        searchInput.placeholder = 'Buscar por referencia o descripción...';
    } catch (error) {
        searchInput.placeholder = `Error al cargar tarifa.`;
        console.error('Error fetching data:', error);
        allProducts = [];
    }
    
    searchInput.value = '';
    resultsContainer.innerHTML = '';
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    // Cargamos todo en paralelo
    await Promise.all([loadStockData(), loadImagesData()]);
    // Luego la tarifa (que depende de que el DOM esté listo para pintar si quisiéramos)
    loadTariffData(currentTariffFile);
});

tariffSelector.addEventListener('change', (event) => {
    currentTariffFile = event.target.value;
    loadTariffData(currentTariffFile);
});

// --- BÚSQUEDA ---
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }
    
    const filteredProducts = allProducts.filter(product => {
        const descripcion = product.Descripcion ? product.Descripcion.toLowerCase() : '';
        const referencia = product.Referencia ? String(product.Referencia).toLowerCase() : '';
        
        // Filtro de stock: Si está en stock.json y estado es 'no', no mostrar
        const stockInfo = stockMap.get(String(product.Referencia));
        if (stockInfo && stockInfo.Estado === 'no') return false;
        
        return descripcion.includes(query) || referencia.includes(query);
    });
    
    displayResults(filteredProducts);
});

// --- RENDERIZADO ---
function displayResults(products) {
    if (products.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--subtle-text);">No se encontraron resultados.</p>';
        return;
    }

    let html = '';
    products.forEach((product, index) => {
        // 1. PRECIOS
        let pvpBase = 0;
        let descuento = 'N/A';
        let precioFinal = 0;
        let precioNetoTexto = 'No aplica'; 
        let precioFinalNumerico = 0;

        // Lógica simplificada de tarifas (reutilizando tu lógica anterior)
        if (currentTariffFile.includes('General') || currentTariffFile.includes('Bigmat') || currentTariffFile.includes('Grandes_Cuentas') || currentTariffFile.includes('Coferdroza')) {
            descuento = '50%';
            // Buscamos el precio en varios campos posibles
            precioFinalNumerico = product.PRECIO_ESTANDAR || product.PRECIO_GRUPO3 || 0;
            if (precioFinalNumerico > 0) pvpBase = precioFinalNumerico / 0.50;
            
        } else {
            // Grupo Neopro, Ehlis, Cecofersa, Synergas, Industrial... (Margen 0.48)
            descuento = '52%';
            precioFinalNumerico = product.PRECIO_GRUPO1 || product.PRECIO_CECOFERSA || product.PRECIO_ESTANDAR || product.PRECIO || 0;
            if (precioFinalNumerico > 0) pvpBase = precioFinalNumerico / 0.48;
        }

        // Netos
        if (product.NETOS || product.NETOS_GRANDE_CUENTAS) {
             precioNetoTexto = product.CONDICIONES_NETO || product.CONDICION_NETO_GC || 'Consultar neto';
        }

        precioFinal = precioFinalNumerico.toFixed(2);

        // 2. STOCK
        const stockInfo = stockMap.get(String(product.Referencia));
        let stockHtml = '';
        let stockTextForBudget = 'Consultar'; 

        if (stockInfo) {
            const estado = stockInfo.Estado ? stockInfo.Estado.toLowerCase() : '';
            if (estado === 'si') {
                const cant = stockInfo.Stock || 0;
                stockHtml = cant > 0 
                    ? `<div class="stock-badge stock-ok"><span class="icon">✅</span> En stock</div>`
                    : `<div class="stock-badge stock-ko"><span class="icon">❌</span> Sin stock</div>`;
                stockTextForBudget = cant > 0 ? "✅ En stock" : "❌ Sin stock";
            } else if (estado.includes('fab')) {
                const dias = estado === 'fab' ? '3-5' : '10-15';
                stockHtml = `<div class="stock-badge stock-fab"><span class="icon">🏭</span> ${dias} días</div>`;
                stockTextForBudget = `🏭 ${dias} días`;
            }
        } 
        
        // 3. IMAGEN (NUEVO)
        const refLimpia = String(product.Referencia).toUpperCase();
        const imgUrl = imagesMap.get(refLimpia);
        
        // Si hay imagen, la mostramos. Si no, ponemos un placeholder gris o nada
        const imgHtml = imgUrl 
            ? `<div class="product-image"><img src="${imgUrl}" alt="${product.Descripcion}" loading="lazy" onclick="window.open('${imgUrl}', '_blank')"></div>`
            : `<div class="product-image no-img"><span>Sin foto</span></div>`;

        // Datos seguros para el presupuesto
        const safeRef = String(product.Referencia || '').replace(/["']/g, "");
        const safeDesc = String(product.Descripcion || '').replace(/["']/g, "");
        const safeNetoTxt = String(precioNetoTexto).replace(/["']/g, "");
        const safeStockTxt = String(stockTextForBudget).replace(/["']/g, "");
        
        const minQty = extractMinQty(precioNetoTexto);
        const netPriceVal = extractNetPrice(precioNetoTexto);
        const qtyInputId = `qty_${index}`;

        html += `
            <div class="product-card-single">
                <div class="card-header">
                    <!-- Columna Izquierda: Imagen -->
                    ${imgHtml}
                    
                    <!-- Columna Derecha: Info -->
                    <div class="product-header-info">
                        <h2>${product.Descripcion || 'Sin descripción'}</h2>
                        <div class="ref-row">
                            <span class="ref-text">Ref: ${product.Referencia || 'N/A'}</span>
                            ${stockHtml}
                        </div>
                    </div>
                </div>
                
                <div class="price-details-grid">
                    <p class="price-line"><strong>PVP Base:</strong> <span>${pvpBase.toFixed(2)} €</span></p>
                    <p class="price-line"><strong>Descuento:</strong> <span>${descuento}</span></p>
                    <p class="price-line"><strong>Precio Final:</strong> <span class="final-price">${precioFinal} €</span></p>
                    <p class="price-line"><strong>Neto:</strong> <span class="neto-price">${precioNetoTexto}</span></p>
                </div>

                <div class="add-controls">
                    <input type="number" id="${qtyInputId}" class="qty-input" value="1" min="1">
                    <button class="add-budget-btn" onclick="addToBudget('${safeRef}', '${safeDesc}', ${precioFinal}, document.getElementById('${qtyInputId}').value, '${safeNetoTxt}', ${minQty}, ${netPriceVal}, '${safeStockTxt}')">
                        + Añadir
                    </button>
                </div>
            </div>`;
    });
    resultsContainer.innerHTML = html;
}