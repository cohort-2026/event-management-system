export interface CalendarEventDetails {
  id: string;
  title: string;
  description: string;
  startTime: string | Date;
  endTime: string | Date;
  venue: string;
  meetingDetails?: string | null;
}

const escapeIcsText = (value: string) => value
  .replace(/\\/g, '\\\\')
  .replace(/\r\n|\r|\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

const formatUtcDate = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Event date is invalid');
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

const foldLine = (line: string) => {
  const folded: string[] = [];
  let current = '';
  let octets = 0;
  for (const character of line) {
    const characterOctets = new TextEncoder().encode(character).length;
    if (octets + characterOctets > 75) {
      folded.push(current);
      current = ` ${character}`;
      octets = 1 + characterOctets;
    } else {
      current += character;
      octets += characterOctets;
    }
  }
  folded.push(current);
  return folded.join('\r\n');
};

const filenameFromTitle = (title: string) =>
  title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'event';

export function downloadEventCalendar(event: CalendarEventDetails): void {
  const description = [
    event.description,
    ...(event.meetingDetails ? [`Meeting details: ${event.meetingDetails}`] : []),
  ].filter(Boolean).join('\n\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'PRODID:-//EventMS//Event Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(event.id)}@eventms`,
    `DTSTAMP:${formatUtcDate(new Date())}`,
    `DTSTART:${formatUtcDate(event.startTime)}`,
    `DTEND:${formatUtcDate(event.endTime)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(event.venue || 'Online event')}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ];
  const calendar = lines.map(foldLine).join('\r\n');
  const objectUrl = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${filenameFromTitle(event.title)}.ics`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
