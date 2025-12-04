console.log("🔄 Cargando Judith v10.0 (Filtro 'Estado:no' + Sin Números)...");

// ==========================================
// 1. CONFIGURACIÓN Y RUTAS
// ==========================================

// ⚠️ Tu API KEY
const API_KEY_HARDCODED = ""; 

// 📂 TUS ARCHIVOS
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
// 2. CARGA DE DATOS + FILTRADO ESTRICTO
// ==========================================

async function loadAllData() {
    console.log("📂 Iniciando carga y filtrado de base de datos...");
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
                        return arrayData
                            .filter(item => {
                                // 🛑 FILTRO DE SEGURIDAD 🛑
                                // Si el artículo tiene Estado "no", LO BORRAMOS del mapa.
                                // Judith no sabrá ni que existe.
                                if (item.Estado === "no") return false;
                                return true;
                            })
                            .map(item => ({ ...item, _origen: file }));
                    }
                    return [];
                })
                .catch(err => [])
        );

        const results = await Promise.all(promises);
        GLOBAL_DATA = results.flat();
        
        console.log(`✅ Base de datos lista: ${GLOBAL_DATA.length} productos (filtrados).`);
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
    
    const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'que', 'precio', 'stock', 'tienes', 'cuanto', 'vale', 'quiero', 'necesito', 'hola', 'por', 'favor'];
    const searchTerms = q.split(' ').filter(word => word.length > 2 && !stopWords.includes(word));

    if (searchTerms.length === 0) return null;

    const results = GLOBAL_DATA.filter(item => {
        const itemString = JSON.stringify(item).toLowerCase();
        return searchTerms.every(term => itemString.includes(term));
    });

    return results.slice(0, 15);
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
// 5. CEREBRO IA (System Prompt Anti-Números)
// ==========================================
const SYSTEM_PROMPT = `
Eres Judith, comercial de señalización.

--- REGLAS DE ORO ---
1. **UBICACIÓN:** Botón a la izquierda.
2. **DATOS:** Usarás los datos que te paso en el contexto cuando el usuario busque algo.

--- 🛑 REGLA SUPREMA DE STOCK (IMPORTANTE) 🛑 ---
ESTÁ TOTALMENTE PROHIBIDO DECIR EL NÚMERO EXACTO DE STOCK.
Aunque veas en los datos "Stock: 1174" o "Stock: 43", JAMÁS se lo digas al cliente.

Tienes que traducir el número a lenguaje comercial:
- Si Stock > 100: Di "Sí, tenemos disponibilidad inmediata", "Hay stock de sobra" o "Sin problemas de cantidad".
- Si Stock es entre 1 y 50: Di "Nos quedan pocas unidades", "Últimas unidades disponibles" o "Stock bajo".
- Si Stock es 0 o negativo: Di "Ahora mismo está agotado" o "Sin stock".

--- INSTRUCCIONES DE RESPUESTA ---
1. **NO ESPERES:** No digas "Voy a mirar". Responde directamente con la información.
2. **PRECIOS:** Prioriza siempre el PRECIO NETO si existe.
3. **ESTRUCTURA:** Los datos que recibes son reales. Si no encuentras algo en el contexto, es que no lo vendemos (o está oculto por política de empresa).

Sé directa, simpática y profesional.
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
                    👋 Hola. Catálogo cargado y listo. ¿En qué puedo ayudarte?
                </div>
            </div>

            <div id="judith-status" style="display:none; padding: 8px; font-size: 11px; color: #666; text-align:center; background:#f0f2f5;">
                Consultando...
            </div>

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
// 7. LÓGICA PRINCIPAL
// ==========================================

async function handleMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    addMsg(text, 'user');
    input.value = '';
    document.getElementById('judith-status').style.display = 'block';

    try {
        const foundData = findRelevantData(text);
        
        let systemMsg = "";
        
        if (foundData && foundData.length > 0) {
            console.log("📊 Datos filtrados encontrados:", foundData);
            systemMsg = `[SISTEMA: El usuario busca esto. Datos REALES adjuntos. RECUERDA: NO DIGAS NÚMEROS DE STOCK, SOLO 'HAY', 'POCO' O 'AGOTADO'.]: ${JSON.stringify(foundData)}`;
        } else {
            systemMsg = `[SISTEMA: No hay coincidencias nuevas. Si pide detalles de lo anterior, usa memoria. Si pide algo nuevo y no está, di que no te consta.]`;
        }

        chatHistory.push({ role: "system", content: systemMsg });
        chatHistory.push({ role: "user", content: text });

        const reply = await callOpenAI();
        chatHistory.push({ role: "assistant", content: reply });

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