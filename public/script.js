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

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    addVideoStream(myVideo, stream);

    const streamEvent = new CustomEvent("audioStreamReady", {
      detail: { stream },
    });
    window.dispatchEvent(streamEvent);

    myPeer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });
  })
  .catch((error) => {
    console.error("Error accessing media devices:", error);
    alert("Unable to access camera and microphone. Please check permissions.");
  });

socket.on("user-disconnected", (userId) => {
  if (peers[userId]) peers[userId].close();
});

socket.on("remote-speech", (data) => {
  const remoteCaptions = document.getElementById("remote-captions");
  const languageName = getLanguageName(data.language);
  remoteCaptions.innerText = `[${languageName}] ${data.text}`;

  setTimeout(() => {
    remoteCaptions.innerText = "";
  }, 3000);
});

myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
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
  videoGrid.append(video);
}

function getLanguageName(langCode) {
  const languages = {
    "en-US": "English",
    "ta-IN": "Tamil",
    "hi-IN": "Hindi",
    "ja-JP": "Japanese",
    "ko-KR": "Korean",
    "zh-CN": "Chinese",
    "es-ES": "Spanish",
    "fr-FR": "French",
    "de-DE": "German",
    "it-IT": "Italian",
  };
  return languages[langCode] || langCode;
}
