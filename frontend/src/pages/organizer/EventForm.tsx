import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CreateEventDto, Event } from '@/types/event';
import Button from '@/components/ui/Button';

type EventFormProps = {
  event?: Event;
  submitLabel: string;
  onSubmit: (data: CreateEventDto) => Promise<void>;
};

function localDateTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function EventForm({ event, submitLabel, onSubmit }: EventFormProps) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [category, setCategory] = useState(event?.category ?? '');
  const [venue, setVenue] = useState(event?.venue ?? '');
  const [date, setDate] = useState(localDateTime(event?.date));
  const [capacity, setCapacity] = useState(String(event?.capacity ?? ''));
  const [isFree, setIsFree] = useState(event?.isFree ?? true);
  const [price, setPrice] = useState(event?.price == null ? '' : String(event.price));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        venue: venue.trim(),
        date,
        capacity: Number(capacity),
        isFree,
        price: isFree ? null : Number(price),
      });
    } catch {
      setError('Could not save this event. Check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium text-neutral-700">
        Event title
        <input required value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2" />
      </label>
      <label className="block text-sm font-medium text-neutral-700">
        Description
        <textarea required rows={5} value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2" />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-neutral-700">
          Category
          <input required value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-neutral-700">
          Venue
          <input required value={venue} onChange={e => setVenue(e.target.value)} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-neutral-700">
          Date and time
          <input required type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-neutral-700">
          Capacity
          <input required min="1" type="number" value={capacity} onChange={e => setCapacity(e.target.value)} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <input type="checkbox" checked={isFree} onChange={e => setIsFree(e.target.checked)} />
        Free event
      </label>
      {!isFree && (
        <label className="block text-sm font-medium text-neutral-700">
          Ticket price (ZAR)
          <input required min="0" step="0.01" type="number" value={price} onChange={e => setPrice(e.target.value)} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2" />
        </label>
      )}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={saving}>{saving ? 'Saving...' : submitLabel}</Button>
    </form>
  );
}
