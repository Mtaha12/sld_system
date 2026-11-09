import React from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

/**
 * Ultra-fast, zero-delay page transition wrapper.
 * Renders the active route outlet immediately without artificial delay bottlenecks.
 */
const PageTransition = () => {
  const location = useLocation();
  const currentOutlet = useOutlet();

  return (
    <div
      key={location.pathname}
      className="w-full animate-fade-in motion-reduce:animate-none"
    >
      {currentOutlet}
    </div>
  );
};

export default PageTransition;
