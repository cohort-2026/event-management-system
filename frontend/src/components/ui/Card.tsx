interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

interface CardHeaderProps { children: React.ReactNode; className?: string; }
interface CardBodyProps   { children: React.ReactNode; className?: string; }
interface CardFooterProps { children: React.ReactNode; className?: string; }

function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-neutral-200 shadow-xs ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 focus-within:ring-2 focus-within:ring-brand-200' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`px-6 py-4 border-b border-neutral-100 ${className}`}>{children}</div>;
}

function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}

function CardFooter({ children, className = '' }: CardFooterProps) {
  return <div className={`px-6 py-4 border-t border-neutral-100 ${className}`}>{children}</div>;
}

Card.Header = CardHeader;
Card.Body   = CardBody;
Card.Footer = CardFooter;

export default Card;
