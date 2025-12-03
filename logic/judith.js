// ==========================================
// CONFIGURACIÓN DE JUDITH
// ==========================================

// ⚠️ PEGA AQUÍ TU CLAVE DE OPENAI.
// IMPORTANTE: Si subes esto a GitHub, asegúrate de borrar la clave antes o usar variables de entorno.
const API_KEY = "sk-TU_CLAVE_AQUI"; 

const SYSTEM_PROMPT = `
Eres Judith, la asistente comercial virtual de la empresa.

PERSONALIDAD:
- Tu idioma es ESPAÑOL DE ESPAÑA (Castellano).
- Tono: Simpática, servicial y profesional. NUNCA arrogante.
- Frases típicas: "¡Hola!", "Claro que sí", "Enseguida te lo miro", "Fenomenal".
- No uses jerga latina ni "spanglish".

DEFINICIONES DE PRODUCTOS (IMPORTANTE):
1. VALLAS: Te refieres a "Vallas Publicitarias de Gran Formato" (Carreteras, 8x3m, monopostes). NO son vallas de jardín.
2. CARTELES: Te refieres a cartelería pequeña, pósters, A3, escaparates.

Si preguntan por "vallas", da precios o info de soportes exteriores gigantes.
Si preguntan por "carteles", habla de impresión digital o papel.
`;

// ==========================================
// 1. CREAR LA INTERFAZ (BOTÓN Y VENTANA)
// ==========================================

function createJudithUI() {
    // Si ya existe, no lo creamos de nuevo
    if (document.getElementById('judith-wrapper')) return;

    // Creamos un contenedor para todo
    const wrapper = document.createElement('div');
    wrapper.id = 'judith-wrapper';
    
    // HTML del Botón Flotante + Ventana Modal
    wrapper.innerHTML = `
        <!-- BOTÓN FLOTANTE (El icono que siempre se ve) -->
        <div id="judith-launcher" style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background-color: #0078d4;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            z-index: 9999;
            transition: transform 0.3s;
        ">👩‍💼</div>

        <!-- VENTANA DEL CHAT (Oculta al principio) -->
        <div id="judith-modal" style="
            display: none;
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
            z-index: 9999;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #e0e0e0;
        ">
            <!-- Cabecera -->
            <div style="background: #0078d4; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold;">👩‍💼 Judith IA</span>
                <span id="close-judith" style="cursor: pointer; font-size: 20px;">&times;</span>
            </div>

            <!-- Área de mensajes -->
            <div id="judith-content" style="flex: 1; padding: 15px; overflow-y: auto; background: #f9f9f9;">
                <div class="chat-msg msg-judith" style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #eee;">
                    ¡Hola! Soy Judith. ¿En qué puedo ayudarte hoy?
                </div>
            </div>

            <!-- Estado escribiendo... -->
            <div id="judith-status" style="display:none; padding: 5px 15px; font-size: 12px; color: #666; font-style: italic;">
                Judith está escribiendo...
            </div>

            <!-- Input -->
            <div style="padding: 10px; border-top: 1px solid #eee; display: flex; background: white;">
                <input type="text" id="user-input" placeholder="Escribe aquí..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; outline: none;">
                <button id="send-btn" style="margin-left: 5px; padding: 0 15px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer;">➤</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);

    // ==========================================
    // 2. EVENTOS (CLICKS Y TECLAS)
    // ==========================================

    const launcher = document.getElementById('judith-launcher');
    const modal = document.getElementById('judith-modal');
    const closeBtn = document.getElementById('close-judith');
    const sendBtn = document.getElementById('send-btn');
    const input = document.getElementById('user-input');

    // Abrir chat
    launcher.addEventListener('click', () => {
        modal.style.display = 'flex';
        launcher.style.display = 'none'; // Ocultar botón al abrir
        input.focus();
    });

    // Cerrar chat
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        launcher.style.display = 'flex'; // Mostrar botón de nuevo
    });

    // Enviar mensaje
    sendBtn.addEventListener('click', handleUserMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserMessage();
    });
}

// ==========================================
// 3. LÓGICA DE ENVÍO Y RESPUESTA
// ==========================================

async function handleUserMessage() {
    const input = document.getElementById('user-input');
    const contentDiv = document.getElementById('judith-content');
    const statusDiv = document.getElementById('judith-status');
    const userText = input.value.trim();

    if (!userText) return;

    // 1. Pintar mensaje usuario
    addMessageToChat(userText, 'user');
    input.value = '';

    // 2. Mostrar "Escribiendo..."
    statusDiv.style.display = 'block';
    contentDiv.scrollTop = contentDiv.scrollHeight;

    try {
        // 3. Llamar a la API
        const responseText = await getOpenAIResponse(userText);
        
        // 4. Pintar respuesta Judith
        addMessageToChat(responseText, 'judith');
        
        // 5. Hablar
        speakText(responseText);

    } catch (error) {
        console.error("Error API:", error);
        addMessageToChat("Lo siento, tengo un problema de conexión. Inténtalo de nuevo.", 'judith');
    } finally {
        statusDiv.style.display = 'none';
        contentDiv.scrollTop = contentDiv.scrollHeight;
    }
}

function addMessageToChat(text, sender) {
    const contentDiv = document.getElementById('judith-content');
    const div = document.createElement('div');
    
    // Estilos según quien habla
    if (sender === 'user') {
        div.style.background = "#dcf8c6"; // Verde tipo WhatsApp
        div.style.alignSelf = "flex-end";
        div.style.marginLeft = "20%";
        div.innerHTML = `${text}`;
    } else {
        div.style.background = "white";
        div.style.border = "1px solid #eee";
        div.style.marginRight = "20%";
        div.innerHTML = `<b>👩‍💼 Judith:</b><br>${text}`;
    }

    div.style.padding = "10px";
    div.style.borderRadius = "8px";
    div.style.marginBottom = "10px";
    div.style.wordWrap = "break-word";

    contentDiv.appendChild(div);
}

// ==========================================
// 4. CONEXIÓN API (CEREBRO)
// ==========================================

async function getOpenAIResponse(userMessage) {
    if (API_KEY.includes("TU_CLAVE")) {
        return "⚠️ Error: Necesitas poner tu API KEY en el archivo judith.js (línea 7).";
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userMessage }
            ],
            temperature: 0.7
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

// ==========================================
// 5. VOZ (ESPAÑOL DE ESPAÑA)
// ==========================================

function speakText(text) {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Parar si ya habla
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configuración para España
    utterance.lang = 'es-ES'; 
    utterance.rate = 1.1; 
    utterance.pitch = 1.1;

    // Buscar voz específica de Google o Microsoft si hay
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang === 'es-ES' && (v.name.includes('Google') || v.name.includes('Microsoft')));
    
    if (esVoice) utterance.voice = esVoice;

    window.speechSynthesis.speak(utterance);
}

// INICIALIZAR
document.addEventListener('DOMContentLoaded', createJudithUI);
// Ejecutar también por si el DOM ya estaba listo
createJudithUI();