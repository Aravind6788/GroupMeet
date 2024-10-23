// Initialize Socket.IO and PeerJS
const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myPeer = new Peer(undefined, {
  host: "peer-ckmk.onrender.com", // Updated PeerJS server URL
  port: 443,
  secure: true, // Use secure connection
});

// Create a video element for the local user
const myVideo = document.createElement("video");
myVideo.muted = true; // Mute the local video
const peers = {};

// Get media stream from the user's camera and microphone
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    addVideoStream(myVideo, stream); // Display the local video

    // Handle incoming calls
    myPeer.on("call", (call) => {
      call.answer(stream); // Answer the call with the local stream
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream); // Display remote video stream
      });
    });

    // Notify when a new user connects
    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream); // Connect to the new user
    });
  });

// Handle user disconnection
socket.on("user-disconnected", (userId) => {
  if (peers[userId]) peers[userId].close(); // Close the connection if user disconnects
});

// Emit a message to join the room when the peer connection is established
myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id); // Use your specific ROOM_ID
});

// Function to connect to a new user
function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream); // Call the new user
  const video = document.createElement("video");

  // Display remote user's video stream
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });

  // Handle disconnection of the remote user
  call.on("close", () => {
    video.remove(); // Remove the video element if the user disconnects
  });

  peers[userId] = call; // Store the call for this user
}

// Function to add video stream to the video grid
function addVideoStream(video, stream) {
  video.srcObject = stream; // Set the video source to the media stream
  video.addEventListener("loadedmetadata", () => {
    video.play(); // Play the video once metadata is loaded
  });
  videoGrid.append(video); // Add the video element to the video grid
}
