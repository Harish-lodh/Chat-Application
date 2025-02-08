const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON data

// Connect to MongoDB
const Mongo_url="mongodb+srv://harish:harish1234@cluster0.1ixjr.mongodb.net/chatDB?retryWrites=true&w=majority";

mongoose.connect(Mongo_url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.error("MongoDB Connection Error:", err));


// Define Message Schema
const messageSchema = new mongoose.Schema({
  room: String,
  author: String,
  message: String,
  time: String,
});

// Create Message Model
const Message = mongoose.model("message", messageSchema,"chat");
console.log(messageSchema);
// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Load past messages when a user joins a room
  socket.on("join_room", async (room) => {
    socket.join(room);
    console.log(`User with ID: ${socket.id} joined room: ${room}`);

    // Fetch previous messages from the database
    const pastMessages = await Message.find({ room }).limit(50); // Load last 50 messages
    socket.emit("load_messages", pastMessages);
  });

  // Store and send messages
  socket.on("send_message", async (data) => {
    const newMessage = new Message(data);
    await newMessage.save(); // Save message in the database

    // Send the message to other users in the same room
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// Start Server
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
