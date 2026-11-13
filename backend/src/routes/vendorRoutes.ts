import { Request, Response, Router } from 'express';
import { Prisma, VendorDocumentStatus, VendorProfileStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path, { basename } from 'node:path';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { requireApprovedOrganizerProfile, requireAuth, requireRole } from '../middleware/auth';
import { config } from '../config/index';
import { maxVendorDocuments, parseVendorPdf } from '../middleware/vendorDocumentUpload';
import { notifyAdmins } from '../services/notificationService';
import {
	sendVendorApplicationRejected,
	sendVendorApplicationSubmitted,
	sendVendorProfileDecision,
	sendVendorStandInvoice,
} from '../services/emailService';
import { prisma } from '../lib/prisma';
import { validateUuidParam } from '../middleware/requestValidation';

const router = Router();
router.param('id', validateUuidParam);

interface VendorDocumentRecord {
	id: string;
	originalName: string;
	storageName: string;
	sizeBytes: number;
	status: VendorDocumentStatus;
	reviewedAt: Date | null;
	rejectionReason: string | null;
	createdAt: Date;
}

const profileColumns = `
	"id",
	"business_name" AS "businessName",
	"business_type" AS "businessType",
	"business_address" AS "businessAddress",
	"business_description" AS "businessDescription",
	"business_registration_number" AS "businessRegistrationNumber",
	"contact_person" AS "contactPerson",
	"contact_email" AS "contactEmail",
	"contact_phone" AS "contactPhone",
	"products_services" AS "productsServices",
	"supporting_document_urls" AS "supportingDocumentUrls",
	"status",
	"rejection_reason" AS "rejectionReason",
	"created_at" AS "createdAt",
	"updated_at" AS "updatedAt"
`;

type VendorProfileInput = {
	businessName: string;
	businessType: string;
	businessAddress: string;
	businessDescription: string;
	businessRegistrationNumber: string;
	contactPerson: string;
	contactEmail: string;
	contactPhone: string;
	productsServices: string[];
	supportingDocumentUrls: string[];
};

interface VendorProfileRecord extends VendorProfileInput {
	id: string;
	status: VendorProfileStatus;
	rejectionReason: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const routeId = (value: string | string[] | undefined): string => typeof value === 'string' ? value : '';
const documentStoragePath = (storageName: string): string | null => {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i.test(storageName)) {
		return null;
	}
	return path.resolve(config.vendorDocumentsDir, storageName);
};

const unlinkTemporaryDocument = async (filePath: string): Promise<void> => {
	try {
		await fs.unlink(filePath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
		throw error;
	}
};

const requireProfileEditable = async (userId: string, res: import('express').Response): Promise<boolean> => {
	const profile = await prisma.vendorProfile.findUnique({ where: { userId }, select: { status: true } });
	if (profile?.status === VendorProfileStatus.APPROVED) {
		res.status(403).json({ success: false, message: 'Approved business profiles cannot be edited' });
		return false;
	}
	if (profile?.status === VendorProfileStatus.PENDING_REVIEW) {
		res.status(409).json({ success: false, message: 'Business profiles cannot be edited while under review' });
		return false;
	}
	return true;
};

function isHttpsUrl(value: string): boolean {
	try {
		return new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
}

function validateProfile(body: unknown, requireComplete = false): { data?: VendorProfileInput; errors: Record<string, string> } {
	const errors: Record<string, string> = {};
	const input = body && typeof body === 'object' ? body as Record<string, unknown> : {};
	const readText = (key: string, maxLength: number): string => {
		const value = typeof input[key] === 'string' ? input[key].trim() : '';
		if (value.length > maxLength) errors[key] = `Must be ${maxLength} characters or fewer`;
		return value;
	};

	const businessName = readText('businessName', 120);
	const businessType = readText('businessType', 100);
	const businessAddress = readText('businessAddress', 500);
	const businessDescription = readText('businessDescription', 2000);
	const businessRegistrationNumber = readText('businessRegistrationNumber', 100);
	const contactPerson = readText('contactPerson', 120);
	const contactEmail = readText('contactEmail', 254).toLowerCase();
	const contactPhone = readText('contactPhone', 30);
	const parsedPhone = parsePhoneNumberFromString(contactPhone, 'ZA');

	if ((businessName.length > 0 && businessName.length < 2) || (requireComplete && businessName.length < 2)) {
		errors.businessName = 'Enter a business name';
	}
	if (requireComplete && businessType.length < 2) errors.businessType = 'Enter a business type or category';
	if (requireComplete && businessAddress.length < 5) errors.businessAddress = 'Enter a business address';
	if (requireComplete && businessDescription.length < 20) errors.businessDescription = 'Enter a business description of at least 20 characters';
	if (businessRegistrationNumber && !/^\d{4}\/\d{6}\/\d{2}$/.test(businessRegistrationNumber)) {
		errors.businessRegistrationNumber = 'Use the format 2020/123456/07';
	}
	if ((contactPerson.length > 0 && contactPerson.length < 2) || (requireComplete && contactPerson.length < 2)) {
		errors.contactPerson = 'Enter a contact person';
	}
	if ((contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) || (requireComplete && !contactEmail)) {
		errors.contactEmail = 'Enter a valid email address';
	}
	if ((contactPhone && !parsedPhone?.isValid()) || (requireComplete && !parsedPhone?.isValid())) {
		errors.contactPhone = 'Enter a valid international phone number';
	}
	const parseList = (key: string, maxItems: number, maxLength: number): string[] => {
		const value = input[key];
		if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
			errors[key] = 'Enter a valid list';
			return [];
		}
		const items = [...new Set((value as string[]).map(item => item.trim()).filter(Boolean))];
		if (items.length > maxItems) errors[key] = `Enter no more than ${maxItems} items`;
		if (items.some(item => item.length > maxLength)) errors[key] = `Each item must be ${maxLength} characters or fewer`;
		return items;
	};

	const productsServices = parseList('productsServices', 20, 100);
	const supportingDocumentUrls = parseList('supportingDocumentUrls', 10, 2048);
	if (supportingDocumentUrls.some(url => !isHttpsUrl(url))) {
		errors.supportingDocumentUrls = 'Supporting documents must use secure HTTPS links';
	}

	if (Object.keys(errors).length > 0) return { errors };
	return {
		errors,
		data: {
			businessName,
			businessType,
			businessAddress,
			businessDescription,
			businessRegistrationNumber,
			contactPerson,
			contactEmail,
			contactPhone: parsedPhone?.number ?? contactPhone,
			productsServices,
			supportingDocumentUrls,
		},
	};
}

const getVendorProfileView = async (userId: string) => {
	const profile = await prisma.vendorProfile.findUnique({
		where: { userId },
		select: {
			id: true,
			businessName: true,
			businessType: true,
			businessAddress: true,
			businessDescription: true,
			businessRegistrationNumber: true,
			contactPerson: true,
			contactEmail: true,
			contactPhone: true,
			productsServices: true,
			supportingDocumentUrls: true,
			status: true,
			rejectionReason: true,
			reviewedAt: true,
			createdAt: true,
			updatedAt: true,
			user: {
				select: {
					vendorDocuments: { select: { status: true } },
				},
			},
		},
	});
	if (!profile) return null;
	const documentStatuses = profile.user.vendorDocuments.map(document => document.status);
	const documentSubmissionStatus = documentStatuses.length === 0
		? 'NOT_SUBMITTED'
		: documentStatuses.includes(VendorDocumentStatus.REJECTED)
			? 'ACTION_REQUIRED'
			: documentStatuses.includes(VendorDocumentStatus.PENDING_REVIEW)
				? 'PENDING_REVIEW'
				: 'VERIFIED';
	const completedFields = [
		profile.businessName,
		profile.businessType,
		profile.businessAddress,
		profile.businessDescription,
		profile.contactPerson,
		profile.contactEmail,
		profile.contactPhone,
	];
	const completionPercentage = Math.round(
		(completedFields.filter(value => value.trim().length > 0).length / completedFields.length) * 100,
	);
	return {
		id: profile.id,
		businessName: profile.businessName,
		businessType: profile.businessType,
		businessAddress: profile.businessAddress,
		businessDescription: profile.businessDescription,
		businessRegistrationNumber: profile.businessRegistrationNumber,
		contactPerson: profile.contactPerson,
		contactEmail: profile.contactEmail,
		contactPhone: profile.contactPhone,
		productsServices: profile.productsServices,
		supportingDocumentUrls: profile.supportingDocumentUrls,
		status: profile.status,
		rejectionReason: profile.rejectionReason,
		reviewedAt: profile.reviewedAt,
		createdAt: profile.createdAt,
		updatedAt: profile.updatedAt,
		profileCompletionStatus: completionPercentage === 100 ? 'COMPLETE' : 'INCOMPLETE',
		completionPercentage,
		documentSubmissionStatus,
	};
};

const getVendorProfile = async (req: Request, res: Response) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { firstname: true, lastname: true, email: true },
	});
	if (!user) return res.status(404).json({ success: false, message: 'Vendor account not found' });

	await prisma.vendorProfile.upsert({
		where: { userId },
		create: {
			userId,
			contactPerson: `${user.firstname} ${user.lastname}`.trim(),
			contactEmail: user.email,
		},
		update: {},
	});
	const profile = await getVendorProfileView(userId);
	return res.json({ success: true, data: profile });
};

router.get('/profile', requireAuth, requireRole('VENDOR'), getVendorProfile);
router.get('/me', requireAuth, requireRole('VENDOR'), getVendorProfile);

type ProfileSaveMode = 'create' | 'patch' | 'upsert';

const saveVendorProfile = async (req: Request, res: Response, mode: ProfileSaveMode) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
		? req.body as Record<string, unknown>
		: {};
	const editableFields = [
		'businessName',
		'businessType',
		'businessAddress',
		'businessDescription',
		'businessRegistrationNumber',
		'contactPerson',
		'contactEmail',
		'contactPhone',
		'productsServices',
		'supportingDocumentUrls',
		'submitForReview',
	];
	const unsupportedField = Object.keys(body).find(field => !editableFields.includes(field));
	if (unsupportedField) {
		return res.status(400).json({
			success: false,
			message: 'The request contains non-editable profile fields',
			errors: [{ field: unsupportedField, message: 'This field cannot be changed here' }],
		});
	}
	if (body.submitForReview !== undefined && typeof body.submitForReview !== 'boolean') {
		return res.status(400).json({ success: false, message: 'submitForReview must be a boolean' });
	}
	if (mode === 'patch' && Object.keys(body).length === 0) {
		return res.status(400).json({ success: false, message: 'Provide at least one editable profile field' });
	}

	const current = await prisma.vendorProfile.findUnique({ where: { userId } });
	if (mode === 'create' && current) {
		return res.status(409).json({ success: false, message: 'A vendor profile already exists' });
	}
	if (mode === 'patch' && !current) {
		return res.status(404).json({ success: false, message: 'Vendor profile not found' });
	}
	const input = mode === 'patch' && current ? { ...current, ...body } : body;
	const submitForReview = body.submitForReview === true;
	const { data, errors } = validateProfile(input, mode === 'create' || submitForReview);
	if (!data) return res.status(400).json({ success: false, message: 'Check the highlighted profile fields', errors });

	const saved = await prisma.$transaction(async transaction => {
		await transaction.$queryRaw<Array<{ id: string }>>`
			SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE
		`;
		const lockedCurrent = await transaction.vendorProfile.findUnique({ where: { userId } });
		if (mode === 'create' && lockedCurrent) return { error: 'exists' as const };
		if (mode === 'patch' && !lockedCurrent) return { error: 'not_found' as const };
		if (
			lockedCurrent?.status === VendorProfileStatus.APPROVED ||
			lockedCurrent?.status === VendorProfileStatus.PENDING_REVIEW
		) return { error: 'not_editable' as const };

		const status = submitForReview
			? VendorProfileStatus.PENDING_REVIEW
			: lockedCurrent?.status ?? VendorProfileStatus.DRAFT;
		const profile = lockedCurrent
			? await transaction.vendorProfile.update({
				where: { userId },
				data: {
					...data,
					status,
					...(submitForReview ? { rejectionReason: null, reviewedAt: null } : {}),
				},
			})
			: await transaction.vendorProfile.create({
				data: {
					userId,
					...data,
					status,
				},
			});

		if (submitForReview) {
			await notifyAdmins(transaction, {
				title: lockedCurrent?.status === VendorProfileStatus.REJECTED
					? 'Vendor profile resubmitted'
					: 'Vendor profile submitted',
				message: `${data.businessName} submitted its vendor profile for review.`,
				link: '/admin/users/vendors/pending',
			});
		}
		return { profile };
	});

	if ('error' in saved) {
		if (saved.error === 'exists') return res.status(409).json({ success: false, message: 'A vendor profile already exists' });
		if (saved.error === 'not_found') return res.status(404).json({ success: false, message: 'Vendor profile not found' });
		return res.status(409).json({ success: false, message: 'Business profiles cannot be edited while approved or under review' });
	}
	const profileView = await getVendorProfileView(userId);
	return res.status(mode === 'create' ? 201 : 200).json({
		success: true,
		data: profileView,
		message: submitForReview ? 'Business profile submitted for review.' : 'Business profile saved.',
	});
};

router.post('/profile', requireAuth, requireRole('VENDOR'), (req, res) => saveVendorProfile(req, res, 'create'));
router.patch('/profile', requireAuth, requireRole('VENDOR'), (req, res) => saveVendorProfile(req, res, 'patch'));
router.put('/profile', requireAuth, requireRole('VENDOR'), (req, res) => saveVendorProfile(req, res, 'upsert'));

router.post('/documents', requireAuth, requireRole('VENDOR'), parseVendorPdf, async (req, res, next) => {
	const vendorId = req.user?.id;
	const file = req.file;
	if (!vendorId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	if (!file) return res.status(400).json({ success: false, message: 'Choose a PDF document to upload' });
	if (!await requireProfileEditable(vendorId, res)) {
		await unlinkTemporaryDocument(file.path);
		return;
	}

	try {
		const contents = await fs.readFile(file.path);
		if (contents.subarray(0, 5).toString('ascii') !== '%PDF-') {
			await unlinkTemporaryDocument(file.path);
			return res.status(400).json({ success: false, message: 'The selected file is not a valid PDF' });
		}

		const originalName = basename(file.originalname).replace(/[^\w .()\-]/g, '_').trim().slice(0, 200) || 'document.pdf';
		const document = await prisma.$transaction(async transaction => {
			await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "users" WHERE "id" = ${vendorId} FOR UPDATE`;
			const [count] = await transaction.$queryRaw<Array<{ count: bigint }>>`
				SELECT COUNT(*) AS "count" FROM "vendor_documents" WHERE "vendor_id" = ${vendorId}
			`;
			if (Number(count.count) >= maxVendorDocuments) return null;

			const [created] = await transaction.$queryRaw<VendorDocumentRecord[]>`
				INSERT INTO "vendor_documents" ("id", "vendor_id", "storage_name", "original_name", "size_bytes", "created_at")
				VALUES (${randomUUID()}, ${vendorId}, ${file.filename}, ${originalName}, ${file.size}, NOW())
				RETURNING "id", "original_name" AS "originalName", "storage_name" AS "storageName",
					"size_bytes" AS "sizeBytes", "status", "reviewed_at" AS "reviewedAt",
					"rejection_reason" AS "rejectionReason", "created_at" AS "createdAt"
			`;
			return created;
		});

		if (!document) {
			await unlinkTemporaryDocument(file.path);
			return res.status(409).json({ success: false, message: `You can upload up to ${maxVendorDocuments} documents` });
		}

		return res.status(201).json({
			success: true,
			data: {
				id: document.id,
				originalName: document.originalName,
				sizeBytes: document.sizeBytes,
				status: document.status,
				reviewedAt: document.reviewedAt,
				rejectionReason: document.rejectionReason,
				createdAt: document.createdAt,
			},
		});
	} catch (error) {
		await unlinkTemporaryDocument(file.path);
		return next(error);
	}
});

router.get('/documents', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const vendorId = req.user?.id;
	if (!vendorId) return res.status(401).json({ success: false, message: 'Not authenticated' });

	const documents = await prisma.$queryRaw<Array<Omit<VendorDocumentRecord, 'storageName'>> >`
		SELECT "id", "original_name" AS "originalName", "size_bytes" AS "sizeBytes",
			"status", "reviewed_at" AS "reviewedAt", "rejection_reason" AS "rejectionReason",
			"created_at" AS "createdAt"
		FROM "vendor_documents" WHERE "vendor_id" = ${vendorId} ORDER BY "created_at" DESC
	`;
	return res.json({ success: true, data: documents });
});

router.get('/documents/:id', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const vendorId = req.user?.id;
	const id = routeId(req.params.id);
	if (!vendorId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	const document = await prisma.vendorDocument.findFirst({
		where: { id, vendorId },
		select: {
			id: true,
			originalName: true,
			sizeBytes: true,
			status: true,
			reviewedAt: true,
			rejectionReason: true,
			createdAt: true,
		},
	});
	if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
	return res.json({ success: true, data: document });
});

router.put('/documents/:id', requireAuth, requireRole('VENDOR'), parseVendorPdf, async (req, res, next) => {
	const vendorId = req.user?.id;
	const id = routeId(req.params.id);
	const file = req.file;
	if (!vendorId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	if (!file) return res.status(400).json({ success: false, message: 'Choose a PDF document to upload' });
	if (!await requireProfileEditable(vendorId, res)) {
		await unlinkTemporaryDocument(file.path);
		return;
	}

	try {
		const contents = await fs.readFile(file.path);
		if (contents.subarray(0, 5).toString('ascii') !== '%PDF-') {
			await unlinkTemporaryDocument(file.path);
			return res.status(400).json({ success: false, message: 'The selected file is not a valid PDF' });
		}
		const originalName = basename(file.originalname).replace(/[^\w .()\-]/g, '_').trim().slice(0, 200) || 'document.pdf';
		const result = await prisma.$transaction(async transaction => {
			await transaction.$queryRaw<Array<{ id: string }>>`
				SELECT "id" FROM "users" WHERE "id" = ${vendorId} FOR UPDATE
			`;
			const profile = await transaction.vendorProfile.findUnique({
				where: { userId: vendorId },
				select: { status: true },
			});
			if (profile?.status === VendorProfileStatus.APPROVED || profile?.status === VendorProfileStatus.PENDING_REVIEW) {
				return { error: 'profile_locked' as const };
			}
			const document = await transaction.vendorDocument.findFirst({
				where: { id, vendorId },
				select: { storageName: true, status: true },
			});
			if (!document) return { error: 'not_found' as const };
			if (document.status !== VendorDocumentStatus.PENDING_REVIEW) return { error: 'reviewed' as const };
			await transaction.vendorDocument.update({
				where: { id },
				data: {
					storageName: file.filename,
					originalName,
					sizeBytes: file.size,
					reviewedAt: null,
					reviewedById: null,
					rejectionReason: null,
				},
			});
			return { previousStorageName: document.storageName };
		});
		if ('error' in result) {
			await unlinkTemporaryDocument(file.path);
			if (result.error === 'not_found') return res.status(404).json({ success: false, message: 'Document not found' });
			if (result.error === 'reviewed') return res.status(409).json({ success: false, message: 'Reviewed documents are retained; upload a new document instead' });
			return res.status(409).json({ success: false, message: 'Documents cannot be changed while the profile is approved or under review' });
		}
		const previousPath = documentStoragePath(result.previousStorageName);
		if (previousPath) {
			await fs.unlink(previousPath).catch((error: NodeJS.ErrnoException) => {
				if (error.code !== 'ENOENT') console.error('Previous vendor document cleanup failed:', error);
			});
		}
		const updated = await prisma.vendorDocument.findUniqueOrThrow({
			where: { id },
			select: {
				id: true,
				originalName: true,
				sizeBytes: true,
				status: true,
				reviewedAt: true,
				rejectionReason: true,
				createdAt: true,
			},
		});
		return res.json({ success: true, data: updated, message: 'Document replaced and submitted for review.' });
	} catch (error) {
		await unlinkTemporaryDocument(file.path);
		return next(error);
	}
});

const listAdminVendorProfiles = (status: VendorProfileStatus) => async (req: Request, res: Response) => {
	const page = Number(req.query.page ?? 1);
	const limit = Number(req.query.limit ?? 20);
	const where = { status };
	const [profiles, total] = await Promise.all([
		prisma.vendorProfile.findMany({
			where,
			include: {
				user: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						email: true,
						isActive: true,
						createdAt: true,
						vendorDocuments: {
							orderBy: { createdAt: 'asc' },
							select: {
								id: true,
								originalName: true,
								sizeBytes: true,
								status: true,
								reviewedAt: true,
								rejectionReason: true,
								createdAt: true,
							},
						},
					},
				},
			},
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
			skip: (page - 1) * limit,
			take: limit,
		}),
		prisma.vendorProfile.count({ where }),
	]);
	return res.json({
		success: true,
		data: profiles,
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
	});
};

router.get('/admin/profiles/pending',  requireAuth, requireRole('ADMIN'), listAdminVendorProfiles(VendorProfileStatus.PENDING_REVIEW));
router.get('/admin/profiles/approved', requireAuth, requireRole('ADMIN'), listAdminVendorProfiles(VendorProfileStatus.APPROVED));
router.get('/admin/profiles/rejected', requireAuth, requireRole('ADMIN'), listAdminVendorProfiles(VendorProfileStatus.REJECTED));

router.get('/admin/profiles/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
	const profileId = routeId(req.params.id);
	if (!profileId) return res.status(400).json({ success: false, message: 'A valid vendor profile ID is required' });
	const profile = await prisma.vendorProfile.findUnique({
		where: { id: profileId },
		select: {
			id: true,
			businessName: true,
			businessType: true,
			businessAddress: true,
			businessDescription: true,
			businessRegistrationNumber: true,
			contactPerson: true,
			contactEmail: true,
			contactPhone: true,
			productsServices: true,
			supportingDocumentUrls: true,
			status: true,
			rejectionReason: true,
			reviewedAt: true,
			createdAt: true,
			updatedAt: true,
			user: {
				select: {
					id: true,
					firstname: true,
					lastname: true,
					email: true,
					isActive: true,
					vendorDocuments: {
						orderBy: { createdAt: 'asc' },
						select: {
							id: true,
							originalName: true,
							sizeBytes: true,
							status: true,
							reviewedAt: true,
							rejectionReason: true,
							createdAt: true,
						},
					},
				},
			},
		},
	});
	if (!profile) return res.status(404).json({ success: false, message: 'Vendor profile not found' });
	return res.json({ success: true, data: profile });
});

const deactivateVendorProfile = async (req: Request, res: Response) => {
	const profileId = routeId(req.params.id);
	if (!profileId) return res.status(400).json({ success: false, message: 'A valid vendor profile ID is required' });
	const result = await prisma.$transaction(async transaction => {
		const profile = await transaction.vendorProfile.findUnique({
			where: { id: profileId },
			select: { userId: true },
		});
		if (!profile) return 'not_found' as const;
		const updated = await transaction.user.updateMany({
			where: { id: profile.userId, role: 'VENDOR', isActive: true },
			data: { isActive: false },
		});
		if (updated.count !== 1) return 'inactive' as const;
		await transaction.auditLog.create({
			data: {
				actorId: req.user!.id,
				affectedUserId: profile.userId,
				action: 'VENDOR_ACCOUNT_DEACTIVATED',
				outcome: 'deactivated_records_preserved',
			},
		});
		return 'deactivated' as const;
	});
	if (result === 'not_found') return res.status(404).json({ success: false, message: 'Vendor profile not found' });
	if (result === 'inactive') return res.status(409).json({ success: false, message: 'Vendor account is already inactive' });
	return res.json({ success: true, message: 'Vendor access deactivated; profile and related records were preserved.' });
};

router.patch('/admin/profiles/:id/deactivate', requireAuth, requireRole('ADMIN'), deactivateVendorProfile);
router.delete('/admin/profiles/:id', requireAuth, requireRole('ADMIN'), deactivateVendorProfile);

router.get('/admin/documents', requireAuth, requireRole('ADMIN'), async (req, res) => {
	const allowedStatuses = Object.values(VendorDocumentStatus);
	const rawStatus = req.query.status;
	if (rawStatus !== undefined && (typeof rawStatus !== 'string' || !allowedStatuses.includes(rawStatus as VendorDocumentStatus))) {
		return res.status(400).json({ success: false, message: 'A valid document status is required' });
	}
	const page = Number(req.query.page ?? 1);
	const limit = Number(req.query.limit ?? 20);
	const where = rawStatus ? { status: rawStatus as VendorDocumentStatus } : {};
	const [documents, total] = await Promise.all([
		prisma.vendorDocument.findMany({
			where,
			select: {
				id: true,
				originalName: true,
				sizeBytes: true,
				status: true,
				reviewedAt: true,
				rejectionReason: true,
				createdAt: true,
				vendor: { select: { id: true, firstname: true, lastname: true, email: true } },
				reviewedBy: { select: { id: true, firstname: true, lastname: true } },
			},
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
			skip: (page - 1) * limit,
			take: limit,
		}),
		prisma.vendorDocument.count({ where }),
	]);
	return res.json({
		success: true,
		data: documents,
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
	});
});

router.get('/admin/documents/:id/download', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
	const id = routeId(req.params.id);
	if (!id) return res.status(400).json({ success: false, message: 'A valid document ID is required' });
	const document = await prisma.vendorDocument.findUnique({ where: { id } });
	if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
	const storagePath = documentStoragePath(document.storageName);
	if (!storagePath) return res.status(404).json({ success: false, message: 'Document not found' });
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('Cache-Control', 'private, no-store');
	return res.download(storagePath, document.originalName, error => {
		if (error && !res.headersSent) next(error);
	});
});

const reviewVendorDocument = async (
	documentId: string,
	adminId: string,
	status: 'APPROVED' | 'REJECTED',
	rejectionReason?: string,
): Promise<'not_found' | 'already_reviewed' | 'reviewed'> => prisma.$transaction(async transaction => {
	await transaction.$queryRaw<Array<{ id: string }>>`
		SELECT "id" FROM "vendor_documents" WHERE "id" = ${documentId} FOR UPDATE
	`;
	const document = await transaction.vendorDocument.findUnique({
		where: { id: documentId },
		select: { id: true, vendorId: true, status: true },
	});
	if (!document) return 'not_found';
	if (document.status !== VendorDocumentStatus.PENDING_REVIEW) return 'already_reviewed';
	const updated = await transaction.vendorDocument.updateMany({
		where: { id: documentId, status: VendorDocumentStatus.PENDING_REVIEW },
		data: {
			status,
			reviewedAt: new Date(),
			reviewedById: adminId,
			rejectionReason: status === VendorDocumentStatus.REJECTED ? rejectionReason : null,
		},
	});
	if (updated.count !== 1) return 'already_reviewed';
	await transaction.auditLog.create({
		data: {
			actorId: adminId,
			affectedUserId: document.vendorId,
			action: status === VendorDocumentStatus.APPROVED ? 'VENDOR_DOCUMENT_APPROVED' : 'VENDOR_DOCUMENT_REJECTED',
			outcome: status === VendorDocumentStatus.APPROVED ? 'approved' : 'rejected',
		},
	});
	await transaction.notification.create({
		data: {
			recipientId: document.vendorId,
			title: status === VendorDocumentStatus.APPROVED ? 'Vendor document verified' : 'Vendor document needs attention',
			message: status === VendorDocumentStatus.APPROVED
				? 'An administrator verified one of your submitted documents.'
				: `An administrator rejected one of your submitted documents. Reason: ${rejectionReason}`,
			link: '/vendor/profile',
		},
	});
	return 'reviewed';
});

router.patch('/admin/documents/:id/verify', requireAuth, requireRole('ADMIN'), async (req, res) => {
	const id = routeId(req.params.id);
	if (!id) return res.status(400).json({ success: false, message: 'A valid document ID is required' });
	const result = await reviewVendorDocument(id, req.user!.id, VendorDocumentStatus.APPROVED);
	if (result === 'not_found') return res.status(404).json({ success: false, message: 'Document not found' });
	if (result === 'already_reviewed') return res.status(409).json({ success: false, message: 'This document has already been reviewed' });
	return res.json({ success: true, message: 'Vendor document verified.' });
});

router.patch('/admin/documents/:id/reject', requireAuth, requireRole('ADMIN'), async (req, res) => {
	const id = routeId(req.params.id);
	const rejectionReason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
	if (!id) return res.status(400).json({ success: false, message: 'A valid document ID is required' });
	if (rejectionReason.length < 10 || rejectionReason.length > 2000) {
		return res.status(400).json({ success: false, message: 'Document feedback must be between 10 and 2000 characters' });
	}
	const result = await reviewVendorDocument(id, req.user!.id, VendorDocumentStatus.REJECTED, rejectionReason);
	if (result === 'not_found') return res.status(404).json({ success: false, message: 'Document not found' });
	if (result === 'already_reviewed') return res.status(409).json({ success: false, message: 'This document has already been reviewed' });
	return res.json({ success: true, message: 'Vendor document rejected.' });
});

const reviewVendorProfile = async (
	profileId: string,
	status: 'APPROVED' | 'REJECTED',
	adminId: string,
	rejectionReason?: string,
): Promise<null | { email: string; firstname: string; businessName: string }> => prisma.$transaction(async transaction => {
	const profile = await transaction.vendorProfile.findFirst({
		where: { id: profileId, status: VendorProfileStatus.PENDING_REVIEW },
		select: {
			id: true,
			userId: true,
			businessName: true,
			user: { select: { email: true, firstname: true } },
		},
	});
	if (!profile) return null;
	const updated = await transaction.vendorProfile.updateMany({
		where: { id: profile.id, status: VendorProfileStatus.PENDING_REVIEW },
		data: {
			status,
			rejectionReason: status === VendorProfileStatus.REJECTED ? rejectionReason : null,
			reviewedAt: new Date(),
		},
	});
	if (updated.count !== 1) return null;
	if (status === VendorProfileStatus.APPROVED) {
		await transaction.vendorDocument.updateMany({
			where: { vendorId: profile.userId, status: VendorDocumentStatus.PENDING_REVIEW },
			data: {
				status: VendorDocumentStatus.APPROVED,
				reviewedAt: new Date(),
				reviewedById: adminId,
				rejectionReason: null,
			},
		});
	}
	await transaction.auditLog.create({
		data: {
			actorId: adminId,
			affectedUserId: profile.userId,
			action: status === VendorProfileStatus.APPROVED ? 'VENDOR_PROFILE_APPROVED' : 'VENDOR_PROFILE_REJECTED',
			outcome: status === VendorProfileStatus.APPROVED ? 'approved' : 'rejected',
		},
	});
	await transaction.notification.create({
		data: {
			recipientId: profile.userId,
			title: status === VendorProfileStatus.APPROVED ? 'Vendor profile approved' : 'Vendor profile rejected',
			message: status === VendorProfileStatus.APPROVED
				? 'Your vendor profile was approved. You can now apply to participate in events.'
				: `Your vendor profile was rejected. Reason: ${rejectionReason}`,
			link: '/vendor/profile',
		},
	});
	return { email: profile.user.email, firstname: profile.user.firstname, businessName: profile.businessName };
});

router.patch('/admin/profiles/:id/approve', requireAuth, requireRole('ADMIN'), async (req, res) => {
	const id = routeId(req.params.id);
	if (!id) return res.status(400).json({ success: false, message: 'A valid profile ID is required' });
	const reviewed = await reviewVendorProfile(id, VendorProfileStatus.APPROVED, req.user!.id);
	if (!reviewed) return res.status(404).json({ success: false, message: 'Pending vendor profile not found' });
	let emailSent = true;
	try {
		await sendVendorProfileDecision({ ...reviewed, status: 'APPROVED' });
	} catch (error) {
		console.error('Vendor profile approval email failed:', error);
		emailSent = false;
	}
	return res.json({
		success: true,
		message: 'Vendor profile approved. The vendor can now apply for stands.',
		data: { emailSent },
	});
});

router.patch('/admin/profiles/:id/reject', requireAuth, requireRole('ADMIN'), async (req, res) => {
	const id = routeId(req.params.id);
	if (!id) return res.status(400).json({ success: false, message: 'A valid profile ID is required' });
	const rejectionReason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
	if (rejectionReason.length < 10 || rejectionReason.length > 2000) {
		return res.status(400).json({ success: false, message: 'Rejection feedback must be between 10 and 2000 characters.' });
	}
	const reviewed = await reviewVendorProfile(id, VendorProfileStatus.REJECTED, req.user!.id, rejectionReason);
	if (!reviewed) return res.status(404).json({ success: false, message: 'Pending vendor profile not found' });
	let emailSent = true;
	try {
		await sendVendorProfileDecision({ ...reviewed, status: 'REJECTED', rejectionReason });
	} catch (error) {
		console.error('Vendor profile rejection email failed:', error);
		emailSent = false;
	}
	return res.json({ success: true, message: 'Vendor profile rejected.', data: { emailSent } });
});

router.get('/documents/:id/download', requireAuth, requireRole('VENDOR'), async (req, res, next) => {
	const vendorId = req.user?.id;
	if (!vendorId) return res.status(401).json({ success: false, message: 'Not authenticated' });

	const [document] = await prisma.$queryRaw<VendorDocumentRecord[]>`
		SELECT "id", "original_name" AS "originalName", "storage_name" AS "storageName",
			"size_bytes" AS "sizeBytes", "status", "reviewed_at" AS "reviewedAt",
			"rejection_reason" AS "rejectionReason", "created_at" AS "createdAt"
		FROM "vendor_documents" WHERE "id" = ${req.params.id} AND "vendor_id" = ${vendorId} LIMIT 1
	`;
	if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
	const storagePath = documentStoragePath(document.storageName);
	if (!storagePath) return res.status(404).json({ success: false, message: 'Document not found' });

	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('Cache-Control', 'private, no-store');
	return res.download(storagePath, document.originalName, error => {
		if (error && !res.headersSent) next(error);
	});
});

router.delete('/documents/:id', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const vendorId = req.user?.id;
	const id = routeId(req.params.id);
	if (!vendorId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	if (!id) return res.status(400).json({ success: false, message: 'A valid document UUID is required' });
	const result = await prisma.$transaction(async transaction => {
		await transaction.$queryRaw<Array<{ id: string }>>`
			SELECT "id" FROM "users" WHERE "id" = ${vendorId} FOR UPDATE
		`;
		const profile = await transaction.vendorProfile.findUnique({
			where: { userId: vendorId },
			select: { status: true },
		});
		if (profile?.status === VendorProfileStatus.APPROVED || profile?.status === VendorProfileStatus.PENDING_REVIEW) {
			return { error: 'profile_locked' as const };
		}
		const document = await transaction.vendorDocument.findFirst({
			where: { id, vendorId },
			select: { id: true, storageName: true, status: true },
		});
		if (!document) return { error: 'not_found' as const };
		if (document.status !== VendorDocumentStatus.PENDING_REVIEW) return { error: 'reviewed' as const };
		const storagePath = documentStoragePath(document.storageName);
		if (!storagePath) return { error: 'invalid_path' as const };
		const deleted = await transaction.vendorDocument.deleteMany({
			where: { id, vendorId, status: VendorDocumentStatus.PENDING_REVIEW },
		});
		if (deleted.count !== 1) return { error: 'reviewed' as const };
		return { document, storagePath };
	});
	if ('error' in result) {
		if (result.error === 'not_found') return res.status(404).json({ success: false, message: 'Document not found' });
		if (result.error === 'reviewed') return res.status(409).json({ success: false, message: 'Reviewed documents are retained for audit history' });
		if (result.error === 'invalid_path') return res.status(404).json({ success: false, message: 'Document not found' });
		return res.status(409).json({ success: false, message: 'Documents cannot be changed while the profile is approved or under review' });
	}

	await fs.unlink(result.storagePath).catch((error: NodeJS.ErrnoException) => {
		if (error.code !== 'ENOENT') throw error;
	});
	return res.json({ success: true, message: 'Document removed' });
});

const submitVendorApplication = async (req: Request, res: Response) => {
	const userId = req.user?.id;
	const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
		? req.body as Record<string, unknown>
		: {};
	const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
	const requestedStandType = typeof body.requestedStandType === 'string' ? body.requestedStandType.trim() : '';
	const requestedStandSize = typeof body.requestedStandSize === 'string' ? body.requestedStandSize.trim() : '';
	const standDescription = typeof body.standDescription === 'string' ? body.standDescription.trim() : '';
	const supportingInformation = typeof body.supportingInformation === 'string' ? body.supportingInformation.trim() : '';
	const staffInput = body.staffMembers ?? [];
	if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	const allowedFields = ['eventId', 'requestedStandType', 'requestedStandSize', 'standDescription', 'supportingInformation', 'staffMembers'];
	const unexpectedField = Object.keys(body).find(field => !allowedFields.includes(field));
	if (unexpectedField) {
		return res.status(400).json({
			success: false,
			message: 'The application contains non-editable fields',
			errors: [{ field: unexpectedField, message: 'This field cannot be submitted' }],
		});
	}
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
		return res.status(400).json({ success: false, message: 'A valid event UUID is required' });
	}
	if (requestedStandType.length < 2 || requestedStandType.length > 80) {
		return res.status(400).json({ success: false, message: 'Stand type must be between 2 and 80 characters' });
	}
	if (requestedStandSize.length < 2 || requestedStandSize.length > 80) {
		return res.status(400).json({ success: false, message: 'Stand size must be between 2 and 80 characters' });
	}
	if (standDescription.length < 10 || standDescription.length > 2000) {
		return res.status(400).json({ success: false, message: 'Stand details must be between 10 and 2000 characters' });
	}
	if (supportingInformation.length > 2000) {
		return res.status(400).json({ success: false, message: 'Supporting information must be no more than 2000 characters' });
	}
	const dimensions = /^(\d{1,3}(?:\.\d{1,2})?)\s*m?\s*[x×]\s*(\d{1,3}(?:\.\d{1,2})?)\s*m?$/i.exec(requestedStandSize);
	if (!dimensions) return res.status(400).json({ success: false, message: 'Enter stand width and depth in metres, for example 3m x 3m' });
	const standWidth = Number(dimensions[1]);
	const standDepth = Number(dimensions[2]);
	if (standWidth <= 0 || standDepth <= 0 || standWidth > 100 || standDepth > 100) {
		return res.status(400).json({ success: false, message: 'Stand width and depth must be greater than zero and no more than 100 metres' });
	}
	if (!Array.isArray(staffInput) || staffInput.length > 20) {
		return res.status(400).json({ success: false, message: 'Add no more than 20 staff members' });
	}
	const staffMembers: Array<{ name: string; email: string }> = [];
	const staffEmails = new Set<string>();
	for (const item of staffInput) {
		if (!item || typeof item !== 'object' || Array.isArray(item)) {
			return res.status(400).json({ success: false, message: 'Each staff member needs a name and email address' });
		}
		const name = typeof item.name === 'string' ? item.name.trim() : '';
		const email = typeof item.email === 'string' ? item.email.trim().toLowerCase() : '';
		if (name.length < 2 || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return res.status(400).json({ success: false, message: 'Enter a valid name and email for every staff member' });
		}
		if (staffEmails.has(email)) return res.status(400).json({ success: false, message: 'Staff email addresses must be unique within an application' });
		staffEmails.add(email);
		staffMembers.push({ name, email });
	}
	const standAreaSqm = Math.round(standWidth * standDepth * 100) / 100;
	const result = await prisma.$transaction(async transaction => {
		await transaction.$queryRaw<Array<{ id: string }>>`
			SELECT "id" FROM "events" WHERE "id" = ${eventId} FOR UPDATE
		`;
		const event = await transaction.event.findUnique({
			where: { id: eventId },
			select: {
				id: true,
				title: true,
				status: true,
				startTime: true,
				vendorStandsAvailable: true,
				vendorStandRatePerSqm: true,
				organizer: { select: { id: true, firstname: true, email: true } },
				_count: { select: { vendorApplications: { where: { status: 'APPROVED' } } } },
			},
		});
		if (!event) return { error: 'not_found' as const };
		if (event.status !== 'PUBLISHED' || event.startTime <= new Date()) return { error: 'closed' as const };
		if (event.vendorStandsAvailable - event._count.vendorApplications <= 0) return { error: 'full' as const };

		const profile = await transaction.vendorProfile.findUnique({
			where: { userId },
			select: {
				businessName: true,
				businessRegistrationNumber: true,
				businessDescription: true,
				productsServices: true,
				status: true,
			},
		});
		if (profile?.status !== VendorProfileStatus.APPROVED) return { error: 'profile_unapproved' as const };
		if (!profile.businessName.trim()) return { error: 'profile_incomplete' as const };

		const existing = await transaction.vendorApplication.findFirst({
			where: { vendorId: userId, eventId, status: { not: 'REJECTED' } },
			select: { id: true },
		});
		if (existing) return { error: 'duplicate' as const };

		const standRatePerSqm = Number(event.vendorStandRatePerSqm);
		const quotedAmount = Math.round(standAreaSqm * standRatePerSqm * 100) / 100;
		const application = await transaction.vendorApplication.create({
			data: {
				vendorId: userId,
				eventId,
				companyName: profile.businessName,
				registrationNumber: profile.businessRegistrationNumber,
				description: profile.businessDescription || profile.productsServices.join(', ') || profile.businessName,
				requestedStandType,
				requestedStandSize: `${standWidth}m x ${standDepth}m`,
				standDescription,
				supportingInformation: supportingInformation || null,
				standAreaSqm,
				standRatePerSqm,
				quotedAmount,
				staffMembers: {
					create: staffMembers.map(member => ({
						...member,
						entryPassId: `VND-${randomUUID().slice(0, 8).toUpperCase()}`,
					})),
				},
			},
			include: {
				staffMembers: true,
				event: { select: { id: true, title: true, date: true, venue: true } },
				invoice: true,
			},
		});
		await transaction.notification.create({
			data: {
				recipientId: event.organizer.id,
				title: 'New vendor stand application',
				message: `${profile.businessName} submitted a stand application for ${event.title}.`,
				link: `/organizer/events/${eventId}/vendors`,
			},
		});
		return {
			application,
			eventTitle: event.title,
			organizerEmail: event.organizer.email,
			organizerFirstname: event.organizer.firstname,
			businessName: profile.businessName,
		};
	});

	if ('error' in result) {
		if (result.error === 'not_found') return res.status(404).json({ success: false, message: 'Event not found' });
		if (result.error === 'closed') return res.status(409).json({ success: false, message: 'Applications are only available for published events before they start' });
		if (result.error === 'full') return res.status(409).json({ success: false, message: 'No vendor stands are currently available' });
		if (result.error === 'profile_unapproved') return res.status(403).json({ success: false, message: 'An approved vendor profile is required to apply' });
		if (result.error === 'profile_incomplete') return res.status(400).json({ success: false, message: 'Complete your business profile before applying for a stand' });
		return res.status(409).json({ success: false, message: 'You already have an active application for this event' });
	}

	let organizerEmailSent = true;
	try {
		await sendVendorApplicationSubmitted({
			email: result.organizerEmail,
			firstname: result.organizerFirstname,
			businessName: result.businessName,
			eventTitle: result.eventTitle,
		});
	} catch (error) {
		console.error('New vendor application email failed:', error);
		organizerEmailSent = false;
	}
	return res.status(201).json({
		success: true,
		data: result.application,
		message: 'Vendor application submitted.',
		organizerEmailSent,
	});
};

router.post('/apply', requireAuth, requireRole('VENDOR'), (req, res) => submitVendorApplication(req, res));
router.post('/applications', requireAuth, requireRole('VENDOR'), (req, res) => submitVendorApplication(req, res));

const vendorApplicationView = {
	event: { select: { id: true, title: true, date: true, startTime: true, endTime: true, venue: true, status: true } },
	invoice: true,
	staffMembers: true,
	decidedBy: { select: { firstname: true, lastname: true } },
} satisfies Prisma.VendorApplicationInclude;

router.get('/applications/me', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	const page = Number(req.query.page ?? 1);
	const limit = Number(req.query.limit ?? 20);
	const where = { vendorId: userId };
	const [applications, total] = await Promise.all([
		prisma.vendorApplication.findMany({
			where,
			include: vendorApplicationView,
			orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
			skip: (page - 1) * limit,
			take: limit,
		}),
		prisma.vendorApplication.count({ where }),
	]);
	return res.json({
		success: true,
		data: applications,
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
	});
});

router.get('/events', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const readFilter = (key: string, maximum: number): string | null => {
		const value = req.query[key];
		if (value === undefined) return '';
		return typeof value === 'string' && value.trim().length <= maximum ? value.trim() : null;
	};
	const search = readFilter('search', 100);
	const category = readFilter('category', 80);
	const location = readFilter('location', 120);
	if (search === null || category === null || location === null) {
		return res.status(400).json({ success: false, message: 'Search filters must be single strings within their allowed length' });
	}
	const page = Number(req.query.page ?? 1);
	const limit = Number(req.query.limit ?? 20);
	const criteria = Prisma.sql`
		e."status" = 'PUBLISHED'::"EventStatus"
		AND e."start_time" > ${new Date()}
		AND e."vendor_stands_available" > (
			SELECT COUNT(*) FROM "vendor_applications" va
			WHERE va."event_id" = e."id" AND va."status" = 'APPROVED'::"VendorApplicationStatus"
		)
		${search ? Prisma.sql`AND (
			e."title" ILIKE ${`%${search}%`} OR
			e."description" ILIKE ${`%${search}%`} OR
			e."category" ILIKE ${`%${search}%`} OR
			e."venue" ILIKE ${`%${search}%`}
		)` : Prisma.empty}
		${category ? Prisma.sql`AND e."category" = ${category}` : Prisma.empty}
		${location ? Prisma.sql`AND e."venue" ILIKE ${`%${location}%`}` : Prisma.empty}
	`;
	const [countRows, events] = await Promise.all([
		prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
			SELECT COUNT(*)::int AS "total" FROM "events" e WHERE ${criteria}
		`),
		prisma.$queryRaw<Array<{
			id: string;
			title: string;
			description: string;
			category: string;
			venue: string;
			date: Date;
			startTime: Date;
			endTime: Date;
			availableVendorStands: number;
		}>>(Prisma.sql`
			SELECT
				e."id",
				e."title",
				e."description",
				e."category",
				e."venue",
				e."date",
				e."start_time" AS "startTime",
				e."end_time" AS "endTime",
				(e."vendor_stands_available" - (
					SELECT COUNT(*) FROM "vendor_applications" va
					WHERE va."event_id" = e."id" AND va."status" = 'APPROVED'::"VendorApplicationStatus"
				))::int AS "availableVendorStands"
			FROM "events" e
			WHERE ${criteria}
			ORDER BY e."start_time" ASC, e."id" ASC
			LIMIT ${limit} OFFSET ${(page - 1) * limit}
		`),
	]);
	const total = countRows[0]?.total ?? 0;
	return res.json({
		success: true,
		data: events.map(event => ({
			...event,
			location: event.venue,
			applicationDeadline: event.startTime,
			applicationRequirements: null,
		})),
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
	});
});

router.get('/applications/:id', requireAuth, requireRole('VENDOR', 'ORGANIZER'), async (req, res) => {
	const id = routeId(req.params.id);
	if (!id) return res.status(400).json({ success: false, message: 'A valid application UUID is required' });
	const application = await prisma.vendorApplication.findUnique({
		where: { id },
		include: {
			...vendorApplicationView,
			vendor: {
				select: {
					id: true,
					firstname: true,
					lastname: true,
					email: true,
					vendorProfile: {
						select: {
							businessName: true,
							businessType: true,
							businessAddress: true,
							businessDescription: true,
							businessRegistrationNumber: true,
							contactPerson: true,
							contactEmail: true,
							contactPhone: true,
							productsServices: true,
							supportingDocumentUrls: true,
						},
					},
				},
			},
		},
	});
	if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
	const isVendorOwner = req.user!.role === 'VENDOR' && application.vendorId === req.user!.id;
	const isOrganizerOwner = req.user!.role === 'ORGANIZER' && Boolean(await prisma.event.findFirst({
		where: { id: application.eventId, organizerId: req.user!.id },
		select: { id: true },
	}));
	if (!isVendorOwner && !isOrganizerOwner) return res.status(404).json({ success: false, message: 'Application not found' });
	return res.json({ success: true, data: application });
});

router.get('/invoices', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const vendorId = req.user!.id;
	const page = Number(req.query.page ?? 1);
	const limit = Number(req.query.limit ?? 20);
	const where = { application: { is: { vendorId } } };
	const [invoices, total] = await Promise.all([
		prisma.vendorInvoice.findMany({
			where,
			include: {
				application: {
					select: {
						id: true,
						status: true,
						assignedStand: true,
						event: { select: { id: true, title: true, date: true, venue: true } },
					},
				},
			},
			orderBy: [{ issuedAt: 'desc' }, { id: 'asc' }],
			skip: (page - 1) * limit,
			take: limit,
		}),
		prisma.vendorInvoice.count({ where }),
	]);
	return res.json({
		success: true,
		data: invoices,
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
	});
});

router.get('/invoices/:id', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const id = routeId(req.params.id);
	if (!id) return res.status(400).json({ success: false, message: 'A valid invoice UUID is required' });
	const invoice = await prisma.vendorInvoice.findFirst({
		where: { id, application: { is: { vendorId: req.user!.id } } },
		include: {
			application: {
				select: {
					id: true,
					status: true,
					assignedStand: true,
					event: { select: { id: true, title: true, date: true, venue: true } },
				},
			},
		},
	});
	if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
	return res.json({ success: true, data: invoice });
});

router.get('/staff', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

	const staffMembers = await prisma.vendorStaffMember.findMany({
		where: { application: { is: { vendorId: userId, status: 'APPROVED' } } },
		select: {
			id: true,
			name: true,
			email: true,
			entryPassId: true,
			application: {
				select: {
					id: true,
					event: { select: { id: true, title: true, date: true, venue: true } },
				},
			},
		},
		orderBy: { name: 'asc' },
	});

	return res.json({ success: true, data: staffMembers });
});

router.post('/:id/staff', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const vendorId = req.user?.id;
	const applicationId = routeId(req.params.id);
	const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
	const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
	if (!vendorId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	if (!applicationId) return res.status(400).json({ success: false, message: 'A valid application ID is required' });
	if (name.length < 2 || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return res.status(400).json({ success: false, message: 'Enter a valid staff name and email address' });
	}

	const result = await prisma.$transaction(async transaction => {
		await transaction.$queryRaw<Array<{ id: string }>>`
			SELECT "id" FROM "vendor_applications" WHERE "id" = ${applicationId} FOR UPDATE
		`;
		const application = await transaction.vendorApplication.findFirst({
			where: {
				id: applicationId,
				vendorId,
				status: 'APPROVED',
				event: { is: { startTime: { gt: new Date() } } },
			},
			select: {
				id: true,
				_count: { select: { staffMembers: true } },
			},
		});
		if (!application) return { error: 'not_found' as const };
		if (application._count.staffMembers >= 20) return { error: 'limit' as const };
		const duplicate = await transaction.vendorStaffMember.findFirst({
			where: { applicationId, email },
			select: { id: true },
		});
		if (duplicate) return { error: 'duplicate' as const };

		return {
			staff: await transaction.vendorStaffMember.create({
				data: {
					applicationId,
					name,
					email,
					entryPassId: `VND-${randomUUID().slice(0, 8).toUpperCase()}`,
				},
			}),
		};
	});

	if ('error' in result) {
		if (result.error === 'limit') return res.status(409).json({ success: false, message: 'An application can have no more than 20 staff members' });
		if (result.error === 'duplicate') return res.status(409).json({ success: false, message: 'This email is already assigned to staff on the application' });
		return res.status(404).json({ success: false, message: 'Approved application not found or the event has started' });
	}
	return res.status(201).json({ success: true, data: result.staff });
});

router.get('/staff/:id', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const id = routeId(req.params.id);
	if (!id) return res.status(400).json({ success: false, message: 'A valid staff member UUID is required' });
	const staff = await prisma.vendorStaffMember.findFirst({
		where: { id, application: { is: { vendorId: req.user!.id, status: 'APPROVED' } } },
		select: {
			id: true,
			name: true,
			email: true,
			entryPassId: true,
			application: { select: { id: true, event: { select: { id: true, title: true, date: true, venue: true } } } },
		},
	});
	if (!staff) return res.status(404).json({ success: false, message: 'Staff member not found' });
	return res.json({ success: true, data: staff });
});

router.patch('/staff/:id', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const id = routeId(req.params.id);
	const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
		? req.body as Record<string, unknown>
		: {};
	const unsupportedField = Object.keys(body).find(field => !['name', 'email'].includes(field));
	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
	if (!id) return res.status(400).json({ success: false, message: 'A valid staff member UUID is required' });
	if (unsupportedField) return res.status(400).json({ success: false, message: 'Only staff name and email can be updated' });
	if (name.length < 2 || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return res.status(400).json({ success: false, message: 'Enter a valid staff name and email address' });
	}
	const result = await prisma.$transaction(async transaction => {
		const staff = await transaction.vendorStaffMember.findFirst({
			where: {
				id,
				application: {
					is: {
						vendorId: req.user!.id,
						status: 'APPROVED',
						event: { is: { startTime: { gt: new Date() } } },
					},
				},
			},
			select: { id: true, applicationId: true },
		});
		if (!staff) return { error: 'not_found' as const };
		await transaction.$queryRaw<Array<{ id: string }>>`
			SELECT "id" FROM "vendor_applications" WHERE "id" = ${staff.applicationId} FOR UPDATE
		`;
		const duplicate = await transaction.vendorStaffMember.findFirst({
			where: { applicationId: staff.applicationId, email, id: { not: id } },
			select: { id: true },
		});
		if (duplicate) return { error: 'duplicate' as const };
		return {
			staff: await transaction.vendorStaffMember.update({
				where: { id },
				data: { name, email },
			}),
		};
	});
	if ('error' in result) {
		if (result.error === 'duplicate') return res.status(409).json({ success: false, message: 'This email is already assigned to staff on the application' });
		return res.status(404).json({ success: false, message: 'Approved staff assignment not found or the event has started' });
	}
	return res.json({ success: true, data: result.staff });
});

router.delete('/staff/:id', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const id = routeId(req.params.id);
	if (!id) return res.status(400).json({ success: false, message: 'A valid staff member UUID is required' });
	const deleted = await prisma.vendorStaffMember.deleteMany({
		where: {
			id,
			application: {
				is: {
					vendorId: req.user!.id,
					status: 'APPROVED',
					event: { is: { startTime: { gt: new Date() } } },
				},
			},
		},
	});
	if (deleted.count !== 1) return res.status(404).json({ success: false, message: 'Approved staff assignment not found or the event has started' });
	return res.json({ success: true, message: 'Staff member removed from the application' });
});

type VendorApplicationDecision =
	| { status: 'APPROVED'; assignedStand: string }
	| { status: 'REJECTED'; rejectionReason: string };

const decideVendorApplication = async (
	req: Request,
	res: Response,
	decision: VendorApplicationDecision,
): Promise<Response> => {
	const userId = req.user?.id;
	const applicationId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
	if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	if (!applicationId) return res.status(400).json({ success: false, message: 'A valid stand request ID is required' });

	const application = await prisma.vendorApplication.findUnique({
		where: { id: applicationId },
		select: {
			id: true,
			vendorId: true,
			status: true,
			requestedStandSize: true,
			standAreaSqm: true,
			standRatePerSqm: true,
			quotedAmount: true,
			event: { select: { id: true, title: true, organizerId: true } },
			vendor: {
				select: {
					email: true,
					firstname: true,
					vendorProfile: { select: { status: true } },
				},
			},
		},
	});
	if (!application) return res.status(404).json({ success: false, message: 'Stand request not found' });
	if (application.event.organizerId !== userId) {
		return res.status(403).json({ success: false, message: 'You can only review requests for events you organize' });
	}
	if (application.status !== 'PENDING_REVIEW') {
		return res.status(409).json({ success: false, message: 'This stand request has already been decided' });
	}

	const decidedAt = new Date();
	const invoiceNumber = `EVMS-${decidedAt.toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
	const dueAt = new Date(decidedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
	try {
		const updated = await prisma.$transaction(async transaction => {
			if (decision.status === 'APPROVED') {
				const vendorProfile = await transaction.vendorProfile.findUnique({
					where: { userId: application.vendorId },
					select: { status: true },
				});
				if (vendorProfile?.status !== VendorProfileStatus.APPROVED) return 'vendor_unapproved' as const;
				await transaction.$queryRaw`SELECT "id" FROM "events" WHERE "id" = ${application.event.id} FOR UPDATE`;
				const event = await transaction.event.findUnique({
					where: { id: application.event.id },
					select: {
						status: true,
						startTime: true,
						vendorStandsAvailable: true,
						_count: { select: { vendorApplications: { where: { status: 'APPROVED' } } } },
					},
				});
				if (event && (event.status !== 'PUBLISHED' || event.startTime <= new Date())) return 'event_closed' as const;
				if (!event || event._count.vendorApplications >= event.vendorStandsAvailable) return 'no_stands' as const;
			}

			const result = await transaction.vendorApplication.updateMany({
				where: { id: applicationId, status: 'PENDING_REVIEW' },
				data: {
					status: decision.status,
					assignedStand: decision.status === 'APPROVED' ? decision.assignedStand : null,
					decidedById: userId,
					decidedAt,
					rejectionReason: decision.status === 'REJECTED' ? decision.rejectionReason : null,
				},
			});
			if (result.count !== 1) return 'already_decided' as const;

			if (decision.status === 'APPROVED') {
				const invoice = await transaction.vendorInvoice.create({
					data: { invoiceNumber, amount: application.quotedAmount, dueAt },
				});
				await transaction.vendorApplication.update({
					where: { id: applicationId },
					data: { invoiceId: invoice.id },
				});
			}

			const message = decision.status === 'APPROVED'
				? `Your stand request for ${application.event.title} was approved. Your assigned stand is ${decision.assignedStand}. Invoice ${invoiceNumber} for ZAR ${Number(application.quotedAmount).toFixed(2)} is due ${dueAt.toLocaleDateString('en-ZA')}.`
				: `Your stand request for ${application.event.title} was rejected. Reason: ${decision.rejectionReason}. You can update your request and submit it again.`;
			await transaction.notification.create({
				data: {
					recipientId: (await transaction.vendorApplication.findUniqueOrThrow({
						where: { id: applicationId },
						select: { vendorId: true },
					})).vendorId,
					title: decision.status === 'APPROVED' ? 'Stand approved and invoice issued' : 'Stand request needs changes',
					message,
					link: '/vendor/applications',
				},
			});
			return 'updated' as const;
		});

		if (updated === 'no_stands') {
			return res.status(409).json({ success: false, message: 'No vendor stands are available to approve this request' });
		}
		if (updated === 'vendor_unapproved') {
			return res.status(409).json({ success: false, message: 'Only applications from approved vendor profiles can be approved' });
		}
		if (updated === 'event_closed') {
			return res.status(409).json({ success: false, message: 'Applications cannot be approved after the event starts or is cancelled' });
		}
		if (updated === 'already_decided') {
			return res.status(409).json({ success: false, message: 'This stand request has already been decided' });
		}
		let invoiceEmailSent = true;
		let decisionEmailSent = true;
		if (decision.status === 'APPROVED') {
			try {
				await sendVendorStandInvoice({
					email: application.vendor.email,
					firstname: application.vendor.firstname,
					eventTitle: application.event.title,
					invoiceNumber,
					amount: Number(application.quotedAmount),
					dueAt,
					assignedStand: decision.assignedStand,
					requestedStandSize: application.requestedStandSize,
					areaSqm: Number(application.standAreaSqm),
					ratePerSqm: Number(application.standRatePerSqm),
				});
			} catch (emailError) {
				console.error('Vendor stand invoice email failed:', emailError);
				invoiceEmailSent = false;
			}
		} else {
			try {
				await sendVendorApplicationRejected({
					email: application.vendor.email,
					firstname: application.vendor.firstname,
					eventTitle: application.event.title,
					rejectionReason: decision.rejectionReason,
				});
			} catch (emailError) {
				console.error('Vendor application rejection email failed:', emailError);
				decisionEmailSent = false;
			}
		}
		return res.json({
			success: true,
			message: decision.status === 'APPROVED' ? 'Stand request approved and invoice issued' : 'Stand request rejected',
			...(decision.status === 'APPROVED' ? { invoiceEmailSent } : { decisionEmailSent }),
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
			return res.status(409).json({ success: false, message: 'That stand is already assigned for this event' });
		}
		throw error;
	}
};

router.patch('/:id/approve', requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, async (req, res) => {
	const assignedStand = typeof req.body?.assignedStand === 'string' ? req.body.assignedStand.trim() : '';
	if (assignedStand.length < 1 || assignedStand.length > 80) {
		return res.status(400).json({ success: false, message: 'Assigned stand must be between 1 and 80 characters' });
	}
	return decideVendorApplication(req, res, { status: 'APPROVED', assignedStand });
});

router.patch('/:id/reject', requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, async (req, res) => {
	const rejectionReason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
	if (rejectionReason.length < 5 || rejectionReason.length > 1000) {
		return res.status(400).json({ success: false, message: 'A rejection reason between 5 and 1000 characters is required' });
	}
	return decideVendorApplication(req, res, { status: 'REJECTED', rejectionReason });
});

export default router;
