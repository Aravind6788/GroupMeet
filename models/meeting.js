// models/meeting.js
const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema({
  link: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Meeting", meetingSchema);
