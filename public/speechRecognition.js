const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  const output = document.getElementById("output");

  recognition.lang = "en-US";
  recognition.interimResults = true; // Allow interim results for continuous speech
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    console.log("Speech recognition started");
  };

  recognition.onresult = (event) => {
    const results = event.results;
    const speechResult = results[results.length - 1][0].transcript; // Get the latest transcript

    // Display the latest result as a caption
    output.innerText = ` ${speechResult}`;

    // Clear the caption after 3 seconds
    setTimeout(() => {
      output.innerText = "";
    }, 3000);
  };

  recognition.onspeechend = () => {
    console.log("Speech ended, restarting recognition...");
    recognition.start(); // Restart recognition
  };

  recognition.onerror = (event) => {
    output.innerText = `Error occurred: ${event.error}`;
    console.log("Error occurred in recognition:", event.error);
    // Attempt to restart recognition if an error occurs
    if (event.error === "no-speech" || event.error === "aborted") {
      recognition.start();
    }
  };

  // Start recognition when the page loads
  recognition.start();
} else {
  document.getElementById("output").innerText =
    "Sorry, your browser does not support Speech Recognition.";
}
