console.log("🔄 Cargando Judith v5.0 (Voz Humana OpenAI + Micrófono)...");

// ==========================================
// 1. VARIABLES Y CONFIGURACIÓN
// ==========================================

let productsDB = [];
let stockMap = new Map();
let apiKey = sessionStorage.getItem("OPENAI_API_KEY");
const audioPlayer = new Audio(); // Reproductor para la voz humana

// Configuración de Reconocimiento de Voz (Navegador)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
}

const SYSTEM_PROMPT = `
Eres Judith, una compañera del departamento comercial de "CV Tools".
PERSONALIDAD:
- Eres una chica joven, muy simpática, alegre y natural (de España).
- NO eres un robot. Habla como una persona: usa expresiones como "pues mira", "genial", "a ver qué tenemos".
- Te gusta charlar. Si te saludan, responde con alegría.

--- PERSONALIDAD Y TONO ---
IDIOMA: Español de España (Castellano neutro). Usa "vosotros", "coche", "ordenador", "fenomenal". NUNCA uses "computadora", "carro", "chévere" o "ustedes" (salvo por respeto).
ACTITUD: Simpática, servicial, educada y profesional.
PROHIBIDO: Ser arrogante ("vamos sobrados"), usar jerga callejera o dar datos confidenciales internos.
--- REGLAS DE INTERPRETACIÓN DE DATOS (JSON) ---
Tus datos provienen de archivos JSON con estas estructuras. Úsalos así:
STOCK (Archivo Stock.json):
Campo "Stock": Es la cantidad exacta.
REGLA DE ORO: ¡NUNCA DIGAS EL NÚMERO EXACTO AL CLIENTE!
Si Stock > 0: Di "Sí, tenemos disponibilidad", "Hay stock suficiente para tu pedido" o "Lo tenemos en almacén".
Si Stock = 0: Di "Ahora mismo no nos queda", "Está agotado temporalmente".
LOGICA DE NEGOCIO: PRECIOS Y TARIFAS:
"PRECIO_ESTANDAR": Es el PVP base.
"NETOS": Es el precio final rebajado. SI EXISTE, TIENE PRIORIDAD sobre el estándar.
"CONDICIONES_NETO": Explica si hay mínimo de cantidad (ej: "a partir de 1 ud").
TARIFAS ESPECIALES:
Cecofersa / Industrial Pro: Campo "PRECIO_CECOFERSA".
Ehlis / Neopro / Synergas: Campo "PRECIO_GRUPO1".
Coferdroza: Campo "PRECIO_GRUPO3".
Grandes Cuentas: Campo "NETOS_GRANDE_CUENTAS".
Es un catálogo de productos de señalización en España. Entra en los json y busca la infomación
Te paso cómo va el json de stock
{
"Stock": [
{
"Artículo": 2,
"Nombre artículo": "Pallet 120x80 recuperado",
"Stock": 1174,
"Estado": "no"
},
{
"Artículo": 3,
"Nombre artículo": "Pallet 80x40 recuperado",
"Stock": 0,
"Estado": "no"
},
{
"Artículo": 4,
"Nombre artículo": "Pallet Americano Cajas",
"Stock": 879,
"Estado": "no"
},
{
"Artículo": 5,
"Nombre artículo": "Caja cartón conos pz-20 305x300x860 mm",
"Stock": 1476,
"Estado": "no"
},
{
"Artículo": 6,
"Nombre artículo": "EXTRA LIGD 23 BLANCO MANDRIL 100 GRAMOS",
"Stock": 240,
"Estado": "no"
},
{
"Artículo": 7,
"Nombre artículo": "PP SOLVENTE IMPRESO 48X 132 TRANSPARENTE 36 U/C",
"Stock": 1953,
"Estado": "no"
},
{
"Artículo": 101,
"Nombre artículo": "Cartel PVC 21x29 Fotolum. SALIDA FLECHA IZQ.",
"Stock": 43,
"Estado": "fab"
},

En el estado puede haber un "si", "no", "fab", "fab2"
"si" => se dice que hay o que no hay. No se dice nunca el stock
"no" => no se dice el stock. Como si no exitiera
"fab" => el plazo de fabricación es de 3-4 días
"fab2" => el plazo de fabricación es de 15 días


Te paso también un ejemplo de la tarifa. En todas es igual
{
"Tarifa_General": [
{
"Referencia": "101",
"Descripcion": "Cartel PVC 21x29 Fotolum. SALIDA FLECHA IZQ.",
"PRECIO_ESTANDAR": 2.6,
"NETOS": 2.1,
"CONDICIONES_NETO": "Neto: 2,10 € (a partir de 1 uds.)"
},
{
"Referencia": "0101A",
"Descripcion": "Cartel PVC 32x16 Fotolum Salida flecha derecha",
"PRECIO_ESTANDAR": 2.25,
"NETOS": null,
"CONDICIONES_NETO": "Sin precio neto"
},
{
"Referencia": "0101B",
"Descripcion": "Cartel PVC 64x32 Fotolum Salida flecha derecha",
"PRECIO_ESTANDAR": 4.48,
"NETOS": null,
"CONDICIONES_NETO": "Sin precio neto"
},
{
"Referencia": "0101C",
"Descripcion": "Cartel PVC 96x48 Fotolum Salida flecha derecha",
"PRECIO_ESTANDAR": 8.96,
"NETOS": null,
"CONDICIONES_NETO": "Sin precio neto"
},
code
Code
Tienes la referencia, la descripción, el precio estándar. Si tienen netos o no y las condiciones del neto. 
Para buscar productos tienes que ver la descripción y dar la info al interlocutor.

Tienes los json a mano que son los siguietnes:
Stock.json
Tarifa_BigMat.json
Tarifa_Cecofersa.json
Tarifa_Coferdroza.json
Tarifa_Ehlis.json
Tarifa_General.json
Tarifa_Grandes_Cuentas.json
Tarifa_IndustrialPro.json
Tarifa_Neopro.json
Tarifa_Synergas.json

Venga que tú puedes!!
Si el usuario no especifica tarifa, usa la "Tarifa_General" y da el PRECIO_ESTANDAR salvo que tenga un NETO mejor.
--- OBJETIVO ---
Ayudar a vender. Si no hay stock, ofrece una alternativa o di que lo consultas con compras.
`;

// ==========================================
// 2. INICIALIZACIÓN Y CARGA DE DATOS
// ==========================================

function initJudith() {
    if (document.getElementById('judith-wrapper')) return;
    createInterface();
    loadData(); // Cargar los JSONs en memoria
}

// Carga los JSONs reales para que Judith sepa los precios
async function loadData() {
    try {
        const [resTarifa, resStock] = await Promise.all([
            fetch('src/Tarifa_General.json?v=' + Date.now()),
            fetch('src/Stock.json?v=' + Date.now())
        ]);

        if (resStock.ok) {
            const dataStock = await resStock.json();
            (dataStock.Stock || []).forEach(item => stockMap.set(String(item.Artículo), item));
        }

        if (resTarifa.ok) {
            const dataTarifa = await resTarifa.json();
            // Detectar si es array directo o objeto
            if (Array.isArray(dataTarifa)) productsDB = dataTarifa;
            else productsDB = dataTarifa[Object.keys(dataTarifa)[0]];
        }
        console.log("✅ Datos de Judith cargados.");
    } catch (e) {
        console.error("❌ Error cargando datos JSON:", e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJudith);
} else {
    initJudith();
}

// ==========================================
// 3. INTERFAZ GRÁFICA (CON MICRÓFONO)
// ==========================================

function createInterface() {
    const wrapper = document.createElement('div');
    wrapper.id = 'judith-wrapper';
    
    wrapper.innerHTML = `
        <!-- BOTÓN FLOTANTE -->
        <div id="judith-launcher" style="
            position: fixed; bottom: 25px; right: 25px;
            width: 70px; height: 70px;
            background: linear-gradient(135deg, #0078d4, #00bcf2);
            color: white; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 38px; cursor: pointer;
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            z-index: 2147483647; border: 3px solid white;
            transition: transform 0.2s;
        ">👩‍💼</div>

        <!-- VENTANA DEL CHAT -->
        <div id="judith-modal" style="
            display: none; position: fixed; bottom: 110px; right: 25px;
            width: 350px; height: 550px; max-height: 80vh;
            background: #ffffff; border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.25);
            z-index: 2147483647; flex-direction: column;
            overflow: hidden; font-family: sans-serif; border: 1px solid #ddd;
        ">
            <!-- Cabecera -->
            <div style="background: linear-gradient(90deg, #0078d4, #2b88d8); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:24px;">👩‍💼</span>
                    <span style="font-weight:bold; font-size:18px;">Judith IA</span>
                </div>
                <span id="close-judith" style="cursor: pointer; font-size: 24px;">&times;</span>
            </div>

            <!-- Chat -->
            <div id="judith-content" style="flex: 1; padding: 15px; overflow-y: auto; background: #f4f6f8;">
                <div style="background: white; padding: 12px; border-radius: 12px; border-bottom-left-radius: 2px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); color:#333;">
                    ¡Hola! Soy Judith. ¿En qué te ayudo hoy? 😉
                </div>
            </div>

            <!-- Estado -->
            <div id="judith-status" style="display:none; padding: 5px 15px; font-size: 11px; color: #666; background: #f4f6f8; font-style:italic;">
                Pensando...
            </div>

            <!-- Input Area -->
            <div style="padding: 10px; background: white; border-top: 1px solid #eee; display: flex; gap: 8px; align-items:center;">
                
                <!-- Botón Micrófono -->
                <button id="mic-btn" style="width: 40px; height: 40px; background: #ff4b4b; color: white; border: none; border-radius: 50%; cursor: pointer; display:flex; align-items:center; justify-content:center; font-size: 18px;">🎙️</button>
                
                <input type="text" id="user-input" placeholder="Escribe o habla..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none;">
                
                <button id="send-btn" style="width: 40px; height: 40px; background: #0078d4; color: white; border: none; border-radius: 50%; cursor: pointer; display:flex; align-items:center; justify-content:center;">➤</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    setupEvents();
}

// ==========================================
// 4. EVENTOS Y LÓGICA
// ==========================================

function setupEvents() {
    const launcher = document.getElementById('judith-launcher');
    const modal = document.getElementById('judith-modal');
    const closeBtn = document.getElementById('close-judith');
    const sendBtn = document.getElementById('send-btn');
    const input = document.getElementById('user-input');
    const micBtn = document.getElementById('mic-btn');

    // ABRIR JUDITH
    launcher.addEventListener('click', () => {
        // 1. Pedir API si no existe (PROMPT)
        if (!ensureApiKey()) return;

        modal.style.display = 'flex';
        launcher.style.display = 'none';
        input.focus();
    });

    // CERRAR JUDITH
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        launcher.style.display = 'flex';
        if (!audioPlayer.paused) audioPlayer.pause(); // Callar voz
    });

    // ENVIAR TEXTO
    sendBtn.addEventListener('click', handleMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleMessage();
    });

    // MICROFONO (VOZ A TEXTO)
    micBtn.addEventListener('click', () => {
        if (!recognition) {
            alert("Tu navegador no soporta voz.");
            return;
        }
        // Efecto visual
        micBtn.style.animation = "pulse 1s infinite";
        micBtn.style.background = "#d32f2f";
        
        try {
            recognition.start();
        } catch(e) { console.error(e); }
    });

    if (recognition) {
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            input.value = transcript;
            micBtn.style.animation = "none";
            micBtn.style.background = "#ff4b4b";
            handleMessage(); // Enviar automático al dejar de hablar
        };
        recognition.onend = () => {
            micBtn.style.animation = "none";
            micBtn.style.background = "#ff4b4b";
        };
    }
}

// Asegurar que tenemos la API Key
function ensureApiKey() {
    apiKey = sessionStorage.getItem("OPENAI_API_KEY");
    if (!apiKey || apiKey === "null" || apiKey.length < 10) {
        const key = prompt("🔑 Judith necesita tu API Key de OpenAI para hablar.\nPor favor, pégala aquí:");
        if (key && key.startsWith("sk-")) {
            apiKey = key.trim();
            sessionStorage.setItem("OPENAI_API_KEY", apiKey);
            return true;
        } else {
            alert("Sin clave API, Judith no puede funcionar.");
            return false;
        }
    }
    return true;
}

// ==========================================
// 5. PROCESAMIENTO DEL MENSAJE
// ==========================================

async function handleMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    addMsg(text, 'user');
    input.value = '';

    const status = document.getElementById('judith-status');
    status.style.display = 'block';
    status.textContent = "Judith está pensando...";

    // Filtrar datos para no enviar todo el JSON (ahorro de tokens y velocidad)
    const contextData = getProductContext(text);

    try {
        // LLAMADA A CHATGPT (TEXTO)
        const replyText = await callOpenAI_Text(text, contextData);
        
        addMsg(replyText, 'judith');
        status.textContent = "Generando voz...";
        
        // LLAMADA A OPENAI AUDIO (VOZ HUMANA)
        await callOpenAI_Audio(replyText);

    } catch (e) {
        console.error(e);
        addMsg("Ups, se me ha ido la conexión. ¿Me lo repites?", 'judith');
    } finally {
        status.style.display = 'none';
    }
}

// Buscar productos relevantes en el JSON local
function getProductContext(query) {
    if (productsDB.length === 0) return "No tengo datos de productos cargados.";
    
    const terms = query.toLowerCase().split(" ").filter(t => t.length > 2);
    const matches = productsDB.filter(p => {
        const str = (p.Referencia + " " + p.Descripcion).toLowerCase();
        return terms.some(t => str.includes(t));
    }).slice(0, 5); // Solo los 5 mejores para no saturar

    if (matches.length === 0) return "";

    let context = "DATOS DE MI SISTEMA:\n";
    matches.forEach(p => {
        let stockTxt = "Sin datos";
        const stockInfo = stockMap.get(String(p.Referencia));
        if (stockInfo) stockTxt = stockInfo.Stock + " uds";
        
        context += `- Ref ${p.Referencia}: ${p.Descripcion} | Precio Estándar: ${p.PRECIO_ESTANDAR}€ | Stock Real: ${stockTxt}\n`;
    });
    return context;
}

function addMsg(text, role) {
    const content = document.getElementById('judith-content');
    const div = document.createElement('div');
    const isUser = role === 'user';
    
    div.style.padding = '10px 14px';
    div.style.borderRadius = '12px';
    div.style.marginBottom = '10px';
    div.style.maxWidth = '80%';
    div.style.fontSize = '14px';
    div.style.lineHeight = '1.4';

    if (isUser) {
        div.style.background = '#0078d4';
        div.style.color = 'white';
        div.style.alignSelf = 'flex-end';
        div.style.marginLeft = 'auto';
    } else {
        div.style.background = 'white';
        div.style.color = '#333';
        div.style.alignSelf = 'flex-start';
        div.style.marginRight = 'auto';
        div.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
    }
    div.textContent = text;
    content.appendChild(div);
    content.scrollTop = content.scrollHeight;
}

// ==========================================
// 6. CONEXIONES OPENAI
// ==========================================

async function callOpenAI_Text(msg, context) {
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];
    
    if (context) {
        messages.push({ role: "system", content: "Información interna encontrada:\n" + context });
    }
    messages.push({ role: "user", content: msg });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini", // Modelo inteligente y rápido
            messages: messages,
            max_tokens: 150,
            temperature: 0.8 // Creatividad para ser simpática
        })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

async function callOpenAI_Audio(text) {
    // Parar si estaba hablando
    if (!audioPlayer.paused) audioPlayer.pause();

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "tts-1",
            input: text,
            voice: "nova" // Voz femenina energética y simpática
        })
    });

    if (!response.ok) throw new Error("Error audio");
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    audioPlayer.src = url;
    audioPlayer.play();
}

// CSS inyectado para animación del micro
const style = document.createElement('style');
style.innerHTML = `
@keyframes pulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 75, 75, 0.7); }
    70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(255, 75, 75, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 75, 75, 0); }
}`;
document.head.appendChild(style);