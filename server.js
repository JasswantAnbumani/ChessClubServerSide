const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 5000;

const MONGO_URI = "mongodb+srv://blastress05:Blast0512@pendaftaran.kk1tbsb.mongodb.net/test?retryWrites=true&w=majority&appName=Pendaftaran";

app.use(cors());
app.use(express.json());

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Koneksi MongoDB sukses"))
  .catch((err) => {
    console.error("❌ Koneksi MongoDB gagal:", err);
    process.exit(1);
  });

const pendaftaranSchema = new mongoose.Schema({
  nama: { type: String, required: true },
  nim: { type: String, required: true },
  angkatan: String,
  kelas: String,
  nohp: String,
  date: { type: Date, default: Date.now },
});
const Pendaftaran = mongoose.model("Pendaftaran", pendaftaranSchema);

const feedbackSchema = new mongoose.Schema({
  msg: { type: String, required: true },
  date: { type: Date, default: Date.now },
}, { collection: "feedback" });
const Feedback = mongoose.model("Feedback", feedbackSchema);

app.get("/api/registrants", async (req, res) => {
  try {
    const results = await Pendaftaran.find().sort({ date: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/registrants", async (req, res) => {
  const { nama, nim, angkatan, kelas, nohp } = req.body;

  if (!nama || !nim) {
    return res.status(400).json({ message: "Nama dan NIM wajib" });
  }

  try {
    const newEntry = new Pendaftaran({ nama, nim, angkatan, kelas, nohp });
    await newEntry.save();
    console.log("✅ Seseorang Telah Mendaftar:", nama, "| No Handphone:", nohp);
    res.status(201).json({ message: "Pendaftaran berhasil", entry: newEntry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/feedbacks", async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ date: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/feedbacks", async (req, res) => {
  const { msg } = req.body;

  if (!msg || !msg.trim()) {
    return res.status(400).json({ message: "Pesan feedback wajib diisi" });
  }

  try {
    const newFeedback = new Feedback({ msg: msg.trim() });
    await newFeedback.save();
    console.log("💬 Feedback baru:", msg.trim());
    res.status(201).json(newFeedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
