import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getEvents } from '@/services/eventService';
import { getMyStaffMembers } from '@/services/vendorService';
import type { Event } from '@/types/event';
import type { VendorStaffWithEvent } from '@/types/vendor';

export default function VendorSearchField({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (value: string) => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [staffMembers, setStaffMembers] = useState<VendorStaffWithEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const query = value ?? internalValue;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const eventResults = normalizedQuery
    ? events.filter(event =>
      [event.title, event.venue, event.category, event.description]
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    ).slice(0, 5)
    : [];
  const staffResults = normalizedQuery
    ? staffMembers.filter(member =>
      [member.name, member.email, member.entryPassId, member.application.event.title]
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    ).slice(0, 5)
    : [];

  useEffect(() => {
    if (!open || loaded) return;
    let active = true;

    const loadSearchData = async () => {
      try {
        const response = await getEvents();
        if (active) setEvents(response.data.data ?? []);
      } catch {
        if (active) setError('Events could not be searched right now.');
      }

      if (user?.role === 'VENDOR') {
        try {
          const response = await getMyStaffMembers();
          if (active) setStaffMembers(response.data.data ?? []);
        } catch {
          if (active) setError(current => current
            ? `${current} Staff passes could not be searched.`
            : 'Staff passes could not be searched right now.');
        }
      }

      if (active) {
        setLoaded(true);
        setLoading(false);
      }
    };

    void loadSearchData();
    return () => { active = false; };
  }, [open, loaded, user?.role]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const updateQuery = (nextValue: string) => {
    setInternalValue(nextValue);
    onChange?.(nextValue);
    if (!loaded) {
      setLoading(true);
      setError('');
    }
    setOpen(true);
  };

  const openSearch = () => {
    if (!loaded) {
      setLoading(true);
      setError('');
    }
    setOpen(true);
  };

  const openFirstResult = () => {
    const event = eventResults[0];
    if (event) {
      navigate(`/events/${event.id}`);
      setOpen(false);
      return;
    }

    const staffMember = staffResults[0];
    if (staffMember) {
      navigate(`/vendor/applications/${staffMember.application.id}/staff`);
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="flex h-7 w-[min(190px,calc(100vw-10rem))] items-center gap-2 rounded-md bg-[#f5f5f5] px-2.5 text-[12px] text-[#777] focus-within:ring-1 focus-within:ring-[#c8c8c8]">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="6" />
          <path strokeLinecap="round" d="m16 16 4 4" />
        </svg>
        <input
          type="search"
          aria-label="Search events and people"
          aria-expanded={open}
          aria-controls="global-search-results"
          placeholder="Search events, people..."
          value={query}
          onFocus={openSearch}
          onChange={event => updateQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              openFirstResult();
            }
          }}
          className="min-w-0 w-full bg-transparent text-[12px] text-[#444] outline-none placeholder:text-[#888]"
        />
      </label>

      {open && (
        <div
          id="global-search-results"
          role="listbox"
          aria-label="Search results"
          className="absolute right-0 top-[calc(100%+0.375rem)] z-[70] max-h-[calc(100dvh-3rem)] w-[min(18rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border border-[#e5e5e5] bg-white p-1.5 shadow-xl"
        >
          {!normalizedQuery ? (
            <p className="px-2 py-2 text-[12px] text-[#777]">Search events, venues, staff, or pass codes.</p>
          ) : loading ? (
            <p role="status" className="px-2 py-2 text-[12px] text-[#777]">Searching…</p>
          ) : (
            <>
              {error && <p role="alert" className="px-2 py-1.5 text-[12px] text-rose-700">{error}</p>}
              {eventResults.map(event => (
                <button
                  key={`event-${event.id}`}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => {
                    navigate(`/events/${event.id}`);
                    setOpen(false);
                  }}
                  className="block w-full rounded-md px-2.5 py-2.5 text-left hover:bg-[#f5f5f5]"
                >
                  <span className="block truncate text-[12px] font-semibold text-[#222]">{event.title}</span>
                  <span className="block truncate text-[12px] text-[#777]">{event.venue} · Event</span>
                </button>
              ))}
              {staffResults.map(member => (
                <button
                  key={`staff-${member.id}`}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => {
                    navigate(`/vendor/applications/${member.application.id}/staff`);
                    setOpen(false);
                  }}
                  className="block w-full rounded-md px-2.5 py-2.5 text-left hover:bg-[#f5f5f5]"
                >
                  <span className="block truncate text-[12px] font-semibold text-[#222]">{member.name}</span>
                  <span className="block truncate text-[12px] text-[#777]">{member.email} · {member.application.event.title}</span>
                </button>
              ))}
              {!eventResults.length && !staffResults.length && (
                <p className="px-2 py-2 text-[12px] text-[#777]">No matching events or people.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
