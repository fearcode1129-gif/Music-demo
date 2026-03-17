const coverPool = [
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80'
];

const audioPool = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
];

const songSeeds = [
  ['Sunset Drive', 'Nova Echo', 'Night Motion', 'Synth Pop', 'A bright synth-driven track made for late-night city lights.'],
  ['Blue Horizon', 'Coastline Theory', 'Ocean Signals', 'Indie Rock', 'Warm guitars and a relaxed groove inspired by open skies.'],
  ['Rainfall Notes', 'Luna Keys', 'Midnight Piano', 'Instrumental', 'Soft piano melodies layered over gentle ambient textures.'],
  ['City Starlight', 'Velvet Metro', 'Neon Weather', 'City Pop', 'A glossy downtown groove with glowing hooks.'],
  ['Golden Pulse', 'Aurora Lane', 'Heartbeat Motel', 'Pop', 'Shimmering pop melodies with a festival-sized chorus.'],
  ['Moonlit Tape', 'Cassette Kids', 'Bedroom Orbit', 'Lo-fi', 'Dusty beats and dreamy pads for late-night focus.'],
  ['Fading Summer', 'West Pier', 'Postcards Home', 'Indie Pop', 'A nostalgic song about ocean breeze and memory.'],
  ['Electric Bloom', 'Polaris Hearts', 'Voltage Garden', 'Electronic', 'A crisp and cinematic electronic ride.'],
  ['Firefly Avenue', 'The Lanterns', 'Afterglow', 'Folk', 'Gentle acoustic storytelling with warm harmonies.'],
  ['Cloud Runner', 'Skyline Motel', 'Altitude', 'Alternative', 'Big drums, wide guitars, and an uplifting chorus.'],
  ['Silver Lake', 'Mina Vale', 'Northbound', 'R&B', 'Smooth grooves wrapped in polished late-night vocals.'],
  ['Parallel Dreams', 'Static Youth', 'Signal Loss', 'Synthwave', 'Retro synth lines and driving midnight energy.'],
  ['Autumn Radio', 'Paper Avenue', 'Slow Signals', 'Acoustic', 'Soft strums and intimate lyric-forward melodies.'],
  ['Velvet Night', 'Neon Harbor', 'Mirrors', 'Soul', 'A silky soul tune with elegant bass and smoky vocals.'],
  ['Pulse Machine', 'Circuit Bloom', 'Factory Hearts', 'Dance', 'Club-ready rhythm with bright electronic textures.'],
  ['Morning Letters', 'Clara Dawn', 'Daybreak Stories', 'Singer-Songwriter', 'Gentle storytelling built for quiet mornings.'],
  ['River Echoes', 'North Cedar', 'Open Roads', 'Country Pop', 'A breezy song with uplifting road-trip energy.'],
  ['Deep Blue Room', 'Atlas Fade', 'Tidal Memory', 'Ambient', 'Floating textures for deep focus and calm.'],
  ['Glass Skies', 'Echo Parade', 'Reflections', 'Dream Pop', 'Airy vocals and chorus-heavy guitars in a dreamy haze.'],
  ['Night Train Home', 'Midtown Static', 'Last Departure', 'Rock', 'A punchy anthem with big hooks and restless energy.'],
  ['Summer Arcade', 'Pixel Hearts', 'Joystick Romance', 'Electro Pop', 'Playful synths and sugar-bright melodies.'],
  ['Lighthouse Song', 'Harbor June', 'Tide Songs', 'Folk Pop', 'A warm, optimistic song about finding your way back.'],
  ['Quiet Satellite', 'Orchid Frame', 'Orbit Diary', 'Chillout', 'Minimal beats and gentle textures for slow afternoons.'],
  ['Wild Current', 'The Breakers', 'Coastal Noise', 'Surf Rock', 'Bright guitars and a pulse that never sits still.'],
  ['Crimson Dawn', 'Solar Bloom', 'First Light', 'Pop Rock', 'Big chorus hooks wrapped in radiant morning energy.'],
  ['Stereo Hearts', 'June Motel', 'Polaroid Summer', 'Teen Pop', 'A feel-good pop song with youthful sparkle.'],
  ['Midnight Harbor', 'Blue Atlas', 'Night Shift', 'Jazz Pop', 'City-night mood with smooth brass accents.'],
  ['Aurora Dreams', 'Luma Shore', 'Northern Lights', 'New Age', 'A slow cinematic build with floating soundscapes.'],
  ['Paper Planes', 'Sunday Cinema', 'Open Window', 'Soft Rock', 'Light guitars and easy melodies made for sunny drives.'],
  ['Skyline Bloom', 'Electric Hearts', 'Color Pulse', 'Electronic', 'A vivid closing track full of motion and release.']
];

const songs = songSeeds.map(([title, artist, album, genre, description], index) => ({
  id: String(index + 1),
  title,
  artist,
  album,
  genre,
  description,
  duration: `0${3 + (index % 3)}:${String(10 + ((index * 7) % 50)).padStart(2, '0')}`,
  year: 2020 + (index % 6),
  cover: coverPool[index % coverPool.length],
  audioUrl: audioPool[index % audioPool.length]
}));

export default songs;
