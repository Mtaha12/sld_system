import { MASONRY_COLUMNS } from '../constants/masonryContent';

const AuthMasonry = () => {
  const renderTile = (item, index) => {
    if (item.type === 'image') {
      return (
        <img
          key={index}
          src={item.src}
          className={`rounded-2xl object-cover w-full text-white ${item.heightClass}`}
          alt={item.alt}
          loading="lazy"
          decoding="async"
        />
      );
    }
    if (item.type === 'stat') {
      return (
        <div
          key={index}
          className={`rounded-2xl p-8 flex flex-col justify-center text-white ${item.bgColorClass} ${item.heightClass}`}
        >
          <h2 className="text-5xl font-bold mb-4">{item.heading}</h2>
          <p className="text-lg opacity-90">{item.text}</p>
        </div>
      );
    }
    return null;
  };

  const renderColumnBlocks = (column) => {
    // Each column content is repeated twice to form one continuous block
    const items = [...column.items, ...column.items];
    return items.map((item, idx) => renderTile(item, idx));
  };

  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/20 to-brand-dark/80 z-10 pointer-events-none group-hover:opacity-50 transition-opacity duration-700" />
      <div className="absolute inset-0 bg-brand-dark/40 z-10 pointer-events-none group-hover:opacity-0 transition-opacity duration-700" />

      <div className="flex items-start gap-4 w-full opacity-80 group-hover:opacity-100 transition-opacity duration-700 h-full">
        {MASONRY_COLUMNS.map((col) => (
          <div key={col.id} className="flex flex-col gap-4 overflow-hidden w-1/3 h-full">
            <div 
              className={`flex flex-col gap-4 w-full shrink-0 ${col.animationClass}`}
              style={col.delay ? { animationDelay: col.delay } : {}}
            >
              {renderColumnBlocks(col)}
            </div>
            <div 
              className={`flex flex-col gap-4 w-full shrink-0 ${col.animationClass}`}
              style={col.delay ? { animationDelay: col.delay } : {}}
              aria-hidden="true"
            >
              {renderColumnBlocks(col)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default AuthMasonry;
