console.log("🔄 Cargando Judith v3.0 (Edición Tarifas y Stock)...");

// ==========================================
// CONFIGURACIÓN
// ==========================================
// ⚠️ PEGA AQUÍ TU CLAVE API
const API_KEY = "sk-TU_CLAVE_AQUI"; 

const SYSTEM_PROMPT = `
Eres Judith, la asistente comercial virtual de la empresa.

--- PERSONALIDAD Y TONO ---
- IDIOMA: Español de España (Castellano neutro). Usa "vosotros", "coche", "ordenador", "fenomenal". NUNCA uses "computadora", "carro", "chévere" o "ustedes" (salvo por respeto).
- ACTITUD: Simpática, servicial, educada y profesional.
- PROHIBIDO: Ser arrogante ("vamos sobrados"), usar jerga callejera o dar datos confidenciales internos.

--- DICCIONARIO DE PRODUCTOS ---
1. "VALLAS": Se refiere EXCLUSIVAMENTE a publicidad exterior de gran formato (carreteras, 8x3m, monopostes).
2. "CARTELES": Se refiere a cartelería pequeña (PVC, papel, vinilo, A3, A4, señalética).

--- REGLAS DE INTERPRETACIÓN DE DATOS (JSON) ---
Tus datos provienen de archivos JSON con estas estructuras. Úsalos así:

1. STOCK (Archivo Stock.json):
   - Campo "Stock": Es la cantidad exacta.
   - REGLA DE ORO: ¡NUNCA DIGAS EL NÚMERO EXACTO AL CLIENTE!
   - Si Stock > 0: Di "Sí, tenemos disponibilidad", "Hay stock suficiente para tu pedido" o "Lo tenemos en almacén".
   - Si Stock = 0: Di "Ahora mismo no nos queda", "Está agotado temporalmente".

2. PRECIOS Y TARIFAS:
   - "PRECIO_ESTANDAR": Es el PVP base.
   - "NETOS": Es el precio final rebajado. SI EXISTE, TIENE PRIORIDAD sobre el estándar.
   - "CONDICIONES_NETO": Explica si hay mínimo de cantidad (ej: "a partir de 1 ud").
   - TARIFAS ESPECIALES:
     - Cecofersa / Industrial Pro: Campo "PRECIO_CECOFERSA".
     - Ehlis / Neopro / Synergas: Campo "PRECIO_GRUPO1".
     - Coferdroza: Campo "PRECIO_GRUPO3".
     - Grandes Cuentas: Campo "NETOS_GRANDE_CUENTAS".

Si el usuario no especifica tarifa, usa la "Tarifa_General" y da el PRECIO_ESTANDAR salvo que tenga un NETO mejor.
`;

// ==========================================
// 1. INICIALIZACIÓN (Garantiza que el botón salga)
// ==========================================

function initJudith() {
    if (document.getElementById('judith-wrapper')) return; // Evitar duplicados
    console.log("🚀 Iniciando interfaz de Judith...");
    createInterface();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJudith);
} else {
    initJudith();
}

// ==========================================
// 2. CREACIÓN DE LA INTERFAZ (HTML/CSS)
// ==========================================

function createInterface() {
    const wrapper = document.createElement('div');
    wrapper.id = 'judith-wrapper';
    
    wrapper.innerHTML = `
        <!-- BOTÓN FLOTANTE -->
        <div id="judith-launcher" style="
            position: fixed; bottom: 20px; right: 20px;
            width: 65px; height: 65px;
            background: linear-gradient(135deg, #0078d4, #005a9e);
            color: white; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 35px; cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 2147483647; transition: transform 0.2s;
            border: 2px solid white;
        ">👩‍💼</div>

        <!-- VENTANA DEL CHAT -->
        <div id="judith-modal" style="
            display: none; position: fixed; bottom: 100px; right: 20px;
            width: 360px; height: 550px;
            background: white; border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 2147483647; flex-direction: column;
            overflow: hidden; font-family: 'Segoe UI', Arial, sans-serif;
            border: 1px solid #ddd;
        ">
            <!-- Cabecera -->
            <div style="background: #0078d4; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:24px;">👩‍💼</span>
                    <div>
                        <div style="font-weight:bold; font-size:16px;">Judith IA</div>
                        <div style="font-size:11px; opacity:0.9;">Asistente Comercial</div>
                    </div>
                </div>
                <span id="close-judith" style="cursor: pointer; font-size: 24px;">&times;</span>
            </div>

            <!-- Chat -->
            <div id="judith-content" style="flex: 1; padding: 15px; overflow-y: auto; background: #f5f7f9;">
                <div style="background: white; padding: 12px; border-radius: 12px; border-top-left-radius: 2px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); width: fit-content; max-width: 85%; color: #333;">
                    ¡Hola! Soy Judith. ¿Necesitas consultar stock o precios de alguna tarifa hoy?
                </div>
            </div>

            <!-- Estado -->
            <div id="judith-status" style="display:none; padding: 5px 15px; font-size: 11px; color: #666; background: #f5f7f9; font-style:italic;">
                Consultando tarifas...
            </div>

            <!-- Input -->
            <div style="padding: 15px; background: white; border-top: 1px solid #eee; display: flex; gap: 8px;">
                <input type="text" id="user-input" placeholder="Pregunta por un artículo..." style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 25px; outline: none; background: #f8f9fa;">
                <button id="send-btn" style="width: 45px; height: 45px; background: #0078d4; color: white; border: none; border-radius: 50%; cursor: pointer; display:flex; align-items:center; justify-content:center; font-size:18px;">➤</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    setupEvents();
}

// ==========================================
// 3. EVENTOS
// ==========================================

function setupEvents() {
    const launcher = document.getElementById('judith-launcher');
    const modal = document.getElementById('judith-modal');
    const closeBtn = document.getElementById('close-judith');
    const sendBtn = document.getElementById('send-btn');
    const input = document.getElementById('user-input');

    launcher.addEventListener('click', () => {
        modal.style.display = 'flex';
        launcher.style.display = 'none';
        setTimeout(() => input.focus(), 100);
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        launcher.style.display = 'flex';
    });

    sendBtn.addEventListener('click', handleMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleMessage();
    });
}

// ==========================================
// 4. LÓGICA DEL CHAT
// ==========================================

async function handleMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    // 1. Mostrar mensaje usuario
    addMsg(text, 'user');
    input.value = '';

    // 2. Mostrar "Escribiendo..."
    const status = document.getElementById('judith-status');
    status.style.display = 'block';
    status.innerText = "Judith está pensando...";

    try {
        // NOTA: En una app real, aquí deberíamos buscar en los JSON locales
        // y adjuntar la info relevante al prompt. Como no tenemos backend aquí,
        // enviamos la consulta directa a OpenAI asumiendo que le pasamos contexto si lo tuviéramos.
        
        const reply = await callOpenAI(text);
        
        // 3. Respuesta IA
        addMsg(reply, 'judith');
        speak(reply);

    } catch (e) {
        console.error(e);
        addMsg("Disculpa, he tenido un pequeño fallo de conexión. ¿Me lo repites?", 'judith');
    } finally {
        status.style.display = 'none';
    }
}

function addMsg(text, role) {
    const content = document.getElementById('judith-content');
    const div = document.createElement('div');
    const isUser = role === 'user';
    
    div.style.maxWidth = '85%';
    div.style.padding = '12px 16px';
    div.style.borderRadius = '12px';
    div.style.marginBottom = '10px';
    div.style.lineHeight = '1.4';
    div.style.fontSize = '14px';
    div.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
    div.style.wordWrap = 'break-word';

    if (isUser) {
        div.style.background = '#dcf8c6'; // Verde WhatsApp suave
        div.style.alignSelf = 'flex-end';
        div.style.marginLeft = 'auto';
        div.style.borderTopRightRadius = '2px';
        div.innerText = text;
    } else {
        div.style.background = 'white';
        div.style.alignSelf = 'flex-start';
        div.style.marginRight = 'auto';
        div.style.borderTopLeftRadius = '2px';
        // Convertimos saltos de línea en HTML para que se vea bonito
        div.innerHTML = text.replace(/\n/g, '<br>');
    }

    content.appendChild(div);
    content.scrollTop = content.scrollHeight;
}

// ==========================================
// 5. CONEXIÓN API (CEREBRO)
// ==========================================

async function callOpenAI(msg) {
    if (API_KEY.includes("TU_CLAVE")) return "⚠️ Error: Falta la API Key en el archivo judith.js";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo", // O "gpt-4" si puedes
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                // Aquí podrías inyectar el JSON si el usuario lo pega en el chat, 
                // o si tuviéramos una función de búsqueda.
                { role: "user", content: msg }
            ],
            temperature: 0.6 // Un poco más bajo para ser precisos con precios
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

// ==========================================
// 6. VOZ (ESPAÑOL DE ESPAÑA)
// ==========================================

function speak(text) {
    if (!window.speechSynthesis) return;
    
    // Cancelar habla anterior
    window.speechSynthesis.cancel();
    
    // Limpiar texto de emojis para que no los lea literal
    const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Configuración forzada para España
    utterance.lang = 'es-ES'; 
    utterance.rate = 1.1; // Velocidad dinámica
    utterance.pitch = 1.05; // Tono amable

    // Intentar seleccionar voz de Google o Microsoft específica de España
    const voices = window.speechSynthesis.getVoices();
    const voiceES = voices.find(v => 
        v.lang === 'es-ES' && (v.name.includes('Google') || v.name.includes('Microsoft'))
    );
    
    if (voiceES) utterance.voice = voiceES;

    window.speechSynthesis.speak(utterance);
}