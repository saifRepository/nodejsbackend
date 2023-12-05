const connectToMongo = require("./db.js");
const express = require("express");
const user = require("./routes/user.js");
const notes = require("./routes/notes.js");
const image = require("./routes/image.js");
connectToMongo();
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/user", user);
app.use("/api/notes", notes);
app.use("/api/image", image);

app.listen(5000, () => {
  console.log("Server is listening at port 5000");
});

// Allow requests from specific origins (replace with your frontend URL)
