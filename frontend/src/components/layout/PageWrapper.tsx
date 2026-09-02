import Navbar from './Navbar';

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
}

export default function PageWrapper({ children, title }: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
        {title && <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
