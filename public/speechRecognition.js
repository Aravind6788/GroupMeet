const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  const output = document.getElementById("output");
  const languageSelect = document.getElementById("language-select");
  const statusIndicator = document.querySelector(".status-indicator");

  // Configuration
  recognition.lang = languageSelect.value;
  recognition.interimResults = true;
  recognition.continuous = true;

  let isRecognitionActive = false;
  let lastRecognitionTimestamp = Date.now();
  let recognitionAttempts = 0;
  const MAX_ATTEMPTS = 5;
  const RESET_ATTEMPT_DELAY = 10000;

  function updateStatus(message) {
    if (statusIndicator) {
      statusIndicator.textContent = message;
    }
  }

  function startRecognition() {
    try {
      if (!isRecognitionActive) {
        recognition.start();
        isRecognitionActive = true;
        lastRecognitionTimestamp = Date.now();
        recognitionAttempts++;
        updateStatus(
          `Speech recognition active (Attempt ${recognitionAttempts})`
        );

        setTimeout(() => {
          recognitionAttempts = 0;
        }, RESET_ATTEMPT_DELAY);
      }
    } catch (error) {
      handleRecognitionError(error);
    }
  }

  function restartRecognition(delay = 1000) {
    if (recognitionAttempts >= MAX_ATTEMPTS) {
      delay = RESET_ATTEMPT_DELAY;
      recognitionAttempts = 0;
    }

    try {
      if (isRecognitionActive) {
        recognition.stop();
      }
    } catch (error) {
      console.error(`Stop error during restart: ${error.message}`);
    }

    isRecognitionActive = false;
    updateStatus("Restarting speech recognition...");

    setTimeout(() => {
      startRecognition();
    }, delay);
  }

  function handleRecognitionError(error) {
    isRecognitionActive = false;
    restartRecognition();
  }

  function checkRecognitionHealth() {
    const currentTime = Date.now();
    const timeSinceLastRecognition = currentTime - lastRecognitionTimestamp;

    if (timeSinceLastRecognition > 10000) {
      restartRecognition();
    }
  }

  languageSelect.addEventListener("change", () => {
    const newLang = languageSelect.value;
    recognition.lang = newLang;
    restartRecognition();
  });

  recognition.onstart = () => {
    updateStatus("Speech recognition active");
  };

  recognition.onend = () => {
    updateStatus("Speech recognition inactive");
    if (isRecognitionActive) {
      restartRecognition();
    }
  };

  recognition.onresult = async (event) => {
    lastRecognitionTimestamp = Date.now();
    const current = event.resultIndex;
    const transcript = event.results[current][0].transcript;

    // Update live captions
    output.textContent = transcript;

    // Send transcript to other users
    if (typeof socket !== "undefined") {
      socket.emit("speech-result", ROOM_ID, transcript);
    }

    if (event.results[current].isFinal) {
      // Translate own captions
      const targetLang = document.getElementById(
        "your-translation-language"
      ).value;
      const translatedText = await translateText(transcript, targetLang);
      document.getElementById("your-translated-captions").textContent =
        translatedText;
    }
  };

  recognition.onerror = (event) => {
    handleRecognitionError(event.error);
  };

  // Start recognition on page load
  startRecognition();

  // Health check interval
  setInterval(checkRecognitionHealth, 5000);

  // Export recognition object for use in other scripts
  window.recognition = recognition;
} else {
  console.error("Speech recognition not supported in this browser.");
}

async function translateText(text, targetLang) {
  try {
    const response = await fetch(
      "https://python-speech-reco-server.onrender.com/translate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          target_lang: targetLang,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.translation || "";
  } catch (error) {
    console.error("Translation Error:", error);
    return "";
  }
}
