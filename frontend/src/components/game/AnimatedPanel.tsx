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
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
