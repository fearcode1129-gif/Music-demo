export const parseLrc = (lrcText) => {
  if (!lrcText || typeof lrcText !== 'string') {
    return [];
  }

  return lrcText
    .split('\n')
    .flatMap((line) => {
      const matches = [...line.matchAll(/\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
      const text = line.replace(/\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g, '').trim();

      if (matches.length === 0 || !text) {
        return [];
      }

      return matches.map((match) => {
        const minutes = Number(match[1]);
        const seconds = Number(match[2]);
        const milliseconds = Number((match[3] || '0').padEnd(3, '0'));

        return {
          time: minutes * 60 + seconds + milliseconds / 1000,
          text
        };
      });
    })
    .sort((left, right) => left.time - right.time);
};
