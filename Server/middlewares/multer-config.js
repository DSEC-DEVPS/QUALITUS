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
    const name = file.originalname.split(" ").join("_");
    const extension = MIME_TYPES[file.mimetype];
    callback(null, name + Date.now() + "." + extension);
  },
});

module.exports = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 100 },
});
