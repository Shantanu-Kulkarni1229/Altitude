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

    // Seed Treks and Batches
    for (let i = 0; i < treksData.length; i++) {
      const trekData = treksData[i];
      const trek = new Trek(trekData);
      await trek.save();

      // Create a normal batch
      const batch1 = new Batch({
        batchId: `batch_${trek.trekId}_01`,
        trekId: trek._id,
        startDate: new Date('2026-10-10'),
        endDate: new Date('2026-10-15'),
        totalSlots: 15,
        slotsBooked: 5,
        price: trek.basePrice
      });
      await batch1.save();

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
