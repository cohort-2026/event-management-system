import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CalendarDays, Camera, CameraOff, CheckCircle2, CircleAlert, Clock3, Flashlight, FlashlightOff, LoaderCircle, MapPin, RotateCw, Search, ShieldCheck, Ticket, Users, X } from 'lucide-react';
import type { Html5Qrcode } from 'html5-qrcode';
import { getEventAttendance, getEventRegistrations, getManagedEvent, type EventAttendanceSummary, type EventRegistration } from '@/features/events/services/eventService';
import { checkInTicket, scanTicketQr, type TicketCheckInResult } from '@/features/tickets/services/ticketService';
import type { Event } from '@/types/event';
import { useAuth } from '@/context/useAuth';

const errorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message ?? fallback : fallback;

type CheckInFeedback = {
  kind: 'success' | 'warning' | 'error';
  title: string;
  message: string;
  ticket?: TicketCheckInResult;
  retry?: () => void;
};

const checkInError = (error: unknown): CheckInFeedback => {
  if (!axios.isAxiosError<{ message?: string }>(error)) {
    return { kind: 'error', title: 'Connection problem', message: 'Check-in could not reach the server. Try again.' };
  }
  const status = error.response?.status;
  const message = error.response?.data?.message?.toLowerCase() ?? '';
  if (status === 400) {
    return { kind: 'error', title: 'Invalid QR code', message: 'The QR code could not be validated.' };
  }
  if (status === 403) {
    return { kind: 'error', title: 'Organizer access required', message: 'Your account is not authorized to check in tickets.' };
  }
  if (status === 404) {
    return { kind: 'error', title: 'Ticket not found', message: 'This ticket is invalid or does not belong to an event you organize.' };
  }
  if (status === 409 && message.includes('already been checked in')) {
    return { kind: 'warning', title: 'Already checked in', message: 'This ticket has already been used.' };
  }
  if (status === 409 && message.includes('payment has not been completed')) {
    return { kind: 'error', title: 'Payment not completed', message: 'This ticket cannot be checked in until its payment is confirmed.' };
  }
  if (status === 409 && message.includes('booking')) {
    return { kind: 'error', title: 'Booking not eligible', message: 'The booking must be confirmed and any required payment completed before check-in.' };
  }
  if (status === 409 && message.includes('event')) {
    return { kind: 'error', title: 'Event unavailable', message: 'Check-in is only available while the event is in progress.' };
  }
  if (status === 409) {
    return { kind: 'error', title: 'Ticket invalid', message: 'This ticket is cancelled or not eligible for check-in.' };
  }
  return { kind: 'error', title: 'Check-in failed', message: 'The ticket could not be checked in. Try again.' };
};

const cameraErrorDetails = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

const isCameraUnavailable = (details: string): boolean =>
  /NotFoundError|DevicesNotFoundError|OverconstrainedError|ConstraintNotSatisfiedError/i.test(details);

const cameraStartMessage = (error: unknown): string => {
  const details = cameraErrorDetails(error);
  if (/NotAllowedError|PermissionDeniedError|permission denied/i.test(details)) {
    return 'Camera permission was denied. Allow camera access in your browser and device settings, then try again.';
  }
  if (isCameraUnavailable(details)) {
    return 'No compatible camera was found. Connect a camera or use guest search.';
  }
  if (/NotReadableError|TrackStartError/i.test(details)) {
    return 'The camera is unavailable or in use by another app. Close other camera apps and try again.';
  }
  return 'The camera could not start. Check camera permissions and device settings, or use guest search.';
};

export default function CheckIn() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[] | null>(null);
  const [attendance, setAttendance] = useState<EventAttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [cameraError, setCameraError] = useState('');
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EventRegistration | null>(null);
  const [feedback, setFeedback] = useState<CheckInFeedback | null>(null);
  const [checkInBusy, setCheckInBusy] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef<Promise<null> | null>(null);
  const stoppingRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(false);
  const scannedRef = useRef(false);
  const checkInBusyRef = useRef(false);
  const cameraGenerationRef = useRef(0);

  const stopCamera = useCallback(async () => {
    cameraGenerationRef.current += 1;
    if (stoppingRef.current) return stoppingRef.current;
    const scanner = scannerRef.current;
    if (!scanner) return;
    scannerRef.current = null;
    const starting = startingRef.current;
    const stopping = (async () => {
      try {
        if (starting) {
          try {
            await starting;
          } catch {
            return;
          }
        }
        await scanner.stop();
      } catch (error) {
        console.error('Could not stop the scanner camera:', error);
        if (mountedRef.current) setCameraError('The camera could not be stopped. Close this page to release it.');
      } finally {
        if (mountedRef.current) {
          setCameraActive(false);
          setTorchAvailable(false);
          setTorchOn(false);
        }
      }
    })();
    stoppingRef.current = stopping;
    await stopping;
    stoppingRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void stopCamera();
    };
  }, [stopCamera]);

  const refreshAttendance = useCallback(async () => {
    const [attendanceResult, registrationsResult] = await Promise.allSettled([
      getEventAttendance(id),
      getEventRegistrations(id),
    ]);
    if (mountedRef.current) {
      if (attendanceResult.status === 'fulfilled') setAttendance(attendanceResult.value.data.data);
      if (registrationsResult.status === 'fulfilled') {
        const refreshedRegistrations = registrationsResult.value.data.data;
        setRegistrations(refreshedRegistrations);
        setSelected(current => current ? refreshedRegistrations.find(registration => registration.id === current.id) ?? current : current);
      }
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    Promise.all([getManagedEvent(id), getEventRegistrations(id), getEventAttendance(id)])
      .then(([eventResponse, registrationsResponse, attendanceResponse]) => {
        if (!active) return;
        setEvent(eventResponse.data.data);
        setRegistrations(registrationsResponse.data.data);
        setAttendance(attendanceResponse.data.data);
      })
      .catch(error => {
        if (active) setLoadError(errorMessage(error, 'Event or guest list could not be loaded.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, retry]);

  const submitCheckIn = async (request: () => ReturnType<typeof scanTicketQr>) => {
    if (checkInBusyRef.current) return;
    checkInBusyRef.current = true;
    setCheckInBusy(true);
    setFeedback(null);
    try {
      const response = await request();
      setAttendance(current => {
        if (!current) return current;
        const totalCheckedInTickets = current.totalCheckedInTickets + 1;
        return {
          ...current,
          totalCheckedInTickets,
          totalNotYetCheckedInTickets: Math.max(0, current.totalNotYetCheckedInTickets - 1),
          attendancePercentage: current.totalConfirmedTickets === 0
            ? 0
            : Number(((totalCheckedInTickets / current.totalConfirmedTickets) * 100).toFixed(2)),
        };
      });
      setFeedback({
        kind: 'success',
        title: 'Check-in successful',
        message: `${response.data.data.event.title} · ${response.data.data.referenceNumber}`,
        ticket: response.data.data,
      });
      try {
        await refreshAttendance();
      } catch {
        // The successful ticket response remains authoritative; attendance can be refreshed later.
      }
    } catch (error) {
      const nextFeedback = checkInError(error);
      if (!axios.isAxiosError(error) || !error.response || (error.response.status ?? 0) >= 500) {
        nextFeedback.retry = () => { void submitCheckIn(request); };
      }
      setFeedback(nextFeedback);
    } finally {
      checkInBusyRef.current = false;
      if (mountedRef.current) setCheckInBusy(false);
    }
  };

  const startCamera = async () => {
    if (cameraBusy || scannerRef.current || selected || !registrations) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is unavailable. Use HTTPS or localhost, or search for a guest below.');
      return;
    }

    setCameraBusy(true);
    setCameraError('');
    setFeedback(null);
    setSelected(null);
    scannedRef.current = false;
    const generation = ++cameraGenerationRef.current;
    try {
      if (stoppingRef.current) await stoppingRef.current;
      if (!mountedRef.current || cameraGenerationRef.current !== generation) return;
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      if (!mountedRef.current || cameraGenerationRef.current !== generation) return;
      const scanner = new Html5Qrcode('organizer-qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      const onScan = (decodedText: string) => {
        if (scannedRef.current || checkInBusyRef.current || !mountedRef.current) return;
        scannedRef.current = true;
        void stopCamera();
        void submitCheckIn(() => scanTicketQr(decodedText));
      };
      const scanConfig = { fps: 10, qrbox: (width: number, height: number) => {
        const size = Math.floor(Math.min(width, height) * 0.65);
        return { width: size, height: size };
      } };
      const starting = (async () => {
        try {
          return await scanner.start({ facingMode: 'environment' }, scanConfig, onScan, () => {});
        } catch (error) {
          if (!isCameraUnavailable(cameraErrorDetails(error)) ||
            !mountedRef.current || cameraGenerationRef.current !== generation) throw error;
          console.warn('Preferred camera unavailable; trying the default camera:', error);
          return scanner.start({ facingMode: 'environment' }, { ...scanConfig, videoConstraints: {} }, onScan, () => {});
        }
      })();
      startingRef.current = starting;
      await starting;
      if (!mountedRef.current || scannerRef.current !== scanner) return;
      setCameraActive(true);
      if (typeof MediaStreamTrack !== 'undefined' && typeof MediaStreamTrack.prototype.getCapabilities === 'function') {
        try {
          setTorchAvailable(scanner.getRunningTrackCameraCapabilities().torchFeature().isSupported());
        } catch (error) {
          console.error('Could not inspect camera light capabilities:', error);
          setCameraError('Camera light controls are unavailable. Scanning is still active.');
        }
      }
    } catch (error) {
      console.error('Could not start the scanner camera:', error);
      if (mountedRef.current) {
        setCameraError(cameraStartMessage(error));
      }
      await stopCamera();
    } finally {
      startingRef.current = null;
      if (mountedRef.current) setCameraBusy(false);
    }
  };

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner || !cameraActive) return;
    try {
      await scanner.getRunningTrackCameraCapabilities().torchFeature().apply(!torchOn);
      setTorchOn(current => !current);
      setCameraError('');
    } catch (error) {
      console.error('Could not change the camera torch:', error);
      setCameraError('The camera light could not be changed.');
    }
  };

  const selectGuest = (registration: EventRegistration) => {
    void stopCamera();
    setSelected(registration);
    setFeedback(null);
    setSearch('');
  };

  const resetForNext = () => {
    setSelected(null);
    setFeedback(null);
    scannedRef.current = false;
  };

  const query = search.trim().toLowerCase();
  const matches = query && registrations
    ? registrations.filter(registration =>
      `${registration.attendee.firstname} ${registration.attendee.lastname} ${ticketsFor(registration).map(ticket => ticket.referenceNumber).join(' ')}`
        .toLowerCase().includes(query)).slice(0, 10)
    : [];

  return <main className="min-h-dvh bg-neutral-950 text-stone-100">
    <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/organizer/check-in" aria-label="Return to check-in events" className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-stone-200 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange-400"><ArrowLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1">
          {loading ? <p className="font-heading text-base font-bold sm:text-lg">Event check-in</p> : event ? <><h1 className="truncate font-heading text-base font-bold sm:text-lg">{event.title}</h1><p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-stone-400"><span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{formatEventDate(event.startTime)}</span><span className="inline-flex min-w-0 items-center gap-1"><MapPin className="size-3.5 shrink-0" /><span className="truncate">{event.venue}</span></span></p></> : <p className="font-heading text-base font-bold">Event check-in</p>}
        </div>
        <div className="hidden items-center gap-2 text-xs text-stone-300 sm:flex"><span className={`size-2 rounded-full ${cameraActive ? 'bg-emerald-400' : 'bg-stone-500'}`} aria-hidden="true" /><span>{cameraActive ? 'Camera active' : 'Camera off'}</span></div>
        {user && <span className="hidden max-w-36 truncate text-xs font-medium text-stone-400 md:block">{user.firstname} {user.lastname}</span>}
        <button type="button" disabled={!torchAvailable || !cameraActive} onClick={() => void toggleTorch()} aria-label={torchOn ? 'Turn camera light off' : 'Turn camera light on'} aria-pressed={torchOn} className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-stone-200 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-35">{torchOn ? <FlashlightOff className="size-5" /> : <Flashlight className="size-5" />}</button>
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:pt-8">
      {loading ? <div role="status" className="flex min-h-72 items-center justify-center gap-3 text-sm text-stone-300"><LoaderCircle className="size-5 animate-spin text-orange-400" />Loading event, attendance and guest list…</div>
        : loadError ? <section role="alert" className="mx-auto max-w-2xl rounded-2xl border border-rose-400/30 bg-rose-950/40 p-6"><CircleAlert className="size-6 text-rose-300" /><h2 className="mt-3 font-heading text-xl font-bold">Check-in data unavailable</h2><p className="mt-2 text-sm leading-relaxed text-stone-300">{loadError}</p><button type="button" onClick={() => { setLoadError(''); setLoading(true); setRetry(value => value + 1); }} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"><RotateCw className="size-4" />Try again</button></section>
        : event && registrations && <>
          <section aria-label="Attendance overview" className="mb-6 grid gap-3 sm:grid-cols-3">
            <AttendanceMetric label="Confirmed tickets" value={attendance?.totalConfirmedTickets} icon={<Users className="size-4" />} />
            <AttendanceMetric label="Checked in" value={attendance?.totalCheckedInTickets} icon={<CheckCircle2 className="size-4" />} tone="success" />
            <AttendanceMetric label="Still expected" value={attendance?.totalNotYetCheckedInTickets} icon={<Clock3 className="size-4" />} />
          </section>
          {attendance && <section className="mb-7 rounded-2xl border border-white/10 bg-neutral-900 p-4 sm:p-5" aria-label="Attendance progress">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-stone-200">Attendance progress</span><span className="font-mono text-stone-300">{attendance.attendancePercentage}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${Math.min(100, Math.max(0, attendance.attendancePercentage))}%` }} /></div>
          </section>}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)]">
            <section aria-labelledby="scanner-heading" className="min-w-0">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-orange-300">Live check-in</p><h2 id="scanner-heading" className="mt-1 font-heading text-2xl font-bold">Scan a ticket</h2></div><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-stone-300"><ShieldCheck className="size-4 text-emerald-300" />Verified by server</span></div>
              <div className="relative flex aspect-[4/3] min-h-72 max-h-[68vh] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 sm:aspect-video">
                <div id="organizer-qr-reader" aria-label="Camera QR scanner" className="absolute inset-0 w-full [&_video]:h-full [&_video]:w-full [&_video]:rounded-2xl [&_video]:object-cover" />
                {cameraActive && <ScanFrame />}
                {cameraBusy && !cameraActive && <div role="status" className="relative z-10 flex flex-col items-center gap-3 px-5 text-center"><LoaderCircle className="size-8 animate-spin text-orange-400" /><p className="text-sm text-stone-200">Starting camera…</p></div>}
                {!cameraActive && !cameraBusy && <div className="relative z-10 flex max-w-sm flex-col items-center px-5 text-center"><span className="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-orange-300"><CameraOff className="size-7" /></span><p className="mt-4 font-semibold">{selected ? 'Camera paused for manual check-in' : 'Camera is off'}</p><p className="mt-1 text-sm leading-relaxed text-stone-400">{selected ? 'Finish or clear the selected guest, then restart the scanner.' : 'Allow camera access, then hold the ticket QR code inside the frame.'}</p>{!selected && <button type="button" disabled={cameraBusy || checkInBusy} onClick={() => void startCamera()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-wait disabled:opacity-50"><Camera className="size-4" />Start camera</button>}</div>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {cameraActive && <button type="button" onClick={() => void stopCamera()} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-stone-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange-400"><CameraOff className="size-4" />Stop camera</button>}
                {(cameraError || cameraActive) && <button type="button" disabled={cameraBusy || checkInBusy} onClick={() => { void stopCamera().then(() => { if (mountedRef.current) void startCamera(); }); }} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-stone-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange-400 disabled:opacity-50"><RotateCw className="size-4" />Restart camera</button>}
              </div>
              {cameraError && <div role="alert" className="mt-3 flex gap-3 rounded-xl border border-amber-400/30 bg-amber-950/35 p-4 text-sm text-amber-100"><CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-300" /><div className="min-w-0"><p className="font-semibold">Camera needs attention</p><p className="mt-1 leading-relaxed text-amber-100/85">{cameraError}</p><p className="mt-2 text-xs text-amber-100/70">You can still check in guests using manual search.</p></div></div>}
              <p className="mt-3 text-xs leading-relaxed text-stone-500">QR scans are verified against this event. Searching for a guest does not check them in automatically.</p>
            </section>

            <div className="space-y-5">
              {checkInBusy && <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl border border-orange-400/25 bg-orange-950/35 p-4 text-sm text-orange-100"><LoaderCircle className="size-5 animate-spin text-orange-300" />Checking ticket with the server…</div>}
              {feedback && <FeedbackCard feedback={feedback} attendee={feedback.ticket ? registrations.find(registration => ticketsFor(registration).some(ticket => ticket.id === feedback.ticket?.id))?.attendee : selected?.attendee} onNext={resetForNext} checkInBusy={checkInBusy} />}

              {selected && <section aria-labelledby="guest-heading" className="rounded-2xl border border-white/10 bg-neutral-900 p-4 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-orange-300">Manual lookup</p><h2 id="guest-heading" className="mt-1 font-heading text-xl font-bold">{selected.attendee.firstname} {selected.attendee.lastname}</h2><p className="mt-1 break-all text-sm text-stone-400">{selected.attendee.email}</p></div><button type="button" onClick={resetForNext} aria-label="Clear selected guest" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-orange-400"><X className="size-4" /></button></div>
                <div className="space-y-2">
                  {ticketsFor(selected).length ? ticketsFor(selected).map(ticket => {
                    const checkedInNow = feedback?.kind === 'success' && feedback.ticket?.id === ticket.id;
                    return <div key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="min-w-0"><p className="text-sm font-semibold text-stone-100">{ticket.type} <span className="text-xs font-medium text-stone-400">· {ticket.status === 'ACTIVE' && checkedInNow ? 'USED' : ticket.status}</span></p><p className="mt-1 break-all font-mono text-xs text-stone-400">{ticket.referenceNumber}</p></div>
                      {ticket.status === 'ACTIVE' && !checkedInNow ? <button type="button" disabled={checkInBusy} onClick={() => void submitCheckIn(() => checkInTicket(ticket.id))} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 text-sm font-bold text-white hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-wait disabled:opacity-50"><CheckCircle2 className="size-4" />{checkInBusy ? 'Checking in…' : 'Check in'}</button> : <span className={`${checkedInNow || ticket.status === 'USED' ? 'bg-emerald-950 text-emerald-200' : 'bg-white/5 text-stone-300'} inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold`}><CheckCircle2 className="size-4" />{checkedInNow ? 'Checked in now' : ticket.status === 'USED' ? 'Already checked in' : 'Not eligible'}</span>}
                    </div>;
                  }) : <p className="rounded-xl border border-white/10 p-3 text-sm text-stone-400">No ticket is attached to this booking.</p>}
                </div>
              </section>}

              <section aria-labelledby="manual-search-heading" className="rounded-2xl border border-white/10 bg-neutral-900 p-4 sm:p-5">
                <div className="mb-3"><h2 id="manual-search-heading" className="font-heading text-lg font-bold">Find a guest</h2><p className="mt-1 text-xs leading-relaxed text-stone-400">Search this event’s guest list by name or individual ticket reference.</p></div>
                <label htmlFor="guest-search" className="sr-only">Search guests by name or ticket reference</label>
                <div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" /><input id="guest-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or ticket reference" autoComplete="off" className="min-h-12 w-full rounded-xl border border-white/10 bg-neutral-950 pl-10 pr-3 text-sm text-white placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-orange-400" /></div>
                {query && <div className="mt-3" aria-live="polite"><p className="mb-2 text-xs text-stone-400">{matches.length ? `${matches.length} matching guest${matches.length === 1 ? '' : 's'}${matches.length === 10 ? ' (showing first 10)' : ''}` : 'No guests match this search.'}</p>{matches.length > 0 && <ul className="max-h-72 divide-y divide-white/10 overflow-y-auto rounded-xl border border-white/10">{matches.map(registration => <li key={registration.id}><button type="button" onClick={() => selectGuest(registration)} className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-orange-400"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-stone-100">{registration.attendee.firstname} {registration.attendee.lastname}</span><span className="mt-0.5 block truncate font-mono text-xs text-stone-400">{ticketsFor(registration).map(ticket => ticket.referenceNumber).join(' · ') || 'No ticket issued'}</span></span><ArrowLeft className="size-4 shrink-0 rotate-180 text-orange-300" aria-hidden="true" /></button></li>)}</ul>}</div>}
                {!query && <p className="mt-3 text-xs text-stone-500">{registrations.length} booking{registrations.length === 1 ? '' : 's'} in this event’s guest list</p>}
              </section>
            </div>
          </div>
        </>}
    </div>
  </main>;
}

function formatEventDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function AttendanceMetric({ label, value, icon, tone = 'neutral' }: { label: string; value?: number; icon: ReactNode; tone?: 'neutral' | 'success' }) {
  return <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-4"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone === 'success' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-orange-300'}`}>{icon}</span><div className="min-w-0"><p className="font-heading text-2xl font-bold leading-none text-white">{value ?? '—'}</p><p className="mt-1 truncate text-xs text-stone-400">{label}</p></div></div>;
}

function FeedbackCard({ feedback, attendee, onNext, checkInBusy }: { feedback: CheckInFeedback; attendee?: EventRegistration['attendee']; onNext: () => void; checkInBusy: boolean }) {
  const success = feedback.kind === 'success';
  const warning = feedback.kind === 'warning';
  return <section role={feedback.kind === 'error' ? 'alert' : 'status'} aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'} className={`rounded-2xl border p-4 sm:p-5 ${success ? 'border-emerald-400/35 bg-emerald-950/45' : warning ? 'border-amber-400/35 bg-amber-950/35' : 'border-rose-400/35 bg-rose-950/35'}`}>
    <div className="flex items-start gap-3"><span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ${success ? 'bg-emerald-400/15 text-emerald-300' : warning ? 'bg-amber-400/15 text-amber-200' : 'bg-rose-400/15 text-rose-200'}`}>{success ? <CheckCircle2 className="size-6" /> : <CircleAlert className="size-6" />}</span><div className="min-w-0"><h2 className="font-heading text-lg font-bold">{feedback.title}</h2><p className="mt-1 text-sm leading-relaxed text-stone-200">{feedback.message}</p>
      {attendee && <p className="mt-3 text-sm font-semibold">{attendee.firstname} {attendee.lastname}<span className="mt-0.5 block break-all text-xs font-normal text-stone-400">{attendee.email}</span></p>}
      {feedback.ticket && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-300"><span className="inline-flex items-center gap-1.5"><Ticket className="size-3.5" />Ticket {feedback.ticket.referenceNumber}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{new Date(feedback.ticket.checkedInAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span></div>}
      {feedback.retry && <button type="button" onClick={feedback.retry} disabled={checkInBusy} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange-400 disabled:opacity-50"><RotateCw className="size-4" />Retry check-in</button>}
      </div></div>
    <button type="button" onClick={onNext} className="mt-4 min-h-10 rounded-lg bg-white/10 px-3.5 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-orange-400">{success ? 'Check in another ticket' : 'Clear message'}</button>
  </section>;
}

function ScanFrame() {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"><div className="relative aspect-square w-[65%] max-w-[360px] rounded-3xl border border-white/40 shadow-[0_0_0_999px_rgba(0,0,0,.22)]"><span className="absolute -left-px -top-px size-8 rounded-tl-3xl border-l-[3px] border-t-[3px] border-orange-400" /><span className="absolute -right-px -top-px size-8 rounded-tr-3xl border-r-[3px] border-t-[3px] border-orange-400" /><span className="absolute -bottom-px -left-px size-8 rounded-bl-3xl border-b-[3px] border-l-[3px] border-orange-400" /><span className="absolute -bottom-px -right-px size-8 rounded-br-3xl border-b-[3px] border-r-[3px] border-orange-400" /></div></div>;
}


function ticketsFor(registration: EventRegistration) {
  return registration.tickets ?? (registration.ticket ? [registration.ticket] : []);
}
