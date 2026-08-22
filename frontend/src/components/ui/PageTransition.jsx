import { useEffect, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

const PageTransition = () => {
  const location = useLocation();
  const currentOutlet = useOutlet();
  
  const [displayLocation, setDisplayLocation] = useState(location);
  const [displayOutlet, setDisplayOutlet] = useState(currentOutlet);
  const [transitionStage, setTransitionStage] = useState('in');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('out');
    }
  }, [location, displayLocation]);

  const handleTransitionEnd = () => {
    if (transitionStage === 'out') {
      setTransitionStage('in');
      setDisplayLocation(location);
      setDisplayOutlet(currentOutlet);
    }
  };

  return (
    <div
      onTransitionEnd={handleTransitionEnd}
      className={`w-full transition-all duration-300 ease-in-out motion-reduce:transition-none ${
        transitionStage === 'in'
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4'
      }`}
    >
      {displayOutlet}
    </div>
  );
};

export default PageTransition;
