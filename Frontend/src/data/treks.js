export const treks = [
  {
    id: "trk_001",
    name: "Valley of Flowers",
    region: "Uttarakhand",
    difficulty: "moderate",
    duration: "6 Days",
    basePrice: 12500,
    slotsRemaining: 12,
    maxAltitude: "14,100 ft",
    trekDistance: "38 km",
    coverPhoto: "https://images.unsplash.com/photo-1572782252655-9c8771392601?w=600&auto=format&fit=crop&q=60",
    description: "A mesmerizing trek through a UNESCO World Heritage site known for its meadows of endemic alpine flowers and the variety of flora. Set against the backdrop of the majestic Zanskar Ranges, this trek offers an unforgettable experience of nature's vibrant colors.",
    highlights: [
      "UNESCO World Heritage Site",
      "Over 300 species of wildflowers",
      "Views of Nilgiri Parbat & Hathi Parbat",
      "Visit to the sacred Hemkund Sahib"
    ],
    itinerary: [
      { day: 1, title: "Haridwar to Govindghat", details: "Drive from Haridwar to Govindghat (10 hrs). Overnight stay in a guesthouse." },
      { day: 2, title: "Govindghat to Ghangaria", details: "Trek 14km alongside the Pushpawati river. Moderate ascent. Overnight in Ghangaria." },
      { day: 3, title: "Ghangaria to Valley of Flowers and back", details: "Trek 5km to the valley. Spend time exploring the vibrant flora. Return to Ghangaria." },
      { day: 4, title: "Ghangaria to Hemkund Sahib and back", details: "Steep 6km climb to the pristine Hemkund Sahib lake and Gurudwara. Return to Ghangaria." },
      { day: 5, title: "Ghangaria to Govindghat", details: "Descend 14km back to Govindghat. Overnight in a guesthouse." },
      { day: 6, title: "Govindghat to Haridwar", details: "Drive back to Haridwar. Trip ends." }
    ],
    departures: [
      { id: "dep_01", dateRange: "Aug 12 - Aug 17", price: 12500, slots: 12 },
      { id: "dep_02", dateRange: "Aug 19 - Aug 24", price: 13000, slots: 4 },
      { id: "dep_03", dateRange: "Aug 26 - Aug 31", price: 12500, slots: 1 }
    ],
    addons: [
      { id: "add_01", name: "Trekking Poles", description: "Set of 2 lightweight poles", price: 500 },
      { id: "add_02", name: "Travel Insurance", description: "Comprehensive medical & evacuation", price: 850 },
      { id: "add_03", name: "Porter for Backpack", description: "Carry up to 10kg of your luggage", price: 2400 }
    ]
  },
  {
    id: "trk_002",
    name: "Kheerganga Trek",
    region: "Himachal Pradesh",
    difficulty: "easy",
    duration: "3 Days",
    basePrice: 3500,
    slotsRemaining: 24,
    maxAltitude: "9,600 ft",
    trekDistance: "24 km",
    coverPhoto: "https://images.unsplash.com/photo-1692626453173-7af2d5b64426?w=600&auto=format&fit=crop&q=60",
    description: "A beginner-friendly trek into the heart of the Parvati Valley. Walk through lush forests, picturesque waterfalls, and end your day taking a dip in the natural hot springs of Kheerganga under the starry Himalayan sky.",
    highlights: [
      "Natural hot water springs at the summit",
      "Stunning views of the Parvati Valley",
      "Beautiful pine forests and waterfalls",
      "Perfect for beginners and weekend getaways"
    ],
    itinerary: [
      { day: 1, title: "Kasol to Barshaini to Kheerganga", details: "Drive to Barshaini and trek 12km to Kheerganga. Enjoy the hot springs. Overnight in tents." },
      { day: 2, title: "Explore Kheerganga", details: "Spend the day exploring the alpine meadows and relaxing in the hot springs." },
      { day: 3, title: "Kheerganga to Barshaini", details: "Trek back to Barshaini and depart for Kasol." }
    ],
    departures: [
      { id: "dep_04", dateRange: "Sep 01 - Sep 03", price: 3500, slots: 24 },
      { id: "dep_05", dateRange: "Sep 08 - Sep 10", price: 3800, slots: 15 }
    ],
    addons: [
      { id: "add_04", name: "Sleeping Bag", description: "Warm -10°C sleeping bag", price: 300 },
      { id: "add_02", name: "Travel Insurance", description: "Comprehensive medical & evacuation", price: 350 }
    ]
  },
  {
    id: "trk_003",
    name: "Stok Kangri Expedition",
    region: "Ladakh",
    difficulty: "extreme",
    duration: "9 Days",
    basePrice: 28000,
    slotsRemaining: 3,
    maxAltitude: "20,187 ft",
    trekDistance: "40 km",
    coverPhoto: "https://images.unsplash.com/photo-1751225750479-43ad27b94fa0?w=600&auto=format&fit=crop&q=60",
    description: "One of the most thrilling non-technical peaks in India. At over 20,000 feet, Stok Kangri offers a true mountaineering experience. It demands high physical fitness and prior high-altitude trekking experience.",
    highlights: [
      "Climb a 6000m peak without technical gear",
      "Panoramic views of the Zanskar and Karakoram ranges",
      "Experience Ladakhi culture in Leh",
      "Challenging glacier crossing and ridge walk"
    ],
    itinerary: [
      { day: 1, title: "Arrive in Leh", details: "Acclimatization day in Leh (11,400 ft)." },
      { day: 2, title: "Leh Acclimatization", details: "Visit monasteries and acclimatize further." },
      { day: 3, title: "Leh to Stok Village, Trek to Mankorma", details: "Drive to Stok, trek to Mankorma (14,200 ft)." },
      { day: 4, title: "Mankorma to Base Camp", details: "Trek to Stok Kangri Base Camp (16,300 ft). Training on ice axes/crampons." },
      { day: 5, title: "Acclimatization and Training", details: "Rest and practice at Base Camp." },
      { day: 6, title: "Summit Attempt", details: "Start at midnight. Reach summit (20,187 ft) by sunrise. Descend to Base Camp." },
      { day: 7, title: "Contingency Summit Day", details: "Reserved day in case of bad weather." },
      { day: 8, title: "Base Camp to Stok Village, Drive to Leh", details: "Trek down to Stok Village, drive back to Leh." },
      { day: 9, title: "Departure", details: "Fly out of Leh." }
    ],
    departures: [
      { id: "dep_06", dateRange: "Jul 15 - Jul 23", price: 28000, slots: 3 },
      { id: "dep_07", dateRange: "Jul 25 - Aug 02", price: 29500, slots: 8 }
    ],
    addons: [
      { id: "add_05", name: "Climbing Boots", description: "Double-layered mountaineering boots", price: 2500 },
      { id: "add_02", name: "Travel Insurance", description: "High-altitude medical & evacuation", price: 2000 },
      { id: "add_06", name: "Personal Sherpa", description: "Dedicated climbing guide", price: 8000 }
    ]
  },
  {
    id: "trk_004",
    name: "Goechala Trek",
    region: "Sikkim",
    difficulty: "hard",
    duration: "11 Days",
    basePrice: 16500,
    slotsRemaining: 6,
    maxAltitude: "16,200 ft",
    trekDistance: "90 km",
    coverPhoto: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=600&auto=format&fit=crop&q=60",
    description: "Get up close and personal with Mt. Kanchenjunga, the third highest peak in the world. The Goechala trek is renowned for its grand mountain views, pristine forests, and the spectacular sunrise from Dzongri Top.",
    highlights: [
      "Stunning views of Mt. Kanchenjunga",
      "Walk through the biodiverse Kanchenjunga National Park",
      "Spectacular sunrise from Dzongri Top",
      "The turquoise waters of Samiti Lake"
    ],
    itinerary: [
      { day: 1, title: "NJP to Yuksom", details: "Drive from NJP to Yuksom (6-7 hrs)." },
      { day: 2, title: "Yuksom to Sachen", details: "Trek through dense forests to Sachen." },
      { day: 3, title: "Sachen to Tshoka", details: "Steep ascent to the Tibetan settlement of Tshoka." },
      { day: 4, title: "Tshoka to Dzongri", details: "Trek through rhododendron forests to Dzongri meadows." },
      { day: 5, title: "Dzongri Top & Acclimatization", details: "Early morning hike to Dzongri Top for sunrise views. Rest." },
      { day: 6, title: "Dzongri to Thansing", details: "Trek towards the Kanchenjunga range to Thansing." },
      { day: 7, title: "Thansing to Lamuney", details: "Short trek to Lamuney, the highest campsite." },
      { day: 8, title: "Lamuney to Goechala & back to Thansing", details: "Long summit day to Viewpoint 1 or Goechala. Descend to Thansing." },
      { day: 9, title: "Thansing to Tshoka", details: "Descend rapidly back to Tshoka." },
      { day: 10, title: "Tshoka to Yuksom", details: "Final descent to Yuksom." },
      { day: 11, title: "Departure", details: "Drive back to NJP." }
    ],
    departures: [
      { id: "dep_08", dateRange: "Oct 10 - Oct 20", price: 16500, slots: 6 },
      { id: "dep_09", dateRange: "Oct 25 - Nov 04", price: 17000, slots: 12 }
    ],
    addons: [
      { id: "add_01", name: "Trekking Poles", description: "Set of 2 lightweight poles", price: 600 },
      { id: "add_02", name: "Travel Insurance", description: "Comprehensive medical & evacuation", price: 1200 },
      { id: "add_03", name: "Porter for Backpack", description: "Carry up to 10kg of your luggage", price: 4400 }
    ]
  },
  {
    id: "trk_005",
    name: "Har Ki Dun",
    region: "Uttarakhand",
    difficulty: "moderate",
    duration: "7 Days",
    basePrice: 11000,
    slotsRemaining: 18,
    maxAltitude: "11,700 ft",
    trekDistance: "47 km",
    coverPhoto: "https://plus.unsplash.com/premium_photo-1675827055694-010aef2cf08f?w=600&auto=format&fit=crop&q=60",
    description: "Walk through the cradle-shaped valley steeped in mythology. Har Ki Dun is a splendid trek passing through ancient villages, dense pine forests, and offering magnificent views of Swargarohini peak.",
    highlights: [
      "Ancient Himalayan villages over 3000 years old",
      "Mythological trail of the Pandavas",
      "Breathtaking views of Swargarohini",
      "Beautiful alpine meadows and pine forests"
    ],
    itinerary: [
      { day: 1, title: "Dehradun to Sankri", details: "Drive 10 hours through picturesque mountain roads." },
      { day: 2, title: "Sankri to Pauni Garaat", details: "Drive to Taluka and trek to Pauni Garaat." },
      { day: 3, title: "Pauni Garaat to Kalkatiyadhar", details: "Trek through forests and ancient villages like Osla." },
      { day: 4, title: "Kalkatiyadhar to Har Ki Dun & back", details: "Trek to the magnificent Har Ki Dun valley and return to Kalkatiyadhar." },
      { day: 5, title: "Kalkatiyadhar to Pauni Garaat", details: "Descend back towards Pauni Garaat." },
      { day: 6, title: "Pauni Garaat to Sankri", details: "Trek to Taluka and drive back to Sankri." },
      { day: 7, title: "Sankri to Dehradun", details: "Drive back to Dehradun." }
    ],
    departures: [
      { id: "dep_10", dateRange: "Nov 05 - Nov 11", price: 11000, slots: 18 },
      { id: "dep_11", dateRange: "Nov 15 - Nov 21", price: 11500, slots: 2 }
    ],
    addons: [
      { id: "add_01", name: "Trekking Poles", description: "Set of 2 lightweight poles", price: 500 },
      { id: "add_02", name: "Travel Insurance", description: "Comprehensive medical & evacuation", price: 800 }
    ]
  },
  {
    id: "trk_006",
    name: "Kashmir Great Lakes",
    region: "Kashmir",
    difficulty: "hard",
    duration: "8 Days",
    basePrice: 18500,
    slotsRemaining: 1,
    maxAltitude: "13,800 ft",
    trekDistance: "72 km",
    coverPhoto: "https://media.istockphoto.com/id/1341288649/photo/75mpix-panorama-of-beautiful-mount-ama-dablam-in-himalayas-nepal.webp?a=1&b=1&s=612x612&w=0&k=20&c=ZQ4s-_ltnxOs8_hU_ZnPxTnaCNv-gKOImKZok15wekk=",
    description: "Often called the most beautiful trek in India, KGL takes you past seven alpine lakes, each more stunning than the last. The vivid turquoise waters against rugged snow-capped peaks is a sight to behold.",
    highlights: [
      "Seven stunning alpine lakes",
      "Vast, endless meadows of Kashmir",
      "Three thrilling mountain passes",
      "Unique flora and fauna of the region"
    ],
    itinerary: [
      { day: 1, title: "Srinagar to Sonamarg", details: "Drive to the base camp at Sonamarg." },
      { day: 2, title: "Sonamarg to Nichnai", details: "Trek through pine forests and meadows to Nichnai." },
      { day: 3, title: "Nichnai to Vishansar Lake", details: "Cross Nichnai Pass (13,500 ft) and descend to the beautiful Vishansar Lake." },
      { day: 4, title: "Vishansar to Gadsar", details: "Cross Gadsar Pass (13,800 ft), the highest point of the trek, to reach Gadsar lake." },
      { day: 5, title: "Gadsar to Satsar", details: "Trek through meadows to reach the Satsar lakes." },
      { day: 6, title: "Satsar to Gangabal Twin Lakes", details: "Cross Zaj Pass for breathtaking views of Mt. Harmukh and the twin lakes." },
      { day: 7, title: "Gangabal to Naranag", details: "A long descent to Naranag village." },
      { day: 8, title: "Drive to Srinagar", details: "Return journey to Srinagar." }
    ],
    departures: [
      { id: "dep_12", dateRange: "Jul 20 - Jul 27", price: 18500, slots: 1 },
      { id: "dep_13", dateRange: "Aug 05 - Aug 12", price: 19000, slots: 0 }
    ],
    addons: [
      { id: "add_01", name: "Trekking Poles", description: "Set of 2 lightweight poles", price: 600 },
      { id: "add_02", name: "Travel Insurance", description: "Comprehensive medical & evacuation", price: 1500 },
      { id: "add_07", name: "Premium Tent Upgrade", description: "More spacious 3-person tent for 2", price: 2000 }
    ]
  },
  {
    id: "trk_007",
    name: "Brahmatal Trek",
    region: "Uttarakhand",
    difficulty: "moderate",
    duration: "6 Days",
    basePrice: 9500,
    slotsRemaining: 8,
    maxAltitude: "12,250 ft",
    trekDistance: "24 km",
    coverPhoto: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600&auto=format&fit=crop&q=60",
    description: "A classic winter trek known for its enchanting snowy trails, frozen alpine lakes, and panoramic views of Mt. Trishul and Nanda Ghunti. A perfect choice for those looking to experience Himalayan winter.",
    highlights: [
      "Walk on frozen alpine lakes (Bekaltal & Brahmatal)",
      "Unmatched views of Mt. Trishul & Nanda Ghunti",
      "Magical snow-covered forest trails",
      "Perfect winter trek for beginners to moderate trekkers"
    ],
    itinerary: [
      { day: 1, title: "Kathgodam to Lohajung", details: "10-hour scenic drive to the base camp." },
      { day: 2, title: "Lohajung to Bekaltal", details: "Trek through oak and rhododendron forests to the frozen Bekaltal lake." },
      { day: 3, title: "Bekaltal to Brahmatal", details: "Trek further up to the Brahmatal lake campsite." },
      { day: 4, title: "Brahmatal to Brahmatal Top and back", details: "Summit day for 360-degree mountain views." },
      { day: 5, title: "Brahmatal to Lohajung", details: "Descend back to the base camp." },
      { day: 6, title: "Lohajung to Kathgodam", details: "Drive back and depart." }
    ],
    departures: [
      { id: "dep_14", dateRange: "Dec 20 - Dec 25", price: 9500, slots: 8 },
      { id: "dep_15", dateRange: "Dec 28 - Jan 02", price: 10500, slots: 15 }
    ],
    addons: [
      { id: "add_08", name: "Microspikes & Gaiters", description: "Essential for snow walking", price: 400 },
      { id: "add_02", name: "Travel Insurance", description: "Comprehensive medical & evacuation", price: 700 }
    ]
  },
  {
    id: "trk_008",
    name: "Annapurna Base Camp",
    region: "Nepal Himalayas",
    difficulty: "hard",
    duration: "10 Days",
    basePrice: 32000,
    slotsRemaining: 15,
    maxAltitude: "13,550 ft",
    trekDistance: "110 km",
    coverPhoto: "https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600&auto=format&fit=crop&q=60",
    description: "Trek into the heart of the Annapurna massif. Walk through terraced farms, traditional Gurung villages, and alpine terrain to reach the breathtaking amphitheater of the base camp.",
    highlights: [
      "Stunning 360-degree views of Annapurna I, Machapuchare, and Hiunchuli",
      "Trek through lush rhododendron and bamboo forests",
      "Stay in cozy traditional tea houses",
      "Relax in the Jhinu Danda hot springs"
    ],
    itinerary: [
      { day: 1, title: "Kathmandu to Pokhara", details: "Drive or fly to the lakeside city of Pokhara." },
      { day: 2, title: "Pokhara to Nayapul to Ghandruk", details: "Drive to Nayapul and start trekking to the beautiful Gurung village of Ghandruk." },
      { day: 3, title: "Ghandruk to Chhomrong", details: "Trek across the Modi Khola river to Chhomrong." },
      { day: 4, title: "Chhomrong to Dovan", details: "Descend to the river and climb back up through bamboo forests." },
      { day: 5, title: "Dovan to Machapuchare Base Camp (MBC)", details: "Trek past Deurali to the gateway of the sanctuary." },
      { day: 6, title: "MBC to Annapurna Base Camp (ABC)", details: "A short trek to the magnificent base camp for sunset views." },
      { day: 7, title: "ABC to Bamboo", details: "Enjoy the sunrise over Annapurna I before descending rapidly to Bamboo." },
      { day: 8, title: "Bamboo to Jhinu Danda", details: "Trek down and enjoy the natural hot springs." },
      { day: 9, title: "Jhinu Danda to Nayapul to Pokhara", details: "Final trek and drive back to Pokhara." },
      { day: 10, title: "Pokhara to Kathmandu", details: "Return journey to Kathmandu." }
    ],
    departures: [
      { id: "dep_16", dateRange: "Apr 10 - Apr 19", price: 32000, slots: 15 },
      { id: "dep_17", dateRange: "May 05 - May 14", price: 33500, slots: 8 }
    ],
    addons: [
      { id: "add_01", name: "Trekking Poles", description: "Set of 2 lightweight poles", price: 600 },
      { id: "add_02", name: "Travel Insurance", description: "International medical & evacuation", price: 2500 },
      { id: "add_09", name: "Kathmandu Hotel Upgrade", description: "4-star stay in Kathmandu", price: 3500 }
    ]
  },
  {
    id: "trk_009",
    name: "Sandakphu Phalut",
    region: "West Bengal",
    difficulty: "moderate",
    duration: "7 Days",
    basePrice: 10500,
    slotsRemaining: 22,
    maxAltitude: "11,929 ft",
    trekDistance: "46 km",
    coverPhoto: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=60",
    description: "Experience the unique trail on the Indo-Nepal border that offers a view of four of the world's five highest peaks: Everest, Kanchenjunga, Lhotse, and Makalu.",
    highlights: [
      "The Sleeping Buddha view of the Kanchenjunga range",
      "Views of Mt. Everest and Lhotse",
      "Trek along the scenic Indo-Nepal border",
      "Dense forests of rhododendron and magnolia"
    ],
    itinerary: [
      { day: 1, title: "NJP to Manebhanjan", details: "Drive from New Jalpaiguri to the base camp." },
      { day: 2, title: "Manebhanjan to Tumling", details: "Trek mostly through the Singalila National Park." },
      { day: 3, title: "Tumling to Kalipokhri", details: "Walk past the black lake and enjoy mountain vistas." },
      { day: 4, title: "Kalipokhri to Sandakphu", details: "Reach the highest point in West Bengal." },
      { day: 5, title: "Sandakphu to Phalut", details: "A long, relatively flat walk with continuous mountain views." },
      { day: 6, title: "Phalut to Gorkhey", details: "Descend into a picturesque valley." },
      { day: 7, title: "Gorkhey to Sepi to NJP", details: "Final descent and drive back." }
    ],
    departures: [
      { id: "dep_18", dateRange: "Oct 15 - Oct 21", price: 10500, slots: 22 },
      { id: "dep_19", dateRange: "Nov 02 - Nov 08", price: 10500, slots: 10 }
    ],
    addons: [
      { id: "add_01", name: "Trekking Poles", description: "Set of 2 lightweight poles", price: 500 },
      { id: "add_02", name: "Travel Insurance", description: "Comprehensive medical & evacuation", price: 800 }
    ]
  },
  {
    id: "trk_010",
    name: "Kuardari Pass",
    region: "Uttarakhand",
    difficulty: "easy",
    duration: "5 Days",
    basePrice: 8500,
    slotsRemaining: 18,
    maxAltitude: "12,516 ft",
    trekDistance: "33 km",
    coverPhoto: "https://plus.unsplash.com/premium_photo-1673264933212-d78737f38e48?w=600&auto=format&fit=crop&q=60",
    description: "Known as the 'Curzon Trail', this trek takes you through pristine forests and opens up to spectacular panoramic views of majestic peaks like Nanda Devi, Dronagiri, and Kamet.",
    highlights: [
      "Spectacular views of Mt. Nanda Devi",
      "Beautiful oak and rhododendron forests",
      "Stunning meadows at Gorson Bugyal",
      "Accessible year-round (except peak monsoon)"
    ],
    itinerary: [
      { day: 1, title: "Haridwar to Joshimath", details: "Drive alongside the Alaknanda river." },
      { day: 2, title: "Joshimath to Dhak to Gulling", details: "Short drive followed by a trek to Gulling campsite." },
      { day: 3, title: "Gulling to Tali Top", details: "Trek through the forest to reach the open meadows of Tali." },
      { day: 4, title: "Tali Top to Kuari Pass and back", details: "Summit day with expansive views of the Garhwal Himalayas." },
      { day: 5, title: "Tali Top to Joshimath to Haridwar", details: "Descend and drive back." }
    ],
    departures: [
      { id: "dep_20", dateRange: "Sep 15 - Sep 19", price: 8500, slots: 18 },
      { id: "dep_21", dateRange: "Oct 10 - Oct 14", price: 8500, slots: 25 }
    ],
    addons: [
      { id: "add_01", name: "Trekking Poles", description: "Set of 2 lightweight poles", price: 500 },
      { id: "add_02", name: "Travel Insurance", description: "Comprehensive medical & evacuation", price: 600 }
    ]
  }
];
