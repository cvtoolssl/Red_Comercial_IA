// logic/judith.js

// --- 1. CONFIGURACIÓN ---
// 👇👇👇 ¡¡PEGA AQUÍ TU CLAVE!! 👇👇👇
const HARDCODED_KEY = "sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"; 

const SYSTEM_PROMPT = `
Eres Judith, una operadora comercial seria y eficiente de "CV Tools".
TU MISIÓN: Dar datos de precio y stock leyendo la información que te paso.

REGLAS ABSOLUTAS (SI LAS ROMPES, FALLAS):
1. PROHIBIDO USAR EMOJIS. Ni uno solo. Texto plano estricto.
2. PROHIBIDO inventar datos. Si en la lista que te paso no está el producto, di "No encuentro ese producto".
3. LENGUAJE: Natural, hablado, breve. No hagas listas largas. Resume.

REGLAS DE NEGOCIO:
1. STOCK: 
   - Jamás digas el número exacto (ej: "40").
   - Si Stock > 10: Di "Sí, hay stock disponible".
   - Si Stock 1-10: Di "Quedan muy pocas unidades".
   - Si Stock 0: Di "Está agotado".
   - Si Estado "FAB": Di "Se fabrica bajo pedido".
2. PRECIOS:
   - Si te preguntan precio, di el PVP Estándar que te paso.
   - Si preguntan por un cliente (ej. BigMat) y no tienes ese dato específico, di el estándar.

ESTILO DE RESPUESTA:
No saludes siempre. Responde directo a la pregunta.
Ejemplo: "La valla ref 101 cuesta 20 euros y sí tenemos stock."
`;

// --- VARIABLES ---
let apiKey = HARDCODED_KEY; 
let productsDB = []; // Aquí guardaremos los objetos brutos, no texto
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

    // Cargar datos en memoria estructurada
    await loadStructuredData();

    // Configuración Voz
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
        updateStatus("🧠 Buscando datos...");
        
        // 1. FILTRADO PREVIO (El truco para que te entienda)
        const relevantContext = findRelevantProducts(transcript);
        
        // 2. CONSULTA A OPENAI CON DATOS FILTRADOS
        await askOpenAI(transcript, relevantContext);
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

// --- CARGA DE DATOS INTELIGENTE ---
async function loadStructuredData() {
    try {
        const [resTarifa, resStock] = await Promise.all([
            fetch(`src/Tarifa_General.json?v=${new Date().getTime()}`),
            fetch(`src/Stock.json?v=${new Date().getTime()}`)
        ]);

        if (!resTarifa.ok || !resStock.ok) throw new Error("Error JSON");

        // Guardar Stock en Mapa para acceso instantáneo
        const dataStock = await resStock.json();
        (dataStock.Stock || []).forEach(item => {
            stockMap.set(String(item.Artículo), item);
        });

        // Guardar Productos en Array
        const dataTarifa = await resTarifa.json();
        // Detectar estructura
        if (Array.isArray(dataTarifa)) {
            productsDB = dataTarifa;
        } else {
            productsDB = dataTarifa[Object.keys(dataTarifa)[0]];
        }
        
        updateStatus("✅ Datos listos");
        console.log("Judith: Base de datos cargada. Items:", productsDB.length);

    } catch (error) {
        console.error("Error Judith Data:", error);
        updateStatus("❌ Error Datos");
    }
}

// --- BUSCADOR INTERNO (EL FILTRO) ---
function findRelevantProducts(query) {
    // Si la consulta es un saludo genérico, no enviamos datos
    if (query.length < 3) return "No hay datos específicos. Es una charla general.";

    const terms = query.toLowerCase().split(' ').filter(t => t.length > 2); // Palabras de más de 2 letras
    
    // Buscamos productos que coincidan con alguna palabra clave
    const matches = productsDB.filter(p => {
        const desc = (p.Descripcion || "").toLowerCase();
        const ref = String(p.Referencia || "").toLowerCase();
        // Si la descripción o la ref contienen alguno de los términos hablados
        return terms.some(term => desc.includes(term) || ref.includes(term));
    });

    // Limitamos a los 10 mejores resultados para no saturar a la IA
    const topMatches = matches.slice(0, 15);

    if (topMatches.length === 0) return "No he encontrado productos en la base de datos que coincidan con lo que pide el usuario.";

    // Construimos el texto solo con lo relevante
    let contextText = "DATOS ENCONTRADOS RELACIONADOS CON LA PREGUNTA:\n";
    
    topMatches.forEach(p => {
        const ref = String(p.Referencia);
        const stockInfo = stockMap.get(ref);
        let stockTxt = "Sin datos de stock";
        
        if (stockInfo) {
            const qty = stockInfo.Stock || 0;
            const estado = stockInfo.Estado || "";
            stockTxt = `Cantidad: ${qty} (Estado: ${estado})`;
        }

        contextText += `- Ref: ${ref} | Desc: ${p.Descripcion} | Precio Estándar: ${p.PRECIO_ESTANDAR || 0}€ | Stock: ${stockTxt}\n`;
    });

    return contextText;
}

// --- IA ---
async function askOpenAI(userText, contextData) {
    if (!apiKey || apiKey.includes("XXX")) {
        speak("Falta la clave de configuración.");
        return;
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "system", content: contextData }, // Inyectamos solo los datos filtrados
                    { role: "user", content: userText }
                ],
                max_tokens: 100, // Respuesta corta
                temperature: 0.3 // Baja temperatura = Menos creativa, más precisa, menos emojis
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content;
        
        addMessage(reply, 'judith');
        speak(reply);
        updateStatus("💤 Esperando...");

    } catch (error) {
        addMessage("Error conexión IA", 'judith');
    }
}

// --- VOZ ---
function speak(text) {
    if (synth.speaking) synth.cancel();
    
    // Doble seguridad anti-emojis: Los borramos del texto antes de leer
    // Elimina rangos unicode de emojis
    const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    utterance.rate = 1.1; 
    
    const voices = synth.getVoices();
    const voice = voices.find(v => v.lang.includes('es') && (v.name.includes('Google') || v.name.includes('Microsoft')));
    if (voice) utterance.voice = voice;

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
                <span>Judith IA</span>
                <span id="close-judith" style="cursor:pointer; font-size:1.5rem;">&times;</span>
            </div>
            <div id="judith-content" class="judith-content">
                <div class="chat-msg msg-judith">Hola. ¿En qué te ayudo?</div>
            </div>
            <div id="judith-status" class="judith-status">Cargando datos...</div>
        </div>
    `;
    document.body.appendChild(container);
}