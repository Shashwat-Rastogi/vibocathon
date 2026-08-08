import React, { useState, useEffect, useRef } from 'react';
import './WaviyText.css';

const WaviyText = ({ text }) => {
  const [isHovered, setIsHovered] = useState(false);
  const textRef = useRef(null);
  const words = text.split(' ');
  let charIndex = 0;

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!textRef.current) return;
      const rect = textRef.current.getBoundingClientRect();
      const inBounds = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      setIsHovered(inBounds);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={textRef} className={`waviy hero-title ${isHovered ? 'force-hover' : ''}`}>
      {words.map((word, wIndex) => (
        <span key={wIndex} className="waviy-word">
          {word.split('').map((char) => {
            charIndex++;
            return (
              <span key={charIndex} style={{ '--i': charIndex }}>
                {char}
              </span>
            );
          })}
          {wIndex < words.length - 1 && <span style={{ width: '0.4em' }}></span>}
        </span>
      ))}
    </div>
  );
};

export default WaviyText;
