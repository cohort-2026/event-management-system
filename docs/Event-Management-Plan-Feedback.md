# Event Management System — Feedback on Your Plan

**Team:** Event Management
**Document:** `docs/EventManagementSystem.pdf`
**Date:** 25 August 2026
**From:** Dzunisani Mongwe, Programme Lead

---

## What you did well

You were given four lines from the client. You turned them into a real problem
statement, and that is the hardest part of Week 1.

- You explained the problem in your own words instead of repeating the brief.
- You said who is affected and why it matters to each of them.
- Your success criteria are clear. Someone can check whether you met them.
- Your stakeholder table gives each person a goal and a list of actions.

The thinking is good. Most of the changes below are about how it is written down.

---

## 1. Do not remove features. Put them in phases.

On page 4 you recommend leaving out payments, QR check-in, notifications,
calendar sync and analytics.

Your instinct is right: you cannot build everything in ten weeks. But the answer
is wrong. **A plan should show everything the client will eventually need, and
then say what gets built first, second and third.** If you delete features from
the plan, the client thinks you did not understand the job.

Replace page 4 with a table like this:

| Phase | What is in it |
|-------|---------------|
| **Phase 1** — build first | Accounts, create and manage events, browse and search, book a place, cancel a booking, see who booked, count bookings |
| **Phase 2** — build next | Ticket types including vendors, vendor applications, payments and invoices, check-in, confirmation and reminder emails |
| **Phase 3** — later version | QR scanning, calendar sync, refunds, waiting lists, detailed reports |

Then add one sentence: *"Phase 1 will be built so that Phase 2 can be added
without starting again."*

Two examples of what that means in practice:

- Even if every ticket is the same today, your system should already know that a
  ticket **has a type**. Adding a vendor ticket later is then a small change.
- Even if all events are free today, your system should already record whether
  payment is **not needed**, **waiting**, or **paid**. Adding payments later is
  then a small change.

---

## 2. You are missing vendors

Your client runs workshops, training sessions and networking events. At events
like these, businesses pay to have a stand, sell products or promote themselves.
That is income for the client, and vendors do not appear anywhere in your plan.

A vendor is not the same as an attendee:

- **They buy a space, not a seat.** An event might have 200 seats but only 10 stands.
  One "maximum number of attendees" field cannot describe both.
- **They usually need permission first.** Not everyone should be allowed to sell
  at someone else's event. Someone has to approve them.
- **One payment covers several people.** A stand comes with two or three staff,
  and each of them needs to get in on the day.
- **They need an invoice, not a receipt.** It is a business purchase, so it needs
  company details on it.
- **You need their business information:** company name, registration number, and
  what they are selling.

Add vendors to your stakeholder table, to your requirements, and to your flows.

One thing to be careful about: if a vendor asks for the list of people who
attended, that is other people's personal information. You must ask attendees for
permission before sharing it.

---

## 3. Your user flows need the most work

You have one flow diagram. It has four problems.

**It mixes different people into one line.**
Your flow is: Book → Ticket → Check-In → Reports. But the *attendee* books, the
*organizer* does check-in, and *management* reads reports. Three different people
in one diagram. That is why you have no organizer flow and no admin flow — they
got hidden inside this one.

**"Register" means two different things.**
Step 2 is "Register / Login" (create an account). Step 5 is "Register" (book a
place at an event). Same word, two meanings, three steps apart. Use **"Create
account"** and **"Book a place"**.

**Nothing ever goes wrong in your flow.**
A real system has to handle: the event is full, bookings have closed, the person
already booked, the payment failed, the organizer cancelled the event, the ticket
was already used. You mention some of these in your requirements, but you never
show what the system does about them.

**The paid flow hides a hard question.**
When exactly is a seat taken? If you only take it once payment succeeds, two
people can pay for the last seat. If you take it the moment someone clicks, people
who never pay will block seats all day. The usual answer is to **hold the seat for
a few minutes and release it if payment does not arrive.** Decide this now and
write it down.

**Draw one flow per person:**

1. Attendee — free event
2. Attendee — paid event
3. Vendor
4. Organizer
5. Admin
6. Management

For each one, show the normal path **and** what happens when something goes wrong.

---

## 4. Decide who is allowed to publish an event

Your requirements say organizers can publish and unpublish events themselves.
Your Story 3 and Story 4 say the organizer submits an event and an admin approves
it before it goes live.

Both cannot be true. Pick one, and make sure the whole document agrees. You will
need this decision again in Week 4 when you build permissions.

---

## 5. Platform Admin — you have one administrator, you need two

Your plan has one "Administrator" who approves events, manages users, manages
events, manages registrations and assigns roles. That is two different jobs.

| | Who they work for | What they manage |
|---|---|---|
| **Administrator** | The client | Approving events, overseeing registrations, managing organiser accounts and roles |
| **Platform Admin** | Us, who build and run it | Creating the client's first Administrator account, platform settings, fixing access problems |

**The client manages their own users.** The only thing we ever create is the very
first Administrator account, so that somebody at the client has the power to create
everyone else.

Here is why it matters to you right now: **who creates the very first account?**
Your plan has an Administrator who manages user accounts — but nobody creates the
Administrator. Every system has this problem and yours does not answer it.

The rule that keeps it safe: **the Platform Admin manages the system, not the
data.** They can reset a locked-out organiser's password. They should not be able
to open an attendee list or read a vendor's business details.

Add a Platform Admin to your stakeholder table, write down what they can and cannot
see, and keep a record of who did what and when — especially for anything a
Platform Admin does.

---

## 6. Smaller fixes

- **Your technology page disagrees with page 3.** Page 3 says React and Next.js.
  The technology page says React with a separate Node backend. Those are two
  different designs. The programme standard is **one Next.js application with
  TypeScript and PostgreSQL** — please update it.
- **"Database: MySQL, PostgreSQL or MongoDB" is not a decision.** Choose
  PostgreSQL and give one line saying why.
- **Postman is not an API.** It is a tool for testing APIs. Move it to a testing row.
- **Stories 1 and 2 talk about "appointment times"** and say "the appointment
  should be recorded". That is wording for a different kind of system — appointments,
  not events. Rewrite both in event language.
- **Write as a team.** The document says "I recommend". It should say "we".

---

## 7. Still missing from Week 1

- **Wireframes.** Simple drawings of the main screens. Paper and a photo is fine.
- **More user stories.** You have 5. You need one for every main thing a person
  can do — including creating an account, searching, cancelling a booking, and
  everything a vendor does.
- **A "who can do what" table.** Rows: Attendee, Vendor, Organizer, Admin,
  Management. Columns: every action in your system. Fill in every box. You will
  use this exact table again in Week 4 to build permissions, so it is worth doing
  properly.

---

## What to do next

1. Replace page 4 with the phase table.
2. Add vendors to the stakeholders, requirements and flows.
3. Draw the six flows, including what happens when things go wrong.
4. Decide who publishes events, and make the whole document agree.
5. Add a Platform Admin, and say what they can and cannot see.
6. Fix the technology page.
7. Rewrite Stories 1 and 2 in event language.
8. Add wireframes and the "who can do what" table.

Well done on the problem understanding — that part was genuinely good.
