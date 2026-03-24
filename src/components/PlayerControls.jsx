import React from 'react';
import { formatTime } from '../utils/player';

const PLAY_MODE_LABELS = {
  'list-loop': '列表循环',
  'single-loop': '单曲循环',
  shuffle: '随机播放'
};

const PlayerControls = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  playMode,
  disabled,
  onTogglePlay,
  onPrevious,
  onNext,
  onCyclePlayMode,
  onSeek,
  onVolumeChange,
  compact = false
}) => {
  const progressValue = Math.min(currentTime, duration || 0);

  return (
    <div className={`player-controls ${compact ? 'is-compact' : ''}`}>
      <div className="player-controls__buttons">
        <button type="button" className="secondary-btn player-btn" onClick={onPrevious} disabled={disabled}>
          上一首
        </button>
        <button type="button" className="primary-btn player-btn" onClick={onTogglePlay} disabled={disabled}>
          {isPlaying ? '暂停' : '播放'}
        </button>
        <button type="button" className="secondary-btn player-btn" onClick={onNext} disabled={disabled}>
          下一首
        </button>
        <button type="button" className="secondary-btn player-btn" onClick={onCyclePlayMode} disabled={disabled}>
          {PLAY_MODE_LABELS[playMode]}
        </button>
      </div>

      <div className="player-controls__timeline">
        <span>{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={progressValue}
          onChange={(event) => onSeek(Number(event.target.value))}
          disabled={disabled}
        />
        <span>{formatTime(duration)}</span>
      </div>

      <div className="player-controls__volume">
        <span>音量</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume ?? 0.8}
          onChange={(event) => onVolumeChange(event.target.value)}
        />
        <span>{Math.round((volume ?? 0.8) * 100)}%</span>
      </div>
    </div>
  );
};

export default PlayerControls;
