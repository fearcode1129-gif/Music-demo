import React from 'react';

const VinylDisc = ({ cover, title, isPlaying }) => {
  return (
    <div className="vinyl-stage" aria-label={`${title} vinyl`}>
      <div className={`tonearm ${isPlaying ? 'is-playing' : ''}`}>
        <span className="tonearm__pivot" />
        <span className="tonearm__arm" />
        <span className="tonearm__head" />
      </div>

      <div className={`vinyl-disc ${isPlaying ? 'is-spinning' : ''}`}>
        <span className="vinyl-disc__ring vinyl-disc__ring--outer" />
        <span className="vinyl-disc__ring vinyl-disc__ring--middle" />
        <span className="vinyl-disc__shine" />
        <div className="vinyl-disc__label">
          {cover ? <img src={cover} alt={title} className="vinyl-disc__cover" /> : <span>{title?.slice(0, 1) || '♪'}</span>}
        </div>
      </div>
    </div>
  );
};

export default VinylDisc;
