const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myPeer = new Peer(undefined, {
  host: "peer-testing.onrender.com",
  path: "/peerjs",
  secure: true,
  port: 443,
});

const myVideo = document.createElement("video");
myVideo.muted = true;
const peers = {};
let myVideoStream;

// Get user media
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    // Answer calls
    myPeer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });

      // Setup data channel for incoming calls
      if (call.peerConnection) {
        call.peerConnection.ondatachannel = (event) => {
          setupDataChannel(event.channel);
        };
      }
    });

    // Handle new users
    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });
  });

// Handle peer connection
myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
  window.chatManager = new ChatManager(id, socket, ROOM_ID);
});

// Handle user disconnection
socket.on("user-disconnected", (userId) => {
  if (peers[userId]) peers[userId].close();
});

// Caption sharing functionality
function sendCaptions(caption) {
  for (let peerId in peers) {
    const peerConnection = peers[peerId];
    if (peerConnection.peerConnection) {
      if (!peerConnection.dataChannel) {
        peerConnection.dataChannel =
          peerConnection.peerConnection.createDataChannel("captions");
        setupDataChannel(peerConnection.dataChannel);
      }

      try {
        peerConnection.dataChannel.send(
          JSON.stringify({
            type: "caption",
            text: caption,
            userId: myPeer.id,
          })
        );
      } catch (error) {
        console.error("Error sending caption:", error);
      }
    }
  }
}

// Setup data channel handlers
function setupDataChannel(dataChannel) {
  dataChannel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "caption") {
        const remoteCaptions = document.getElementById("remote-captions");
        remoteCaptions.textContent = `${data.text}`;
      }
    } catch (error) {
      console.error("Error processing received caption:", error);
    }
  };

  dataChannel.onerror = (error) => {
    console.error("Data channel error:", error);
  };
}

// Connect to new user
function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");

  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });

  call.on("close", () => {
    video.remove();
  });

  // Setup peer connection for captions
  if (call.peerConnection) {
    call.peerConnection.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };
  }

  peers[userId] = call;
}

// Add video stream
function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

// Controls
const muteButton = document.getElementById("muteButton");
const videoButton = document.getElementById("videoButton");
const leaveButton = document.getElementById("leaveButton");

muteButton.addEventListener("click", toggleAudio);
videoButton.addEventListener("click", toggleVideo);
leaveButton.addEventListener("click", leaveRoom);

function toggleAudio() {
  const audioTrack = myVideoStream.getAudioTracks()[0];
  audioTrack.enabled = !audioTrack.enabled;
  muteButton.innerHTML = audioTrack.enabled
    ? '<i data-lucide="mic" class="h-6 w-6"></i>'
    : '<i data-lucide="mic-off" class="h-6 w-6"></i>';
  lucide.createIcons();
}

function toggleVideo() {
  const videoTrack = myVideoStream.getVideoTracks()[0];
  videoTrack.enabled = !videoTrack.enabled;
  videoButton.innerHTML = videoTrack.enabled
    ? '<i data-lucide="video" class="h-6 w-6"></i>'
    : '<i data-lucide="video-off" class="h-6 w-6"></i>';
  lucide.createIcons();
}

function leaveRoom() {
  window.location.href = "/";
}

// Initialize icons
lucide.createIcons();

// Add socket event handlers for chat messages
socket.on("chat-message", (message) => {
  if (chatManager) {
    chatManager.receiveChatMessage(message);
  }
});

// Connect speech recognition to caption sharing
if (typeof recognition !== "undefined") {
  recognition.onresult = async (event) => {
    lastRecognitionTimestamp = Date.now();
    const current = event.resultIndex;
    const transcript = event.results[current][0].transcript;

    output.textContent = transcript;

    // Send captions to other participants
    sendCaptions(transcript);

    if (event.results[current].isFinal) {
      const targetLang = document.getElementById("translation-language").value;
      const translatedText = await translateText(transcript, targetLang);
      document.getElementById("translated-captions").textContent =
        translatedText;

      const remoteCaptions =
        document.getElementById("remote-captions").textContent;
      const remoteTargetLang = document.getElementById(
        "remote-translation-language"
      ).value;
      const remoteTranslatedText = await translateText(
        remoteCaptions,
        remoteTargetLang
      );
      document.getElementById("remote-translated-captions").textContent =
        remoteTranslatedText;
    }
  };
}

// Translation function
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
