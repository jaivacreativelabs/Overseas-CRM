import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../utils/errors';
import { saveFile } from '../utils/file-storage';

// Files are held in memory, then persisted to MongoDB GridFS (see utils/file-storage.ts).
// Disk storage does not survive on Vercel's serverless filesystem.
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow common document and image types
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only PDF, DOCX, PNG, JPG files are allowed.', 400, 'INVALID_FILE_TYPE'));
  }
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
});

/**
 * After multer parses the file, store it in GridFS and set `req.file.filename` to the stored name,
 * so controllers keep building `/uploads/${file.filename}` URLs exactly as before.
 */
const persistUploadedFile = async (req: Request, _res: Response, next: NextFunction) => {
  const file = req.file;
  if (!file || !file.buffer) return next();
  try {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    // Random 128-bit token: stored file URLs cannot be guessed or enumerated.
    const filename = `${file.fieldname}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}${ext}`;
    await saveFile(filename, file.buffer, file.mimetype, file.originalname);
    file.filename = filename;
    next();
  } catch (err) {
    next(err);
  }
};

export const upload = {
  single: (fieldName: string): RequestHandler[] => [multerUpload.single(fieldName), persistUploadedFile],
};
