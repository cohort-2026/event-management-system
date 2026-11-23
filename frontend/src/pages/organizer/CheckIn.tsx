import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import type { Html5Qrcode } from 'html5-qrcode';
import { getEventAttendance, getEventRegistrations, getManagedEvent, type EventAttendanceSummary, type EventRegistration } from '@/services/eventService';
import { checkInTicket, scanTicketQr, type TicketCheckInResult } from '@/services/ticketService';
import type { Event } from '@/types/event';

const errorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message ?? fallback : fallback;

type CheckInFeedback = {
  kind: 'success' | 'warning' | 'error';
  title: string;
  message: string;
  ticket?: TicketCheckInResult;
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
  if (status === 409 && message.includes('payment')) {
    return { kind: 'error', title: 'Payment not completed', message: 'This ticket cannot be checked in until its payment is confirmed.' };
  }
  if (status === 409 && message.includes('booking')) {
    return { kind: 'error', title: 'Booking not confirmed', message: 'This ticket is not eligible for check-in.' };
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
      if (registrationsResult.status === 'fulfilled') setRegistrations(registrationsResult.value.data.data);
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
      setFeedback(checkInError(error));
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

  const checkedIn = attendance?.totalCheckedInTickets;
  const query = search.trim().toLowerCase();
  const matches = query && registrations
    ? registrations.filter(registration =>
      `${registration.attendee.firstname} ${registration.attendee.lastname} ${ticketsFor(registration).map(ticket => ticket.referenceNumber).join(' ')}`
        .toLowerCase().includes(query)).slice(0, 10)
    : [];

  return (
    <main className="min-h-dvh bg-black text-white">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-5">
        <header className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 bg-black px-4">
          <Link to={id ? `/organizer/events/${id}` : '/organizer/events'} aria-label="Close scanner" className="rounded-lg p-2 text-2xl text-white hover:bg-white/10">×</Link>
          <div className="text-center">
            <p className="text-xl font-bold">{checkedIn ?? '—'}<span className="text-sm text-white/70"> / {attendance?.totalConfirmedTickets ?? '—'}</span></p>
            <p className="text-xs text-white/70">tickets checked in / confirmed</p>
          </div>
          <button type="button" disabled={!torchAvailable || !cameraActive} onClick={() => void toggleTorch()} aria-label={torchOn ? 'Turn camera light off' : 'Turn camera light on'} aria-pressed={torchOn} className="rounded-lg p-2 text-xl text-white hover:bg-white/10 disabled:opacity-30">ϟ</button>
        </header>

        <div className="mt-4 rounded-xl border border-white/10 bg-[#1d1b1b] px-4 py-3 text-sm text-white/80">
          Scanned QR codes are validated by the event check-in service. Guest search never checks anyone in automatically.
        </div>

        {loading ? (
          <p role="status" className="py-12 text-center text-sm text-white/70">Loading event and guest list…</p>
        ) : loadError ? (
          <div role="alert" className="mt-5 rounded-xl bg-rose-950 p-4 text-sm text-white">
            <p>{loadError}</p>
            <button type="button" onClick={() => { setLoadError(''); setLoading(true); setRetry(value => value + 1); }} className="mt-3 font-semibold underline">Try again</button>
          </div>
        ) : event && registrations && (
          <>
            <div className="relative mt-5 flex min-h-80 flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#1d1b1b]">
              <div id="organizer-qr-reader" className="w-full" />
              {cameraBusy && !cameraActive && <p role="status" className="py-6 text-sm text-white/80">Starting camera…</p>}
              {!cameraActive && !cameraBusy && !selected && (
                <div className="flex flex-col items-center px-5 py-10 text-center">
                  <div aria-hidden="true" className="flex h-44 w-44 items-center justify-center rounded-2xl border-4 border-orange-500 text-6xl text-white/30">▦</div>
                  <p className="mt-6 text-sm text-white/80">Point the camera at a QR code on the guest's phone</p>
                  <button type="button" disabled={cameraBusy} onClick={() => void startCamera()} className="mt-5 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50">
                    {cameraBusy ? 'Starting camera…' : 'Start camera'}
                  </button>
                </div>
              )}
              {cameraActive && <button type="button" onClick={() => void stopCamera()} className="absolute bottom-3 rounded-lg bg-black/80 px-4 py-2 text-sm font-semibold text-white">Stop camera</button>}
            </div>
            {cameraError && <p role="alert" className="mt-3 rounded-lg bg-rose-950 px-4 py-3 text-sm text-white">{cameraError}</p>}

            {checkInBusy && <p role="status" className="mt-4 rounded-xl bg-blue-950 p-4 text-sm text-blue-100">Checking ticket with the server…</p>}

            {feedback && (
              <section role={feedback.kind === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-xl border p-4 ${feedback.kind === 'success' ? 'border-emerald-500 bg-emerald-950' : feedback.kind === 'warning' ? 'border-amber-500 bg-amber-950' : 'border-rose-500 bg-rose-950'}`}>
                <h1 className="font-bold">{feedback.title}</h1>
                <p className="mt-2 text-sm">{feedback.message}</p>
                {feedback.ticket && <p className="mt-2 text-xs text-emerald-100">Ticket {feedback.ticket.referenceNumber} · {new Date(feedback.ticket.checkedInAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</p>}
                {(!selected || feedback.kind !== 'success') && <button type="button" onClick={resetForNext} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black">Scan or search next</button>}
              </section>
            )}

            {selected && (
              <section role="status" className="mt-4 rounded-xl border border-amber-500 bg-amber-950 p-4">
                <h1 className="font-bold">Guest selected</h1>
                <p className="mt-2 text-sm">{selected.attendee.firstname} {selected.attendee.lastname}</p>
                <div className="mt-3 space-y-2">
                  {ticketsFor(selected).length ? ticketsFor(selected).map(ticket => (
                    <div key={ticket.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 p-3">
                      <div><p className="text-sm font-semibold">{ticket.type} · {ticket.status}</p><p className="font-mono text-xs text-white/70">{ticket.referenceNumber}</p></div>
                      {ticket.status === 'ACTIVE' && feedback?.ticket?.id !== ticket.id ? (
                        <button type="button" disabled={checkInBusy} onClick={() => void submitCheckIn(() => checkInTicket(ticket.id))} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                          {checkInBusy ? 'Checking in…' : 'Check in ticket'}
                        </button>
                      ) : <span className="text-xs text-white/70">{ticket.status === 'USED' ? 'Already checked in' : 'Not eligible for entry'}</span>}
                    </div>
                  )) : <p className="text-sm text-white/70">No ticket issued</p>}
                </div>
                <button type="button" onClick={resetForNext} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black">Choose another guest</button>
              </section>
            )}

            <label htmlFor="guest-search" className="sr-only">Search guests by name or ticket reference</label>
            <input id="guest-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name or code" className="mt-4 w-full rounded-xl border border-white/10 bg-[#1d1b1b] px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline focus:outline-2 focus:outline-orange-500" />
            {query && (
              <div className="mt-2 rounded-xl bg-[#1d1b1b]">
                {matches.length ? (
                  <ul className="divide-y divide-white/10">
                    {matches.map(registration => (
                      <li key={registration.id}>
                        <button type="button" onClick={() => selectGuest(registration)} className="w-full px-4 py-3 text-left hover:bg-white/10">
                          <span className="block text-sm font-semibold">{registration.attendee.firstname} {registration.attendee.lastname}</span>
                          <span className="text-xs text-white/70">{ticketsFor(registration).map(ticket => ticket.referenceNumber).join(' · ') || 'No ticket issued'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="px-4 py-3 text-sm text-white/70">No guests match this search.</p>}
              </div>
            )}
            <p className="mt-4 text-center text-xs text-white/60">{event.title} · {event.venue}</p>
          </>
        )}
      </div>
    </main>
  );
}

function ticketsFor(registration: EventRegistration) {
  return registration.tickets ?? (registration.ticket ? [registration.ticket] : []);
}
