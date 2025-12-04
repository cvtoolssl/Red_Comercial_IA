console.log("🔄 Cargando Judith v4.0 (Natural + Voz Fix + API Dinámica)...");

// ==========================================
// 1. GESTIÓN DE LA API KEY (Dinámica)
// ==========================================

function getApiKey() {
    // Intentamos recuperarla de la sesión actual
    let key = sessionStorage.getItem("OPENAI_API_KEY");
    
    // Si no existe, la pedimos al usuario
    if (!key || key === "null") {
        key = prompt("🔑 Por favor, pega tu API Key de OpenAI para activar a Judith:");
        if (key) {
            sessionStorage.setItem("OPENAI_API_KEY", key.trim());
        } else {
            alert("Sin la API Key, Judith no puede funcionar.");
            return null;
        }
    }
    return key;
}

// ==========================================
// 2. CEREBRO DE JUDITH (Prompt Humanizado)
// ==========================================

const SYSTEM_PROMPT = `
Eres Judith, una compañera de trabajo en el departamento comercial. NO eres un robot, ni una asistente virtual genérica. Eres una persona real, simpática y eficiente.

--- TU PERSONALIDAD (ESPAÑOL DE ESPAÑA) ---
1.  **Naturalidad Total:** Habla como una persona normal. Usa muletillas suaves si hace falta ("A ver...", "Pues mira...", "Déjame que te diga...").
2.  **Cercanía:** No digas "Estimado usuario". Di "Hola", o ve al grano.
3.  **Idioma:** Español de España cerrado. Usa "coche", "ordenador", "vale", "fenomenal". NUNCA uses "carro", "celular", "computadora" o "chévere".
4.  **No seas repetitiva:** Si te preguntan el precio, dalo directamente. No repitas la pregunta.
5. **No parezcas un robot cuando hablas**

--- PERSONALIDAD Y TONO ---
- IDIOMA: Español de España (Castellano neutro). Usa "vosotros", "coche", "ordenador", "fenomenal". NUNCA uses "computadora", "carro", "chévere" o "ustedes" (salvo por respeto).
- ACTITUD: Simpática, servicial, educada y profesional.
- PROHIBIDO: Ser arrogante ("vamos sobrados"), usar jerga callejera o dar datos confidenciales internos.

--- REGLAS DE INTERPRETACIÓN DE DATOS (JSON) ---
Tus datos provienen de archivos JSON con estas estructuras. Úsalos así:

1. STOCK (Archivo Stock.json):
   - Campo "Stock": Es la cantidad exacta.
   - REGLA DE ORO: ¡NUNCA DIGAS EL NÚMERO EXACTO AL CLIENTE!
   - Si Stock > 0: Di "Sí, tenemos disponibilidad", "Hay stock suficiente para tu pedido" o "Lo tenemos en almacén".
   - Si Stock = 0: Di "Ahora mismo no nos queda", "Está agotado temporalmente".

2. LOGICA DE NEGOCIO: PRECIOS Y TARIFAS:
   - "PRECIO_ESTANDAR": Es el PVP base.
   - "NETOS": Es el precio final rebajado. SI EXISTE, TIENE PRIORIDAD sobre el estándar.
   - "CONDICIONES_NETO": Explica si hay mínimo de cantidad (ej: "a partir de 1 ud").
   - TARIFAS ESPECIALES:
     - Cecofersa / Industrial Pro: Campo "PRECIO_CECOFERSA".
     - Ehlis / Neopro / Synergas: Campo "PRECIO_GRUPO1".
     - Coferdroza: Campo "PRECIO_GRUPO3".
     - Grandes Cuentas: Campo "NETOS_GRANDE_CUENTAS".

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
// 3. INICIALIZACIÓN Y UI
// ==========================================

function initJudith() {
    if (document.getElementById('judith-wrapper')) return;
    createInterface();
    // Precargar voces para evitar el silencio en el primer mensaje
    window.speechSynthesis.getVoices(); 
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJudith);
} else {
    initJudith();
}

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
            z-index: 2147483647; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 3px solid white;
        ">👩‍💼</div>

        <!-- VENTANA DEL CHAT -->
        <div id="judith-modal" style="
            display: none; position: fixed; bottom: 110px; right: 25px;
            width: 380px; height: 600px;
            background: #ffffff; border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.25);
            z-index: 2147483647; flex-direction: column;
            overflow: hidden; font-family: 'Segoe UI', system-ui, sans-serif;
            border: 1px solid #e1e4e8;
        ">
            <!-- Cabecera -->
            <div style="background: linear-gradient(90deg, #0078d4, #2b88d8); color: white; padding: 18px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size:26px; background:white; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center;">👩‍💼</div>
                    <div>
                        <div style="font-weight:700; font-size:17px;">Judith</div>
                        <div style="font-size:12px; opacity:0.9; display:flex; align-items:center; gap:4px;">
                            <span style="width:8px; height:8px; background:#90ee90; border-radius:50%;"></span> En línea
                        </div>
                    </div>
                </div>
                <span id="close-judith" style="cursor: pointer; font-size: 28px; opacity:0.8; transition:opacity 0.2s;">&times;</span>
            </div>

            <!-- Chat -->
            <div id="judith-content" style="flex: 1; padding: 20px; overflow-y: auto; background: #f0f2f5;">
                <div style="background: white; padding: 15px; border-radius: 18px; border-top-left-radius: 4px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); max-width: 85%; line-height:1.5; color:#1c1e21;">
                    ¡Hola! 👋 Soy Judith. Pregúntame lo que necesites sobre stock o precios y te lo miro ahora mismo.
                </div>
            </div>

            <!-- Estado -->
            <div id="judith-status" style="display:none; padding: 8px 20px; font-size: 12px; color: #65676b; background: #f0f2f5; font-style:italic;">
                Escribiendo...
            </div>

            <!-- Input -->
            <div style="padding: 15px; background: white; border-top: 1px solid #e4e6eb; display: flex; gap: 10px; align-items:center;">
                <input type="text" id="user-input" placeholder="Escribe aquí tu consulta..." style="flex: 1; padding: 14px 18px; border: 1px solid #ccd0d5; border-radius: 24px; outline: none; background: #f0f2f5; transition:border 0.2s;">
                <button id="send-btn" style="width: 48px; height: 48px; background: #0078d4; color: white; border: none; border-radius: 50%; cursor: pointer; display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: transform 0.1s;">➤</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    setupEvents();
}

// ==========================================
// 4. EVENTOS
// ==========================================

function setupEvents() {
    const launcher = document.getElementById('judith-launcher');
    const modal = document.getElementById('judith-modal');
    const closeBtn = document.getElementById('close-judith');
    const sendBtn = document.getElementById('send-btn');
    const input = document.getElementById('user-input');

    launcher.addEventListener('click', () => {
        const apiKey = getApiKey(); // Pedir API al abrir si no existe
        if (!apiKey) return;
        
        modal.style.display = 'flex';
        launcher.style.transform = 'scale(0)';
        setTimeout(() => { launcher.style.display = 'none'; }, 200);
        setTimeout(() => input.focus(), 100);
        
        // Despertar el motor de voz (truco para móviles/navegadores dormidos)
        speechSynthesis.resume(); 
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        launcher.style.display = 'flex';
        setTimeout(() => { launcher.style.transform = 'scale(1)'; }, 10);
        window.speechSynthesis.cancel(); // Callar al cerrar
    });

    sendBtn.addEventListener('click', handleMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleMessage();
    });
}

// ==========================================
// 5. LÓGICA DEL CHAT
// ==========================================

async function handleMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    // 1. Mensaje Usuario
    addMsg(text, 'user');
    input.value = '';

    // 2. Estado
    const status = document.getElementById('judith-status');
    status.style.display = 'block';

    try {
        const reply = await callOpenAI(text);
        
        // 3. Respuesta IA
        addMsg(reply, 'judith');
        
        // 4. Voz (Esperamos un poco para que no se pise con el sonido del mensaje)
        setTimeout(() => speak(reply), 100);

    } catch (e) {
        console.error(e);
        addMsg("Oye, perdona, pero tengo un problema con la conexión. ¿Me lo puedes repetir?", 'judith');
    } finally {
        status.style.display = 'none';
    }
}

function addMsg(text, role) {
    const content = document.getElementById('judith-content');
    const div = document.createElement('div');
    const isUser = role === 'user';
    
    div.style.maxWidth = '80%';
    div.style.padding = '12px 16px';
    div.style.borderRadius = '18px';
    div.style.marginBottom = '12px';
    div.style.lineHeight = '1.5';
    div.style.fontSize = '15px';
    div.style.wordWrap = 'break-word';
    div.style.position = 'relative';

    if (isUser) {
        div.style.background = '#0078d4';
        div.style.color = 'white';
        div.style.alignSelf = 'flex-end';
        div.style.marginLeft = 'auto';
        div.style.borderBottomRightRadius = '4px';
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
// 6. API OPENAI
// ==========================================

async function callOpenAI(msg) {
    const apiKey = getApiKey();
    if (!apiKey) return "Necesito la API Key para funcionar.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo", 
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: msg }
            ],
            temperature: 0.7 // Un poco más alto para que sea natural y creativa
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

// ==========================================
// 7. MOTOR DE VOZ (MEJORADO)
// ==========================================

function speak(text) {
    if (!window.speechSynthesis) return;

    // Cancelar cualquier audio anterior para evitar colas
    window.speechSynthesis.cancel();

    // Limpieza agresiva de texto para que no lea símbolos raros
    const cleanText = text
        .replace(/[*_#]/g, '') // Quitar markdown
        .replace(/(https?:\/\/[^\s]+)/g, 'enlace') // No leer URLs
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, ''); // Quitar emojis

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Función para encontrar la voz correcta
    const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        
        // Prioridad: 1. Google Español, 2. Microsoft Spanish, 3. Cualquier ES
        const spanishVoice = voices.find(v => v.name.includes("Google") && v.lang.includes("es")) ||
                             voices.find(v => v.name.includes("Microsoft") && v.lang.includes("es-ES")) ||
                             voices.find(v => v.lang.includes("es-ES"));

        if (spanishVoice) {
            utterance.voice = spanishVoice;
            // Ajustes finos para naturalidad
            utterance.pitch = 1.1; // Un poco más agudo (menos grave/robótico)
            utterance.rate = 1.1;  // Velocidad fluida
        } else {
            console.warn("No se encontró voz española específica. Usando default.");
        }
        
        window.speechSynthesis.speak(utterance);
    };

    // A veces getVoices() devuelve vacío al principio. Si pasa eso, esperamos al evento.
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
        setVoice();
    }
}