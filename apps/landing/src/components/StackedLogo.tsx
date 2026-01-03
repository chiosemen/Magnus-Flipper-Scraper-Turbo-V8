'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

interface StackedLogoProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export default function StackedLogo({ 
  size = 'md', 
  animated = false,
  className = ''
}: StackedLogoProps) {
  const sizes = {
    sm: { width: 120, height: 160 },
    md: { width: 180, height: 240 },
    lg: { width: 240, height: 320 },
  };

  const { width, height } = sizes[size];

  const Wrapper = animated ? motion.div : 'div';
  const wrapperProps = animated ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: 'easeOut' as any }
  } : {};

  return (
    // @ts-ignore - framer motion types
    <Wrapper 
      className={`flex flex-col items-center ${className}`}
      {...wrapperProps}
    >
      <Image
        src="/logo-stacked.svg"
        alt="Magnus Flipper AI"
        width={width}
        height={height}
        priority
      />
    </Wrapper>
  );
}