// const express = require("express");
// const cors = require("cors");
// const dotenv = require("dotenv");

// dotenv.config();

// require("./config/db");

// const authRoutes = require("./routes/authRoutes");
// const complaintRoutes = require("./routes/complaintRoutes");

// const app = express();

// app.use(cors());
// app.use(express.json());

// app.use("/api/auth", authRoutes);
// app.use("/api/complaints", complaintRoutes);

// app.get("/", (req, res) => {
//     res.send("CCRTS Backend Running");
// });

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Server Working");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});