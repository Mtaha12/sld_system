import SquareLoader from './SquareLoader';

const Spinner = ({ size = 'md', text = '', className = '', fullscreen = false }) => {
  return (
    <SquareLoader 
      size={size} 
      text={text} 
      className={className} 
      fullscreen={fullscreen} 
    />
  );
};

export default Spinner;

