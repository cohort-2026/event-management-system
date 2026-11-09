import { Request, Response, NextFunction } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '@/config/index';

const getImageExtension = (buffer: Buffer): string | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
};

const extensionByMimeType: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const uploadEventBanner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'Choose an event image to upload.' });
      return;
    }

    const extension = getImageExtension(file.buffer);
    if (!extension || extension !== extensionByMimeType[file.mimetype]) {
      res.status(400).json({ success: false, message: 'The selected file is not a valid JPG, PNG, or WebP image.' });
      return;
    }

    await fs.mkdir(config.eventBannersDir, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    await fs.writeFile(path.join(config.eventBannersDir, filename), file.buffer, { flag: 'wx' });
    const baseUrl = config.baseUrl || `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      success: true,
      data: { url: `${baseUrl}/uploads/event-banners/${filename}` },
      message: 'Event image uploaded.',
    });
  } catch (error) {
    next(error);
  }
};
