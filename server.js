const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser"); // o body parser tem que ser antes do express senao da merda
const session = require("express-session");

const app = express();
const PORT = 3000;

// --- CONFIGURAÇÕES DO SERVIDOR ---
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "lasalle-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Em produção com HTTPS, mude para true
  })
);

app.use(express.static("public"));

// --- AUTENTICAÇÃO ---

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "lasalle@abel") {
    req.session.authenticated = true;
    res.json({ status: "sucesso" });
  } else {
    res.status(401).json({ status: "erro", message: "Credenciais inválidas" });
  }
});

app.get("/admin", (req, res) => {
  if (req.session.authenticated) {
    res.sendFile(path.join(__dirname, "private", "admin.html"));
  } else {
    res.redirect("/login.html");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login.html");
});

// Configuração do Multer (é a ferramenta que faz o upload do video)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "public/videos";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// --- ROTAS ---

// 1. UPLOAD
app.post("/api/upload", upload.single("video"), (req, res) => {
  try {
    res.json({ status: "sucesso", mensagem: "Vídeo enviado!" });
  } catch (e) {
    res.status(500).json({ status: "erro", mensagem: "Erro no upload" });
  }
});

// 2. LISTAR VÍDEOS
app.get("/api/videos", (req, res) => {
  const videoDir = path.join(__dirname, "public", "videos");

  if (!fs.existsSync(videoDir)) return res.json([]);

  fs.readdir(videoDir, (err, files) => {
    if (err) return res.status(500).json({ erro: "Erro ao ler pasta" });

    const videos = files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return [".mp4", ".webm", ".ogg", ".mov"].includes(ext);
    });
    res.json(videos);
  });
});

// 3. RENOMEAR VÍDEO
app.put("/api/videos/:oldName", (req, res) => {
  const oldName = req.params.oldName;
  const newName = req.body.newName;
  const videoDir = path.join(__dirname, "public", "videos");

  if (!newName || newName.includes("/") || newName.includes("..")) {
    return res.status(400).json({ status: "erro", mensagem: "Nome inválido" });
  }

  const oldPath = path.join(videoDir, oldName);
  const newPath = path.join(videoDir, newName);

  fs.rename(oldPath, newPath, (err) => {
    if (err)
      return res
        .status(500)
        .json({ status: "erro", mensagem: "Erro ao renomear" });
    res.json({ status: "sucesso", mensagem: "Renomeado com sucesso!" });
  });
});

// 4. ROTA PARA EXCLUIR VÍDEO (CUIDADO AO MEXER AQUI PELO AMOR DE DEUS)
app.delete("/api/videos/:name", (req, res) => {
  const videoDir = path.join(__dirname, "public", "videos");
  const filePath = path.join(videoDir, req.params.name);

  fs.unlink(filePath, (err) => {
    if (err)
      return res
        .status(500)
        .json({ status: "erro", mensagem: "Erro ao excluir" });
    res.json({ status: "sucesso", mensagem: "Vídeo excluído!" });
  });
});

// 5. ROTA DO PLAYER (Playlist)
app.get("/api/playlist", (req, res) => {
  const videoDir = path.join(__dirname, "public", "videos");
  if (!fs.existsSync(videoDir)) return res.json({ playlist: [] });

  fs.readdir(videoDir, (err, files) => {
    if (err) return res.json({ playlist: [] });
    const videos = files.filter((f) =>
      [".mp4", ".webm"].includes(path.extname(f).toLowerCase())
    );
    const playlist = videos.map((v) => `/videos/${v}`);
    res.json({ playlist: playlist });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
