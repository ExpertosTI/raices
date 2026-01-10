import React from 'react';
import { motion } from 'framer-motion';

interface BlurTextProps {
    text: string;
    delay?: number;
    className?: string;
    animateBy?: 'words' | 'letters';
    direction?: 'top' | 'bottom';
    animationFrom?: any;
    animationTo?: any;
    easing?: any;
}

// Removed unused props to fix build
export const BlurText: React.FC<BlurTextProps> = ({
    text,
    delay = 200,
    className = '',
    animateBy = 'words',
    direction = 'top',
    animationFrom,
    animationTo,
    easing = "easeOut",
}) => {
    const elements = animateBy === 'words' ? text.split(' ') : text.split('');

    // Default config fallback
    const defaultFrom = direction === 'top'
        ? { filter: 'blur(10px)', opacity: 0, transform: 'translate3d(0,-50px,0)' }
        : { filter: 'blur(10px)', opacity: 0, transform: 'translate3d(0,50px,0)' };

    const defaultTo = [
        { filter: 'blur(5px)', opacity: 0.5, transform: direction === 'top' ? 'translate3d(0,5px,0)' : 'translate3d(0,-5px,0)' },
        { filter: 'blur(0px)', opacity: 1, transform: 'translate3d(0,0,0)' }
    ];

    return (
        <p className={className}>
            {elements.map((element, index) => (
                <motion.span
                    key={index}
                    initial={animationFrom || defaultFrom}
                    animate={animationTo || defaultTo}
                    transition={{
                        duration: 0.8, // Slightly slower for elegance
                        ease: easing,
                        delay: index * (delay / 1000), // Convert ms to s
                    }}
                    style={{ display: 'inline-block', marginRight: animateBy === 'words' ? '0.25em' : '0' }}
                >
                    {element}
                </motion.span>
            ))}
        </p>
    );
};
