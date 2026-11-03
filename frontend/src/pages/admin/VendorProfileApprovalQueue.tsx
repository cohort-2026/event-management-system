import { useEffect, useState } from 'react';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
	downloadVendorReviewDocument,
	getPendingVendorProfiles,
	reviewVendorProfile,
} from '@/services/vendorService';
import type { PendingVendorProfile, VendorDocument } from '@/types/vendor';

export default function VendorProfileApprovalQueue() {
	const [profiles, setProfiles] = useState<PendingVendorProfile[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	const loadProfiles = async () => {
		const response = await getPendingVendorProfiles();
		setProfiles(response.data.data);
	};

	useEffect(() => {
		let active = true;
		getPendingVendorProfiles()
			.then(response => { if (active) setProfiles(response.data.data); })
			.catch(loadError => {
				if (active) setError(axios.isAxiosError(loadError)
					? (loadError.response?.data?.message ?? 'Vendor profiles could not be loaded.')
					: 'Vendor profiles could not be loaded.');
			})
			.finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, []);

	const decide = async (profile: PendingVendorProfile, decision: 'approve' | 'reject') => {
		if (decision === 'reject' && !window.confirm(`Reject ${profile.businessName}'s vendor profile?`)) return;
		setError('');
		setNotice('');
		setBusyId(profile.id);
		try {
			const response = await reviewVendorProfile(profile.id, decision);
			setNotice(response.data.message ?? `Vendor profile ${decision === 'approve' ? 'approved' : 'rejected'}.`);
			await loadProfiles();
		} catch (reviewError) {
			setError(axios.isAxiosError(reviewError)
				? (reviewError.response?.data?.message ?? 'Vendor profile could not be reviewed.')
				: 'Vendor profile could not be reviewed.');
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
				<h1 className="text-2xl font-bold text-neutral-900">Vendor profile approvals</h1>
				<p className="mt-1 text-neutral-500">Review vendor business details and supporting documents.</p>
			</div>
			{error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
			{notice && <p role="status" className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
			{loading ? <div className="flex justify-center py-16"><Spinner /></div> : profiles.length === 0 ? (
				<div className="border-y border-neutral-200 py-16 text-center">
					<p className="font-semibold text-neutral-800">No vendor profiles need review.</p>
				</div>
			) : (
				<div className="flex flex-col gap-5">
					{profiles.map(profile => (
						<article key={profile.id} className="border-y border-neutral-200 bg-white px-5 py-6 sm:px-7">
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant="warning">Pending review</Badge>
										<span className="text-xs text-neutral-500">Submitted {new Date(profile.createdAt).toLocaleDateString()}</span>
									</div>
									<h2 className="mt-2 text-xl font-bold text-neutral-900">{profile.businessName}</h2>
									<p className="mt-1 text-sm text-neutral-600">{profile.user.firstname} {profile.user.lastname} · {profile.user.email}</p>
								</div>
								<div className="flex gap-2">
									<Button variant="danger" size="sm" disabled={busyId === profile.id} onClick={() => void decide(profile, 'reject')}>Reject</Button>
									<Button size="sm" loading={busyId === profile.id} onClick={() => void decide(profile, 'approve')}>Approve</Button>
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