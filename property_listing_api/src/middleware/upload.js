const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { AppError } = require('../utils/response');

const propertiesRoot = path.resolve(process.cwd(), config.upload.dir, 'properties');
const siteRoot = path.resolve(process.cwd(), config.upload.dir, 'site');
fs.mkdirSync(propertiesRoot, { recursive: true });
fs.mkdirSync(siteRoot, { recursive: true });

function fileFilter(_req, file, cb) {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new AppError('Only image files are allowed (jpg, png, webp, gif, svg, ico)', 400));
  }
  cb(null, true);
}

const propertyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, propertiesRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});

const siteStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, siteRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `site-${Date.now()}-${uuidv4()}${ext}`);
  },
});

const uploadPropertyImages = multer({
  storage: propertyStorage,
  fileFilter,
  limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024, files: 12 },
}).array('images', 12);

function mediaFilter(_req, file, cb) {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico', '.pdf', '.mp4', '.webm', '.mov', '.m4v'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new AppError('Allowed: images, PDF, video (mp4, webm, mov)', 400));
  }
  cb(null, true);
}

const uploadSiteMedia = multer({
  storage: siteStorage,
  fileFilter: mediaFilter,
  limits: { fileSize: Math.max(config.upload.maxFileSizeMb, 100) * 1024 * 1024, files: 1 },
}).single('file');

module.exports = { uploadPropertyImages, uploadSiteMedia, uploadRoot: propertiesRoot };
