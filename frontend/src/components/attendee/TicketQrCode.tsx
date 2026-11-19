import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface TicketQrCodeProps {
  payload: string;
  className?: string;
}

export default function TicketQrCode({ payload, className = '' }: TicketQrCodeProps) {
  const [result, setResult] = useState<{ payload: string; image?: string; error?: string } | null>(null);

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 240 })
      .then(dataUrl => {
        if (active) setResult({ payload, image: dataUrl });
      })
      .catch(() => {
        if (active) setResult({
          payload,
          error: 'Your ticket QR code could not be generated. Please try again later.',
        });
      });

    return () => { active = false; };
  }, [payload]);

  if (!result || result.payload !== payload) {
    return <p role="status" className="py-8 text-center text-xs text-neutral-500">Preparing your QR code…</p>;
  }
  if (result.error) return <p role="alert" className="text-center text-xs text-rose-700">{result.error}</p>;

  return (
    <img
      src={result.image}
      alt="Ticket check-in QR code"
      className={`mx-auto block h-auto w-full max-w-[240px] ${className}`}
    />
  );
}
