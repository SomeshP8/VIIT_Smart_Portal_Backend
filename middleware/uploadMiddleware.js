import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../server/.env') }); // Explicitly load to ensure credentials are ready

// Configure Cloudinary with credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage — files are uploaded directly to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    // Determine which folder and resource type to use based on file type
    const ext = path.extname(file.originalname).toLowerCase();
    const isDocument = ['.pdf', '.docx'].includes(ext);

    return {
      folder: 'viit_smart_campus',
      // Documents use 'raw', images use 'image'
      resource_type: isDocument ? 'raw' : 'image',
      // Use a human-readable public_id prefixed with the field name + timestamp
      public_id: `${file.fieldname}-${Date.now()}`,
      // Allow any supported format to pass through unchanged
      format: undefined,
    };
  },
});

// File Filtering Logic (same types as before)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Supported types: ${allowedExtensions.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB Limit
  },
  fileFilter,
});

export default upload;
