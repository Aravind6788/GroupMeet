const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json()); // Middleware to parse JSON requests

app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`); // All users will join the same "test-room"
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  console.log('New user connected:', socket.id);

  socket.on("join-room", (roomId, userId) => {
    console.log(`User ${userId} joining room ${roomId}`);
    socket.join(roomId);

    socket.to(roomId).emit("user-connected", userId);

    socket.on("disconnect", () => {
      console.log(`User ${userId} disconnected from room ${roomId}`);
      socket.to(roomId).emit("user-disconnected", userId);
    });
  });
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
