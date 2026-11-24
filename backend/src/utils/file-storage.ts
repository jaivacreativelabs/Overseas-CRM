import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { AppError } from './errors';

/**
 * Persistent file storage in MongoDB GridFS.
 *
 * Vercel's serverless filesystem is temporary and per-instance, so files written to disk there
 * disappear and are never served. Uploads are stored in the same MongoDB database instead and
 * streamed back from `/uploads/:filename`, keeping the URL shape the app already stores.
 */
const BUCKET_NAME = 'uploads';

const getBucket = () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new AppError('File storage is not available: database is not connected.', 503, 'STORAGE_UNAVAILABLE');
  }
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
};

/** Saves an in-memory upload under `filename` (must be unique and unguessable). */
export const saveFile = (filename: string, buffer: Buffer, contentType: string, originalName: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const uploadStream = getBucket().openUploadStream(filename, {
      metadata: { contentType, originalName },
    });
    Readable.from(buffer).pipe(uploadStream).on('error', reject).on('finish', () => resolve());
  });

/**
 * GET /uploads/:filename — streams a stored file. Falls through (next()) when the file is not in
 * GridFS so local development can still serve older files from the on-disk uploads folder.
 */
export const serveStoredFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.params;
    if (!filename || filename.includes('/') || filename.includes('..')) return next();

    const bucket = getBucket();
    const [file] = await bucket.find({ filename }).sort({ uploadDate: -1 }).limit(1).toArray();
    if (!file) return next();

    const contentType = (file.metadata as any)?.contentType || 'application/octet-stream';
    const originalName = String((file.metadata as any)?.originalName || filename).replace(/["\r\n]/g, '');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(file.length));
    // inline: PDFs and images open in the browser tab; other types download.
    res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // HEAD only asks whether the file exists (the Documents page checks before previewing): skip the body.
    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    bucket
      .openDownloadStream(file._id)
      .on('error', (err) => next(err))
      .pipe(res);
  } catch (err) {
    next(err);
  }
};
