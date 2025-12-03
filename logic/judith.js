// logic/judith.js

// --- 1. CONFIGURACIÓN ---
// 👇👇👇 ¡¡PEGA AQUÍ TU CLAVE!! 👇👇👇
const HARDCODED_KEY = "sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"; 

const SYSTEM_PROMPT = `
Eres Judith, la asistente comercial de "CV Tools".
PERSONALIDAD:
- Eres mujer, simpática, alegre y con sentido del humor.
- Te encanta dar conversación. Si te saludan o preguntan qué tal, responde con naturalidad y simpatía (ej: "¡Aquí estoy, lista para venderlo todo! ¿Y tú qué tal?").
- NO eres un robot aburrido. Eres una compañera de trabajo eficiente pero con chispa.

REGLAS DE TRABAJO (CUANDO PIDEN DATOS):
1. STOCK:
   - NUNCA digas el número exacto. 
   - Si hay > 10: "Sí, tenemos de sobra".
   - Si hay 1-10: "Queda poquito, ojo".
   - Si hay 0: "Nada, está agotado".
2. PRECIOS:
   - Da el precio estándar si no especifican cliente.

REGLAS DE HABLA:
- PROHIBIDO EMOJIS (El lector los lee mal).
- Usa frases cortas y naturales.
- Si no encuentras un producto, dilo con naturalidad: "Oye, pues eso no me suena que lo tengamos".
`;

// --- VARIABLES ---
let apiKey = HARDCODED_KEY; 
let productsDB = []; 
let stockMap = new Map();

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
const synth = window.speechSynthesis;
let isListening = false;

// Elementos DOM
let fab, modal, content, statusDiv;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    createJudithUI(); 
    
    fab = document.getElementById('judith-fab');
    modal = document.getElementById('judith-modal');
    content = document.getElementById('judith-content');
    statusDiv = document.getElementById('judith-status');

    await loadStructuredData();

    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        isListening = true;
        fab.classList.add('listening-pulse');
        updateStatus("👂 Escuchando...");
    };

    recognition.onend = () => {
        isListening = false;
        fab.classList.remove('listening-pulse');
    };

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        addMessage(transcript, 'user');
        
        // Decidimos si es trabajo o charla
        const productContext = findRelevantProducts(transcript);
        
        if (productContext) {
            updateStatus("🧠 Consultando catálogo...");
            await askOpenAI(transcript, productContext, true); // Modo Trabajo
        } else {
            updateStatus("💬 Charlando...");
            await askOpenAI(transcript, "", false); // Modo Charla
        }
    };

    fab.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            if (synth.speaking) synth.cancel();
            modal.classList.add('active');
            try { recognition.start(); } catch(e) { console.error(e); }
        }
    });

    document.getElementById('close-judith').addEventListener('click', () => {
        modal.classList.remove('active');
        recognition.stop();
        synth.cancel();
    });
});

// --- CARGA DE DATOS ---
async function loadStructuredData() {
    try {
        const [resTarifa, resStock] = await Promise.all([
            fetch(`src/Tarifa_General.json?v=${new Date().getTime()}`),
            fetch(`src/Stock.json?v=${new Date().getTime()}`)
        ]);

        if (!resTarifa.ok || !resStock.ok) throw new Error("Error JSON");

        const dataStock = await resStock.json();
        (dataStock.Stock || []).forEach(item => {
            stockMap.set(String(item.Artículo), item);
        });

        const dataTarifa = await resTarifa.json();
        if (Array.isArray(dataTarifa)) {
            productsDB = dataTarifa;
        } else {
            productsDB = dataTarifa[Object.keys(dataTarifa)[0]];
        }
        
        updateStatus("✅ Judith Lista");
        console.log("Judith: Memoria cargada.");

    } catch (error) {
        console.error(error);
        updateStatus("❌ Error Datos");
    }
}

// --- BUSCADOR INTELIGENTE (Detecta si hay intención de compra) ---
function findRelevantProducts(query) {
    const cleanQuery = query.toLowerCase();
    
    // Lista de palabras "gatillo" para saber si busca productos
    // Si la frase no tiene una intención clara de búsqueda o palabras de catálogo, asumimos charla.
    const searchIntention = cleanQuery.length > 3 && (
        productsDB.some(p => cleanQuery.includes(String(p.Referencia).toLowerCase())) || 
        productsDB.some(p => cleanQuery.includes(String(p.Descripcion).toLowerCase().substring(0, 10))) ||
        cleanQuery.includes("precio") || 
        cleanQuery.includes("stock") || 
        cleanQuery.includes("tienes") || 
        cleanQuery.includes("queda") ||
        cleanQuery.includes("vale")
    );

    if (!searchIntention) return null; // Es charla pura

    const terms = cleanQuery.split(' ').filter(t => t.length > 2);
    const matches = productsDB.filter(p => {
        const desc = (p.Descripcion || "").toLowerCase();
        const ref = String(p.Referencia || "").toLowerCase();
        return terms.some(term => desc.includes(term) || ref.includes(term));
    });

    const topMatches = matches.slice(0, 10);
    
    if (topMatches.length === 0) return null; // No encontró nada, pasamos a modo charla genérica

    let contextText = "DATOS DEL CATÁLOGO:\n";
    topMatches.forEach(p => {
        const ref = String(p.Referencia);
        const stockInfo = stockMap.get(ref);
        let stockTxt = "Sin datos";
        if (stockInfo) {
            stockTxt = `${stockInfo.Stock || 0} uds (Estado: ${stockInfo.Estado})`;
        }
        contextText += `- Ref: ${ref} | ${p.Descripcion} | PVP: ${p.PRECIO_ESTANDAR}€ | Stock: ${stockTxt}\n`;
    });

    return contextText;
}

// --- CONEXIÓN CON OPENAI ---
async function askOpenAI(userText, contextData, isWorkMode) {
    if (!apiKey || apiKey.includes("XXX")) {
        speak("Necesito que configures mi clave API.");
        return;
    }

    // Si es modo charla, subimos la temperatura para que sea más creativa.
    // Si es modo trabajo, la bajamos para que no invente precios.
    const temp = isWorkMode ? 0.2 : 0.8; 
    
    // Si es modo charla, no inyectamos datos de productos para no confundirla
    const messages = [
        { role: "system", content: SYSTEM_PROMPT }
    ];

    if (isWorkMode) {
        messages.push({ role: "system", content: "El usuario pregunta por estos productos:\n" + contextData });
    }

    messages.push({ role: "user", content: userText });

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: messages,
                max_tokens: 150,
                temperature: temp 
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content;
        
        addMessage(reply, 'judith');
        speak(reply);
        updateStatus("💤 Esperando...");

    } catch (error) {
        addMessage("Error de conexión...", 'judith');
    }
}

// --- SÍNTESIS DE VOZ (Intentando que sea menos robótica) ---
function speak(text) {
    if (synth.speaking) synth.cancel();
    
    // 1. Limpieza radical de texto
    const cleanText = text.replace(/[*_#]/g, '').replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    
    // TRUCO: Un poco más de velocidad suele disimular lo robótico
    utterance.rate = 1.1; 
    // TRUCO: Tono ligeramente agudo para voz femenina
    utterance.pitch = 1.2; 

    // Selección de voz: Buscamos "Google" que suele ser la más natural en Android
    const voices = synth.getVoices();
    const preferredVoice = voices.find(v => 
        (v.lang.includes('es') && v.name.includes('Google')) || 
        (v.lang.includes('es') && v.name.includes('Microsoft'))
    );
    
    if (preferredVoice) utterance.voice = preferredVoice;

    synth.speak(utterance);
}

// --- UI ---
function addMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('chat-msg', sender === 'user' ? 'msg-user' : 'msg-judith');
    div.textContent = text;
    content.appendChild(div);
    content.scrollTop = content.scrollHeight;
}

function updateStatus(text) {
    if(statusDiv) statusDiv.textContent = text;
}

function createJudithUI() {
    if(document.getElementById('judith-fab')) return;
    const container = document.createElement('div');
    container.innerHTML = `
        <div id="judith-fab"><span style="font-size: 30px;">👩‍💼</span></div>
        <div id="judith-modal" class="judith-modal">
            <div class="judith-header">
                <span>👩‍💼 Judith IA</span>
                <span id="close-judith" style="cursor:pointer; font-size:1.5rem;">&times;</span>
            </div>
            <div id="judith-content" class="judith-content">
                <div class="chat-msg msg-judith">¡Hola! ¿Charlamos un rato o trabajamos? 😉</div>
            </div>
            <div id="judith-status" class="judith-status">Cargando...</div>
        </div>
    `;
    document.body.appendChild(container);
}