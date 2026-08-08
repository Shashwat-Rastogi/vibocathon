import React, { useState } from 'react';
import './WaviyText.css';

const WaviyText = ({ text }) => {
  const [isHovered, setIsHovered] = useState(false);
  const words = text.split(' ');
  let charIndex = 0;

  return (
    <div 
      className={`waviy hero-title ${isHovered ? 'force-hover' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
