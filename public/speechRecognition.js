const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  const output = document.getElementById("output");
  recognition.lang = "ta-IN";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let isRecognizing = false;
  let audioContext;
  let mediaStreamSource;

  // Listen for the audio stream from video call
  window.addEventListener("audioStreamReady", (event) => {
    const stream = event.detail.stream;

    // Initialize audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    startRecognition();
  });

  function startRecognition() {
    if (!isRecognizing) {
      try {
        recognition.start();
      } catch (error) {
        console.log("Recognition already started");
      }
    }
  }

  recognition.onstart = () => {
    console.log("Speech recognition started");
    isRecognizing = true;
  };

  recognition.onresult = (event) => {
    const results = event.results;
    const speechResult = results[results.length - 1][0].transcript;
    output.innerText = `${speechResult}`;

    // Emit the speech result to other participants
    socket.emit("speech-result", ROOM_ID, speechResult);

    setTimeout(() => {
      output.innerText = "";
    }, 3000);
  };

  recognition.onspeechend = () => {
    console.log("Speech ended");
    isRecognizing = false;
    recognition.stop();
  };

  recognition.onerror = (event) => {
    console.log("Error occurred in recognition:", event.error);
    isRecognizing = false;

    if (event.error === "no-speech" || event.error === "aborted") {
      recognition.stop();
      setTimeout(startRecognition, 1000);
    }
  };

  // Check recognition status every second
  setInterval(() => {
    if (!isRecognizing) {
      startRecognition();
    }
  }, 1000);

  // Add language selector functionality if needed
} else {
  document.getElementById("output").innerText =
    "Sorry, your browser does not support Speech Recognition.";
}
