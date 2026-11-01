import React from 'react';
import { motion } from 'framer-motion';

export const Card = ({ children, className = '', hover = false, onClick, padding = 'p-6' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`card ${padding} ${hover ? 'card-hover cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Backwards compatibility alias
export const GlassCard = ({ children, className = '', hoverEffect = false, onClick }) => {
  return (
    <Card hover={hoverEffect} onClick={onClick} className={className}>
      {children}
    </Card>
  );
};
