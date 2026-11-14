import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import type { Html5Qrcode } from 'html5-qrcode';
import { getEventRegistrations, getManagedEvent, type EventRegistration } from '@/services/eventService';
import type { Event } from '@/types/event';

const errorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message ?? fallback : fallback;

export default function CheckIn() {
  const { id = '' } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[] | null>(null);
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
  const [unmatched, setUnmatched] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef<Promise<null> | null>(null);
  const stoppingRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(false);
  const scannedRef = useRef(false);
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
        if (scanner.isScanning) await scanner.stop();
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

  useEffect(() => {
    let active = true;
    Promise.all([getManagedEvent(id), getEventRegistrations(id)])
      .then(([eventResponse, registrationsResponse]) => {
        if (!active) return;
        setEvent(eventResponse.data.data);
        setRegistrations(registrationsResponse.data.data);
      })
      .catch(error => {
        if (active) setLoadError(errorMessage(error, 'Event or guest list could not be loaded.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, retry]);

  const startCamera = async () => {
    if (cameraBusy || scannerRef.current || selected || unmatched || !registrations) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is unavailable. Use HTTPS or localhost, or search for a guest below.');
      return;
    }

    setCameraBusy(true);
    setCameraError('');
    setUnmatched(false);
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
      const starting = scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: (width, height) => {
          const size = Math.floor(Math.min(width, height) * 0.65);
          return { width: size, height: size };
        } },
        decodedText => {
          if (scannedRef.current || !mountedRef.current) return;
          scannedRef.current = true;
          const reference = decodedText.trim().toLowerCase();
          const match = registrations.find(registration =>
            registration.ticket?.referenceNumber.toLowerCase() === reference);
          setSelected(match ?? null);
          setUnmatched(!match);
          void stopCamera();
        },
        () => {},
      );
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
        setCameraError('The camera could not start. Check camera permission or use guest search.');
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
    setUnmatched(false);
    setSearch('');
  };

  const tickets = registrations?.filter(registration =>
    registration.status !== 'CANCELLED' && registration.ticket);
  const checkedIn = tickets?.filter(registration => registration.ticket?.status === 'USED').length;
  const query = search.trim().toLowerCase();
  const matches = query && registrations
    ? registrations.filter(registration =>
      `${registration.attendee.firstname} ${registration.attendee.lastname} ${registration.ticket?.referenceNumber ?? ''}`
        .toLowerCase().includes(query)).slice(0, 10)
    : [];

  return (
    <main className="min-h-dvh bg-black text-white">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-5">
        <header className="flex items-center justify-between gap-3">
          <Link to={id ? `/organizer/events/${id}` : '/organizer/events'} aria-label="Close scanner" className="rounded-lg p-2 text-2xl text-white hover:bg-white/10">×</Link>
          <div className="text-center">
            <p className="text-xl font-bold">{checkedIn ?? '—'}<span className="text-sm text-white/70"> / {tickets?.length ?? '—'}</span></p>
            <p className="text-xs text-white/70">tickets marked used / issued</p>
          </div>
          <button type="button" disabled={!torchAvailable || !cameraActive} onClick={() => void toggleTorch()} aria-label={torchOn ? 'Turn camera light off' : 'Turn camera light on'} aria-pressed={torchOn} className="rounded-lg p-2 text-xl text-white hover:bg-white/10 disabled:opacity-30">ϟ</button>
        </header>

        <div className="mt-4 rounded-xl border border-amber-500/50 bg-amber-950 px-4 py-3 text-sm text-amber-100">
          Lookup only. Check-in is unavailable; scanning does not admit a guest.
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
              {!cameraActive && !cameraBusy && !selected && !unmatched && (
                <div className="flex flex-col items-center px-5 py-10 text-center">
                  <div aria-hidden="true" className="flex h-44 w-44 items-center justify-center rounded-2xl border-4 border-orange-500 text-6xl text-white/30">▦</div>
                  <p className="mt-6 text-sm text-white/80">Point the camera at a ticket QR code</p>
                  <button type="button" disabled={cameraBusy} onClick={() => void startCamera()} className="mt-5 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50">
                    {cameraBusy ? 'Starting camera…' : 'Start camera'}
                  </button>
                </div>
              )}
              {cameraActive && <button type="button" onClick={() => void stopCamera()} className="absolute bottom-3 rounded-lg bg-black/80 px-4 py-2 text-sm font-semibold text-white">Stop camera</button>}
            </div>
            {cameraError && <p role="alert" className="mt-3 rounded-lg bg-rose-950 px-4 py-3 text-sm text-white">{cameraError}</p>}

            {(selected || unmatched) && (
              <section role="status" className="mt-4 rounded-xl border border-amber-500 bg-amber-950 p-4">
                <h1 className="font-bold">{selected ? 'Guest found — lookup only' : 'No matching reference found'}</h1>
                {selected ? (
                  <>
                    <p className="mt-2 text-sm">{selected.attendee.firstname} {selected.attendee.lastname}</p>
                    <p className="mt-1 text-sm">{selected.ticket ? `${selected.ticket.type} · ${selected.ticket.referenceNumber} · ${selected.ticket.status} at load` : 'No ticket issued'}</p>
                    <p className="mt-2 text-sm text-amber-100">This lookup does not confirm admission or change ticket status.</p>
                  </>
                ) : <p className="mt-2 text-sm text-amber-100">Only exact ticket references in this event’s guest list can be matched.</p>}
                <button type="button" onClick={() => { setSelected(null); setUnmatched(false); }} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black">Scan or search next</button>
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
                          <span className="text-xs text-white/70">{registration.ticket?.referenceNumber ?? 'No ticket issued'}</span>
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
