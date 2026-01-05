import { ReactNode } from 'react';
import { useRevealOnScroll } from '../../lib/useRevealOnScroll';

interface SectionProps {
  children: ReactNode;
  className?: string;
  reveal?: boolean;
}

export function Section({ children, className = '', reveal = true }: SectionProps) {
  const ref = useRevealOnScroll<HTMLElement>();

  return (
    <section
      ref={reveal ? ref : undefined}
      className={`${reveal ? 'reveal' : ''} ${className}`}
    >
      {children}
    </section>
  );
}
