interface PageWrapperProps {
  children: React.ReactNode;
}

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f6_100%)] flex flex-col">
      <main className="flex-1 page-container section-gap">
        {children}
      </main>
    </div>
  );
}
