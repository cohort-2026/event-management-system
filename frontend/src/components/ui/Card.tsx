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
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`px-5 py-4 border-b border-gray-100 ${className}`}>{children}</div>;
}

function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

function CardFooter({ children, className = '' }: CardFooterProps) {
  return <div className={`px-5 py-4 border-t border-gray-100 ${className}`}>{children}</div>;
}

Card.Header = CardHeader;
Card.Body   = CardBody;
Card.Footer = CardFooter;

export default Card;
