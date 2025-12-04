console.log("🔄 Cargando Judith v9.0 (Fix Estructuras + Búsqueda)...");

// ==========================================
// 1. CONFIGURACIÓN Y RUTAS
// ==========================================

// ⚠️ Tu API KEY (Opcional, si la dejas vacía la pedirá al usuario)
const API_KEY_HARDCODED = ""; 

// 📂 TUS ARCHIVOS (Rutas relativas desde index.html)
const FILES_TO_LOAD = [
    'src/Stock.json',
    'src/Tarifa_General.json',
    'src/Tarifa_Big_mat.json',
    'src/Tarifa_Cecofersa.json',
    'src/Tarifa_Coferdroza.json',
    'src/Tarifa_Ehlis.json',
    'src/Tarifa_Grandes_Cuentas.json',
    'src/Tarifa_Industrial_Pro.json',
    'src/Tarifa_neopro.json',
    'src/Tarifa_Synergas.json'
];

let GLOBAL_DATA = [];
let chatHistory = [];

// ==========================================
// 2. CARGA DE DATOS (CATÁLOGO COMPLETO)
// ==========================================

async function loadAllData() {
    console.log("📂 Iniciando carga de base de datos...");
    const statusDiv = document.getElementById('judith-status');
    if(statusDiv) { statusDiv.style.display = 'block'; statusDiv.innerText = "Cargando catálogo..."; }

    try {
        const promises = FILES_TO_LOAD.map(file => 
            fetch(file)
                .then(res => {
                    if (!res.ok) return {}; 
                    return res.json();
                })
                .then(data => {
                    const key = Object.keys(data)[0]; 
                    const arrayData = data[key];
                    if (Array.isArray(arrayData)) {
                        // Añadimos origen para que la IA sepa de qué tarifa viene
                        return arrayData.map(item => ({ ...item, _origen: file }));
                    }
                    return [];
                })
                .catch(err => [])
        );

        const results = await Promise.all(promises);
        GLOBAL_DATA = results.flat();
        
        console.log(`✅ Base de datos lista: ${GLOBAL_DATA.length} productos.`);
        if(statusDiv) { statusDiv.style.display = 'none'; }

    } catch (error) {
        console.error("Error cargando datos:", error);
    }
}

// ==========================================
// 3. MOTOR DE BÚSQUEDA
// ==========================================

function findRelevantData(userQuery) {
    if (!GLOBAL_DATA.length) return null;
    const q = userQuery.toLowerCase();
    
    // Palabras a ignorar para buscar mejor
    const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'que', 'precio', 'stock', 'tienes', 'cuanto', 'vale', 'quiero', 'necesito', 'hola', 'por', 'favor'];
    
    // Sacamos las palabras clave reales (ej: "cartel", "salida")
    // NOTA: He quitado "detalles" y "especifica" de stopWords para que intente buscar si el usuario insiste,
    // aunque la clave está en el prompt del sistema.
    const searchTerms = q.split(' ').filter(word => word.length > 2 && !stopWords.includes(word));

    // Si no hay palabras clave (ej: el usuario solo dice "dame más detalles"), 
    // devolvemos null para que la IA tire de memoria.
    if (searchTerms.length === 0) return null;

    // Buscamos coincidencias
    const results = GLOBAL_DATA.filter(item => {
        const itemString = JSON.stringify(item).toLowerCase();
        return searchTerms.every(term => itemString.includes(term));
    });

    return results.slice(0, 15); // Devolvemos hasta 15 resultados
}

// ==========================================
// 4. API KEY
// ==========================================
function getApiKey() {
    if (API_KEY_HARDCODED) return API_KEY_HARDCODED;
    let key = sessionStorage.getItem("OPENAI_API_KEY");
    if (!key || key === "null") {
        key = prompt("🔑 Introduce tu API Key de OpenAI:");
        if (key) sessionStorage.setItem("OPENAI_API_KEY", key.trim());
    }
    return key;
}

// ==========================================
// 5. CEREBRO IA (System Prompt Revisado)
// ==========================================
const SYSTEM_PROMPT = `
Eres Judith, comercial de señalización.

--- REGLAS DE ORO (CÚMPLELAS SIEMPRE) ---
1. **UBICACIÓN:** El botón de chat está a la izquierda.
2. **DATOS:** Recibirás un JSON con productos REALES basados en la búsqueda del usuario.
3. **NO ESPERES:** 
   - PROHIBIDO decir: "Déjame consultarlo", "Un momento", "Voy a mirar".
   - Tienes los datos delante. ¡DÁLOS YA!

--- INSTRUCCIONES DE ESTRUCTURA DE DATOS ---
A continuación te muestro EJEMPLOS de cómo son los datos. 
⚠️ ATENCIÓN: Estos datos de abajo son SOLO EJEMPLOS para que entiendas los nombres de las columnas (Claves). NO SON EL INVENTARIO REAL. El inventario real te llegará en el mensaje del sistema cuando el usuario busque algo.

**EJEMPLO DE ESTRUCTURA STOCK (NO USAR VALORES, SOLO VER CLAVES):**
{
  "Artículo": "(Código)", "Nombre artículo": "(Descripción)", "Stock": (Numero), "Estado": "no/fab/si"
}
NOTA SOBRE ESTADO:
- 'si': Se puede decir stock.
- 'no': Se puede decir stock.
- 'fab': Entrega 3-4 días aprox.
- 'fab2': Entrega 15 días aprox.

**EJEMPLO DE ESTRUCTURA TARIFAS (NO USAR VALORES, SOLO VER CLAVES):**
{
  "Referencia": "(Ref)", "Descripcion": "(Desc)", "PRECIO_ESTANDAR": (Num), "NETOS": (Num/Null)
}

--- REGLAS DE RESPUESTA ---
1. Si te preguntan PRECIO: Busca en el contexto que te paso. Prioriza "NETOS". Si no hay neto, da "PRECIO_ESTANDAR".
2. Si te preguntan STOCK: 
   - NUNCA digas el número exacto.
   - >50: "Hay de sobra".
   - <50: "Quedan pocas".
   - 0: "Agotado".
3. Si te piden DETALLES: Lee la descripción completa del producto que encontraste en el contexto.

Sé directa. No saludes en cada mensaje.
`;

// ==========================================
// 6. UI (IZQUIERDA)
// ==========================================

function initJudith() {
    if (document.getElementById('judith-wrapper')) return;
    createInterface();
    loadAllData();
    chatHistory = [{ role: "system", content: SYSTEM_PROMPT }];
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initJudith);
else initJudith();

function createInterface() {
    const wrapper = document.createElement('div');
    wrapper.id = 'judith-wrapper';
    
    // UI a la izquierda (Left)
    wrapper.innerHTML = `
        <div id="judith-launcher" style="
            position: fixed; bottom: 20px; left: 20px; width: 70px; height: 70px;
            background: linear-gradient(135deg, #0078d4, #005a9e);
            color: white; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 35px; cursor: pointer; z-index: 999999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 3px solid white;
            transition: transform 0.3s;
        ">👩‍💼</div>

        <div id="judith-modal" style="
            display: none; position: fixed; bottom: 100px; left: 20px;
            width: 380px; height: 600px; background: #fff;
            border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.25);
            z-index: 999999; flex-direction: column; overflow: hidden;
            font-family: 'Segoe UI', sans-serif; border: 1px solid #e1e4e8;
        ">
            <div style="background: #0078d4; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:24px;">👩‍💼</span>
                    <div>
                        <div style="font-weight:bold; font-size:16px;">Judith</div>
                        <div style="font-size:11px; opacity:0.9;">Comercial Virtual</div>
                    </div>
                </div>
                <span id="close-judith" style="cursor: pointer; font-size: 24px;">&times;</span>
            </div>

            <div id="judith-content" style="flex: 1; padding: 15px; overflow-y: auto; background: #f0f2f5;">
                <div style="background: white; padding: 12px; border-radius: 12px; margin-bottom: 10px; width: 85%; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                    👋 Hola. Catálogo cargado. ¿Qué referencia o producto buscamos?
                </div>
            </div>

            <div id="judith-status" style="display:none; padding: 8px; font-size: 11px; color: #666; text-align:center; background:#f0f2f5;">
                Consultando...
            </div>

            <div style="padding: 15px; background: white; border-top: 1px solid #eee; display: flex; gap: 8px; align-items: center;">
                <button id="mic-btn" style="width: 42px; height: 42px; background: #d83b01; color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 20px; display:flex; align-items:center; justify-content:center;">🎙️</button>
                <input type="text" id="user-input" placeholder="Pregunta..." style="flex: 1; padding: 12px; border: 1px solid #ccc; border-radius: 20px; outline: none; background: #f9f9f9;">
                <button id="send-btn" style="width: 42px; height: 42px; background: #0078d4; color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 18px; display:flex; align-items:center; justify-content:center;">➤</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    setupEvents();
}

function setupEvents() {
    const launcher = document.getElementById('judith-launcher');
    const modal = document.getElementById('judith-modal');
    const closeBtn = document.getElementById('close-judith');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const input = document.getElementById('user-input');

    launcher.addEventListener('click', () => {
        const apiKey = getApiKey();
        if(!apiKey) return;
        modal.style.display = 'flex';
        launcher.style.display = 'none';
        if (window.speechSynthesis) window.speechSynthesis.resume();
        input.focus();
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        launcher.style.display = 'flex';
        window.speechSynthesis.cancel();
    });

    const send = () => handleMessage();
    sendBtn.addEventListener('click', send);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') send(); });

    // Voz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        
        micBtn.addEventListener('click', () => {
            micBtn.style.background = '#00cc00'; 
            recognition.start();
        });

        recognition.onresult = (event) => {
            input.value = event.results[0][0].transcript;
            micBtn.style.background = '#d83b01';
            send();
        };
        recognition.onend = () => { micBtn.style.background = '#d83b01'; };
    } else {
        micBtn.style.display = 'none';
    }
}

// ==========================================
// 7. LÓGICA PRINCIPAL (Fluida)
// ==========================================

async function handleMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    addMsg(text, 'user');
    input.value = '';
    document.getElementById('judith-status').style.display = 'block';

    try {
        // 1. BÚSQUEDA
        const foundData = findRelevantData(text);
        
        let systemMsg = "";
        
        if (foundData && foundData.length > 0) {
            // Caso A: Datos encontrados
            console.log("📊 Datos encontrados (Top 15):", foundData);
            systemMsg = `[SISTEMA: El usuario busca esto. Te adjunto los datos REALES encontrados en la base de datos. RESPONDE USANDO ESTOS DATOS Y NO LOS EJEMPLOS DEL PROMPT]: ${JSON.stringify(foundData)}`;
        } else {
            // Caso B: Sin datos nuevos -> Memoria
            console.log("⚠️ No se encontraron datos nuevos, tirando de memoria.");
            systemMsg = `[SISTEMA: La búsqueda en la base de datos no arrojó resultados nuevos para esta frase. 
            - Si el usuario está pidiendo "más detalles" o "especificar" sobre lo anterior, USA TU MEMORIA del mensaje anterior y describe el producto a fondo.
            - Si pide un producto nuevo y no está en la base de datos, di que no te consta esa referencia.]`;
        }

        // Añadir contexto
        chatHistory.push({ role: "system", content: systemMsg });
        chatHistory.push({ role: "user", content: text });

        // Llamada
        const reply = await callOpenAI();
        chatHistory.push({ role: "assistant", content: reply });

        // Limpieza de memoria (Max 15)
        if (chatHistory.length > 15) chatHistory = [chatHistory[0], ...chatHistory.slice(-14)];

        addMsg(reply, 'judith');
        speak(reply);

    } catch (e) {
        console.error(e);
        addMsg("Error: " + e.message, 'judith');
    } finally {
        document.getElementById('judith-status').style.display = 'none';
    }
}

function addMsg(text, role) {
    const content = document.getElementById('judith-content');
    const div = document.createElement('div');
    const isUser = role === 'user';
    
    div.style.padding = '12px 16px';
    div.style.borderRadius = '18px';
    div.style.marginBottom = '8px';
    div.style.maxWidth = '85%';
    div.style.wordWrap = 'break-word';

    if (isUser) {
        div.style.background = '#0078d4';
        div.style.color = 'white';
        div.style.alignSelf = 'flex-end';
        div.style.marginLeft = 'auto';
        div.style.borderBottomRightRadius = '4px';
        div.innerText = text;
    } else {
        div.style.background = 'white';
        div.style.color = '#1c1e21';
        div.style.alignSelf = 'flex-start';
        div.style.marginRight = 'auto';
        div.style.borderBottomLeftRadius = '4px';
        div.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
        div.innerHTML = text.replace(/\n/g, '<br>');
    }
    content.appendChild(div);
    content.scrollTop = content.scrollHeight;
}

async function callOpenAI() {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Falta API Key");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: chatHistory,
            temperature: 0.2
        })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_]/g, '').replace(/https?:\/\/\S+/g, 'enlace');
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'es-ES';
    u.rate = 1.1; 
    const v = window.speechSynthesis.getVoices().find(v => v.lang === 'es-ES' && (v.name.includes('Google') || v.name.includes('Microsoft'))) || window.speechSynthesis.getVoices().find(v => v.lang.startsWith('es'));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
}