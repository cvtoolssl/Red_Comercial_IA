// logic/judith.js

// --- CONFIGURACIÓN ---
const SYSTEM_PROMPT = `
Eres Judith, la asistente virtual de la empresa comercial "CV Tools".
Tu personalidad es: Femenina, muy simpática, eficiente y profesional.
Usas emojis ocasionalmente para ser amable.
Tu objetivo es ayudar al comercial con Stocks y Precios.
IMPORTANTE:
1. Si te preguntan por Stock, NUNCA digas la cantidad exacta. Solo di "Sí, tenemos suficiente" o "Queda poco, cuidado". Si hay 0, di "No hay stock".
2. Si te preguntan precios, pregunta siempre "¿Para qué tipo de tarifa?".
3. Sé breve en tus respuestas orales.
`;

// --- VARIABLES ---
let apiKey = localStorage.getItem('openai_apikey');
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
const synth = window.speechSynthesis;
let isListening = false;

// Elementos del DOM (se cargarán al iniciar)
let fab, modal, content, statusDiv;

document.addEventListener('DOMContentLoaded', () => {
    createJudithUI(); // Crear elementos si no existen en HTML
    
    fab = document.getElementById('judith-fab');
    modal = document.getElementById('judith-modal');
    content = document.getElementById('judith-content');
    statusDiv = document.getElementById('judith-status');

    // Configuración Reconocimiento de Voz
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    // Eventos Voz
    recognition.onstart = () => {
        isListening = true;
        fab.classList.add('listening-pulse');
        updateStatus("👂 Escuchando...");
    };

    recognition.onend = () => {
        isListening = false;
        fab.classList.remove('listening-pulse');
        // Si no habló, volvemos a reposo. Si habló, onresult se encarga.
    };

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        addMessage(transcript, 'user');
        updateStatus("🧠 Pensando...");
        
        // Llamada a la IA
        await askOpenAI(transcript);
    };

    // Click en el botón
    fab.addEventListener('click', () => {
        if (!apiKey) {
            askForKey();
            return;
        }
        
        if (isListening) {
            recognition.stop();
        } else {
            // Abrir modal y escuchar
            modal.classList.add('active');
            try {
                recognition.start();
            } catch(e) { console.error(e); }
        }
    });

    // Cerrar modal
    document.getElementById('close-judith').addEventListener('click', () => {
        modal.classList.remove('active');
        recognition.stop();
        synth.cancel(); // Callar si está hablando
    });
});

// --- FUNCIONES LÓGICAS ---

function askForKey() {
    const key = prompt("⚠️ Configuración Inicial ⚠️\n\nIntroduce tu API KEY de OpenAI para activar a Judith.\n(Se guardará en tu móvil y no será visible para nadie).");
    if (key && key.startsWith('sk-')) {
        localStorage.setItem('openai_apikey', key);
        apiKey = key;
        alert("¡Clave guardada! Pulsa el micro de nuevo para hablar con Judith.");
    } else {
        alert("Clave no válida. Judith no puede funcionar sin cerebro 🧠.");
    }
}

async function askOpenAI(userText) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // Modelo rápido y barato
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    // AQUÍ EN LA FASE 2 INYECTAREMOS EL JSON DE STOCKS
                    { role: "user", content: userText }
                ],
                max_tokens: 150
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const reply = data.choices[0].message.content;
        addMessage(reply, 'judith');
        speak(reply);
        updateStatus("💤 Esperando...");

    } catch (error) {
        addMessage("Error: " + error.message, 'judith');
        updateStatus("❌ Error de conexión");
    }
}

// --- SÍNTESIS DE VOZ (JUDITH HABLA) ---
function speak(text) {
    if (synth.speaking) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.1; // Un pelín rápido para ser eficiente
    utterance.pitch = 1.1; // Un poco agudo (femenino)

    // Intentar buscar voz femenina de Google o del sistema
    const voices = synth.getVoices();
    const femaleVoice = voices.find(v => v.lang.includes('es') && (v.name.includes('Google') || v.name.includes('Female')));
    if (femaleVoice) utterance.voice = femaleVoice;

    synth.speak(utterance);
}

// --- UTILIDADES UI ---
function addMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('chat-msg', sender === 'user' ? 'msg-user' : 'msg-judith');
    div.textContent = text;
    content.appendChild(div);
    content.scrollTop = content.scrollHeight;
}

function updateStatus(text) {
    statusDiv.textContent = text;
}

function createJudithUI() {
    // Inyectamos el HTML necesario dinámicamente para no ensuciar tu index.html
    const container = document.createElement('div');
    container.innerHTML = `
        <div id="judith-fab" title="Hablar con Judith">
            <span style="font-size: 30px;">👩‍💼</span>
        </div>
        
        <div id="judith-modal" class="judith-modal">
            <div class="judith-header">
                <span>👩‍💼 Judith IA</span>
                <span id="close-judith" style="cursor:pointer;">&times;</span>
            </div>
            <div id="judith-content" class="judith-content">
                <div class="chat-msg msg-judith">¡Hola! Soy Judith. Toca el micro para hablar.</div>
            </div>
            <div id="judith-status" class="judith-status">💤 Esperando...</div>
        </div>
    `;
    document.body.appendChild(container);
}