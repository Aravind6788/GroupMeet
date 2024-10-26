const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  const output = document.getElementById("output");
  recognition.lang = "en-US";
  recognition.interimResults = true;
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
    // Stop recognition to reset, then restart
    recognition.stop();
    setTimeout(() => {
      if (!isRecognizing) recognition.start();
    }, 500); // Delay to ensure stop has completed
  };

  recognition.onerror = (event) => {
    output.innerText = `Error occurred: ${event.error}`;
    console.log("Error occurred in recognition:", event.error);
    isRecognizing = false;
    // Restart only if it’s not already recognizing
    if (
      (event.error === "no-speech" || event.error === "aborted") &&
      !isRecognizing
    ) {
      recognition.stop();
      setTimeout(() => recognition.start(), 500);
    }
  };

  // Start recognition when the page loads
  recognition.start();
} else {
  document.getElementById("output").innerText =
    "Sorry, your browser does not support Speech Recognition.";
}
