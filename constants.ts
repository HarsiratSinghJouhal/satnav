import { EventLocation } from './types';

// Helper function to convert DMS to Decimal Degrees. Not exported.
const dmsToDecimal = (dms: string): number => {
  const parts = dms.match(/(\d+)°(\d+)'([\d\.]+)"([NSEW])/);
  if (!parts) return 0;
  const degrees = parseFloat(parts[1]);
  const minutes = parseFloat(parts[2]);
  const seconds = parseFloat(parts[3]);
  const direction = parts[4];
  
  let decimal = degrees + (minutes / 60) + (seconds / 3600);
  
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }
  
  return decimal;
};

// Based on venue type to provide realistic capacity for heatmap calculations.
const getCapacityForVenue = (venue: string): number => {
    const lowerVenue = venue.toLowerCase();
    // Specific override for SatHack
    if (lowerVenue.includes('csed and c hall')) {
      return 1500;
    }
    if (lowerVenue.includes('auditorium') || lowerVenue.includes('fete') || lowerVenue.includes('oat') || lowerVenue.includes('lawns') || lowerVenue.includes('ground') || lowerVenue.includes('stage') || lowerVenue.includes('stairs')) {
        return 1500;
    }
    if (lowerVenue.includes('lt') || lowerVenue.includes('hall') || lowerVenue.includes('block') || lowerVenue.includes('csed') || lowerVenue.includes('tan 203')) {
        return 300;
    }
    if (lowerVenue.includes('road') || lowerVenue.includes('library') || lowerVenue.includes('track')) {
        return 500;
    }
    return 400; // Default for others
};

// Specific popularity scores for each event, rated out of 10.
const eventPopularity: { [key: string]: number } = {
  'Street Fest': 8,
  'Experivista': 5,
  'Informal Games': 6,
  'Artist Nights': 9.5,
  'Perplexed': 9,
  'Emporia': 8,
  'Case Quest': 8.5,
  'Toast Tactics': 7.5,
  'Portfolio Wars': 7,
  'Readathon': 6,
  'Canvas Relay': 6,
  '50 hour film making': 8.5,
  'Bhangra': 7,
  'Amplify': 4,
  'Ruhaniyat': 6,
  'Canvas Under Canopy': 5,
  'Through The Lens': 6,
  'Aether - Battle of Bands': 6,
  'SatWalk': 6.5,
  'Mic Drop': 4.5,
  'Fashion Design': 4.5,
  'MUN': 6,
  'Photowalk': 4,
  'Product Campaign Design': 4,
  'Quizathon': 5.5,
  'Reelvolution': 8,
  'West Waltz War (GROUP)': 7,
  'Cadence': 7,
  'Nukkad Natak': 7.5,
  'Mood Board Magic': 4,
  'Wild West Showdown': 5,
  'West Waltz War': 7,
  'Production Wars': 7.5,
  'Switch skit': 6,
  'Crescendo': 5,
  'Silent expressions': 4,
  'Strut Dynamite': 4,
  'Thespian clash': 5,
  'SatHack': 9.5,
  'Mirage': 9.5,
  'Fall Esportsmania Season 3': 8,
  'AlgoAuction': 8,
  'Tech Got Talent': 7.5,
  'MACH 1.0': 7.5,
  'RoboWars': 8,
  'Tech. Adventure. Nexus': 6.5,
  'Sky Circuit - The Drone Race': 6,
};

// Helper to parse date strings (e.g., "13/11/2025" or "13-16 November") into an array of day strings
const parseDate = (dateStr: string): string[] => {
    if (dateStr.includes('-')) { // It's a range like "13-16 November"
        const parts = dateStr.replace(' November', '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);
        const dates: string[] = [];
        for (let i = start; i <= end; i++) {
            dates.push(`${i} Nov`);
        }
        return dates;
    } else { // It's a single date like "13/11/2025"
        const day = dateStr.split('/')[0];
        return [`${day} Nov`];
    }
};

const rawEvents = [
  { title: 'Street Fest', desc: 'Experience vibrant streets filled with music, food, art, and energy as the campus transforms into a colorful celebration.', cat: 'Informal', date: '13-16 November', venue: 'H - K road', lat: '30°21\'13.9"N', lon: '76°21\'54.2"E' },
  { title: 'Experivista', desc: 'Dive into immersive experience zones featuring brands, interactive games, and mini attractions that bring excitement, innovation, and fun.', cat: 'Informal', date: '14-16 November', venue: 'Library to Cos road', lat: '30°21\'12.9"N', lon: '76°21\'47.7"E' },
  { title: 'Informal Games', desc: 'Unleash your fun side with crazy challenges, spontaneous laughter, and unforgettable memories in the most entertaining games.', cat: 'Informal', date: '14-16 November', venue: 'SBOP Lawns', lat: '30°21\'08.0"N', lon: '76°22\'11.3"E' },
  { title: 'Artist Nights', desc: 'Witness electrifying performances by talented artists, soulful music, and dazzling lights as creativity takes center stage at Saturnalia nights.', cat: 'Cultural', date: '15-16 November', venue: 'FETE AREA', lat: '30°21\'15.1"N', lon: '76°21\'51.4"E' },
  { title: 'Perplexed', desc: 'A competition where teams use Al agents to solve departmental and business challenges.', cat: 'Business', date: '13/11/2025', venue: 'LT 201', lat: '30°21\'17.0"N', lon: '76°22\'10.1"E' },
  { title: 'Emporia', desc: 'Emporia', cat: 'Business', date: '13/11/2025', venue: 'TAN Auditorium', lat: '30°21\'13.2"N', lon: '76°22\'05.2"E' },
  { title: 'Case Quest', desc: 'Innovate, strategize, pitch, transform ideas into impactful ventures.', cat: 'Business', date: '14/11/2025', venue: 'LT 201', lat: '30°21\'17.0"N', lon: '76°22\'10.1"E' },
  { title: 'Toast Tactics', desc: 'Teams solve real challenges, showcasing innovation, strategy, collaboration, and leadership.', cat: 'Business', date: '14/11/2025', venue: 'TAN Auditorium', lat: '30°21\'13.2"N', lon: '76°22\'05.2"E' },
  { title: 'Portfolio Wars', desc: 'Teams manage virtual stock portfolios, simulating real-time finance scenarios collaboratively.', cat: 'Business', date: '15/11/2025', venue: 'TAN 203', lat: '30°21\'13.2"N', lon: '76°22\'05.2"E' },
  { title: 'Readathon', desc: 'Relaxed community event celebrating reading, diverse books, and personal pace.', cat: 'Cultural', date: '13/11/2025', venue: 'Central Library', lat: '30°21\'16.2"N', lon: '76°22\'10.9"E' },
  { title: 'Canvas Relay', desc: 'Canvas Relay is a dynamic and interactive team-based art competition, where creativity meets collaboration.', cat: 'Cultural', date: '13/11/2025', venue: 'Central Park OAT - 2', lat: '30°21\'10.3"N', lon: '76°21\'58.6"E' },
  { title: '50 hour film making', desc: 'Create a film in 50 hours', cat: 'Cultural', date: '13/11/2025', venue: 'LT 101', lat: '30°21\'17.0"N', lon: '76°22\'10.1"E' },
  { title: 'Bhangra', desc: 'Feel the dhol beat thunder through your veins and the rush of energy as every step echoes the pride of Punjab. Bhangra i', cat: 'Cultural', date: '13/11/2025', venue: 'OAT', lat: '30°21\'16.1"N', lon: '76°21\'45.2"E' },
  { title: 'Amplify', desc: 'This solo instrumental showcase invites outstanding musicians to present the full range of their abilities.', cat: 'Cultural', date: '14/11/2025', venue: 'C Hall', lat: '30°21\'11.7"N', lon: '76°22\'20.0"E' },
  { title: 'Ruhaniyat', desc: 'This platform spotlights singular voices and styles, inviting solo performers to traverse genres from contemporary', cat: 'Cultural', date: '14/11/2025', venue: 'Central Park OAT - 2', lat: '30°21\'10.3"N', lon: '76°21\'58.6"E' },
  { title: 'Canvas Under Canopy', desc: 'Painting competition blending creativity, culture, technique, and expressive storytelling.', cat: 'Cultural', date: '14/11/2025', venue: 'Central Park Stage - 1', lat: '30°21\'10.3"N', lon: '76°21\'58.6"E' },
  { title: 'Through The Lens', desc: 'Photography competition showcasing creativity, emotion, perspective, and visual storytelling mastery.', cat: 'Cultural', date: '14/11/2025', venue: 'F-Block', lat: '30°21\'15.3"N', lon: '76°22\'19.9"E' },
  { title: 'Aether - Battle of Bands', desc: 'Bring the band to center stage at Battle of Bands, a high-octane showdown built for big sound and bigger moments.', cat: 'Cultural', date: '14/11/2025', venue: 'FETE AREA', lat: '30°21\'15.1"N', lon: '76°21\'51.4"E' },
  { title: 'SatWalk', desc: 'Sat Walk, Saturnalia\'s signature fashion-and-culture showcase, marks its 50th edition as "The Embergence Legacy." Teams', cat: 'Cultural', date: '14/11/2025', venue: 'FETE AREA', lat: '30°21\'15.1"N', lon: '76°21\'51.4"E' },
  { title: 'Mic Drop', desc: 'Mic Drop is a solo street battle where rappers and beatboxers go head-to-head in a high-voltage freestyle showdown.', cat: 'Cultural', date: '14/11/2025', venue: 'K LAWNS', lat: '30°21\'10.6"N', lon: '76°22\'15.6"E' },
  { title: 'Fashion Design', desc: 'Teams design regal fashion blending tradition, innovation, elegance, and creativity.', cat: 'Cultural', date: '14/11/2025', venue: 'LP 105', lat: '30°21\'16.5"N', lon: '76°22\'10.2"E' },
  { title: 'MUN', desc: 'Students simulate diplomacy, debate global issues, and practice leadership skills.', cat: 'Cultural', date: '14/11/2025', venue: 'TAN Auditorium', lat: '30°21\'13.2"N', lon: '76°22\'05.2"E' },
  { title: 'Photowalk', desc: 'Photography enthusiasts capture campus life guided by experts, sharing feedback.', cat: 'Cultural', date: '14/11/2025', venue: 'Library', lat: '30°21\'16.2"N', lon: '76°22\'10.9"E' },
  { title: 'Product Campaign Design', desc: 'Design impactful product campaigns blending creativity, strategy, storytelling, and presentation.', cat: 'Cultural', date: '14/11/2025', venue: 'LP108', lat: '30°21\'17.7"N', lon: '76°22\'12.2"E' },
  { title: 'Quizathon', desc: 'Quizathon is the ultimate test of wit, speed, and intellect.', cat: 'Cultural', date: '14/11/2025', venue: 'LP107', lat: '30°21\'17.7"N', lon: '76°22\'12.2"E' },
  { title: 'Reelvolution', desc: 'Short-form reels challenge creativity, timing, and impactful digital storytelling.', cat: 'Cultural', date: '14/11/2025', venue: 'F block', lat: '30°21\'15.3"N', lon: '76°22\'19.9"E' },
  { title: 'West Waltz War (GROUP)', desc: 'Street Crew Battle ignites the stage with raw energy and urban rhythm. Dance crews of 8 to 15 performers go head-to-head', cat: 'Cultural', date: '14/11/2025', venue: 'Skywalk stairs', lat: '30°21\'16.2"N', lon: '76°22\'10.9"E' },
  { title: 'Cadence', desc: 'Spoken word poetry on topics.', cat: 'Cultural', date: '14/11/2025', venue: 'C hall', lat: '30°21\'11.7"N', lon: '76°22\'20.0"E' },
  { title: 'Nukkad Natak', desc: 'Nukkad Naatak brings theatre to the streets, loud, raw, and unapologetically real.', cat: 'Cultural', date: '14/11/2025', venue: 'SBOP LAWNS', lat: '30°21\'08.0"N', lon: '76°22\'11.3"E' },
  { title: 'Mood Board Magic', desc: 'Painting competition expressing assigned emotions through color, form, and abstraction.', cat: 'Cultural', date: '15/11/2025', venue: 'Central Park OAT - 2', lat: '30°21\'10.3"N', lon: '76°21\'58.6"E' },
  { title: 'Wild West Showdown', desc: 'Teams clash in high-energy, synchronized, and creative street dance showdowns.', cat: 'Cultural', date: '15/11/2025', venue: 'FETE AREA', lat: '30°21\'15.1"N', lon: '76°21\'51.4"E' },
  { title: 'West Waltz War', desc: 'Dynamic face-off spotlighting style, skill, creativity, and stage presence.', cat: 'Cultural', date: '15/11/2025', venue: 'Library Stairs', lat: '30°21\'16.2"N', lon: '76°22\'10.9"E' },
  { title: 'Production Wars', desc: 'Step into a high-voltage music-production showdown where producers push limits with original beats.', cat: 'Cultural', date: '15/11/2025', venue: 'LP 104', lat: '30°21\'16.5"N', lon: '76°22\'10.2"E' },
  { title: 'Switch skit', desc: 'Switch Skit is a fast-paced theatrical challenge where teams blend comedy, drama, and improvisation', cat: 'Cultural', date: '15/11/2025', venue: 'Main Auditorium', lat: '30°21\'07.0"N', lon: '76°22\'15.4"E' },
  { title: 'Crescendo', desc: 'An adrenaline-charged competition spotlighting English-language vocals, featuring exceptional soloists alongside', cat: 'Cultural', date: '15/11/2025', venue: 'Central Park Stage - 1', lat: '30°21\'10.3"N', lon: '76°21\'58.6"E' },
  { title: 'Silent expressions', desc: 'Silent Expressions is a unique mime competition where actions speak louder than words.', cat: 'Cultural', date: '15/11/2025', venue: 'Main Auditorium', lat: '30°21\'07.0"N', lon: '76°22\'15.4"E' },
  { title: 'Strut Dynamite', desc: 'The Solo Western Dance competition features 3-5 minute performances celebrating creativity, individuality, and technique', cat: 'Cultural', date: '16/11/2025', venue: 'Main Auditorium', lat: '30°21\'07.0"N', lon: '76°22\'15.4"E' },
  { title: 'Thespian clash', desc: 'Thespian Clash is the grand stage for dramatic excellence, where teams perform 8 to 12-minute plays.', cat: 'Cultural', date: '16/11/2025', venue: 'Main Auditorium', lat: '30°21\'07.0"N', lon: '76°22\'15.4"E' },
  { title: 'SatHack', desc: 'A time-bound hackathon transforming ideas into functional tech prototypes for real-world impact.', cat: 'Technical', date: '13/11/2025', venue: 'CSED and C hall', lat: '30°21\'18.5"N', lon: '76°22\'10.4"E' },
  { title: 'Mirage', desc: 'An AR-powered treasure hunt turning the campus into a trail of digital puzzles and adventures.', cat: 'Technical', date: '14/11/2025', venue: 'Main Auditorium', lat: '30°21\'07.0"N', lon: '76°22\'15.4"E' },
  { title: 'Fall Esportsmania Season 3', desc: 'Competitive gaming tournaments and experiences.', cat: 'Technical', date: '14/11/2025', venue: 'LT 203 (1) + AS 1 (2+3)', lat: '30°21\'17.0"N', lon: '76°22\'10.1"E' },
  { title: 'AlgoAuction', desc: 'A high-stakes coding showdown where logic meets luck!', cat: 'Technical', date: '15/11/2025', venue: 'LP 108', lat: '30°21\'17.7"N', lon: '76°22\'12.2"E' },
  { title: 'Tech Got Talent', desc: 'Engage with renowned tech leaders in a lively and inspiring conversation.', cat: 'Technical', date: '15/11/2025', venue: 'Main Auditorium', lat: '30°21\'07.0"N', lon: '76°22\'15.4"E' },
  { title: 'MACH 1.0', desc: 'Join the flagship RC plane race and compete at Mach 1.0 speeds!', cat: 'Technical', date: '15/11/2025', venue: 'Synthetic Track', lat: '30°21\'14.7"N', lon: '76°21\'40.5"E' },
  { title: 'RoboWars', desc: 'Robotics teams battle it out as custom robots collide in a fight for arena dominance.', cat: 'Technical', date: '15/11/2025', venue: 'OAT/Cos', lat: '30°21\'16.1"N', lon: '76°21\'45.2"E' },
  { title: 'Tech. Adventure. Nexus', desc: 'Solve your individual challenge, assemble the clues, and conquer the master puzzle together.', cat: 'Technical', date: '15/11/2025', venue: 'TAN', lat: '30°21\'13.2"N', lon: '76°22\'05.2"E' },
  { title: 'Sky Circuit - The Drone Race', desc: 'Race high-speed drones through an exciting aerial obstacle course to claim victory!', cat: 'Technical', date: '16/11/2025', venue: 'K LAWNS', lat: '30°21\'10.6"N', lon: '76°22\'15.6"E' },
];


export const EVENT_LOCATIONS: EventLocation[] = rawEvents.map(event => ({
  id: event.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
  name: event.title,
  details: event.desc,
  category: event.cat,
  date: event.date,
  days: parseDate(event.date), // Add parsed days for filtering
  venue: event.venue,
  capacity: getCapacityForVenue(event.venue),
  popularity: (eventPopularity[event.title] || 5) / 10, // Use specific popularity score (scaled to 0-1)
  coordinates: {
    latitude: dmsToDecimal(event.lat),
    longitude: dmsToDecimal(event.lon),
  },
}));