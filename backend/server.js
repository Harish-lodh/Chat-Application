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
const Mongo_url = "mongodb+srv://harish:harish1234@cluster0.1ixjr.mongodb.net/chatDB?retryWrites=true&w=majority";

mongoose.connect(Mongo_url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Define Message Schema with timestamps
const messageSchema = new mongoose.Schema({
  room: { type: String, required: true },
  author: { type: String, required: true },
  message: { type: String, required: true },
  time: { type: String, required: true },
}, { timestamps: true }); // Auto createdAt and updatedAt

// Create Message Model
const Message = mongoose.model("Message", messageSchema, "chat");

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

    try {
      // Fetch last 50 messages from the database
      const pastMessages = await Message.find({ room }).sort({ createdAt: -1 }).limit(50);
      console.log("Fetched Messages:", pastMessages);  // <-- Add this log
      socket.emit("load_messages", pastMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  });

  // Store and send messages
  socket.on("send_message", async (data) => {
    console.log("Received Message:", data);

    // Validate Data Before Saving
    if (!data.room || !data.author || !data.message || !data.time) {
      console.error("Invalid message data:", data);
      return;
    }

    try {
      const newMessage = new Message(data);
      await newMessage.save(); // Save message in database //here not inserting data my databse name is Message and coolection name is chat
      socket.to(data.room).emit("receive_message", data);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// Start Server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});

// Test API to check if server is running
app.get("/", (req, res) => {
  res.send("Backend is running successfully!");
});
