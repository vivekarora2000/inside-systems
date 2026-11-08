import type { SearchDocument, SearchSettings } from './search-engine';

export const ORIGINAL_CORPUS: SearchDocument[] = [
  { id: 'northstar-market', title: 'Northstar Night Market returns to Harbor Square', category: 'Events', body: 'The Friday night market brings dumplings, live music, and local makers to Harbor Square. Moonline ferries run late for the opening weekend.' },
  { id: 'moonline-ferry', title: 'Moonline ferry adds late-night departures', category: 'Transit', body: 'New Friday and Saturday ferry service connects Harbor Square with Juniper Bank until midnight. Bicycles ride free after nine.' },
  { id: 'java-house', title: 'Java House keeps the old roaster turning', category: 'Food & drink', body: 'The city’s oldest coffee counter serves cardamom cold brew beside the river. Its name predates the nearby Java software studios by twenty years.' },
  { id: 'juniper-bank', title: 'Juniper Bank opens a riverside reading room', category: 'Places', body: 'A former bank branch now lends books and picnic blankets on the east bank of the Alder River. The vault holds a tiny local history collection.' },
  { id: 'starglass-park', title: 'Starglass Park after dark', category: 'Parks', body: 'A quiet hilltop park with night views, native grasses, and a small public observatory above the harbor. Red path lights preserve the view of the stars.' },
  { id: 'zephyrite-archive', title: 'A zephyrite map resurfaces at the city archive', category: 'Local news', body: 'Conservators found the hand-colored zephyrite survey inside a mislabeled harbor ledger. The rare map records wind channels used by early ferry captains.' },
  { id: 'saffron-counter', title: 'Saffron, quickly', category: 'Food & drink', body: 'Saffron noodles, saffron buns, saffron tea, and one bright saffron custard arrive in six minutes at this tiny market counter.' },
  { id: 'saffron-table', title: 'The long table at Marigold', category: 'Food & drink', body: 'Marigold occupies a roomy former post office with long communal tables, a courtyard, a bakery window, and a shelf of neighborhood cookbooks. The evening menu moves from beans and charred cabbage to fish, rice, and a delicate saffron broth. Servers describe the farms behind each dish, while a slow dessert course closes with saffron pears.' },
  { id: 'willow-short', title: 'Willow Trail pocket guide', category: 'Parks', body: 'Willow Trail follows the creek for one shaded mile.' },
  { id: 'willow-long', title: 'Walking the complete Willow Trail', category: 'Parks', body: 'Willow Trail begins behind the old waterworks and follows the creek past benches, rain gardens, footbridges, school murals, cottonwoods, and a broad meadow before climbing toward the north ridge. The Willow Trail route is three miles end to end, with water fountains near both trailheads and a quiet spur beside the bird sanctuary.' },
  { id: 'rooftop-headline', title: 'Rooftop cinema opens above Calder Station', category: 'Events', body: 'Blankets, headphones, and local short films come to the station roof every Thursday in August.' },
  { id: 'rooftop-body', title: 'Summer film calendar expands', category: 'Local news', body: 'The arts council added documentaries at the library, animation in Bell Park, and a rooftop cinema above Calder Station. Free reservations open on Monday.' },
  { id: 'copper-kettle', title: 'Copper Kettle Café', category: 'Food & drink', body: 'A narrow café near City Hall known for strong coffee, rye toast, and a sunny back bench. The lunch rush is brief but lively.' },
  { id: 'orchard-loop', title: 'Orchard Loop reopens after rain', category: 'Parks', body: 'Crews repaired two bridges on the popular Orchard Loop. The lower path remains muddy near the community garden.' },
  { id: 'calder-station', title: 'Calder Station accessibility work begins', category: 'Transit', body: 'Elevator construction moves the west entrance fifty yards south. Trains continue on their normal weekday schedule.' },
  { id: 'alder-bus', title: 'Alder bus lanes become permanent', category: 'Transit', body: 'Route 4 gained six minutes during its morning test. New red lanes now run from Juniper Bank to Calder Station.' },
  { id: 'bellwether-bikes', title: 'Bellwether Bikes opens repair kiosks', category: 'Local technology', body: 'Solar repair stands with pumps and common tools now sit at four trailheads. A local sensor reports missing tools to the cooperative.' },
  { id: 'tideglass', title: 'Tideglass predicts the next ferry crowd', category: 'Local technology', body: 'The Harbor Square startup uses ticket scans and weather history to estimate ferry demand. Its public display shows broad ranges rather than exact promises.' },
  { id: 'lumen-forge', title: 'Lumen Forge builds quieter streetlights', category: 'Local technology', body: 'Engineers on Foundry Row test shielded lamps that reduce glare around homes and parks. Starglass Park will host the first pilot.' },
  { id: 'paper-bridge', title: 'Paper Bridge Studio prints the city by hand', category: 'Places', body: 'Visitors can watch letterpress maps emerge one color at a time. Saturday workshops teach simple bookbinding.' },
  { id: 'harbor-bulletin', title: 'Harbor Square street bulletin', category: 'Local news', body: 'Harbor Square closes to cars during the night market. Use the ferry entrance on Alder Street and expect busy platforms after ten.' },
  { id: 'museum-hours', title: 'City Museum extends Friday hours', category: 'Local news', body: 'The museum will stay open until nine on Fridays. The ground-floor city model and archive gallery are free after six.' },
  { id: 'radio-garden', title: 'Radio Garden listening picnic', category: 'Events', body: 'Bring a blanket and tune a hand-built radio under the cottonwoods. Volunteers provide receivers and a short lesson on local frequencies.' },
  { id: 'lantern-parade', title: 'Alder Lantern Parade route announced', category: 'Events', body: 'Paper lanterns leave the library at dusk, cross Market Street, and finish beside the river. The route avoids the steep museum hill.' },
  { id: 'quiet-hour', title: 'Quiet hour at Northstar Market', category: 'Events', body: 'The first hour of Sunday’s market lowers music and stall lighting for visitors who prefer a calmer visit. Ferries retain their regular schedule.' },
  { id: 'bell-park', title: 'Bell Park splash fountain starts early', category: 'Parks', body: 'A warm forecast moved the fountain opening to May. Shaded tables and the west playground remain open during pump checks.' },
  { id: 'reed-marsh', title: 'Reed Marsh boardwalk field notes', category: 'Parks', body: 'The short boardwalk crosses cattails and shallow ponds alive with red-winged blackbirds. Visit before eight for the quietest walk.' },
  { id: 'granite-steps', title: 'Granite Steps viewpoint', category: 'Places', body: 'One hundred broad steps climb from Foundry Row to a small overlook. The top frames ferries moving across the harbor.' },
  { id: 'clock-library', title: 'The library inside a clock factory', category: 'Places', body: 'North Branch Library keeps the factory’s tall windows, brass clock, and painted floor numbers. A tool-lending desk fills the old loading bay.' },
  { id: 'maple-baths', title: 'Maple Baths becomes a public pool again', category: 'Places', body: 'Restoration returned daylight to the tiled 1920s pool. Morning lap hours begin at six, and neighborhood swim lessons remain free.' },
  { id: 'crane-noodle', title: 'Crane Noodle makes one excellent bowl', category: 'Food & drink', body: 'The eight-seat shop serves hand-cut noodles in mushroom broth with pickled greens. A vegetarian bowl is always available.' },
  { id: 'ember-bakery', title: 'Ember Bakery at dawn', category: 'Food & drink', body: 'Sesame loaves leave the oven at seven, followed by cherry buns and savory hand pies. Coffee comes from a roaster two blocks away.' },
  { id: 'moss-table', title: 'Moss Table cooks from the garden', category: 'Food & drink', body: 'Lunch changes with the community garden harvest. Expect herb omelets, beans on toast, and lemony greens in a bright corner room.' },
  { id: 'solace-tea', title: 'Solace Tea Room', category: 'Food & drink', body: 'A quiet second-floor room pours oolong, mint tea, and roasted barley tea. Shoes stay on; laptops close after five.' },
  { id: 'route-seven', title: 'Route 7 gets all-door boarding', category: 'Transit', body: 'Riders may board at any door with a valid pass. The transit agency expects shorter stops along Market Street.' },
  { id: 'green-ferry', title: 'Electric ferry begins harbor trials', category: 'Transit', body: 'The compact electric boat will make empty test crossings for two weeks. Passenger service starts only after safety review.' },
  { id: 'night-train', title: 'Last train moves to 12:30', category: 'Transit', body: 'Friday and Saturday trains now leave Calder Station at half past midnight. Connecting bus routes hold for eight minutes.' },
  { id: 'crosswalk-signal', title: 'Talking crosswalk signals reach Foundry Row', category: 'Local technology', body: 'New accessible signals announce street names and crossing time. Volume adjusts automatically to surrounding traffic.' },
  { id: 'rainbarrel-network', title: 'Rainbarrel Network maps every downpour', category: 'Local technology', body: 'Backyard gauges send anonymous rainfall totals to a neighborhood map. Gardeners use the open data to plan watering.' },
  { id: 'civic-mesh', title: 'Civic Mesh tests library internet relays', category: 'Local technology', body: 'Small rooftop radios extend free internet around three library branches. The pilot publishes uptime and coverage gaps each week.' },
  { id: 'market-sensor', title: 'Market sensors count space, not faces', category: 'Local technology', body: 'Ceiling sensors estimate open tables at the food hall without recording images. A public sign explains exactly what is collected.' },
  { id: 'repair-fair', title: 'Repair Fair fills the old depot', category: 'Community', body: 'Volunteer fixers mend lamps, radios, jackets, and small appliances. Visitors can borrow tools or learn a repair at the long workbench.' },
  { id: 'seed-swap', title: 'Spring seed swap at North Branch', category: 'Community', body: 'Gardeners trade labeled seeds and short growing notes. Extra packets go to school gardens across the city.' },
  { id: 'porch-concerts', title: 'Porch concert map released', category: 'Community', body: 'Twenty homes host acoustic sets on Sunday afternoon. The map marks step-free porches and nearby bus stops.' },
  { id: 'river-cleanup', title: 'Alder River cleanup collects a curious haul', category: 'Community', body: 'Volunteers recovered six bicycles, a brass bell, and hundreds of bottle caps from the east bank. Reusable finds go to the repair fair.' },
  { id: 'snow-plan', title: 'City publishes a simpler snow plan', category: 'Local news', body: 'A new map labels which sidewalks, bus stops, and bridges are cleared first. Residents can report blocked curb ramps by text.' },
  { id: 'water-main', title: 'Foundry Row water work moves east', category: 'Local news', body: 'Night crews shift one block east on Monday. Restaurants remain open, but the south sidewalk closes after eight.' },
  { id: 'school-garden', title: 'School garden grows a tiny grain field', category: 'Community', body: 'Students planted wheat, rye, and oats in three classroom plots. A summer workshop turns the harvest into bread.' },
];

export type Experiment = {
  id: string;
  number: string;
  title: string;
  concept: string;
  query: string;
  settings: Partial<SearchSettings>;
  compareIds: [string, string];
  action: string;
};

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'rare-words',
    number: 'A',
    title: 'Rare words matter',
    concept: 'Document frequency → IDF',
    query: 'zephyrite harbor',
    settings: { titleWeight: 2.4, k1: 1.2, b: 0.75, removeStopWords: true, matchMode: 'OR' },
    compareIds: ['zephyrite-archive', 'harbor-bulletin'],
    action: 'Open Retrieve and compare each term’s document frequency.',
  },
  {
    id: 'diminishing-returns',
    number: 'B',
    title: 'More mentions, less gain',
    concept: 'Term frequency saturation',
    query: 'saffron',
    settings: { titleWeight: 1, k1: 1.2, b: 0, removeStopWords: true, matchMode: 'OR' },
    compareIds: ['saffron-counter', 'saffron-table'],
    action: 'Raise k1 and watch repeated mentions gain more influence.',
  },
  {
    id: 'length-matters',
    number: 'C',
    title: 'Does length matter?',
    concept: 'Document length normalization',
    query: 'willow trail',
    settings: { titleWeight: 1, k1: 1.2, b: 0.2, removeStopWords: true, matchMode: 'AND' },
    compareIds: ['willow-short', 'willow-long'],
    action: 'Move b toward 1 to strengthen the measured length adjustment.',
  },
  {
    id: 'headlines-win',
    number: 'D',
    title: 'Headlines change the winner',
    concept: 'Title field weighting',
    query: 'rooftop cinema',
    settings: { titleWeight: 0.5, k1: 1.2, b: 0.75, removeStopWords: true, matchMode: 'AND' },
    compareIds: ['rooftop-headline', 'rooftop-body'],
    action: 'Raise title weight and watch the headline pull away.',
  },
];
