import { Request, Response, Router } from 'express';
import { Prisma, PrismaClient, VendorProfileStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path, { basename } from 'node:path';
import { requireAuth, requireRole } from '@/middleware/auth';
import { config } from '@/config/index';
import { maxVendorDocuments, parseVendorPdf } from '@/middleware/vendorDocumentUpload';
import { notifyAdmins } from '@/services/notificationService';

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

	if (businessName.length < 2) errors.businessName = 'Enter a business name';
	if (contactPerson.length < 2) errors.contactPerson = 'Enter a contact person';
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) errors.contactEmail = 'Enter a valid email address';
	if (!/^\+?[0-9\s().-]{7,30}$/.test(contactPhone) || contactPhone.replace(/\D/g, '').length < 7) {
		errors.contactPhone = 'Enter a valid phone number';
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
			businessDescription,
			businessRegistrationNumber,
			contactPerson,
			contactEmail,
			contactPhone,
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
			"supporting_document_urls", "created_at", "updated_at"
		) VALUES (
			${randomUUID()}, ${userId}, '', '', '', ${`${user.firstname} ${user.lastname}`.trim()},
			${user.email}, '', ARRAY[]::TEXT[], ARRAY[]::TEXT[], NOW(), NOW()
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
			"supporting_document_urls", "created_at", "updated_at"
		) VALUES (
			${randomUUID()}, ${userId}, ${data.businessName}, ${data.businessDescription}, ${data.businessRegistrationNumber},
			${data.contactPerson}, ${data.contactEmail}, ${data.contactPhone},
			ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(data.productsServices)}::jsonb)),
			ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(data.supportingDocumentUrls)}::jsonb)), NOW(), NOW()
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
				WHEN ${submitForReview} AND "vendor_profiles"."status" = 'REJECTED'
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
		if (submitForReview && current?.status === VendorProfileStatus.REJECTED) {
			await notifyAdmins(transaction, {
				title: 'Vendor profile resubmitted',
				message: `${data.businessName} resubmitted its vendor profile for review.`,
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
		await transaction.auditLog.deleteMany({
			where: { OR: [{ actorId: profile.userId }, { affectedUserId: profile.userId }] },
		});
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
	return res.json({ success: true, message: 'Vendor profile approved. The vendor can now sign in.' });
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
	if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
	if (!eventId || eventId.length > 64) return res.status(400).json({ success: false, message: 'A valid event is required' });

	const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, status: true, startTime: true } });
	if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
	if (event.status !== 'PUBLISHED') return res.status(409).json({ success: false, message: 'Vendor applications are only available for published events' });
	if (event.startTime <= new Date()) return res.status(409).json({ success: false, message: 'Vendor applications are closed because this event has started' });

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

	const application = await prisma.vendorApplication.create({
		data: {
			vendorId: userId,
			eventId,
			companyName: profile.businessName,
			registrationNumber: profile.businessRegistrationNumber,
			description: profile.businessDescription || profile.productsServices.join(', ') || profile.businessName,
		},
	});
	return res.status(201).json({ success: true, data: application });
});

router.get('/me', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

	const applications = await prisma.vendorApplication.findMany({
		where: { vendorId: userId },
		include: { event: { select: { id: true, title: true, date: true, venue: true } } },
		orderBy: { createdAt: 'desc' },
	});
	return res.json({ success: true, data: applications });
});

router.get('/staff', requireAuth, requireRole('VENDOR'), async (req, res) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

	const staffMembers = await prisma.vendorStaffMember.findMany({
		where: { application: { is: { vendorId: userId } } },
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

// PATCH /api/vendors/:id/approve      Approve a vendor application (Organizer of that event)
// PATCH /api/vendors/:id/reject       Reject a vendor application (Organizer of that event)
router.patch('/:id/approve',    requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.patch('/:id/reject',     requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));

export default router;
