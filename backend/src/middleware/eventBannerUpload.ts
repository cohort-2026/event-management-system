import { Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';

export const maxEventBannerBytes = 5 * 1024 * 1024;

const allowedTypes: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxEventBannerBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (allowedTypes[file.mimetype] && allowedTypes[file.mimetype] === extension) {
      callback(null, true);
    } else {
      callback(new Error('Choose a JPG, PNG, or WebP image.'));
    }
  },
});

export const parseEventBanner: RequestHandler = (req, res, next) => {
  upload.single('banner')(req, res, error => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ success: false, message: 'Event images must be 5 MB or smaller.' });
      return;
    }
    if (error instanceof multer.MulterError) {
      res.status(400).json({ success: false, message: 'Upload one event image at a time.' });
      return;
    }
    res.status(400).json({ success: false, message: 'Choose a JPG, PNG, or WebP image.' });
  });
};
