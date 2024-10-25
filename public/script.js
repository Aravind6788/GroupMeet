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

// Get user's media (video/audio)
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    addVideoStream(myVideo, stream);

    // Listen for incoming calls (when other users join)
    myPeer.on("call", (call) => {
      call.answer(stream); // Answer the call with our stream
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    // When another user connects
    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });
  });

// When a user disconnects, close their stream
socket.on("user-disconnected", (userId) => {
  if (peers[userId]) peers[userId].close();
});

// Send the Peer ID when a user connects to the room
myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
});

// Call the new user and send your stream
function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream); // Call the new user
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream); // Show their video
  });
  call.on("close", () => {
    video.remove(); // Remove their video when they disconnect
  });

  peers[userId] = call; // Save their call so we can close it later
}

// Add the video stream to the DOM
function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}
