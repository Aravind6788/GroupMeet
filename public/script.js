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
    });

    // Handle new users
    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });
  });

// Handle peer connection
myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
  // Initialize chat manager
  window.chatManager = new ChatManager(id, socket, ROOM_ID);
});

// Handle user disconnection
socket.on("user-disconnected", (userId) => {
  if (peers[userId]) peers[userId].close();
});

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
