const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const bodyParser = require("body-parser");
const path = require("path");
const functions = require("firebase-functions");
const port = 5002;
const app = express();

// app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.json({ limit: "200mb" }));
app.use(bodyParser.urlencoded({ limit: "200mb", extended: true }));
app.use(express.json());

const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath));
// const getMessage = require("./src/Routes/getMessage");
const registration = require("./controllers/getReg");
const { aimodel } = require("./controllers/ai");

app.use("/registration", registration);
app.use("/ai", aimodel);

// Menambahkan handler untuk root path
app.get("/", (req, res) => {
  res.send("Selamat datang di server Express!");
});

// exports.apiPrice = functions.https.onRequest(app);
app.listen(port, () => {
  console.log(`Server berjalan di port: ${port}`);
});
