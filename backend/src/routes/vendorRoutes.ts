import { Request, Response, Router } from 'express';
import { Prisma, PrismaClient, VendorProfileStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path, { basename } from 'node:path';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { requireApprovedOrganizerProfile, requireAuth, requireRole } from '../middleware/auth';
import { config } from '../config/index';
import { maxVendorDocuments, parseVendorPdf } from '../middleware/vendorDocumentUpload';
import { notifyAdmins } from '../services/notificationService';
import { sendVendorStandInvoice } from '../services/emailService';

const router = Router();
const prisma = new PrismaClient();

interface VendorDocumentRecord {
	id: string;
	originalName: string;
	storageName: string;
	sizeBytes: number;
	createdAt: Date;
}

const profileColumns = `
	"id",
	"business_name" AS "businessName",
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

const requireProfileEditable = async (userId: string, res: import('express').Response): Promise<boolean> => {
	const profile = await prisma.vendorProfile.findUnique({ where: { userId }, select: { status: true } });
	if (profile?.status === VendorProfileStatus.APPROVED) {
		res.status(403).json({ success: false, message: 'Approved business profiles cannot be edited' });
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

function validateProfile(body: unknown): { data?: VendorProfileInput; errors: Record<string, string> } {
	const errors: Record<string, string> = {};
	const input = body && typeof body === 'object' ? body as Record<string, unknown> : {};
	const readText = (key: string, maxLength: number): string => {
		const value = typeof input[key] === 'string' ? input[key].trim() : '';
		if (value.length > maxLength) errors[key] = `Must be ${maxLength} characters or fewer`;
		return value;
	};

	const businessName = readText('businessName', 120);
	const businessDescription = readText('businessDescription', 2000);
	const businessRegistrationNumber = readText('businessRegistrationNumber', 100);
	const contactPerson = readText('contactPerson', 120);
	const contactEmail = readText('contactEmail', 254).toLowerCase();
	const contactPhone = readText('contactPhone', 30);
	const parsedPhone = parsePhoneNumberFromString(contactPhone, 'ZA');

	if (businessName.length < 2) errors.businessName = 'Enter a business name';
	if (businessRegistrationNumber && !/^\d{4}\/\d{6}\/\d{2}$/.test(businessRegistrationNumber)) {
		errors.businessRegistrationNumber = 'Use the format 2020/123456/07';
	}
	if (contactPerson.length < 2) errors.contactPerson = 'Enter a contact person';
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) errors.contactEmail = 'Enter a valid email address';
	if (!parsedPhone?.isValid()) errors.contactPhone = 'Enter a valid international phone number';
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
			businessDescription,
			businessRegistrationNumber,
			contactPerson,
			contactEmail,
			contactPhone: parsedPhone!.number,
			productsServices,
			supportingDocumentUrls,
		},
	};
}

router.get('/profile', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { firstname: true, lastname: true, email: true },
	});
	if (!user) return res.status(404).json({ success: false, message: 'Vendor account not found' });

	await prisma.$executeRaw`
		INSERT INTO "vendor_profiles" (
			"id", "user_id", "business_name", "business_description", "business_registration_number",
			"contact_person", "contact_email", "contact_phone", "products_services",
			"supporting_document_urls", "status", "created_at", "updated_at"
		) VALUES (
			${randomUUID()}, ${userId}, '', '', '', ${`${user.firstname} ${user.lastname}`.trim()},
			${user.email}, '', ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'DRAFT'::"VendorProfileStatus", NOW(), NOW()
		) ON CONFLICT ("user_id") DO NOTHING
	`;
	const [profile] = await prisma.$queryRaw<VendorProfileRecord[]>`
		SELECT ${Prisma.raw(profileColumns)} FROM "vendor_profiles" WHERE "user_id" = ${userId} LIMIT 1
	`;
	return res.json({ success: true, data: profile });
});

router.put('/profile', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	if (!await requireProfileEditable(userId, res)) return;

	const { data, errors } = validateProfile(req.body);
	if (!data) return res.status(400).json({ success: false, message: 'Check the highlighted profile fields', errors });
	const submitForReview = req.body?.submitForReview === true;

	const profile = await prisma.$transaction(async transaction => {
		const current = await transaction.vendorProfile.findUnique({
			where: { userId },
			select: { status: true },
		});
		const [updatedProfile] = await transaction.$queryRaw<VendorProfileRecord[]>`
		INSERT INTO "vendor_profiles" (
			"id", "user_id", "business_name", "business_description", "business_registration_number",
			"contact_person", "contact_email", "contact_phone", "products_services",
			"supporting_document_urls", "status", "created_at", "updated_at"
		) VALUES (
			${randomUUID()}, ${userId}, ${data.businessName}, ${data.businessDescription}, ${data.businessRegistrationNumber},
			${data.contactPerson}, ${data.contactEmail}, ${data.contactPhone},
			ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(data.productsServices)}::jsonb)),
			ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(data.supportingDocumentUrls)}::jsonb)),
			CASE WHEN ${submitForReview} THEN 'PENDING_REVIEW'::"VendorProfileStatus" ELSE 'DRAFT'::"VendorProfileStatus" END,
			NOW(), NOW()
		) ON CONFLICT ("user_id") DO UPDATE SET
			"business_name" = EXCLUDED."business_name",
			"business_description" = EXCLUDED."business_description",
			"business_registration_number" = EXCLUDED."business_registration_number",
			"contact_person" = EXCLUDED."contact_person",
			"contact_email" = EXCLUDED."contact_email",
			"contact_phone" = EXCLUDED."contact_phone",
			"products_services" = EXCLUDED."products_services",
			"supporting_document_urls" = EXCLUDED."supporting_document_urls",
			"status" = CASE
				WHEN ${submitForReview} AND "vendor_profiles"."status" IN ('DRAFT', 'REJECTED')
					THEN 'PENDING_REVIEW'::"VendorProfileStatus"
				ELSE "vendor_profiles"."status"
			END,
			"rejection_reason" = CASE
				WHEN ${submitForReview} AND "vendor_profiles"."status" = 'REJECTED' THEN NULL
				ELSE "vendor_profiles"."rejection_reason"
			END,
			"reviewed_at" = CASE
				WHEN ${submitForReview} AND "vendor_profiles"."status" = 'REJECTED' THEN NULL
				ELSE "vendor_profiles"."reviewed_at"
			END,
			"updated_at" = NOW()
		RETURNING ${Prisma.raw(profileColumns)}
		`;
		if (submitForReview && (!current || current.status === VendorProfileStatus.DRAFT || current.status === VendorProfileStatus.REJECTED)) {
			await notifyAdmins(transaction, {
				title: current?.status === VendorProfileStatus.REJECTED ? 'Vendor profile resubmitted' : 'Vendor profile submitted',
				message: `${data.businessName} submitted its vendor profile for review.`,
				link: '/admin/users/vendors/pending',
			});
		}
		return updatedProfile;
	});
	return res.json({
		success: true,
		data: profile,
		message: profile.status === VendorProfileStatus.PENDING_REVIEW && submitForReview
			? 'Business profile submitted for review.'
			: 'Business profile saved.',
	});
});

router.post('/documents', requireAuth, requireRole('VENDOR'), parseVendorPdf, async (req, res, next) => {
	const vendorId = req.user?.id;
	const file = req.file;
	if (!vendorId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	if (!file) return res.status(400).json({ success: false, message: 'Choose a PDF document to upload' });
	if (!await requireProfileEditable(vendorId, res)) {
		await fs.unlink(file.path).catch(() => undefined);
		return;
	}

	try {
		const contents = await fs.readFile(file.path);
		if (contents.subarray(0, 5).toString('ascii') !== '%PDF-') {
			await fs.unlink(file.path);
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
				RETURNING "id", "original_name" AS "originalName", "storage_name" AS "storageName", "size_bytes" AS "sizeBytes", "created_at" AS "createdAt"
			`;
			return created;
		});

		if (!document) {
			await fs.unlink(file.path);
			return res.status(409).json({ success: false, message: `You can upload up to ${maxVendorDocuments} documents` });
		}

		return res.status(201).json({
			success: true,
			data: { id: document.id, originalName: document.originalName, sizeBytes: document.sizeBytes, createdAt: document.createdAt },
		});
	} catch (error) {
		await fs.unlink(file.path).catch(() => undefined);
		return next(error);
	}
});

router.get('/documents', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const vendorId = req.user?.id;
	if (!vendorId) return res.status(401).json({ success: false, message: 'Not authenticated' });

	const documents = await prisma.$queryRaw<Array<Omit<VendorDocumentRecord, 'storageName'>> >`
		SELECT "id", "original_name" AS "originalName", "size_bytes" AS "sizeBytes", "created_at" AS "createdAt"
		FROM "vendor_documents" WHERE "vendor_id" = ${vendorId} ORDER BY "created_at" DESC
	`;
	return res.json({ success: true, data: documents });
});

const listAdminVendorProfiles = (status: VendorProfileStatus) => async (_req: Request, res: Response) => {
	const profiles = await prisma.vendorProfile.findMany({
		where: { status },
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
						select: { id: true, originalName: true, sizeBytes: true, createdAt: true },
					},
				},
			},
		},
		orderBy: { createdAt: 'asc' },
	});
	return res.json({ success: true, data: profiles });
};

router.get('/admin/profiles/pending', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), listAdminVendorProfiles(VendorProfileStatus.PENDING_REVIEW));
router.get('/admin/profiles/approved', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), listAdminVendorProfiles(VendorProfileStatus.APPROVED));

router.delete('/admin/profiles/:id', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (req, res) => {
	const profileId = routeId(req.params.id);
	if (!profileId) return res.status(400).json({ success: false, message: 'A valid vendor profile ID is required' });

	const deleted = await prisma.$transaction(async transaction => {
		const profile = await transaction.vendorProfile.findFirst({
			where: { id: profileId, status: VendorProfileStatus.APPROVED },
			select: { id: true, userId: true },
		});
		if (!profile) return false;

		const events = await transaction.event.findMany({ where: { organizerId: profile.userId }, select: { id: true } });
		const eventIds = events.map(event => event.id);
		const bookings = await transaction.booking.findMany({
			where: {
				OR: [
					{ attendeeId: profile.userId },
					...(eventIds.length ? [{ eventId: { in: eventIds } }] : []),
				],
			},
			select: { id: true },
		});
		const bookingIds = bookings.map(booking => booking.id);
		const applications = await transaction.vendorApplication.findMany({
			where: {
				OR: [
					{ vendorId: profile.userId },
					...(eventIds.length ? [{ eventId: { in: eventIds } }] : []),
				],
			},
			select: { id: true },
		});
		const applicationIds = applications.map(application => application.id);

		await transaction.ticket.deleteMany({
			where: {
				OR: [
					{ holderId: profile.userId },
					...(bookingIds.length ? [{ bookingId: { in: bookingIds } }] : []),
					...(eventIds.length ? [{ eventId: { in: eventIds } }] : []),
				],
			},
		});
		if (bookingIds.length) {
			await transaction.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
			await transaction.booking.deleteMany({ where: { id: { in: bookingIds } } });
		}
		if (applicationIds.length) {
			await transaction.vendorStaffMember.deleteMany({ where: { applicationId: { in: applicationIds } } });
			await transaction.vendorApplication.deleteMany({ where: { id: { in: applicationIds } } });
		}
		if (eventIds.length) {
			await transaction.event.deleteMany({ where: { id: { in: eventIds } } });
		}
		await transaction.user.delete({ where: { id: profile.userId } });
		await transaction.auditLog.create({
			data: {
				actorId: req.user!.id,
				affectedUserId: profile.userId,
				action: 'VENDOR_ACCOUNT_DELETED',
				outcome: 'permanently_deleted',
			},
		});
		return true;
	});

	if (!deleted) return res.status(404).json({ success: false, message: 'Approved vendor profile not found' });
	return res.json({ success: true, message: 'Vendor account and related records permanently deleted.' });
});

router.get('/admin/documents/:id/download', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (req, res, next) => {
	const id = routeId(req.params.id);
	if (!id) return res.status(400).json({ success: false, message: 'A valid document ID is required' });
	const document = await prisma.vendorDocument.findUnique({ where: { id } });
	if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
	res.setHeader('X-Content-Type-Options', 'nosniff');
	return res.download(path.resolve(config.vendorDocumentsDir, document.storageName), document.originalName, error => {
		if (error && !res.headersSent) next(error);
	});
});

const reviewVendorProfile = async (
	profileId: string,
	status: 'APPROVED' | 'REJECTED',
	adminId: string,
	rejectionReason?: string,
): Promise<boolean> => prisma.$transaction(async transaction => {
	const profile = await transaction.vendorProfile.findFirst({
		where: { id: profileId, status: VendorProfileStatus.PENDING_REVIEW },
		select: { id: true, userId: true },
	});
	if (!profile) return false;
	await transaction.vendorProfile.update({
		where: { id: profile.id },
		data: {
			status,
			rejectionReason: status === VendorProfileStatus.REJECTED ? rejectionReason : null,
			reviewedAt: new Date(),
		},
	});
	await transaction.auditLog.create({
		data: {
			actorId: adminId,
			affectedUserId: profile.userId,
			action: status === VendorProfileStatus.APPROVED ? 'VENDOR_PROFILE_APPROVED' : 'VENDOR_PROFILE_REJECTED',
			outcome: status === VendorProfileStatus.APPROVED ? 'approved' : 'rejected',
		},
	});
	return true;
});

router.patch('/admin/profiles/:id/approve', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (req, res) => {
	const id = routeId(req.params.id);
	if (!id) return res.status(400).json({ success: false, message: 'A valid profile ID is required' });
	const reviewed = await reviewVendorProfile(id, VendorProfileStatus.APPROVED, req.user!.id);
	if (!reviewed) return res.status(404).json({ success: false, message: 'Pending vendor profile not found' });
	return res.json({ success: true, message: 'Vendor profile approved. The vendor can now apply for stands.' });
});

router.patch('/admin/profiles/:id/reject', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (req, res) => {
	const id = routeId(req.params.id);
	if (!id) return res.status(400).json({ success: false, message: 'A valid profile ID is required' });
	const rejectionReason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
	if (rejectionReason.length < 10 || rejectionReason.length > 2000) {
		return res.status(400).json({ success: false, message: 'Rejection feedback must be between 10 and 2000 characters.' });
	}
	const reviewed = await reviewVendorProfile(id, VendorProfileStatus.REJECTED, req.user!.id, rejectionReason);
	if (!reviewed) return res.status(404).json({ success: false, message: 'Pending vendor profile not found' });
	return res.json({ success: true, message: 'Vendor profile rejected.' });
});

router.get('/documents/:id/download', requireAuth, requireRole('VENDOR'), async (req, res, next) => {
	const vendorId = req.user?.id;
	if (!vendorId) return res.status(401).json({ success: false, message: 'Not authenticated' });

	const [document] = await prisma.$queryRaw<VendorDocumentRecord[]>`
		SELECT "id", "original_name" AS "originalName", "storage_name" AS "storageName", "size_bytes" AS "sizeBytes", "created_at" AS "createdAt"
		FROM "vendor_documents" WHERE "id" = ${req.params.id} AND "vendor_id" = ${vendorId} LIMIT 1
	`;
	if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

	res.setHeader('X-Content-Type-Options', 'nosniff');
	return res.download(path.resolve(config.vendorDocumentsDir, document.storageName), document.originalName, error => {
		if (error && !res.headersSent) next(error);
	});
});

router.delete('/documents/:id', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const vendorId = req.user?.id;
	if (!vendorId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	if (!await requireProfileEditable(vendorId, res)) return;

	const [document] = await prisma.$queryRaw<VendorDocumentRecord[]>`
		SELECT "id", "original_name" AS "originalName", "storage_name" AS "storageName", "size_bytes" AS "sizeBytes", "created_at" AS "createdAt"
		FROM "vendor_documents" WHERE "id" = ${req.params.id} AND "vendor_id" = ${vendorId} LIMIT 1
	`;
	if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

	await prisma.$executeRaw`DELETE FROM "vendor_documents" WHERE "id" = ${document.id} AND "vendor_id" = ${vendorId}`;
	await fs.unlink(path.resolve(config.vendorDocumentsDir, document.storageName)).catch((error: NodeJS.ErrnoException) => {
		if (error.code !== 'ENOENT') throw error;
	});
	return res.json({ success: true, message: 'Document removed' });
});

// POST  /api/vendors/apply            Submit a vendor stand application
// GET   /api/vendors/me               View own applications
// POST  /api/vendors/:id/staff        Add staff to an approved application
router.post('/apply', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const userId = req.user?.id;
	const eventId = typeof req.body?.eventId === 'string' ? req.body.eventId.trim() : '';
	const requestedStandType = typeof req.body?.requestedStandType === 'string' ? req.body.requestedStandType.trim() : '';
	const requestedStandSize = typeof req.body?.requestedStandSize === 'string' ? req.body.requestedStandSize.trim() : '';
	const standDescription = typeof req.body?.standDescription === 'string' ? req.body.standDescription.trim() : '';
	const supportingInformation = typeof req.body?.supportingInformation === 'string' ? req.body.supportingInformation.trim() : '';
	const staffInput = req.body?.staffMembers ?? [];
	if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	if (!eventId || eventId.length > 64) return res.status(400).json({ success: false, message: 'A valid event is required' });
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
	for (const item of staffInput) {
		if (!item || typeof item !== 'object' || Array.isArray(item)) {
			return res.status(400).json({ success: false, message: 'Each staff member needs a name and email address' });
		}
		const name = typeof item.name === 'string' ? item.name.trim() : '';
		const email = typeof item.email === 'string' ? item.email.trim().toLowerCase() : '';
		if (name.length < 2 || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return res.status(400).json({ success: false, message: 'Enter a valid name and email for every staff member' });
		}
		staffMembers.push({ name, email });
	}

	const event = await prisma.event.findUnique({
		where: { id: eventId },
		select: {
			id: true,
			status: true,
			startTime: true,
			vendorStandsAvailable: true,
			vendorStandRatePerSqm: true,
			_count: { select: { vendorApplications: { where: { status: 'APPROVED' } } } },
		},
	});
	if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
	if (event.status !== 'PUBLISHED') return res.status(409).json({ success: false, message: 'Vendor applications are only available for published events' });
	if (event.startTime <= new Date()) return res.status(409).json({ success: false, message: 'Vendor applications are closed because this event has started' });
	if (event.vendorStandsAvailable - event._count.vendorApplications <= 0) {
		return res.status(409).json({ success: false, message: 'No vendor stands are currently available' });
	}
	const standRatePerSqm = Number(event.vendorStandRatePerSqm);

	const [profile] = await prisma.$queryRaw<Array<{
		businessName: string;
		businessRegistrationNumber: string;
		businessDescription: string;
		productsServices: string[];
	}>>`
		SELECT
			"business_name" AS "businessName",
			"business_registration_number" AS "businessRegistrationNumber",
			"business_description" AS "businessDescription",
			"products_services" AS "productsServices"
		FROM "vendor_profiles"
		WHERE "user_id" = ${userId}
		LIMIT 1
	`;

	if (!profile?.businessName.trim()) {
		return res.status(400).json({ success: false, message: 'Complete your business profile before applying for a stand' });
	}

	const existingApplication = await prisma.vendorApplication.findFirst({
		where: { vendorId: userId, eventId, status: { not: 'REJECTED' } },
		select: { id: true },
	});
	if (existingApplication) return res.status(409).json({ success: false, message: 'You already have an application for this event' });
	const standAreaSqm = Math.round(standWidth * standDepth * 100) / 100;
	const quotedAmount = Math.round(standAreaSqm * standRatePerSqm * 100) / 100;

	const application = await prisma.vendorApplication.create({
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
		include: { staffMembers: true },
	});
	return res.status(201).json({ success: true, data: application });
});

router.get('/me', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

	const applications = await prisma.vendorApplication.findMany({
		where: { vendorId: userId },
		include: {
			event: { select: { id: true, title: true, date: true, venue: true } },
			invoice: true,
			staffMembers: true,
		},
		orderBy: { createdAt: 'desc' },
	});
	return res.json({ success: true, data: applications });
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

router.post('/:id/staff',       requireAuth, requireRole('VENDOR'), (_req, res) => res.sendStatus(501));

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
			status: true,
			requestedStandSize: true,
			standAreaSqm: true,
			standRatePerSqm: true,
			quotedAmount: true,
			event: { select: { id: true, title: true, organizerId: true } },
			vendor: { select: { email: true, firstname: true } },
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
				await transaction.$queryRaw`SELECT "id" FROM "events" WHERE "id" = ${application.event.id} FOR UPDATE`;
				const event = await transaction.event.findUnique({
					where: { id: application.event.id },
					select: {
						vendorStandsAvailable: true,
						_count: { select: { vendorApplications: { where: { status: 'APPROVED' } } } },
					},
				});
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
		if (updated === 'already_decided') {
			return res.status(409).json({ success: false, message: 'This stand request has already been decided' });
		}
		let invoiceEmailSent = true;
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
		}
		return res.json({
			success: true,
			message: decision.status === 'APPROVED' ? 'Stand request approved and invoice issued' : 'Stand request rejected',
			...(decision.status === 'APPROVED' ? { invoiceEmailSent } : {}),
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
