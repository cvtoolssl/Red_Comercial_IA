console.log("🔄 Cargando script de Judith...");

// ==========================================
// CONFIGURACIÓN (CLAVE API)
// ==========================================
// ⚠️ PEGA AQUÍ TU CLAVE.
const API_KEY = "sk-TU_CLAVE_AQUI"; 

const SYSTEM_PROMPT = `
Eres Judith, la asistente comercial virtual de la empresa.

PERSONALIDAD:
- Idioma: ESPAÑOL DE ESPAÑA (Castellano).
- Tono: Simpática, cercana pero profesional.
- Expresiones: "Fenomenal", "Ahora mismo te lo miro", "Claro que sí".

PRODUCTOS:
1. VALLAS: Publicidad exterior GRAN FORMATO (Carreteras, 8x3m).
2. CARTELES: Impresión pequeña, pósters, escaparates.

Si preguntan por "vallas", vende publicidad exterior.
Si preguntan por "carteles", vende impresión digital.
`;

// ==========================================
// 1. INICIALIZACIÓN SEGURA
// ==========================================

function initJudith() {
    console.log("🚀 Iniciando Judith UI...");
    
    // Verificamos si ya existe para no duplicar
    if (document.getElementById('judith-wrapper')) {
        console.log("⚠️ Judith ya existe en el DOM.");
        return;
    }

    // Crear la interfaz
    createInterface();
}

// Aseguramos que el código se ejecute solo cuando la web esté lista
if (document.readyState === 'loading') {  
    document.addEventListener('DOMContentLoaded', initJudith);
} else {  
    initJudith();
}

// ==========================================
// 2. CREACIÓN DE LA INTERFAZ (UI)
// ==========================================

function createInterface() {
    const wrapper = document.createElement('div');
    wrapper.id = 'judith-wrapper';
    
    // HTML inyectado con estilos "inline" para asegurar que se vea
    wrapper.innerHTML = `
        <!-- BOTÓN FLOTANTE (EL ICONO) -->
        <div id="judith-launcher" style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 65px;
            height: 65px;
            background-color: #0078d4;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 35px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 2147483647; /* VALOR MÁXIMO PARA QUE SE VEA SIEMPRE */
            transition: transform 0.2s;
            border: 2px solid white;
        ">👩‍💼</div>

        <!-- VENTANA DEL CHAT -->
        <div id="judith-modal" style="
            display: none;
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.2);
            z-index: 2147483647;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #ccc;
            font-family: Arial, sans-serif;
        ">
            <!-- Cabecera -->
            <div style="background: #0078d4; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; font-size: 1.1em;">👩‍💼 Judith IA</span>
                <span id="close-judith" style="cursor: pointer; font-size: 24px; line-height: 20px;">&times;</span>
            </div>

            <!-- Área de mensajes -->
            <div id="judith-content" style="flex: 1; padding: 15px; overflow-y: auto; background: #f0f2f5;">
                <div style="background: white; padding: 12px; border-radius: 12px; border-top-left-radius: 2px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); width: fit-content; max-width: 85%;">
                    👋 ¡Hola! Soy Judith. ¿En qué puedo ayudarte?
                </div>
            </div>

            <!-- Estado -->
            <div id="judith-status" style="display:none; padding: 5px 15px; font-size: 12px; color: #666; background: #f0f2f5;">
                Judith está escribiendo...
            </div>

            <!-- Input -->
            <div style="padding: 12px; background: white; border-top: 1px solid #ddd; display: flex; gap: 8px;">
                <input type="text" id="user-input" placeholder="Escribe aquí..." style="flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 20px; outline: none; padding-left: 15px;">
                <button id="send-btn" style="width: 40px; height: 40px; background: #0078d4; color: white; border: none; border-radius: 50%; cursor: pointer; font-weight: bold;">➤</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    console.log("✅ Interfaz de Judith inyectada en el body.");

    // Configurar eventos una vez creado el HTML
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

    // Abrir
    launcher.addEventListener('click', () => {
        modal.style.display = 'flex';
        launcher.style.display = 'none';
        setTimeout(() => input.focus(), 100); // Foco al input
    });

    // Cerrar
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        launcher.style.display = 'flex';
    });

    // Enviar
    sendBtn.addEventListener('click', handleMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleMessage();
    });
}

// ==========================================
// 4. LÓGICA DE NEGOCIO
// ==========================================

async function handleMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    // Pintar usuario
    addMsg(text, 'user');
    input.value = '';

    // Estado cargando
    const status = document.getElementById('judith-status');
    status.style.display = 'block';

    try {
        const reply = await callOpenAI(text);
        addMsg(reply, 'judith');
        speak(reply);
    } catch (e) {
        console.error(e);
        addMsg("Lo siento, no puedo conectar ahora mismo.", 'judith');
    } finally {
        status.style.display = 'none';
    }
}

function addMsg(text, role) {
    const content = document.getElementById('judith-content');
    const div = document.createElement('div');
    
    // Estilos dinámicos
    const isUser = role === 'user';
    div.style.background = isUser ? '#dcf8c6' : 'white';
    div.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
    div.style.marginLeft = isUser ? 'auto' : '0';
    div.style.marginRight = isUser ? '0' : 'auto';
    div.style.maxWidth = '85%';
    div.style.padding = '10px 14px';
    div.style.borderRadius = '12px';
    div.style.marginBottom = '10px';
    div.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
    div.style.wordWrap = 'break-word';

    if (!isUser) {
        div.style.borderTopLeftRadius = '2px';
        div.innerHTML = `<b>👩‍💼 Judith:</b><br>${text}`;
    } else {
        div.style.borderTopRightRadius = '2px';
        div.innerText = text;
    }

    content.appendChild(div);
    content.scrollTop = content.scrollHeight;
}

// ==========================================
// 5. API Y VOZ
// ==========================================

async function callOpenAI(msg) {
    if (API_KEY.includes("TU_CLAVE")) return "⚠️ Configura la API Key en judith.js";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: msg }
            ]
        })
    });
    const data = await res.json();
    return data.choices[0].message.content;
}

function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES'; // Español de España
    u.rate = 1.1;
    window.speechSynthesis.speak(u);
}