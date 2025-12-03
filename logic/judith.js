// logic/judith.js

// --- 1. CONFIGURACIÓN ---
// Si quieres dejarla fija, escríbela dentro de las comillas.
const HARDCODED_KEY = ""; 

const SYSTEM_PROMPT = `
Eres Judith, la asistente comercial de "CV Tools".
PERSONALIDAD:
- Eres una mujer joven, simpática, con mucha chispa y naturalidad española.
- Te encanta charlar. Si te preguntan "qué tal", responde con gracia y cercanía.
- Trata al usuario como a un compañero de trabajo de confianza.

REGLAS DE TRABAJO (CUANDO PIDEN DATOS):
1. STOCK:
   - NUNCA digas el número exacto.
   - Si > 10: "Sí, vamos sobrados".
   - Si 1-10: "Queda muy poco, ten cuidado".
   - Si 0: "Nada, está agotadísimo".
2. PRECIOS:
   - Di el precio estándar si no especifican cliente.
   
IMPORTANTE PARA EL AUDIO:
- NO uses emojis nunca (quedan mal al leerlos).
- Usa frases cortas y habladas. Evita listas largas.
`;

// --- VARIABLES ---
let apiKey = localStorage.getItem('openai_apikey') || HARDCODED_KEY;
let productsDB = []; 
let stockMap = new Map();

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
let isListening = false;
let audioPlayer = new Audio(); // Reproductor de audio HD

// Elementos DOM
let fab, modal, content, statusDiv;

// --- INICIALIZACIÓN ---
// Usamos "load" en vez de DOMContentLoaded para asegurar que todo el CSS está listo
window.addEventListener('load', async () => {
    createJudithUI(); // Crear el botón visualmente
    
    // Referencias a elementos
    fab = document.getElementById('judith-fab');
    modal = document.getElementById('judith-modal');
    content = document.getElementById('judith-content');
    statusDiv = document.getElementById('judith-status');

    // Cargar datos en segundo plano
    await loadStructuredData();

    // Configuración Voz (Oído)
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
        
        // Comprobar Clave antes de seguir
        if (!checkApiKey()) return;

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
        if (!checkApiKey()) return; // Si no hay clave, la pide y para.

        if (isListening) {
            recognition.stop();
        } else {
            // Parar audio si está sonando
            if (!audioPlayer.paused) audioPlayer.pause();
            
            modal.classList.add('active');
            try { recognition.start(); } catch(e) { 
                console.error(e);
                alert("Error al iniciar el micrófono. Revisa los permisos.");
            }
        }
    });

    document.getElementById('close-judith').addEventListener('click', () => {
        modal.classList.remove('active');
        recognition.stop();
        if (!audioPlayer.paused) audioPlayer.pause();
    });
});

// --- UI INJECTION (ESTO HACE QUE APAREZCA EL BOTÓN) ---
function createJudithUI() {
    // Si ya existe, no lo creamos otra vez
    if(document.getElementById('judith-fab')) return;

    const container = document.createElement('div');
    container.innerHTML = `
        <div id="judith-fab" title="Hablar con Judith">
            <span>👩‍💼</span>
        </div>
        
        <div id="judith-modal" class="judith-modal">
            <div class="judith-header">
                <span>👩‍💼 Judith IA</span>
                <span id="close-judith" style="cursor:pointer; font-size:1.5rem;">&times;</span>
            </div>
            <div id="judith-content" class="judith-content">
                <div class="chat-msg msg-judith">¡Hola! Soy Judith. ¿Charlamos o trabajamos? 😉</div>
            </div>
            <div id="judith-status" class="judith-status">Cargando datos...</div>
        </div>
    `;
    document.body.appendChild(container);
    console.log("Judith UI creada correctamente");
}

// --- GESTIÓN DE CLAVE API ---
function checkApiKey() {
    if (!apiKey || apiKey.length < 10) {
        const inputKey = prompt("🔑 Judith necesita tu API Key de OpenAI para hablar con voz real:\n(Empieza por sk-...)");
        if (inputKey && inputKey.startsWith("sk-")) {
            apiKey = inputKey;
            localStorage.setItem('openai_apikey', inputKey);
            alert("¡Clave guardada! Pulsa el micro otra vez.");
            return true;
        } else {
            alert("Clave no válida. Judith no puede funcionar.");
            return false;
        }
    }
    return true;
}

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
        
        if(statusDiv) statusDiv.textContent = "✅ Judith Lista";

    } catch (error) {
        console.error(error);
        if(statusDiv) statusDiv.textContent = "❌ Error Datos";
    }
}

// --- BUSCADOR INTELIGENTE ---
function findRelevantProducts(query) {
    const cleanQuery = query.toLowerCase();
    
    // Detectar intención de búsqueda
    const searchIntention = cleanQuery.length > 3 && (
        productsDB.some(p => cleanQuery.includes(String(p.Referencia).toLowerCase())) || 
        productsDB.some(p => cleanQuery.includes(String(p.Descripcion).toLowerCase().substring(0, 10))) ||
        cleanQuery.includes("precio") || 
        cleanQuery.includes("stock") || 
        cleanQuery.includes("tienes") || 
        cleanQuery.includes("queda") ||
        cleanQuery.includes("vale")
    );

    if (!searchIntention) return null; 

    const terms = cleanQuery.split(' ').filter(t => t.length > 2);
    const matches = productsDB.filter(p => {
        const desc = (p.Descripcion || "").toLowerCase();
        const ref = String(p.Referencia || "").toLowerCase();
        return terms.some(term => desc.includes(term) || ref.includes(term));
    });

    const topMatches = matches.slice(0, 10);
    if (topMatches.length === 0) return null; 

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

// --- CONEXIÓN CON OPENAI (CHAT + AUDIO) ---
async function askOpenAI(userText, contextData, isWorkMode) {
    const temp = isWorkMode ? 0.2 : 0.9; // Más creativa si charlamos
    
    const messages = [
        { role: "system", content: SYSTEM_PROMPT }
    ];

    if (isWorkMode) {
        messages.push({ role: "system", content: "El usuario pregunta por:\n" + contextData });
    }

    messages.push({ role: "user", content: userText });

    try {
        // 1. OBTENER RESPUESTA DE TEXTO
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
        
        if (data.error) throw new Error(data.error.message);

        const reply = data.choices[0].message.content;
        addMessage(reply, 'judith');
        
        // 2. GENERAR AUDIO DE CALIDAD (NOVA)
        await speakHighQuality(reply);
        
        updateStatus("💤 Esperando...");

    } catch (error) {
        addMessage("Error: " + error.message, 'judith');
        updateStatus("❌ Error");
    }
}

// --- SÍNTESIS DE VOZ HD (OPENAI AUDIO) ---
async function speakHighQuality(text) {
    updateStatus("🔊 Generando voz...");
    
    // Limpieza de emojis
    const cleanText = text.replace(/[*_#]/g, '').replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "tts-1",
                input: cleanText,
                voice: "nova" // Voz simpática y humana
            })
        });

        if (!response.ok) throw new Error("Error generando audio");

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        
        audioPlayer.src = audioUrl;
        audioPlayer.play();
        
        updateStatus("🗣️ Hablando...");

        audioPlayer.onended = () => {
            updateStatus("💤 Esperando...");
        };

    } catch (error) {
        console.error("Error Audio:", error);
        // Fallback si falla la voz HD
        const synth = window.speechSynthesis;
        const u = new SpeechSynthesisUtterance(cleanText);
        u.lang = "es-ES";
        synth.speak(u);
    }
}

// --- HELPER UI ---
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