import { Request, Response, NextFunction, RequestHandler } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { config } from '@/config/index';

export const maxVendorDocumentBytes = 10 * 1024 * 1024;
export const maxVendorDocuments = 10;

const upload = multer({
	storage: multer.diskStorage({
		destination: (_req, _file, callback) => {
			fs.mkdir(config.vendorDocumentsDir, { recursive: true })
				.then(() => callback(null, config.vendorDocumentsDir))
				.catch(error => callback(error, ''));
		},
		filename: (_req, _file, callback) => callback(null, `${randomUUID()}.pdf`),
	}),
	limits: { fileSize: maxVendorDocumentBytes, files: maxVendorDocuments },
	fileFilter: (_req, file, callback) => {
		const isPdf = file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf';
		if (isPdf) callback(null, true);
		else callback(new Error('Choose PDF documents only'));
	},
});

const cleanupUploadedFiles = async (req: Request): Promise<void> => {
	const uploaded = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];
	await Promise.all(uploaded.map(file => fs.unlink(file.path).catch(() => undefined)));
};

const handleUploadError = (error: unknown, req: Request, res: Response, next: NextFunction): void => {
	if (!error) {
		next();
		return;
	}
	void cleanupUploadedFiles(req).then(() => {
		if (error instanceof multer.MulterError) {
			const tooLarge = error.code === 'LIMIT_FILE_SIZE';
			res.status(tooLarge ? 413 : 400).json({
				success: false,
				message: tooLarge ? 'PDF files must be 10 MB or smaller' : 'Upload up to 10 PDF documents',
			});
			return;
		}
		res.status(400).json({ success: false, message: 'Choose PDF documents only' });
	}).catch(next);
};

export const parseVendorPdf: RequestHandler = (req, res, next) => {
	upload.single('document')(req, res, error => handleUploadError(error, req, res, next));
};

export const parseVendorRegistrationDocuments: RequestHandler = (req, res, next) => {
	upload.array('supportingDocuments', maxVendorDocuments)(req, res, error => handleUploadError(error, req, res, next));
};