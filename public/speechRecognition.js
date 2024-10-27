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
  const RESET_ATTEMPT_DELAY = 10000; // 10 seconds

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

  function translateText(text, targetLang) {
    return fetch("https://python-speech-reco-server.onrender.com/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        target_lang: targetLang,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data && data.translation) {
          return data.translation;
        } else {
          throw new Error("Translation not found in response");
        }
      })
      .catch((error) => {
        console.error("Translation Error:", error);
        return ""; // Return an empty string on error
      });
  }

  recognition.onstart = () => {
    updateStatus("Speech recognition active");
  };

  recognition.onend = () => {
    updateStatus("Speech recognition inactive");
  };

  recognition.onresult = async (event) => {
    lastRecognitionTimestamp = Date.now();
    const current = event.resultIndex;
    const transcript = event.results[current][0].transcript;

    output.textContent = transcript;

    if (event.results[current].isFinal) {
      // Translate the transcript
      const targetLang = document.getElementById("translation-language").value;
      const translatedText = await translateText(transcript, targetLang);

      // Display the translated text in the translated captions box
      document.getElementById("translated-captions").textContent =
        translatedText;

      // Handle remote captions translation
      const remoteCaptions =
        document.getElementById("remote-captions").textContent;
      const remoteTargetLang = document.getElementById(
        "remote-translation-language"
      ).value;
      const remoteTranslatedText = await translateText(
        remoteCaptions,
        remoteTargetLang
      );

      // Display the translated remote captions
      document.getElementById("remote-translated-captions").textContent =
        remoteTranslatedText;
    }
  };

  recognition.onerror = (event) => {
    handleRecognitionError(event.error);
  };

  startRecognition();

  setInterval(checkRecognitionHealth, 5000);
} else {
  console.error("Speech recognition not supported in this browser.");
}
