// ==========================================
// CONFIGURACIÓN DE JUDITH
// ==========================================

// ¡IMPORTANTE! Pega aquí tu clave, pero ten cuidado al subir esto a GitHub.
// Si el repo es público, GitHub te bloqueará. Lo ideal es usar variables de entorno,
// pero para este archivo local, pégala dentro de las comillas.
const API_KEY = "sk-TU_CLAVE_DE_OPENAI_AQUI"; 

const SYSTEM_PROMPT = `
Eres Judith, la asistente comercial virtual experta en publicidad y marketing.

PERSONALIDAD Y TONO:
- Tu idioma es ESPAÑOL DE ESPAÑA (Castellano neutro). 
- Eres simpática, educada y muy profesional.
- Usas expresiones como: "Fenomenal", "Estupendo", "Enseguida te lo miro", "Claro que sí".
- PROHIBIDO: Usar jerga latina, tutear excesivamente si no hay confianza, o frases arrogantes como "vamos sobrados". Sé humilde y servicial.
- Objetivo: Ayudar al cliente a encontrar la mejor solución publicitaria.

DICCIONARIO DE PRODUCTOS (MUY IMPORTANTE):
1. Tienes los archivos json adjuntos. Limítate a buscar por descripción  o referencia lo que te preguntan y da la información

INSTRUCCIÓN:
Si te preguntan por cualquier producto pregunta para que tarifa quieres el precio e informa de si hay stock o no sin decir nunca la cantidad. 
`;

// ==========================================
// LÓGICA DE LA INTERFAZ (UI)
// ==========================================

function createJudithUI() {
    // Evitar duplicados si ya existe
    if (document.getElementById('judith-modal')) return;

    const modalHTML = `
    <div id="judith-modal" class="judith-modal">
        <div class="judith-header">
            <span>👩‍💼 Judith IA</span>
            <span id="close-judith" style="cursor:pointer; font-size:1.5rem;">&times;</span>
        </div>
        <div id="judith-content" class="judith-content">
            <div class="chat-msg msg-judith">¡Hola! Soy Judith, tu compañera. ¿Qué necesitas hoy?</div>
        </div>
        
        <!-- Área de entrada de texto -->
        <div class="judith-input-area" style="padding: 10px; display: flex; gap: 5px; border-top: 1px solid #ccc;">
            <input type="text" id="user-input" placeholder="Escribe aquí..." style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
            <button id="send-btn" style="padding: 8px 15px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer;">➤</button>
        </div>

        <div id="judith-status" class="judith-status" style="display:none; padding: 5px; font-size: 0.8em; color: gray;">Judith está escribiendo...</div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Event Listeners
    document.getElementById('close-judith').addEventListener('click', () => {
        document.getElementById('judith-modal').style.display = 'none';
    });

    const sendBtn = document.getElementById('send-btn');
    const input = document.getElementById('user-input');

    sendBtn.addEventListener('click', handleUserMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserMessage();
    });
}

// ==========================================
// LÓGICA DEL CHAT
// ==========================================

async function handleUserMessage() {
    const input = document.getElementById('user-input');
    const contentDiv = document.getElementById('judith-content');
    const statusDiv = document.getElementById('judith-status');
    const userText = input.value.trim();

    if (!userText) return;

    // 1. Mostrar mensaje del usuario
    appendMessage(userText, 'msg-user', '👤');
    input.value = '';
    
    // 2. Mostrar estado "Cargando..."
    statusDiv.style.display = 'block';

    try {
        // 3. Llamada a OpenAI
        const responseText = await getOpenAIResponse(userText);
        
        // 4. Mostrar respuesta de Judith
        appendMessage(responseText, 'msg-judith', '👩‍💼');
        
        // 5. Hablar (TTS)
        speakText(responseText);

    } catch (error) {
        console.error(error);
        appendMessage("Lo siento, he tenido un problema de conexión. ¿Puedes repetirlo?", 'msg-judith', '⚠️');
    } finally {
        statusDiv.style.display = 'none';
    }
}

function appendMessage(text, className, icon) {
    const contentDiv = document.getElementById('judith-content');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${className}`;
    msgDiv.style.margin = "10px 0";
    msgDiv.style.padding = "10px";
    msgDiv.style.borderRadius = "8px";
    
    // Estilos básicos para diferenciar (puedes moverlos al CSS)
    if (className === 'msg-user') {
        msgDiv.style.background = "#e3f2fd";
        msgDiv.style.textAlign = "right";
        msgDiv.innerHTML = `${text} ${icon}`;
    } else {
        msgDiv.style.background = "#f5f5f5";
        msgDiv.style.textAlign = "left";
        msgDiv.innerHTML = `${icon} ${text}`;
    }

    contentDiv.appendChild(msgDiv);
    contentDiv.scrollTop = contentDiv.scrollHeight; // Auto-scroll
}

// ==========================================
// CONEXIÓN CON API (CEREBRO)
// ==========================================

async function getOpenAIResponse(userMessage) {
    if (API_KEY.includes("TU_CLAVE")) {
        return "¡Oye! Parece que falta configurar mi API Key en el código. Avísale al programador.";
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo", // O gpt-4 si tienes acceso y presupuesto
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userMessage }
            ],
            temperature: 0.7, // Creatividad equilibrada
            max_tokens: 150
        })
    });

    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error.message);
    }
    
    return data.choices[0].message.content;
}

// ==========================================
// VOZ (TEXT TO SPEECH) - ESPAÑOL DE ESPAÑA
// ==========================================

function speakText(text) {
    if (!('speechSynthesis' in window)) return;

    // Cancelar si ya estaba hablando
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configuración de la voz
    utterance.lang = 'es-ES'; // Forzar Español de España
    utterance.rate = 1.1;     // Un pelín más rápido para que sea dinámico
    utterance.pitch = 1.1;    // Un tono un poco más agudo (más femenino/amable)

    // Intentar buscar una voz específica de Google o Microsoft si existe
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(voice => 
        (voice.lang === 'es-ES' && voice.name.includes('Google')) || 
        (voice.lang === 'es-ES' && voice.name.includes('Microsoft')) ||
        voice.lang === 'es-ES'
    );

    if (spanishVoice) {
        utterance.voice = spanishVoice;
    }

    window.speechSynthesis.speak(utterance);
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', createJudithUI);
// Por si acaso carga antes el script que el DOM
createJudithUI();