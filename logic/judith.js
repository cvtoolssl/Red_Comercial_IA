console.log("🔄 Cargando Judith v6.0 (Auto-Micro + Fix Datos + Botón Izq)...");

// ==========================================
// 1. VARIABLES Y CONFIGURACIÓN
// ==========================================

let productsDB = [];
let stockMap = new Map();
let apiKey = sessionStorage.getItem("OPENAI_API_KEY");
const audioPlayer = new Audio(); // Reproductor para la voz humana

// Configuración de Reconocimiento de Voz (Navegador)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
}

const SYSTEM_PROMPT = `
Eres Judith, una compañera del departamento comercial de "CV Tools".
PERSONALIDAD:
- Eres una chica joven, muy simpática, alegre y natural (de España).
- NO eres un robot. Habla como una persona: usa expresiones como "pues mira", "genial", "a ver qué tenemos".
- Te gusta charlar. Si te saludan, responde con alegría.

--- PERSONALIDAD Y TONO ---
IDIOMA: Español de España (Castellano neutro). Usa "vosotros", "coche", "ordenador", "fenomenal". NUNCA uses "computadora", "carro", "chévere" o "ustedes" (salvo por respeto).
ACTITUD: Simpática, servicial, educada y profesional.
PROHIBIDO: Ser arrogante ("vamos sobrados"), usar jerga callejera o dar datos confidenciales internos.

--- REGLAS DE INTERPRETACIÓN DE DATOS (JSON) ---
Tus datos provienen de archivos JSON con estas estructuras. Úsalos así:

1. STOCK:
   - Campo "Stock": Es la cantidad exacta.
   - REGLA DE ORO: ¡NUNCA DIGAS EL NÚMERO EXACTO AL CLIENTE!
   - Si Stock > 10: Di "Sí, tenemos disponibilidad", "Hay stock suficiente" o "Lo tenemos en almacén".
   - Si Stock 1-10: Di "Queda poquito", "Hay pocas unidades".
   - Si Stock = 0: Di "Ahora mismo no nos queda", "Está agotado temporalmente".
   - Si Estado es "fab": Di "Hay que fabricarlo (3-4 días)".

2. PRECIOS:
   - "PRECIO_ESTANDAR": Es el PVP base.
   - "NETOS": Si existe y es mayor que 0, es el precio final real. Menciónalo.
   
Si el usuario no especifica tarifa, usa el dato que te paso (que viene de la Tarifa General).

--- OBJETIVO ---
Ayudar a vender. Sé breve y natural. No leas tablas, cuéntalo como una persona.
`;

// ==========================================
// 2. INICIALIZACIÓN Y CARGA DE DATOS
// ==========================================

function initJudith() {
    if (document.getElementById('judith-wrapper')) return;
    createInterface();
    loadData(); // Cargar los JSONs en memoria
}

// Carga los JSONs reales para que Judith sepa los precios
async function loadData() {
    try {
        const [resTarifa, resStock] = await Promise.all([
            fetch('src/Tarifa_General.json?v=' + Date.now()),
            fetch('src/Stock.json?v=' + Date.now())
        ]);

        if (resStock.ok) {
            const dataStock = await resStock.json();
            // Mapeamos por "Artículo" convertido a String para evitar errores de tipo
            (dataStock.Stock || []).forEach(item => stockMap.set(String(item.Artículo), item));
        }

        if (resTarifa.ok) {
            const dataTarifa = await resTarifa.json();
            if (Array.isArray(dataTarifa)) productsDB = dataTarifa;
            else productsDB = dataTarifa[Object.keys(dataTarifa)[0]];
        }
        console.log("✅ Datos de Judith cargados. Productos:", productsDB.length);
    } catch (e) {
        console.error("❌ Error cargando datos JSON:", e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJudith);
} else {
    initJudith();
}

// ==========================================
// 3. INTERFAZ GRÁFICA (Botón a la Izquierda)
// ==========================================

function createInterface() {
    const wrapper = document.createElement('div');
    wrapper.id = 'judith-wrapper';
    
    wrapper.innerHTML = `
        <!-- BOTÓN FLOTANTE (IZQUIERDA) -->
        <div id="judith-launcher" style="
            position: fixed; bottom: 25px; left: 25px;
            width: 70px; height: 70px;
            background: linear-gradient(135deg, #0078d4, #00bcf2);
            color: white; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 38px; cursor: pointer;
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            z-index: 2147483647; border: 3px solid white;
            transition: transform 0.2s;
        ">👩‍💼</div>

        <!-- VENTANA DEL CHAT -->
        <div id="judith-modal" style="
            display: none; position: fixed; bottom: 110px; left: 25px;
            width: 350px; height: 550px; max-height: 80vh;
            background: #ffffff; border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.25);
            z-index: 2147483647; flex-direction: column;
            overflow: hidden; font-family: sans-serif; border: 1px solid #ddd;
        ">
            <!-- Cabecera -->
            <div style="background: linear-gradient(90deg, #0078d4, #2b88d8); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:24px;">👩‍💼</span>
                    <span style="font-weight:bold; font-size:18px;">Judith IA</span>
                </div>
                <span id="close-judith" style="cursor: pointer; font-size: 24px;">&times;</span>
            </div>

            <!-- Chat -->
            <div id="judith-content" style="flex: 1; padding: 15px; overflow-y: auto; background: #f4f6f8;">
                <div style="background: white; padding: 12px; border-radius: 12px; border-bottom-left-radius: 2px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); color:#333;">
                    ¡Hola! Soy Judith. Dime qué necesitas y lo miramos. 😉
                </div>
            </div>

            <!-- Estado -->
            <div id="judith-status" style="display:none; padding: 5px 15px; font-size: 11px; color: #666; background: #f4f6f8; font-style:italic;">
                Pensando...
            </div>

            <!-- Input Area -->
            <div style="padding: 10px; background: white; border-top: 1px solid #eee; display: flex; gap: 8px; align-items:center;">
                <!-- Botón Micrófono -->
                <button id="mic-btn" style="width: 40px; height: 40px; background: #ff4b4b; color: white; border: none; border-radius: 50%; cursor: pointer; display:flex; align-items:center; justify-content:center; font-size: 18px;">🎙️</button>
                <input type="text" id="user-input" placeholder="Escribe o habla..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none;">
                <button id="send-btn" style="width: 40px; height: 40px; background: #0078d4; color: white; border: none; border-radius: 50%; cursor: pointer; display:flex; align-items:center; justify-content:center;">➤</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    setupEvents();
}

// ==========================================
// 4. EVENTOS Y LÓGICA (AUTO-MICRO)
// ==========================================

function setupEvents() {
    const launcher = document.getElementById('judith-launcher');
    const modal = document.getElementById('judith-modal');
    const closeBtn = document.getElementById('close-judith');
    const sendBtn = document.getElementById('send-btn');
    const input = document.getElementById('user-input');
    const micBtn = document.getElementById('mic-btn');

    // ABRIR JUDITH + AUTO-ESCUCHAR
    launcher.addEventListener('click', () => {
        // 1. Pedir API si no existe (PROMPT)
        if (!ensureApiKey()) return;

        modal.style.display = 'flex';
        launcher.style.display = 'none';
        
        // 2. Activar micro automáticamente
        startListening();
    });

    // CERRAR JUDITH
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        launcher.style.display = 'flex';
        if (!audioPlayer.paused) audioPlayer.pause(); // Callar voz
        if (recognition) recognition.stop(); // Parar micro
    });

    // ENVIAR TEXTO
    sendBtn.addEventListener('click', handleMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleMessage();
    });

    // BOTÓN MICRO MANUAL
    micBtn.addEventListener('click', startListening);
}

function startListening() {
    const micBtn = document.getElementById('mic-btn');
    if (!recognition) {
        alert("Tu navegador no soporta voz.");
        return;
    }
    
    // Parar si Judith estaba hablando
    if (!audioPlayer.paused) audioPlayer.pause();

    micBtn.style.animation = "pulse 1s infinite";
    micBtn.style.background = "#d32f2f"; // Rojo intenso escuchando
    
    try {
        recognition.start();
    } catch(e) { 
        // Si ya estaba activo, no pasa nada
        console.log("Micro ya activo o error:", e);
    }
}

// Configurar eventos del reconocimiento fuera para que no se dupliquen
if (recognition) {
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('user-input').value = transcript;
        stopListeningAnim();
        handleMessage(); // Enviar automático
    };
    recognition.onend = () => {
        stopListeningAnim();
    };
    recognition.onerror = () => {
        stopListeningAnim();
    };
}

function stopListeningAnim() {
    const micBtn = document.getElementById('mic-btn');
    micBtn.style.animation = "none";
    micBtn.style.background = "#ff4b4b";
}

function ensureApiKey() {
    apiKey = sessionStorage.getItem("OPENAI_API_KEY");
    if (!apiKey || apiKey === "null" || apiKey.length < 10) {
        const key = prompt("🔑 Judith necesita tu API Key de OpenAI para hablar.\nPor favor, pégala aquí:");
        if (key && key.startsWith("sk-")) {
            apiKey = key.trim();
            sessionStorage.setItem("OPENAI_API_KEY", apiKey);
            return true;
        } else {
            alert("Sin clave API, Judith no puede funcionar.");
            return false;
        }
    }
    return true;
}

// ==========================================
// 5. PROCESAMIENTO INTELIGENTE DE DATOS
// ==========================================

async function handleMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    addMsg(text, 'user');
    input.value = '';

    const status = document.getElementById('judith-status');
    status.style.display = 'block';
    status.textContent = "Judith está pensando...";

    // 1. BUSCAR DATOS LOCALMENTE
    const contextData = getProductContext(text);

    try {
        // 2. PREGUNTAR A OPENAI
        const replyText = await callOpenAI_Text(text, contextData);
        
        addMsg(replyText, 'judith');
        status.textContent = "Generando voz...";
        
        // 3. GENERAR AUDIO
        await callOpenAI_Audio(replyText);

    } catch (e) {
        console.error(e);
        addMsg("Ups, tengo mala conexión. ¿Me lo repites?", 'judith');
    } finally {
        status.style.display = 'none';
    }
}

// ARREGLADO: Búsqueda flexible y cruce correcto de datos
function getProductContext(query) {
    if (productsDB.length === 0) return "⚠️ No tengo datos de productos cargados todavía.";
    
    // Palabras clave de la búsqueda (ej: "precio cartel salida")
    const terms = query.toLowerCase().split(" ").filter(t => t.length > 2);
    
    // Filtramos productos que coincidan con los términos
    const matches = productsDB.filter(p => {
        const desc = (p.Descripcion || "").toLowerCase();
        const ref = String(p.Referencia || "").toLowerCase();
        // Si coincide la referencia o alguna palabra de la descripción
        return terms.some(t => desc.includes(t) || ref.includes(t));
    }).slice(0, 5); // Máximo 5 para no liar a la IA

    if (matches.length === 0) return ""; // No se encontró nada específico

    let context = "DATOS ENCONTRADOS EN EL SISTEMA:\n";
    
    matches.forEach(p => {
        // Buscamos el stock cruzando Referencia (Tarifa) con Artículo (Stock)
        // Convertimos ambos a String para asegurar match
        const refString = String(p.Referencia);
        const stockInfo = stockMap.get(refString);
        
        let stockTxt = "Sin datos de stock";
        let estadoTxt = "";
        
        if (stockInfo) {
            stockTxt = `${stockInfo.Stock} unidades`;
            estadoTxt = `(Estado: ${stockInfo.Estado})`;
        }

        // Info extra de precio neto
        let precioInfo = `PVP: ${p.PRECIO_ESTANDAR}€`;
        if (p.NETOS) precioInfo += ` | NETO OFERTA: ${p.NETOS}€ (${p.CONDICIONES_NETO})`;

        context += `- Ref: ${refString} | ${p.Descripcion} | ${precioInfo} | Stock: ${stockTxt} ${estadoTxt}\n`;
    });
    
    return context;
}

function addMsg(text, role) {
    const content = document.getElementById('judith-content');
    const div = document.createElement('div');
    const isUser = role === 'user';
    
    div.style.padding = '10px 14px';
    div.style.borderRadius = '12px';
    div.style.marginBottom = '10px';
    div.style.maxWidth = '80%';
    div.style.fontSize = '14px';
    div.style.lineHeight = '1.4';

    if (isUser) {
        div.style.background = '#0078d4';
        div.style.color = 'white';
        div.style.alignSelf = 'flex-end';
        div.style.marginLeft = 'auto';
    } else {
        div.style.background = 'white';
        div.style.color = '#333';
        div.style.alignSelf = 'flex-start';
        div.style.marginRight = 'auto';
        div.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
    }
    div.textContent = text;
    content.appendChild(div);
    content.scrollTop = content.scrollHeight;
}

// ==========================================
// 6. CONEXIONES OPENAI
// ==========================================

async function callOpenAI_Text(msg, context) {
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];
    
    if (context) {
        messages.push({ role: "system", content: "INFORMACIÓN DE LA BASE DE DATOS:\n" + context });
    }
    messages.push({ role: "user", content: msg });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: messages,
            max_tokens: 150,
            temperature: 0.7 
        })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

async function callOpenAI_Audio(text) {
    if (!audioPlayer.paused) audioPlayer.pause();

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "tts-1",
            input: text,
            voice: "nova" // Voz simpática
        })
    });

    if (!response.ok) throw new Error("Error audio");
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    audioPlayer.src = url;
    audioPlayer.play();
}

// Estilos de animación
const style = document.createElement('style');
style.innerHTML = `
@keyframes pulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 75, 75, 0.7); }
    70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(255, 75, 75, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 75, 75, 0); }
}`;
document.head.appendChild(style);