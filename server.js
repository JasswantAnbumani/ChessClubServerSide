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

// ===== SCHEMA PENDAFTARAN =====
const pendaftaranSchema = new mongoose.Schema({
  nama: { type: String, required: true },
  nim: { type: String, required: true },
  angkatan: String,
  kelas: String,
  nohp: String,
  date: { type: Date, default: Date.now },
});
const Pendaftaran = mongoose.model("Pendaftaran", pendaftaranSchema);

// ===== SCHEMA FEEDBACK =====
const feedbackSchema = new mongoose.Schema({
  msg: { type: String, required: true },
  date: { type: Date, default: Date.now },
}, { collection: "feedback" });
const Feedback = mongoose.model("Feedback", feedbackSchema);

// ===== SCHEMA AKUN PERANGKAT UPM =====
const perangkatSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // sementara plain text
  nama: String,
  jabatan: String
}, { collection: "akun_perangkat" });

const PerangkatUPMUser = mongoose.model("PerangkatUPMUser", perangkatSchema);

// ===== SCHEMA ALBUM =====
const albumSchema = new mongoose.Schema({
  albumName: String,
  photos: [String],
  uploadedBy: String,
  date: { type: Date, default: Date.now }
}, { collection: "albums" });

const Album = mongoose.model("Album", albumSchema);

// ===== MIDDLEWARE CEK LOGIN =====
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Token diperlukan" });

  // Bearer token?
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Token tidak valid" });
    req.user = decoded;
    next();
  });
}

// ===== API PENDAFTARAN =====
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
    console.log(`✅ Seseorang Telah Mendaftar: ${nama} | No HP: ${nohp} | ${new Date().toLocaleString()}`);
    res.status(201).json({ message: "Pendaftaran berhasil", entry: newEntry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== API FEEDBACK =====
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
    console.log(`💬 Feedback baru: "${msg.trim()}" | ${new Date().toLocaleString()}`);
    res.status(201).json(newFeedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== API REGISTER AKUN PERANGKAT UPM =====
app.post("/api/perangkatupm/register", async (req, res) => {
  const { username, password, nama, jabatan } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username dan password wajib diisi" });
  }

  try {
    const existingUser = await PerangkatUPMUser.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username sudah digunakan" });
    }

    const newUser = new PerangkatUPMUser({ username, password, nama, jabatan });
    await newUser.save();

    console.log(`🆕 User baru dibuat: ${username} (${nama || "Tanpa Nama"}) pada ${new Date().toLocaleString()}`);

    res.status(201).json({ message: "Akun perangkat berhasil dibuat", user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// ===== UPLOAD FOTO ALBUM =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.post("/api/albums/upload", verifyToken, upload.array("photos"), async (req, res) => {
  try {
    const albumName = req.body.albumName || "Tanpa Nama";
    const photoPaths = req.files.map(file => `/uploads/${file.filename}`);

    let album = await Album.findOne({ albumName });
    if (!album) {
      album = new Album({ albumName, photos: [], uploadedBy: req.user.nama });
    }

    album.photos.push(...photoPaths);
    await album.save();

    console.log(`📸 ${req.user.nama} mengupload ${photoPaths.length} foto ke album "${albumName}"`);

    res.status(201).json(album);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/albums", async (req, res) => {
  try {
    const albums = await Album.find().sort({ date: -1 });
    res.json(albums);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
