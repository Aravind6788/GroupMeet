const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/database");
const User = require("./models/user");
const bcrypt = require("bcrypt");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");

connectDB();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.redirect("/login");
  } catch (err) {
    res.status(500).send("Error creating user");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.redirect("/home");
  } else {
    res.status(400).send("Invalid username or password");
  }
});

app.get("/home", (req, res) => {
  res.render("home");
});

app.get("/room", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  socket.on("join-room", (roomId, userId) => {
    console.log(`User ${userId} joining room ${roomId}`);
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId);

    socket.on("speech-result", (roomId, data) => {
      socket.to(roomId).emit("remote-speech", data);
    });

    socket.on("language-change", (roomId, newLang) => {
      socket.to(roomId).emit("language-change", newLang);
    });

    socket.on("disconnect", () => {
      console.log(`User ${userId} disconnected from room ${roomId}`);
      socket.to(roomId).emit("user-disconnected", userId);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
