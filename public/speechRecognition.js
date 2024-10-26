const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  const output = document.getElementById("output");
  const languageSelect = document.getElementById("language-select");
  const startBtn = document.getElementById("start-btn");

  // Initial language setting
  recognition.lang = languageSelect.value;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let isRecognizing = false;
  let audioContext;
  let mediaStreamSource;

  // Language selection handler
  languageSelect.addEventListener("change", () => {
    const newLang = languageSelect.value;
    recognition.lang = newLang;

    // Restart recognition with new language
    if (isRecognizing) {
      recognition.stop();
      setTimeout(() => {
        startRecognition();
      }, 100);
    }

    // Emit language change to other participants
    socket.emit("language-change", ROOM_ID, newLang);
  });

  // Start/Stop button handler
  startBtn.addEventListener("click", () => {
    if (isRecognizing) {
      recognition.stop();
      startBtn.textContent = "Start Recognition";
    } else {
      startRecognition();
      startBtn.textContent = "Stop Recognition";
    }
  });

  // Listen for the audio stream from video call
  window.addEventListener("audioStreamReady", (event) => {
    const stream = event.detail.stream;

    // Initialize audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    startRecognition();
  });

  function startRecognition() {
    isRecognizing = true;
    recognition.start();
  }

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    output.textContent = transcript;

    // Emit speech result to other participants
    socket.emit("speech-result", ROOM_ID, {
      text: transcript,
      language: recognition.lang,
    });
  };

  recognition.onend = () => {
    isRecognizing = false;
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event);
  };
} else {
  console.log("Speech recognition not supported");
}
