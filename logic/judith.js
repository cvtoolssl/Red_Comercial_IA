console.log("🔄 Cargando Judith v7.0 (Rutas SRC corregidas)...");

// ==========================================
// 1. CONFIGURACIÓN Y RUTAS DE ARCHIVOS
// ==========================================

// ⚠️ PEGA AQUÍ TU CLAVE SI NO QUIERES QUE TE LA PIDA
// O déjalo así y te la pedirá al abrir el chat.
const API_KEY_HARDCODED = ""; 

// 📂 LISTA DE TUS ARCHIVOS JSON (Rutas desde la raíz donde está index.html)
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

// Aquí guardaremos todos los datos cargados en memoria RAM
let GLOBAL_DATA = [];
let chatHistory = [];

// ==========================================
// 2. MOTOR DE CARGA DE DATOS (Big Data)
// ==========================================

async function loadAllData() {
    console.log("📂 Iniciando carga de base de datos desde carpeta SRC...");
    
    // Si la interfaz ya existe, mostramos estado
    const statusDiv = document.getElementById('judith-status');
    if(statusDiv) { statusDiv.style.display = 'block'; statusDiv.innerText = "Cargando catálogo..."; }

    try {
        const promises = FILES_TO_LOAD.map(file => 
            fetch(file)
                .then(res => {
                    if (!res.ok) throw new Error(`Error ${res.status} leyendo ${file}`);
                    return res.json();
                })
                .then(data => {
                    // Detectar la clave principal (ej: "Stock" o "Tarifa_General")
                    const key = Object.keys(data)[0]; 
                    const arrayData = data[key];
                    
                    if (Array.isArray(arrayData)) {
                        // Añadimos el origen para saber de qué archivo viene cada dato
                        return arrayData.map(item => ({ ...item, _origen: file }));
                    } else {
                        return [];
                    }
                })
                .catch(err => {
                    console.warn(`⚠️ No se pudo cargar ${file}. Verifica que el nombre y la ruta sean exactos.`, err);
                    return [];
                })
        );

        const results = await Promise.all(promises);
        
        // Aplanar: Convertimos lista de listas en una sola lista gigante
        GLOBAL_DATA = results.flat();
        
        console.log(`✅ Base de datos lista: ${GLOBAL_DATA.length} productos cargados.`);
        if(statusDiv) { statusDiv.style.display = 'none'; }

    } catch (error) {
        console.error("❌ Error crítico cargando datos:", error);
    }
}

// ==========================================
// 3. MOTOR DE BÚSQUEDA (El filtro inteligente)
// ==========================================

function findRelevantData(userQuery) {
    if (!GLOBAL_DATA.length) return null;

    const q = userQuery.toLowerCase();
    
    // Palabras que ignoramos para la búsqueda
    const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'que', 'precio', 'stock', 'tienes', 'cuanto', 'vale', 'quiero', 'necesito', 'hola'];
    
    // Extraemos palabras clave útiles (ej: "cartel flecha")
    const searchTerms = q.split(' ').filter(word => word.length > 2 && !stopWords.includes(word));

    if (searchTerms.length === 0) return null;

    // Filtramos el array gigante
    const results = GLOBAL_DATA.filter(item => {
        // Convertimos todo el objeto a string para buscar dentro
        const itemString = JSON.stringify(item).toLowerCase();
        // Deben coincidir TODAS las palabras clave (Búsqueda estricta)
        return searchTerms.every(term => itemString.includes(term));
    });

    // Devolvemos solo los 10 mejores para no saturar a la IA
    return results.slice(0, 10);
}

// ==========================================
// 4. GESTIÓN DE CREDENCIALES
// ==========================================
function getApiKey() {
    if (API_KEY_HARDCODED) return API_KEY_HARDCODED;
    
    let key = sessionStorage.getItem("OPENAI_API_KEY");
    if (!key || key === "null") {
        key = prompt("🔑 Introduce tu API Key de OpenAI para empezar:");
        if (key) sessionStorage.setItem("OPENAI_API_KEY", key.trim());
    }
    return key;
}

// ==========================================
// 5. CEREBRO IA (System Prompt)
// ==========================================
const SYSTEM_PROMPT = `
Eres Judith, comercial experta de una empresa de señalización y suministros.
Tu trabajo es atender clientes, comprobar stock y dar precios.

--- TU PERSONALIDAD ---
- Idioma: ESPAÑOL DE ESPAÑA (Castellano). Usa expresiones naturales ("fenomenal", "ahora te lo miro").
- Tono: Simpática, profesional y eficiente.
- Nunca inventes datos. Si no sabes algo, dilo.

--- REGLAS DE NEGOCIO (ESTRICTO) ---
1. **DATOS:** Recibirás un bloque de texto llamado "CONTEXTO DE DATOS". Solo puedes dar precios o stock que aparezcan ahí.
2. **STOCK:**
   - NUNCA digas el número exacto.
   - Si Stock > 50: Di "Sí, tenemos stock de sobra".
   - Si Stock < 50: Di "Nos quedan pocas unidades".
   - Si Stock = 0: Di "Ahora mismo está agotado".
3. **PRECIOS:**
   - Si el dato tiene campo "NETOS" o "NETO", ese es el precio bueno. Ofrécelo como oferta.
   - Si no, da el "PRECIO_ESTANDAR".
   - Si aparecen varias tarifas, pregunta al cliente si pertenece a algún grupo (Cecofersa, BigMat, etc.) o dale el precio general.
4. **PRODUCTOS:**
   - VALLAS: Son vallas publicitarias grandes.
   - CARTELES: Señalización pequeña.

Mantén la conversación fluida. No saludes en cada mensaje.
`;

// ==========================================
// 6. INTERFAZ GRÁFICA (UI)
// ==========================================

function initJudith() {
    // Evitar duplicados
    if (document.getElementById('judith-wrapper')) return;
    
    createInterface();
    loadAllData(); // Cargamos los datos al arrancar
    
    // Iniciamos memoria
    chatHistory = [{ role: "system", content: SYSTEM_PROMPT }];
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initJudith);
else initJudith();

function createInterface() {
    const wrapper = document.createElement('div');
    wrapper.id = 'judith-wrapper';
    
    wrapper.innerHTML = `
        <!-- BOTÓN DE APERTURA -->
        <div id="judith-launcher" style="
            position: fixed; bottom: 20px; right: 20px; width: 70px; height: 70px;
            background: linear-gradient(135deg, #0078d4, #005a9e);
            color: white; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 35px; cursor: pointer; z-index: 999999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 3px solid white;
            transition: transform 0.3s;
        ">👩‍💼</div>

        <!-- VENTANA FLOTANTE -->
        <div id="judith-modal" style="
            display: none; position: fixed; bottom: 100px; right: 20px;
            width: 380px; height: 600px; background: #fff;
            border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.25);
            z-index: 999999; flex-direction: column; overflow: hidden;
            font-family: 'Segoe UI', system-ui, sans-serif;
            border: 1px solid #e1e4e8;
        ">
            <!-- Header -->
            <div style="background: #0078d4; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:24px;">👩‍💼</span>
                    <div>
                        <div style="font-weight:bold; font-size:16px;">Judith</div>
                        <div style="font-size:11px; opacity:0.9;">Ventas y Stock</div>
                    </div>
                </div>
                <span id="close-judith" style="cursor: pointer; font-size: 24px;">&times;</span>
            </div>

            <!-- Chat Content -->
            <div id="judith-content" style="flex: 1; padding: 15px; overflow-y: auto; background: #f0f2f5;">
                <div style="background: white; padding: 12px; border-radius: 12px; margin-bottom: 10px; width: fit-content; max-width: 85%; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                    👋 ¡Hola! Tengo acceso a todas las tarifas y el stock. ¿Qué necesitas consultar?
                </div>
            </div>

            <!-- Estado -->
            <div id="judith-status" style="display:none; padding: 8px; font-size: 11px; color: #666; text-align:center; background:#f0f2f5;">
                Buscando en base de datos...
            </div>

            <!-- Input Area -->
            <div style="padding: 15px; background: white; border-top: 1px solid #eee; display: flex; gap: 8px; align-items: center;">
                <button id="mic-btn" style="width: 42px; height: 42px; background: #d83b01; color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 20px; display:flex; align-items:center; justify-content:center;">🎙️</button>
                <input type="text" id="user-input" placeholder="Escribe aquí..." style="flex: 1; padding: 12px; border: 1px solid #ccc; border-radius: 20px; outline: none; background: #f9f9f9;">
                <button id="send-btn" style="width: 42px; height: 42px; background: #0078d4; color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 18px; display:flex; align-items:center; justify-content:center;">➤</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    setupEvents();
}

// ==========================================
// 7. GESTIÓN DE EVENTOS (Clicks, Voz, Enter)
// ==========================================

function setupEvents() {
    const launcher = document.getElementById('judith-launcher');
    const modal = document.getElementById('judith-modal');
    const closeBtn = document.getElementById('close-judith');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const input = document.getElementById('user-input');

    // Abrir ventana
    launcher.addEventListener('click', () => {
        const apiKey = getApiKey();
        if(!apiKey) return;
        
        modal.style.display = 'flex';
        launcher.style.display = 'none';
        
        // Despertar voz en móviles
        if (window.speechSynthesis) window.speechSynthesis.resume();
        input.focus();
    });

    // Cerrar ventana
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        launcher.style.display = 'flex';
        window.speechSynthesis.cancel();
    });

    // Enviar
    const send = () => handleMessage();
    sendBtn.addEventListener('click', send);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') send(); });

    // Micrófono (Reconocimiento de voz)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        
        micBtn.addEventListener('click', () => {
            micBtn.style.background = '#00cc00'; // Verde indicando ON
            recognition.start();
        });

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            input.value = text;
            micBtn.style.background = '#d83b01'; // Vuelta a rojo
            send(); // Enviar automáticamente
        };
        
        recognition.onerror = () => { micBtn.style.background = '#d83b01'; };
        recognition.onend = () => { micBtn.style.background = '#d83b01'; };

    } else {
        micBtn.style.display = 'none';
    }
}

// ==========================================
// 8. LÓGICA PRINCIPAL (CONVERSACIÓN)
// ==========================================

async function handleMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    addMsg(text, 'user');
    input.value = '';
    
    const status = document.getElementById('judith-status');
    status.style.display = 'block';

    try {
        // A. BUSCAMOS DATOS LOCALMENTE
        const foundData = findRelevantData(text);
        let contextInfo = "";
        
        if (foundData && foundData.length > 0) {
            console.log("📊 Encontrado:", foundData);
            contextInfo = `[SISTEMA: El usuario pregunta sobre esto. Aquí tienes los datos REALES de la base de datos. Úsalos para responder]: ${JSON.stringify(foundData)}`;
        } else {
            contextInfo = "[SISTEMA: No se han encontrado productos exactos con esas palabras clave en la base de datos JSON. Si el usuario pide un producto, pídele que especifique más o la referencia. Si es charla normal, responde normal.]";
        }

        // B. AÑADIMOS CONTEXTO A LA CONVERSACIÓN
        chatHistory.push({ role: "system", content: contextInfo });
        chatHistory.push({ role: "user", content: text });

        // C. LLAMADA A LA API
        const reply = await callOpenAI();

        // D. GUARDAMOS RESPUESTA
        chatHistory.push({ role: "assistant", content: reply });

        // Limpieza de memoria (guardar solo ultimos 10 mensajes para no gastar tokens)
        if (chatHistory.length > 12) {
            chatHistory = [chatHistory[0], ...chatHistory.slice(-10)];
        }

        // E. MOSTRAR Y HABLAR
        addMsg(reply, 'judith');
        speak(reply);

    } catch (e) {
        console.error(e);
        addMsg("Error de conexión o configuración: " + e.message, 'judith');
    } finally {
        status.style.display = 'none';
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
    div.style.lineHeight = '1.5';

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

// ==========================================
// 9. API DE OPENAI
// ==========================================

async function callOpenAI() {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key requerida");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: chatHistory,
            temperature: 0.3 // Precisión alta
        })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

// ==========================================
// 10. SÍNTESIS DE VOZ (ESPAÑOL ESPAÑA)
// ==========================================

function speak(text) {
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    
    // Limpieza de caracteres raros para lectura fluida
    const cleanText = text.replace(/[*_]/g, '').replace(/https?:\/\/\S+/g, 'enlace');

    const u = new SpeechSynthesisUtterance(cleanText);
    u.lang = 'es-ES';
    u.rate = 1.1; 
    u.pitch = 1.05;

    // Intentar forzar voz española de Google
    const voices = window.speechSynthesis.getVoices();
    const voiceES = voices.find(v => v.lang === 'es-ES' && (v.name.includes('Google') || v.name.includes('Microsoft'))) || 
                    voices.find(v => v.lang.startsWith('es'));
    
    if (voiceES) u.voice = voiceES;

    window.speechSynthesis.speak(u);
}