import { IMG } from './assets/index.js'

export const SPECIES = [
  { id: 'monstera', common: 'Monstera Deliciosa', latin: 'Monstera deliciosa', dli: [6.5, 10.5], img: IMG.monstera, water: 8, feed: 8 },
  { id: 'snake', common: 'Snake Plant', latin: 'Sansevieria trifasciata', dli: [0.5, 3.5], img: IMG.snake, water: 14, feed: 10 },
  { id: 'peace', common: 'Peace Lily', latin: 'Spathiphyllum wallisii', dli: [3.5, 6.5], img: IMG.peace, water: 6, feed: 8 },
  { id: 'fiddle', common: 'Fiddle Leaf Fig', latin: 'Ficus lyrata', dli: [10.5, 15.5], img: IMG.fiddle, water: 7, feed: 6 },
  { id: 'tulsi', common: 'Tulsi', latin: 'Ocimum tenuiflorum', dli: [15.5, 30], img: IMG.tulsi, water: 3, feed: 6 },
]

export const speciesById = (id) => SPECIES.find((s) => s.id === id) ?? SPECIES[0]

const day = 86400000
const ago = (d) => new Date(Date.now() - d * day)

export const SEED_PLANTS = [
  { id: 'p1', species: 'monstera', name: 'Bhoomi', room: 'East window · living room', added: ago(214), lastWater: ago(3), health: 91, dli: 7.8 },
  { id: 'p2', species: 'snake', name: 'Sentinel', room: 'North balcony', added: ago(96), lastWater: ago(9), health: 84, dli: 1.9 },
]

export const SEED_USERS = [
  { id: 'U-1041', name: 'Ananya Raghunathan', email: 'ananya.r@example.in', city: 'Gurugram', plan: 'quarterly', status: 'active', joined: ago(412), plants: 7, spend: 7794, renews: 22, method: 'UPI · HDFC' },
  { id: 'U-1052', name: 'Rohit Menon', email: 'rohit.menon@example.in', city: 'Mumbai', plan: 'quarterly', status: 'active', joined: ago(388), plants: 4, spend: 6495, renews: 8, method: 'Card · ICICI' },
  { id: 'U-1067', name: 'Shreya Kulkarni', email: 's.kulkarni@example.in', city: 'Bengaluru', plan: 'quarterly', status: 'active', joined: ago(355), plants: 12, spend: 9093, renews: 41, method: 'UPI · Axis' },
  { id: 'U-1079', name: 'Devika Sen', email: 'devika.sen@example.in', city: 'Kolkata', plan: 'trial', status: 'active', joined: ago(287), plants: 2, spend: 998, renews: null, method: 'UPI · SBI' },
  { id: 'U-1084', name: 'Karthik Iyer', email: 'k.iyer@example.in', city: 'Chennai', plan: 'quarterly', status: 'past_due', joined: ago(266), plants: 5, spend: 5196, renews: -4, method: 'Card · Amex' },
  { id: 'U-1093', name: 'Meera Joshi', email: 'meera.j@example.in', city: 'Pune', plan: 'quarterly', status: 'active', joined: ago(240), plants: 9, spend: 5196, renews: 15, method: 'UPI · Kotak' },
  { id: 'U-1102', name: 'Arjun Bhatia', email: 'arjun.b@example.in', city: 'Delhi NCR', plan: 'trial', status: 'active', joined: ago(198), plants: 1, spend: 499, renews: null, method: 'UPI · Paytm' },
  { id: 'U-1118', name: 'Nandini Rao', email: 'nandini.rao@example.in', city: 'Hyderabad', plan: 'quarterly', status: 'paused', joined: ago(176), plants: 6, spend: 3897, renews: null, method: 'Card · HDFC' },
  { id: 'U-1126', name: 'Vikram Shetty', email: 'v.shetty@example.in', city: 'Mangaluru', plan: 'quarterly', status: 'active', joined: ago(154), plants: 3, spend: 3897, renews: 29, method: 'UPI · Canara' },
  { id: 'U-1139', name: 'Priya Nair', email: 'priya.nair@example.in', city: 'Kochi', plan: 'trial', status: 'suspended', joined: ago(131), plants: 2, spend: 499, renews: null, method: 'UPI · Federal' },
  { id: 'U-1147', name: 'Sahil Kapoor', email: 'sahil.k@example.in', city: 'Chandigarh', plan: 'quarterly', status: 'active', joined: ago(112), plants: 8, spend: 2598, renews: 3, method: 'Card · SBI' },
  { id: 'U-1158', name: 'Ritika Desai', email: 'ritika.d@example.in', city: 'Ahmedabad', plan: 'quarterly', status: 'active', joined: ago(88), plants: 5, spend: 2598, renews: 19, method: 'UPI · BoB' },
  { id: 'U-1163', name: 'Imran Qureshi', email: 'imran.q@example.in', city: 'Lucknow', plan: 'trial', status: 'active', joined: ago(61), plants: 3, spend: 998, renews: null, method: 'UPI · PNB' },
  { id: 'U-1171', name: 'Tanvi Bhatt', email: 'tanvi.b@example.in', city: 'Jaipur', plan: 'quarterly', status: 'cancelled', joined: ago(44), plants: 1, spend: 1299, renews: null, method: 'Card · ICICI' },
  { id: 'U-1180', name: 'Aditya Ghosh', email: 'a.ghosh@example.in', city: 'Bhubaneswar', plan: 'trial', status: 'active', joined: ago(17), plants: 2, spend: 499, renews: null, method: 'UPI · SBI' },
]

export const PLAN_PRICE = { trial: 499, quarterly: 1299 }
export const PLAN_LABEL = { trial: 'Trial pack', quarterly: 'Quarterly refill' }

// Scaled to the seeded cohort so every figure on the dashboard reconciles:
// the final month equals the MRR computed live from SEED_USERS.
export const REVENUE = [
  { m: 'Sep', mrr: 866, users: 4 },
  { m: 'Oct', mrr: 1155, users: 6 },
  { m: 'Nov', mrr: 1443, users: 8 },
  { m: 'Dec', mrr: 1732, users: 9 },
  { m: 'Jan', mrr: 1588, users: 10 },
  { m: 'Feb', mrr: 2165, users: 12 },
  { m: 'Mar', mrr: 2598, users: 13 },
  { m: 'Apr', mrr: 3031, users: 15 },
]

export const SEED_POSTS = [
  {
    id: 'c1',
    author: 'Shreya Kulkarni',
    city: 'Indiranagar, Bengaluru',
    time: '2h',
    img: IMG.jungle,
    plant: 'Monstera deliciosa',
    text: 'Ground floor, dense colony, 3.1 DLI on the recon tool — everyone told me monstera was impossible here. Moved it 40 cm toward the grille and top-dressed at 45 g. Leaf nine came out fenestrated.',
    likes: 128,
    tag: 'win',
    comments: [
      { by: 'Rohit Menon', text: 'The 40 cm thing is underrated. Distance from glass matters more than which window you have.' },
      { by: 'Meera Joshi', text: 'What is your watering interval at that DLI?' },
    ],
  },
  {
    id: 'c2',
    author: 'Karthik Iyer',
    city: 'Adyar, Chennai',
    time: '6h',
    img: IMG.leaf,
    plant: 'Ficus lyrata',
    text: 'Brown crispy margins on the two newest leaves, west window, 13.4 DLI. Scanner says leaf scorch not underwatering. Anyone moved a lyrata back from a west window mid-summer without shocking it?',
    likes: 41,
    tag: 'help',
    comments: [{ by: 'Ananya Raghunathan', text: 'Move it in 30 cm steps, one step a week. Mine sulked for ten days then pushed two leaves.' }],
  },
  {
    id: 'c3',
    author: 'Devika Sen',
    city: 'Salt Lake, Kolkata',
    time: '1d',
    img: IMG.hands,
    plant: 'Aadhar-Vati',
    text: 'BED-017, day 54. Opened the pouch and it genuinely smells like forest floor rather than ammonia. First time I have been able to trace a bag of compost to the week it was turned.',
    likes: 203,
    tag: 'soil',
    comments: [],
  },
  {
    id: 'c4',
    author: 'Meera Joshi',
    city: 'Kothrud, Pune',
    time: '2d',
    img: IMG.peace,
    plant: 'Spathiphyllum wallisii',
    text: 'Four spathes at once after two seasons of nothing but leaves. Only change was moving from 3.2 to 5.1 DLI and feeding on the schedule the app generated instead of when I remembered.',
    likes: 167,
    tag: 'win',
    comments: [{ by: 'Tanvi Bhatt', text: 'This is the push I needed to actually follow the schedule.' }],
  },
]

export const REPORTED = [
  { id: 'r1', post: 'Buy cheap NPK 19:19:19 wholesale — DM for rates', author: 'growfast_supplies', reason: 'Commercial spam', count: 14 },
  { id: 'r2', post: 'Just use bleach on the leaves, kills everything', author: 'Anon user U-1204', reason: 'Unsafe advice', count: 6 },
]
