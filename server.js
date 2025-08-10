const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = "rahasia_perangkat_upm";

const MONGO_URI = "mongodb+srv://blastress05:Blast0512@pendaftaran.kk1tbsb.mongodb.net/test?retryWrites=true&w=majority&appName=Pendaftaran";

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== KONEKSI MONGODB =====
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Koneksi MongoDB sukses"))
  .catch((err) => {
    console.error("❌ Koneksi MongoDB gagal:", err);
    process.exit(1);
  });

// ===== SCHEMA AKUN PERANGKAT UPM =====
const perangkatSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nama: String,
  jabatan: String
}, { collection: "akun_perangkat" });

const PerangkatUPMUser = mongoose.model("PerangkatUPMUser", perangkatSchema);

// ===== API LOGIN AKUN PERANGKAT UPM =====
app.post("/api/perangkatupm/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username dan password wajib diisi" });
  }

  try {
    const user = await PerangkatUPMUser.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "User tidak ditemukan" });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: "Password salah" });
    }

    console.log(`✅ ${user.nama || username} telah login pada ${new Date().toLocaleString()}`);

    const token = jwt.sign({ username: user.username, nama: user.nama }, JWT_SECRET, { expiresIn: "2h" });

    res.json({
      message: "Login sukses",
      token,
      user: {
        nama: user.nama,
        jabatan: user.jabatan
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
