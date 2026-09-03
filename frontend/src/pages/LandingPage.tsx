import { PageWrapper } from "@/components/layout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

export default function LandingPage() {
  return (
    <PageWrapper title="Landing Page" >
      {/* content */}
    
      <main className="page-container section-gap">
        {/* page content */}

  <h1>Welcome to the Event Management System</h1>
  <a href="/login">Login</a> | <a href="/register">Register</a>
  <div className="card-grid">
  <h2>Features</h2>
  <div className="card">
    <h3>Create Events</h3>
    <p>Organize and manage your events with ease.</p>
  </div>
  <div className="card">
    <h3>RSVP Management</h3>
    <p>Track attendees and manage RSVPs efficiently.</p>
  </div>
  <div className="card">
    <h3>Notifications</h3>
    <p>Send reminders and updates to your attendees.</p>
  </div>
</div>
<form className="form-stack">
  <Input label="Title" />
  <Input label="Location" />
  <Input label="Date" />
  <Textarea label="Description" />
  <Button type="submit">Save</Button>
</form>
  </main>
  </PageWrapper>
  );
}
