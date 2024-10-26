const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  const output = document.getElementById("output");
  recognition.lang = "ta-IN"; // Set language to English
  recognition.interimResults = true; // Allow interim results
  recognition.maxAlternatives = 1;

  let isRecognizing = false; // Flag to track recognition state

  recognition.onstart = () => {
    console.log("Speech recognition started");
    isRecognizing = true;
  };

  recognition.onresult = (event) => {
    const results = event.results;
    const speechResult = results[results.length - 1][0].transcript;
    output.innerText = ` ${speechResult}`;

    // Clear the caption after 3 seconds
    setTimeout(() => {
      output.innerText = "";
    }, 3000);
  };

  recognition.onspeechend = () => {
    console.log("Speech ended");
    isRecognizing = false;
    // Stop recognition to reset
    recognition.stop();
  };

  recognition.onerror = (event) => {
    output.innerText = `Error occurred: ${event.error}`;
    console.log("Error occurred in recognition:", event.error);
    isRecognizing = false;

    // Restart if there was no speech or it was aborted
    if (event.error === "no-speech" || event.error === "aborted") {
      recognition.stop();
    }
  };

  // Function to continuously check and restart recognition
  const checkRecognitionStatus = () => {
    if (!isRecognizing) {
      console.log("Restarting recognition...");
      recognition.start();
    }
  };

  // Start checking recognition status every second
  setInterval(checkRecognitionStatus, 1000);

  // Start recognition when the page loads
  recognition.start();
} else {
  document.getElementById("output").innerText =
    "Sorry, your browser does not support Speech Recognition.";
}
