"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ShootingStarsProps {
  isActive: boolean;
  onComplete?: () => void;
}

export function ShootingStars({ isActive, onComplete }: ShootingStarsProps) {
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; angle: number }>>([]);

  useEffect(() => {
    if (isActive) {
      // Create shooting stars with random positions and angles
      const newStars = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        angle: Math.random() * 360,
      }));
      
      setStars(newStars);
      
      // Clear stars after animation
      const timer = setTimeout(() => {
        setStars([]);
        onComplete?.();
      }, 1200);
      
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {stars.map((star) => (
            <motion.div
              key={star.id}
              className="absolute w-1 h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-transparent rounded-full"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                transform: `rotate(${star.angle}deg)`,
              }}
              initial={{ 
                scale: 0,
                opacity: 0,
                x: 0,
                y: 0,
              }}
              animate={{ 
                scale: [0, 1, 0.8, 0],
                opacity: [0, 1, 0.8, 0],
                x: [0, 30, 60, 80],
                y: [0, -20, -40, -60],
              }}
              transition={{
                duration: 1.2,
                ease: "easeOut",
                delay: Math.random() * 0.3,
              }}
            >
              {/* Star trail */}
              <motion.div
                className="absolute w-3 h-0.5 bg-gradient-to-r from-yellow-400 to-transparent"
                style={{
                  transform: `rotate(${star.angle}deg)`,
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: [0, 1, 0.8, 0] }}
                transition={{
                  duration: 1.2,
                  ease: "easeOut",
                  delay: Math.random() * 0.3,
                }}
              />
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
