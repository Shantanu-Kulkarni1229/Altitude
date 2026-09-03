require('dotenv').config();
const mongoose = require('mongoose');
const Trek = require('./src/models/Trek');
const Batch = require('./src/models/Batch');
const AddOn = require('./src/models/AddOn');
const Booking = require('./src/models/Booking');
const AuditLog = require('./src/models/AuditLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/altitude';

const treksData = [
  {
    trekId: "trk_001",
    name: "Valley of Flowers",
    region: "Uttarakhand",
    difficulty: "moderate",
    minFitnessLevel: 5,
    durationDays: 6,
    basePrice: 12500,
    maxAltitude: "14,100 ft",
    trekDistance: "38 km",
    coverPhoto: "https://images.unsplash.com/photo-1572782252655-9c8771392601?w=600&auto=format&fit=crop&q=60",
    description: "A mesmerizing trek through a UNESCO World Heritage site known for its meadows of endemic alpine flowers and the variety of flora.",
    highlights: ["UNESCO World Heritage Site", "Over 300 species of wildflowers"],
    itinerary: [
      { day: 1, title: "Haridwar to Govindghat", details: "Drive from Haridwar to Govindghat." }
    ]
  },
  {
    trekId: "trk_002",
    name: "Kheerganga Trek",
    region: "Himachal Pradesh",
    difficulty: "easy",
    minFitnessLevel: 3,
    durationDays: 3,
    basePrice: 3500,
    maxAltitude: "9,600 ft",
    trekDistance: "24 km",
    coverPhoto: "https://images.unsplash.com/photo-1692626453173-7af2d5b64426?w=600&auto=format&fit=crop&q=60",
    description: "A beginner-friendly trek into the heart of the Parvati Valley.",
    highlights: ["Natural hot water springs at the summit", "Beautiful pine forests and waterfalls"],
    itinerary: [
      { day: 1, title: "Kasol to Barshaini to Kheerganga", details: "Drive to Barshaini and trek 12km to Kheerganga." }
    ]
  },
  {
    trekId: "trk_003",
    name: "Stok Kangri Expedition",
    region: "Ladakh",
    difficulty: "extreme",
    minFitnessLevel: 9,
    durationDays: 9,
    basePrice: 28000,
    maxAltitude: "20,187 ft",
    trekDistance: "40 km",
    coverPhoto: "https://images.unsplash.com/photo-1751225750479-43ad27b94fa0?w=600&auto=format&fit=crop&q=60",
    description: "One of the most thrilling non-technical peaks in India. At over 20,000 feet, Stok Kangri offers a true mountaineering experience.",
    highlights: ["Climb a 6000m peak without technical gear"],
    itinerary: [
      { day: 1, title: "Arrive in Leh", details: "Acclimatization day in Leh (11,400 ft)." }
    ]
  },
  {
    trekId: "trk_004",
    name: "Goechala Trek",
    region: "Sikkim",
    difficulty: "hard",
    minFitnessLevel: 7,
    durationDays: 11,
    basePrice: 16500,
    maxAltitude: "16,200 ft",
    trekDistance: "90 km",
    coverPhoto: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=600&auto=format&fit=crop&q=60",
    description: "Get up close and personal with Mt. Kanchenjunga.",
    highlights: ["Stunning views of Mt. Kanchenjunga"],
    itinerary: [
      { day: 1, title: "NJP to Yuksom", details: "Drive from NJP to Yuksom (6-7 hrs)." }
    ]
  },
  {
    trekId: "trk_005",
    name: "Har Ki Dun",
    region: "Uttarakhand",
    difficulty: "moderate",
    minFitnessLevel: 5,
    durationDays: 7,
    basePrice: 11000,
    maxAltitude: "11,700 ft",
    trekDistance: "47 km",
    coverPhoto: "https://plus.unsplash.com/premium_photo-1675827055694-010aef2cf08f?w=600&auto=format&fit=crop&q=60",
    description: "Walk through the cradle-shaped valley steeped in mythology.",
    highlights: ["Ancient Himalayan villages over 3000 years old"],
    itinerary: [
      { day: 1, title: "Dehradun to Sankri", details: "Drive 10 hours." }
    ]
  },
  {
    trekId: "trk_006",
    name: "Kashmir Great Lakes",
    region: "Kashmir",
    difficulty: "hard",
    minFitnessLevel: 7,
    durationDays: 8,
    basePrice: 18500,
    maxAltitude: "13,800 ft",
    trekDistance: "72 km",
    coverPhoto: "https://media.istockphoto.com/id/1341288649/photo/75mpix-panorama-of-beautiful-mount-ama-dablam-in-himalayas-nepal.webp?a=1&b=1&s=612x612&w=0&k=20&c=ZQ4s-_ltnxOs8_hU_ZnPxTnaCNv-gKOImKZok15wekk=",
    description: "Often called the most beautiful trek in India.",
    highlights: ["Seven stunning alpine lakes"],
    itinerary: [
      { day: 1, title: "Srinagar to Sonamarg", details: "Drive to base camp." }
    ]
  },
  {
    trekId: "trk_007",
    name: "Brahmatal Trek",
    region: "Uttarakhand",
    difficulty: "moderate",
    minFitnessLevel: 4,
    durationDays: 6,
    basePrice: 9500,
    maxAltitude: "12,250 ft",
    trekDistance: "24 km",
    coverPhoto: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600&auto=format&fit=crop&q=60",
    description: "A classic winter trek known for its enchanting snowy trails.",
    highlights: ["Walk on frozen alpine lakes"],
    itinerary: [
      { day: 1, title: "Kathgodam to Lohajung", details: "Scenic drive." }
    ]
  },
  {
    trekId: "trk_008",
    name: "Annapurna Base Camp",
    region: "Nepal Himalayas",
    difficulty: "hard",
    minFitnessLevel: 7,
    durationDays: 10,
    basePrice: 32000,
    maxAltitude: "13,550 ft",
    trekDistance: "110 km",
    coverPhoto: "https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600&auto=format&fit=crop&q=60",
    description: "Trek into the heart of the Annapurna massif.",
    highlights: ["Stunning 360-degree views of Annapurna I"],
    itinerary: [
      { day: 1, title: "Kathmandu to Pokhara", details: "Drive or fly." }
    ]
  },
  {
    trekId: "trk_009",
    name: "Sandakphu Phalut",
    region: "West Bengal",
    difficulty: "moderate",
    minFitnessLevel: 5,
    durationDays: 7,
    basePrice: 10500,
    maxAltitude: "11,929 ft",
    trekDistance: "46 km",
    coverPhoto: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=60",
    description: "Experience the unique trail on the Indo-Nepal border.",
    highlights: ["The Sleeping Buddha view of the Kanchenjunga range"],
    itinerary: [
      { day: 1, title: "NJP to Manebhanjan", details: "Drive." }
    ]
  },
  {
    trekId: "trk_010",
    name: "Kuardari Pass",
    region: "Uttarakhand",
    difficulty: "easy",
    minFitnessLevel: 3,
    durationDays: 5,
    basePrice: 8500,
    maxAltitude: "12,516 ft",
    trekDistance: "33 km",
    coverPhoto: "https://plus.unsplash.com/premium_photo-1673264933212-d78737f38e48?w=600&auto=format&fit=crop&q=60",
    description: "Known as the 'Curzon Trail', this trek takes you through pristine forests.",
    highlights: ["Spectacular views of Mt. Nanda Devi"],
    itinerary: [
      { day: 1, title: "Haridwar to Joshimath", details: "Drive." }
    ]
  },
  {
    trekId: "trk_011",
    name: "Kedarkantha Trek",
    region: "Uttarakhand",
    difficulty: "moderate",
    minFitnessLevel: 4,
    durationDays: 6,
    basePrice: 8500,
    maxAltitude: "12,500 ft",
    trekDistance: "20 km",
    coverPhoto: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format&fit=crop&q=60",
    description: "India's most popular winter trek — a summit climb through snow-laden pine forests to a stunning 360-degree Himalayan panorama.",
    highlights: ["Summit day above 12,500 ft", "Camping on snow"],
    itinerary: [
      { day: 1, title: "Dehradun to Sankri", details: "Drive through the Mussoorie hills to the base village." }
    ]
  },
  {
    trekId: "trk_012",
    name: "Nag Tibba Trek",
    region: "Uttarakhand",
    difficulty: "easy",
    minFitnessLevel: 2,
    durationDays: 2,
    basePrice: 3000,
    maxAltitude: "9,915 ft",
    trekDistance: "16 km",
    coverPhoto: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=60",
    description: "A perfect weekend trek to the 'Serpent's Peak', ideal for first-timers wanting a taste of the high Himalayas without a long commitment.",
    highlights: ["Great for absolute beginners", "Panoramic sunrise over Bandarpoonch"],
    itinerary: [
      { day: 1, title: "Dehradun to Pantwari", details: "Drive to the trailhead village and begin the ascent." }
    ]
  },
  {
    trekId: "trk_013",
    name: "Roopkund Trek",
    region: "Uttarakhand",
    difficulty: "hard",
    minFitnessLevel: 7,
    durationDays: 8,
    basePrice: 14500,
    maxAltitude: "16,499 ft",
    trekDistance: "53 km",
    coverPhoto: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&auto=format&fit=crop&q=60",
    description: "The legendary 'Mystery Lake' trek, famous for centuries-old human skeletal remains and dramatic ridgeline views of Trishul.",
    highlights: ["The mysterious Skeleton Lake", "Views of Trishul & Nanda Ghunti"],
    itinerary: [
      { day: 1, title: "Kathgodam to Lohajung", details: "Drive to the base village via scenic hill roads." }
    ]
  },
  {
    trekId: "trk_014",
    name: "Hampta Pass Trek",
    region: "Himachal Pradesh",
    difficulty: "moderate",
    minFitnessLevel: 5,
    durationDays: 5,
    basePrice: 10000,
    maxAltitude: "14,100 ft",
    trekDistance: "35 km",
    coverPhoto: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=600&auto=format&fit=crop&q=60",
    description: "A dramatic crossover trek from the lush Kullu valley to the stark, desert-like landscape of Lahaul in a single pass.",
    highlights: ["Two contrasting landscapes in one trek", "Optional side trip to Chandratal Lake"],
    itinerary: [
      { day: 1, title: "Manali to Jobra", details: "Drive to the trailhead and trek to the first campsite." }
    ]
  },
  {
    trekId: "trk_015",
    name: "Bhrigu Lake Trek",
    region: "Himachal Pradesh",
    difficulty: "easy",
    minFitnessLevel: 3,
    durationDays: 4,
    basePrice: 7000,
    maxAltitude: "14,100 ft",
    trekDistance: "20 km",
    coverPhoto: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&auto=format&fit=crop&q=60",
    description: "A high-altitude alpine lake trek through meadows above Manali, said to change color through the day.",
    highlights: ["A sacred glacial lake at 14,000 ft", "Sweeping views of the Pir Panjal range"],
    itinerary: [
      { day: 1, title: "Manali to Gulaba", details: "Drive to the trailhead and begin the ascent through meadows." }
    ]
  },
  {
    trekId: "trk_016",
    name: "Pin Parvati Pass",
    region: "Himachal Pradesh",
    difficulty: "extreme",
    minFitnessLevel: 9,
    durationDays: 11,
    basePrice: 22000,
    maxAltitude: "17,457 ft",
    trekDistance: "110 km",
    coverPhoto: "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=600&auto=format&fit=crop&q=60",
    description: "One of the toughest high-altitude crossovers in the Himalayas, linking the green Parvati Valley to the barren Spiti landscape.",
    highlights: ["Technical glacier crossing", "Two dramatically different valleys"],
    itinerary: [
      { day: 1, title: "Kasol to Barshaini", details: "Drive and begin the long approach into the Pin Valley." }
    ]
  },
  {
    trekId: "trk_017",
    name: "Chadar - The Frozen River Trek",
    region: "Ladakh",
    difficulty: "extreme",
    minFitnessLevel: 8,
    durationDays: 9,
    basePrice: 25000,
    maxAltitude: "11,123 ft",
    trekDistance: "62 km",
    coverPhoto: "https://images.unsplash.com/photo-1571687949921-1306bfb24b72?w=600&auto=format&fit=crop&q=60",
    description: "A once-in-a-lifetime winter expedition walking on the frozen Zanskar river between towering canyon walls.",
    highlights: ["Trek on a frozen river", "Camp in ice caves"],
    itinerary: [
      { day: 1, title: "Leh to Shingra Koma", details: "Acclimatize in Leh, then drive to the start of the frozen river." }
    ]
  },
  {
    trekId: "trk_018",
    name: "Markha Valley Trek",
    region: "Ladakh",
    difficulty: "hard",
    minFitnessLevel: 7,
    durationDays: 8,
    basePrice: 19000,
    maxAltitude: "17,060 ft",
    trekDistance: "70 km",
    coverPhoto: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=600&auto=format&fit=crop&q=60",
    description: "A classic teahouse trek through Ladakh's remote Markha Valley, crossing the high Kongmaru La pass.",
    highlights: ["Ancient monasteries en route", "Crosses Kongmaru La at 17,060 ft"],
    itinerary: [
      { day: 1, title: "Leh to Chilling", details: "Acclimatize, then drive to the trailhead and cross the Zanskar." }
    ]
  },
  {
    trekId: "trk_019",
    name: "Rupin Pass Trek",
    region: "Himachal Pradesh",
    difficulty: "hard",
    minFitnessLevel: 7,
    durationDays: 8,
    basePrice: 16500,
    maxAltitude: "15,250 ft",
    trekDistance: "52 km",
    coverPhoto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=60",
    description: "One of the most visually dramatic treks in India, featuring hanging villages, waterfalls, and a vast snow-covered pass.",
    highlights: ["The iconic Rupin waterfall", "A dramatic snow-bridge crossing"],
    itinerary: [
      { day: 1, title: "Dehradun to Dhaula", details: "Long scenic drive to the last motorable village." }
    ]
  },
  {
    trekId: "trk_020",
    name: "Dzongri Trek",
    region: "Sikkim",
    difficulty: "moderate",
    minFitnessLevel: 5,
    durationDays: 7,
    basePrice: 13000,
    maxAltitude: "13,200 ft",
    trekDistance: "40 km",
    coverPhoto: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=600&auto=format&fit=crop&q=60",
    description: "A shorter alternative to Goechala, rewarding trekkers with an unforgettable sunrise over the Kanchenjunga range.",
    highlights: ["Sunrise view from Dzongri Top", "Rhododendron forests in bloom"],
    itinerary: [
      { day: 1, title: "Yuksom to Sachen", details: "Begin the trek through dense forest along the Rathong river." }
    ]
  },
  {
    trekId: "trk_021",
    name: "Everest Base Camp Trek",
    region: "Nepal Himalayas",
    difficulty: "extreme",
    minFitnessLevel: 9,
    durationDays: 14,
    basePrice: 85000,
    maxAltitude: "17,600 ft",
    trekDistance: "130 km",
    coverPhoto: "https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?w=600&auto=format&fit=crop&q=60",
    description: "The world's most iconic trek — follow in the footsteps of legends through Sherpa country to the foot of Mt. Everest.",
    highlights: ["Stand at the base of the world's highest peak", "Fly into Lukla, trek through Namche Bazaar"],
    itinerary: [
      { day: 1, title: "Kathmandu to Lukla to Phakding", details: "Scenic mountain flight into Lukla, then trek to the first village." }
    ]
  },
  {
    trekId: "trk_022",
    name: "Langtang Valley Trek",
    region: "Nepal Himalayas",
    difficulty: "moderate",
    minFitnessLevel: 6,
    durationDays: 10,
    basePrice: 35000,
    maxAltitude: "12,700 ft",
    trekDistance: "65 km",
    coverPhoto: "https://images.unsplash.com/photo-1544198365-f5d60b6d8190?w=600&auto=format&fit=crop&q=60",
    description: "Known as the 'Valley of Glaciers', a quieter and closer alternative to the Everest and Annapurna regions.",
    highlights: ["Kyanjin Gompa monastery", "Close-up views of Langtang Lirung"],
    itinerary: [
      { day: 1, title: "Kathmandu to Syabrubesi", details: "Scenic drive out of the Kathmandu valley to the trailhead." }
    ]
  },
  {
    trekId: "trk_023",
    name: "Poon Hill Trek",
    region: "Nepal Himalayas",
    difficulty: "easy",
    minFitnessLevel: 3,
    durationDays: 5,
    basePrice: 18000,
    maxAltitude: "10,500 ft",
    trekDistance: "33 km",
    coverPhoto: "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=600&auto=format&fit=crop&q=60",
    description: "A short, beginner-friendly teahouse trek famous for its sunrise viewpoint over Dhaulagiri and Annapurna.",
    highlights: ["Sunrise over the Annapurna range", "Cozy teahouse stays in Ghorepani"],
    itinerary: [
      { day: 1, title: "Pokhara to Nayapul to Tikhedhunga", details: "Drive to the trailhead and begin a gentle ascent." }
    ]
  },
  {
    trekId: "trk_024",
    name: "Tsomoriri Lake Trek",
    region: "Ladakh",
    difficulty: "hard",
    minFitnessLevel: 6,
    durationDays: 7,
    basePrice: 17000,
    maxAltitude: "15,075 ft",
    trekDistance: "40 km",
    coverPhoto: "https://images.unsplash.com/photo-1476611317561-60117649dd94?w=600&auto=format&fit=crop&q=60",
    description: "A remote high-altitude trek to a pristine Himalayan lake shared with nomadic Changpa herders and rare wildlife.",
    highlights: ["A serene high-altitude lake at 15,000 ft", "Chance sightings of Kiang and Black-necked Crane"],
    itinerary: [
      { day: 1, title: "Leh to Karzok", details: "Acclimatize in Leh, then drive along the Indus to the lake." }
    ]
  },
  {
    trekId: "trk_025",
    name: "Druk Path Trek",
    region: "Bhutan",
    difficulty: "moderate",
    minFitnessLevel: 6,
    durationDays: 6,
    basePrice: 45000,
    maxAltitude: "13,400 ft",
    trekDistance: "28 km",
    coverPhoto: "https://images.unsplash.com/photo-1465310477141-6fb93167a273?w=600&auto=format&fit=crop&q=60",
    description: "A classic Himalayan kingdom trek connecting Paro to Thimphu past ancient dzongs and sacred alpine lakes.",
    highlights: ["Views of Jomolhari", "Ancient fortresses (dzongs) along the route"],
    itinerary: [
      { day: 1, title: "Paro to Jele Dzong", details: "Begin the ascent from the Paro valley through blue pine forest." }
    ]
  }
];

const addonsData = [
  { addOnId: "add_01", name: "Trekking Poles", price: 500, category: "gear", description: "Set of 2 lightweight poles" },
  { addOnId: "add_02", name: "Travel Insurance", price: 850, category: "insurance", description: "Comprehensive medical & evacuation" },
  { addOnId: "add_03", name: "Porter for Backpack", price: 2400, category: "guide", description: "Carry up to 10kg of your luggage" },
  { addOnId: "add_04", name: "Sleeping Bag", price: 300, category: "gear", description: "Warm -10°C sleeping bag" },
  { addOnId: "add_05", name: "Personal Sherpa", price: 8000, category: "guide", description: "Dedicated climbing guide" }
];

const seedDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    // Clear existing. Bookings/audit logs are cleared too so demo runs start
    // from a clean slate — they reference Batch/Trek ids that are about to
    // be replaced anyway.
    await Trek.deleteMany({});
    await Batch.deleteMany({});
    await AddOn.deleteMany({});
    await Booking.deleteMany({});
    await AuditLog.deleteMany({});

    // Seed Addons
    await AddOn.insertMany(addonsData);
    console.log("AddOns seeded.");

    // A handful of iconic/popular treks get a second departure date, so the
    // catalog doesn't look like every trek has exactly one identical slot —
    // and slot counts cycle through a few realistic variants (including a
    // couple of "almost full" ones) instead of being uniformly 15/5.
    const POPULAR_TREK_IDS = new Set(['trk_001', 'trk_011', 'trk_021', 'trk_023']);
    const SLOT_VARIANTS = [
      { totalSlots: 15, slotsBooked: 5 },
      { totalSlots: 12, slotsBooked: 10 }, // low availability -> "spots left" urgency badge
      { totalSlots: 20, slotsBooked: 3 },
      { totalSlots: 10, slotsBooked: 8 },
      { totalSlots: 18, slotsBooked: 6 },
      { totalSlots: 14, slotsBooked: 12 }  // low availability
    ];
    const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

    // Seed Treks and Batches
    for (let i = 0; i < treksData.length; i++) {
      const trekData = treksData[i];
      const trek = new Trek(trekData);
      await trek.save();

      const variant = SLOT_VARIANTS[i % SLOT_VARIANTS.length];
      const startDate1 = new Date('2026-10-10');
      const batch1 = new Batch({
        batchId: `batch_${trek.trekId}_01`,
        trekId: trek._id,
        startDate: startDate1,
        endDate: addDays(startDate1, trek.durationDays),
        totalSlots: variant.totalSlots,
        slotsBooked: variant.slotsBooked,
        price: trek.basePrice
      });
      await batch1.save();

      // Second departure for a few iconic treks — makes "Available Departures"
      // feel like a real catalog with choices, not a single fixed slot.
      if (POPULAR_TREK_IDS.has(trek.trekId)) {
        const startDate2 = new Date('2026-11-20');
        const batch2 = new Batch({
          batchId: `batch_${trek.trekId}_02`,
          trekId: trek._id,
          startDate: startDate2,
          endDate: addDays(startDate2, trek.durationDays),
          totalSlots: 16,
          slotsBooked: 2,
          price: trek.basePrice
        });
        await batch2.save();
      }

      // For the first trek, create a batch with exactly 1 slot left.
      // Used to demo the atomic reservation guard: fire 2 concurrent
      // bookings against this batch and confirm only 1 succeeds.
      if (i === 0) {
        const batchRace = new Batch({
          batchId: `batch_${trek.trekId}_race`,
          trekId: trek._id,
          startDate: new Date('2026-10-20'),
          endDate: new Date('2026-10-25'),
          totalSlots: 10,
          slotsBooked: 9, // ONLY 1 SLOT LEFT!
          price: trek.basePrice
        });
        await batchRace.save();
      }
    }

    console.log("Treks and Batches seeded.");
    console.log("Database seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedDB();
