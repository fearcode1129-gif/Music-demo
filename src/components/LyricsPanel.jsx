import React, { useEffect, useMemo, useRef } from 'react';

const resolveActiveIndex = (lyrics, currentTime) => {
  if (!Array.isArray(lyrics) || lyrics.length === 0) {
    return -1;
  }

  let activeIndex = 0;

  for (let index = 0; index < lyrics.length; index += 1) {
    if (currentTime >= lyrics[index].time) {
      activeIndex = index;
    } else {
      break;
    }
  }

  return activeIndex;
};

const LyricsPanel = ({
  lyrics,
  currentTime,
  isSyncEnabled,
  loading,
  error,
  variant = 'default'
}) => {
  const listRef = useRef(null);
  const activeLineRef = useRef(null);
  const activeIndex = useMemo(() => resolveActiveIndex(lyrics, currentTime), [lyrics, currentTime]);

  useEffect(() => {
    if (!isSyncEnabled || !activeLineRef.current || !listRef.current) {
      return;
    }

    activeLineRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }, [activeIndex, isSyncEnabled]);

  if (loading) {
    return (
      <div className={`lyrics-card ${variant === 'immersive' ? 'lyrics-card--immersive' : ''}`}>
        <div className="comment-card__header">
          <h2>歌词</h2>
          <span className="muted-text">歌词加载中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`lyrics-card ${variant === 'immersive' ? 'lyrics-card--immersive' : ''}`}>
        <div className="comment-card__header">
          <h2>歌词</h2>
        </div>
        <div className="message error">{error}</div>
      </div>
    );
  }

  if (!Array.isArray(lyrics) || lyrics.length === 0) {
    return (
      <div className={`lyrics-card ${variant === 'immersive' ? 'lyrics-card--immersive' : ''}`}>
        <div className="comment-card__header">
          <h2>歌词</h2>
        </div>
        <div className="empty-card lyrics-empty">暂无歌词</div>
      </div>
    );
  }

  return (
    <div className={`lyrics-card ${variant === 'immersive' ? 'lyrics-card--immersive' : ''}`}>
      <div className="comment-card__header">
        <h2>歌词</h2>
        <span className="muted-text">{isSyncEnabled ? '已同步当前播放进度' : '播放这首歌后自动高亮'}</span>
      </div>

      <div ref={listRef} className={`lyrics-list ${variant === 'immersive' ? 'lyrics-list--immersive' : ''}`}>
        {lyrics.map((line, index) => {
          const isActive = index === activeIndex && isSyncEnabled;
          const isPast = isSyncEnabled && activeIndex > index;

          return (
            <p
              key={`${line.time}-${line.text}-${index}`}
              ref={isActive ? activeLineRef : null}
              className={`lyrics-line ${isActive ? 'is-active' : ''} ${isPast ? 'is-past' : ''}`}
            >
              {line.text}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default LyricsPanel;
