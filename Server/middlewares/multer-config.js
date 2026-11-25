const multer = require("multer");
const path = require("path");
const MIME_TYPES = {
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "text/csv": "csv",
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, "/app/chargements");
  },
  filename: (req, file, callback) => {
    const extension =
      MIME_TYPES[file.mimetype] ||
      path.extname(file.originalname || "").slice(1).replace(/[^A-Za-z0-9]/g, "").toLowerCase() ||
      "bin";
    callback(null, `${nettoyerNom(nomOriginal(file))}_${Date.now()}.${extension}`);
  },
});

// Le nom du fichier sert d'adresse (/chargements/<nom>) : on n'y garde que des
// caractères sûrs dans une URL. Un « # », « % », « & » ou « ? » coupait l'adresse
// et rendait la fiche illisible. Le titre de la fiche, lui, n'est pas modifié.
function nomOriginal(file) {
  // Multer lit le nom en latin1 : on le relit en UTF-8 pour récupérer les accents.
  const brut = Buffer.from(file.originalname || "", "latin1").toString("utf8");
  return path.parse(brut).name;
}

function nettoyerNom(nom) {
  const propre = String(nom || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 80);
  return propre || "fichier";
}

module.exports = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 100 },
});
