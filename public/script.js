const socket = io("/"); // Assuming root namespace
const videoGrid = document.getElementById("video-grid");
const myPeer = new Peer({
  host: "peerjs.com",
  port: 443,
  secure: true,
});

const myVideo = document.createElement("video");
myVideo.muted = true;
const peers = {};

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    addVideoStream(myVideo, stream);

    // Answer incoming calls
    myPeer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    // Handle user connections through Socket.IO
    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });
  })
  .catch((err) => {
    console.error("Failed to get local stream", err); // Error handling
  });

socket.on("user-disconnected", (userId) => {
  if (peers[userId]) peers[userId].close();
});

// Emit event when peer connection is opened
myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id); // Make sure ROOM_ID is defined
});

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

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video); // Ensure videoGrid handles multiple users correctly
}
