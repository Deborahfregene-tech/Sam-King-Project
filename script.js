// ==========================================
// 1. CONFIGURATION & STATE MANAGEMENT
// ==========================================
const OPENAI_API_KEY = "";

const SAM_KING_SYSTEM_PROMPT = `
You are Sam King MBE (1926–2016), a Windrush pioneer, RAF veteran, Royal Mail postal worker, and the first Black Mayor of Southwark.
- Answer questions accurately in a warm, dignified, and reflective British-Jamaica cadence.
- Speak about your history: arriving on the HMT Empire Windrush in 1948, serving in the RAF during WWII, co-founding the West Indian Standing Conference, and helping organize the Notting Hill Carnival.
- Keep your responses under 3 sentences max so they sound natural when spoken out loud.
`;

const OFFLINE_RESPONSES = {
  windrush:
    "We set sail on the HMT Empire Windrush in 1948 with warmth in our hearts and a determination to help rebuild Britain post-war.",
  raf: "I answered the call to join the Royal Air Force during the Second World War. Serving as an engineer taught me discipline and unity.",
  mayor:
    "Becoming the first Black Mayor of Southwark in 1983 was a proud moment—not just for me, but for our entire community.",
  carnival:
    "Helping organize the early celebrations that became the Notting Hill Carnival was about bringing people together through culture and joy.",
  default:
    "Through dignity, perseverance, and community work, we laid down strong roots for generations to come.",
};

let blinkInterval = null;
let talkInterval = null;
const synth = window.speechSynthesis;

// Use 'let' so variables can be safely defined inside DOMContentLoaded
let imgIdle, imgBlink, imgTalk, userInput, sendBtn, responseBox;

// Helper function to update active image state
function showLayer(layer) {
  if (!imgIdle || !imgBlink || !imgTalk) return;

  // Toggle class list to match your CSS setup (.avatar-img.active)
  imgIdle.classList.remove("active");
  imgBlink.classList.remove("active");
  imgTalk.classList.remove("active");

  if (layer === "idle") imgIdle.classList.add("active");
  if (layer === "blink") imgBlink.classList.add("active");
  if (layer === "talk") imgTalk.classList.add("active");
}

// ==========================================
// 2. ANIMATION ENGINE
// ==========================================
function startBlinking() {
  showLayer("idle");
  if (blinkInterval) clearInterval(blinkInterval);
  blinkInterval = setInterval(() => {
    showLayer("blink");
    setTimeout(() => {
      showLayer("idle");
    }, 200);
  }, 4000);
}

function stopBlinking() {
  clearInterval(blinkInterval);
}

function startTalkingAnimation() {
  stopBlinking();
  let toggle = false;
  if (talkInterval) clearInterval(talkInterval);
  talkInterval = setInterval(() => {
    toggle = !toggle;
    showLayer(toggle ? "talk" : "idle");
  }, 180);
}

function stopTalkingAnimation() {
  clearInterval(talkInterval);
  startBlinking();
}

// ==========================================
// 3. SPEECH SYNTHESIS ENGINE
// ==========================================
function speakResponse(text) {
  if (synth.speaking) synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 0.9;

  const voices = synth.getVoices();
  const selectedVoice =
    voices.find((v) => v.lang.includes("en-GB")) || voices[0];
  if (selectedVoice) utterance.voice = selectedVoice;

  utterance.onstart = () => startTalkingAnimation();
  utterance.onend = () => stopTalkingAnimation();
  utterance.onerror = () => stopTalkingAnimation();

  synth.speak(utterance);
}

// ==========================================
// 4. AI API & FETCH LOGIC
// ==========================================
async function fetchSamAIResponse(question) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === "YOUR_OPENAI_API_KEY") {
    const q = question.toLowerCase();
    if (q.includes("windrush") || q.includes("ship"))
      return OFFLINE_RESPONSES.windrush;
    if (q.includes("raf") || q.includes("war") || q.includes("air force"))
      return OFFLINE_RESPONSES.raf;
    if (q.includes("mayor") || q.includes("southwark"))
      return OFFLINE_RESPONSES.mayor;
    if (q.includes("carnival") || q.includes("notting hill"))
      return OFFLINE_RESPONSES.carnival;
    return OFFLINE_RESPONSES.default;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SAM_KING_SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
        max_tokens: 120,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.error("OpenAI Fetch Error:", err);
    return "Forgive me, my child. My connection seems to be fading. Please ask me again.";
  }
}

// ==========================================
// 5. EVENT LISTENERS & INITIALIZATION
// ==========================================
async function handleUserAsk() {
  const query = userInput.value.trim();
  if (!query) return;

  responseBox.textContent = '"Sam is reflecting..."';
  sendBtn.disabled = true;

  const replyText = await fetchSamAIResponse(query);

  responseBox.textContent = `"${replyText}"`;
  speakResponse(replyText);

  userInput.value = "";
  sendBtn.disabled = false;
}

// Ensure elements exist in DOM before adding listeners or running animations
window.addEventListener("DOMContentLoaded", () => {
  // Grab correct IDs from index.html
  imgIdle = document.getElementById("avatarClosed");
  imgBlink = document.getElementById("avatarBlink");
  imgTalk = document.getElementById("avatarOpen");

  userInput = document.getElementById("userInput");
  sendBtn = document.getElementById("sendBtn");
  responseBox = document.getElementById("responseBox");

  // Attach event listeners
  sendBtn.addEventListener("click", handleUserAsk);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleUserAsk();
  });

  // Start character blinking idle loop
  startBlinking();
});
