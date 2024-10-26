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

  // Logging function with timestamp
  function logWithTimestamp(message, type = "info") {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;

    switch (type) {
      case "error":
        console.error(logMessage);
        break;
      case "warn":
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  // Update status with logging
  function updateStatus(message) {
    logWithTimestamp(`Status Update: ${message}`);
    if (statusIndicator) {
      statusIndicator.textContent = message;
    }
  }

  // Start recognition with enhanced error handling
  function startRecognition() {
    try {
      if (!isRecognitionActive) {
        recognition.start();
        isRecognitionActive = true;
        lastRecognitionTimestamp = Date.now();
        recognitionAttempts++;

        logWithTimestamp(
          `Starting recognition (Attempt ${recognitionAttempts})`
        );
        updateStatus(
          `Speech recognition active (Attempt ${recognitionAttempts})`
        );

        // Reset attempts counter after successful start
        setTimeout(() => {
          recognitionAttempts = 0;
        }, RESET_ATTEMPT_DELAY);
      }
    } catch (error) {
      logWithTimestamp(`Start error: ${error.message}`, "error");
      handleRecognitionError(error);
    }
  }

  // Enhanced restart function
  function restartRecognition(delay = 1000) {
    logWithTimestamp("Attempting to restart recognition");

    if (recognitionAttempts >= MAX_ATTEMPTS) {
      logWithTimestamp(
        "Max attempts reached, waiting longer before retry",
        "warn"
      );
      delay = RESET_ATTEMPT_DELAY;
      recognitionAttempts = 0;
    }

    try {
      if (isRecognitionActive) {
        recognition.stop();
        logWithTimestamp("Recognition stopped for restart");
      }
    } catch (error) {
      logWithTimestamp(`Stop error during restart: ${error.message}`, "error");
    }

    isRecognitionActive = false;
    updateStatus("Restarting speech recognition...");

    setTimeout(() => {
      startRecognition();
    }, delay);
  }

  // Error handling function
  function handleRecognitionError(error) {
    logWithTimestamp(`Recognition error handled: ${error.message}`, "error");
    isRecognitionActive = false;
    restartRecognition();
  }

  // Health check function
  function checkRecognitionHealth() {
    const currentTime = Date.now();
    const timeSinceLastRecognition = currentTime - lastRecognitionTimestamp;

    logWithTimestamp(
      `Health check - Time since last recognition: ${timeSinceLastRecognition}ms`
    );

    if (timeSinceLastRecognition > 10000) {
      // 10 seconds
      logWithTimestamp("Recognition appears to be stalled, restarting", "warn");
      restartRecognition();
    }
  }

  // Language change handler
  languageSelect.addEventListener("change", () => {
    const newLang = languageSelect.value;
    logWithTimestamp(`Language changed to: ${newLang}`);
    recognition.lang = newLang;
    restartRecognition();
    socket.emit("language-change", ROOM_ID, newLang);
  });

  // Recognition event handlers
  recognition.onstart = () => {
    logWithTimestamp("Recognition started successfully");
    updateStatus("Listening...");
  };

  recognition.onresult = (event) => {
    lastRecognitionTimestamp = Date.now();
    const current = event.resultIndex;
    const transcript = event.results[current][0].transcript;

    logWithTimestamp(`Speech recognized: ${transcript}`);
    output.textContent = transcript;

    if (event.results[current].isFinal) {
      logWithTimestamp("Final result emitted");
      socket.emit("speech-result", ROOM_ID, {
        text: transcript,
        language: recognition.lang,
      });
    }
  };

  recognition.onend = () => {
    logWithTimestamp("Recognition ended", "warn");
    isRecognitionActive = false;
    updateStatus("Recognition ended - Restarting...");
    restartRecognition();
  };

  recognition.onerror = (event) => {
    logWithTimestamp(`Recognition error: ${event.error}`, "error");
    isRecognitionActive = false;
    updateStatus(`Error: ${event.error}`);
    handleRecognitionError(event);
  };

  // Multiple monitoring intervals
  // Health check every 5 seconds
  setInterval(checkRecognitionHealth, 5000);

  // Forced restart every 30 seconds
  setInterval(() => {
    logWithTimestamp("Performing scheduled restart");
    restartRecognition();
  }, 30000);

  // Quick check every second
  setInterval(() => {
    if (!isRecognitionActive) {
      logWithTimestamp("Recognition inactive, attempting to start", "warn");
      startRecognition();
    }
  }, 1000);

  // Handle visibility change
  document.addEventListener("visibilitychange", () => {
    logWithTimestamp(`Visibility changed: ${document.visibilityState}`);
    if (document.visibilityState === "visible") {
      restartRecognition();
    }
  });

  // Handle online/offline events
  window.addEventListener("online", () => {
    logWithTimestamp("Network connection restored");
    restartRecognition();
  });

  window.addEventListener("offline", () => {
    logWithTimestamp("Network connection lost", "warn");
    updateStatus("Waiting for network connection...");
  });

  // Start recognition when audio stream is ready
  window.addEventListener("audioStreamReady", (event) => {
    logWithTimestamp("Audio stream ready, starting recognition");
    startRecognition();
  });

  // Initial start
  logWithTimestamp("Initializing speech recognition");
  startRecognition();
} else {
  console.error("Speech recognition not supported in this browser");
  alert(
    "Speech recognition is not supported in your browser. Please use Chrome or Edge."
  );
}
