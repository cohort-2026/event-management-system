import { useEffect, useState } from 'react';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import UserManagementNav from '@/components/admin/UserManagementNav';
import {
	downloadVendorReviewDocument,
	deleteVendorAccount,
	getVendorProfilesByStatus,
	reviewVendorProfile,
} from '@/services/vendorService';
import type { PendingVendorProfile, VendorDocument } from '@/types/vendor';

export default function VendorProfileApprovalQueue({ status = 'PENDING_REVIEW' }: { status?: 'PENDING_REVIEW' | 'APPROVED' }) {
	const [profiles, setProfiles] = useState<PendingVendorProfile[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [profileToReject, setProfileToReject] = useState<PendingVendorProfile | null>(null);
	const [profileToDelete, setProfileToDelete] = useState<PendingVendorProfile | null>(null);
	const [rejectionReason, setRejectionReason] = useState('');
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	const loadProfiles = async () => {
		const response = await getVendorProfilesByStatus(status);
		setProfiles(response.data.data);
	};

	useEffect(() => {
		let active = true;
		setLoading(true);
		setError('');
		getVendorProfilesByStatus(status)
			.then(response => { if (active) setProfiles(response.data.data); })
			.catch(loadError => {
				if (active) setError(axios.isAxiosError(loadError)
					? (loadError.response?.data?.message ?? 'Vendor profiles could not be loaded.')
					: 'Vendor profiles could not be loaded.');
			})
			.finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, [status]);

	const decide = async (profile: PendingVendorProfile, decision: 'approve' | 'reject', reason?: string) => {
		setError('');
		setNotice('');
		setBusyId(profile.id);
		try {
			const response = await reviewVendorProfile(profile.id, decision, reason);
			setNotice(response.data.message ?? `Vendor profile ${decision === 'approve' ? 'approved' : 'rejected'}.`);
			if (decision === 'reject') {
				setProfileToReject(null);
				setRejectionReason('');
			}
			await loadProfiles();
		} catch (reviewError) {
			setError(axios.isAxiosError(reviewError)
				? (reviewError.response?.data?.message ?? 'Vendor profile could not be reviewed.')
				: 'Vendor profile could not be reviewed.');
		} finally {
			setBusyId(null);
		}
	};

	const rejectProfile = async () => {
		if (!profileToReject) return;
		await decide(profileToReject, 'reject', rejectionReason.trim());
	};

	const deleteAccount = async () => {
		if (!profileToDelete) return;
		setError('');
		setNotice('');
		setBusyId(profileToDelete.id);
		try {
			const response = await deleteVendorAccount(profileToDelete.id);
			setNotice(response.data.message ?? 'Vendor account permanently deleted.');
			setProfileToDelete(null);
			await loadProfiles();
		} catch (deleteError) {
			setError(axios.isAxiosError(deleteError)
				? (deleteError.response?.data?.message ?? 'Vendor account could not be deleted.')
				: 'Vendor account could not be deleted.');
		} finally {
			setBusyId(null);
		}
	};

	const downloadDocument = async (document: VendorDocument) => {
		setError('');
		try {
			const response = await downloadVendorReviewDocument(document.id);
			const url = URL.createObjectURL(response.data);
			const anchor = window.document.createElement('a');
			anchor.href = url;
			anchor.download = document.originalName;
			anchor.click();
			window.setTimeout(() => URL.revokeObjectURL(url), 1000);
		} catch {
			setError(`Unable to download ${document.originalName}.`);
		}
	};

	return (
		<PageWrapper>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-neutral-900">
					{status === 'PENDING_REVIEW' ? 'Vendor profiles awaiting approval' : 'Approved vendor profiles'}
				</h1>
					<p className="mt-1 text-neutral-500">
						{status === 'PENDING_REVIEW' ? 'Review vendor business details and supporting documents.' : 'View approved vendor business profiles.'}
					</p>
			</div>
			{status === 'PENDING_REVIEW' && <UserManagementNav />}
			{error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
			{notice && <p role="status" className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
			{loading ? <div className="flex justify-center py-16"><Spinner /></div> : profiles.length === 0 ? (
				<div className="border-y border-neutral-200 py-16 text-center">
					<p className="font-semibold text-neutral-800">
						{status === 'PENDING_REVIEW' ? 'No vendor profiles are awaiting approval.' : 'No approved vendor profiles.'}
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-5">
					{profiles.map(profile => (
						<article key={profile.id} className="border-y border-neutral-200 bg-white px-5 py-6 sm:px-7">
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant={status === 'PENDING_REVIEW' ? 'warning' : 'success'}>
											{status === 'PENDING_REVIEW' ? 'Pending review' : 'Approved'}
										</Badge>
										<span className="text-xs text-neutral-500">Submitted {new Date(profile.createdAt).toLocaleDateString()}</span>
									</div>
									<h2 className="mt-2 text-xl font-bold text-neutral-900">{profile.businessName}</h2>
									<p className="mt-1 text-sm text-neutral-600">{profile.user.firstname} {profile.user.lastname} · {profile.user.email}</p>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									{status === 'APPROVED' && (
										<>
											<Badge variant={profile.user.isActive ? 'success' : 'danger'}>
												{profile.user.isActive ? 'ACTIVE' : 'INACTIVE'}
											</Badge>
											<Button variant="danger" size="sm" disabled={Boolean(busyId)} onClick={() => setProfileToDelete(profile)}>
												DELETE ACCOUNT
											</Button>
										</>
									)}
									{status === 'PENDING_REVIEW' && <>
										<Button variant="danger" size="sm" disabled={Boolean(busyId)} onClick={() => { setProfileToReject(profile); setRejectionReason(''); }}>Reject</Button>
										<Button size="sm" loading={busyId === profile.id} onClick={() => void decide(profile, 'approve')}>Approve</Button>
									</>}
								</div>
							</div>
							<dl className="mt-5 grid grid-cols-1 gap-4 border-t border-neutral-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
								<Detail label="Registration number" value={profile.businessRegistrationNumber || 'Not provided'} />
								<Detail label="Contact person" value={profile.contactPerson} />
								<Detail label="Business email" value={profile.contactEmail} />
								<Detail label="Phone" value={profile.contactPhone} />
								<Detail label="Description" value={profile.businessDescription || 'Not provided'} />
								<Detail label="Products and services" value={profile.productsServices.join(', ') || 'Not provided'} />
							</dl>
							<div className="mt-5 border-t border-neutral-100 pt-4">
								<h3 className="text-sm font-semibold text-neutral-800">Supporting documents</h3>
								{profile.user.vendorDocuments.length ? (
									<ul className="mt-2 divide-y divide-neutral-100">
										{profile.user.vendorDocuments.map(document => (
											<li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
												<span className="break-all text-sm text-neutral-700">{document.originalName} <span className="text-xs text-neutral-400">({formatFileSize(document.sizeBytes)})</span></span>
												<Button size="sm" variant="secondary" onClick={() => void downloadDocument(document)}>Download PDF</Button>
											</li>
										))}
									</ul>
								) : <p className="mt-2 text-sm text-rose-700">No supporting documents were uploaded.</p>}
							</div>
						</article>
					))}
				</div>
			)}
			<Modal
				open={Boolean(profileToReject)}
				onClose={() => {
					if (!busyId) setProfileToReject(null);
				}}
				title="Reject vendor profile"
				size="sm"
			>
				<div className="flex flex-col gap-4">
					<p className="text-sm text-neutral-600">
						Explain why {profileToReject?.businessName} was rejected. This feedback will be visible to the vendor.
					</p>
					<textarea
						rows={5}
						maxLength={2000}
						value={rejectionReason}
						onChange={event => setRejectionReason(event.target.value)}
						placeholder="Describe what needs to be corrected (at least 10 characters)…"
						className="block w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
					/>
					<p className="text-xs text-neutral-500">{rejectionReason.trim().length}/2000 characters</p>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="secondary" size="sm" disabled={Boolean(busyId)} onClick={() => setProfileToReject(null)}>Cancel</Button>
						<Button type="button" variant="danger" size="sm" loading={Boolean(busyId)} disabled={rejectionReason.trim().length < 10} onClick={() => void rejectProfile()}>
							Confirm rejection
						</Button>
					</div>
				</div>
			</Modal>
			<Modal
				open={Boolean(profileToDelete)}
				onClose={() => {
					if (!busyId) setProfileToDelete(null);
				}}
				title="Confirm account deletion"
				size="sm"
			>
				<div className="flex flex-col gap-4">
					<p className="text-sm text-neutral-600">
						Permanently delete {profileToDelete?.user.firstname} {profileToDelete?.user.lastname}'s vendor account, applications, documents, and related records? This cannot be undone.
					</p>
					{error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
					<div className="flex justify-end gap-2">
						<Button type="button" variant="secondary" size="sm" disabled={Boolean(busyId)} onClick={() => setProfileToDelete(null)}>
							Cancel
						</Button>
						<Button type="button" variant="danger" size="sm" loading={Boolean(busyId)} onClick={() => void deleteAccount()}>
							Permanently delete
						</Button>
					</div>
				</div>
			</Modal>
		</PageWrapper>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return <div><dt className="text-xs font-semibold uppercase text-neutral-500">{label}</dt><dd className="mt-1 break-words text-sm text-neutral-800">{value}</dd></div>;
}

function formatFileSize(sizeBytes: number): string {
	return sizeBytes < 1024 * 1024
		? `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
		: `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}