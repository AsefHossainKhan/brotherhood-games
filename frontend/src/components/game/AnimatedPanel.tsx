'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface AnimatedPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedPanel({ children, className = '' }: AnimatedPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 16 }}
      transition={{ type: 'spring', stiffness: 170, damping: 24, mass: 0.9 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
