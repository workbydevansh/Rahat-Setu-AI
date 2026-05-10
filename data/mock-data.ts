import type {
  Certificate,
  Crisis,
  CrisisReport,
  CrisisTypePanel,
  DashboardStat,
  MapMarker,
  NGOProfile,
  ReliefTask,
  ResourceNeed,
  ResourcePledge,
  ResponsePillar,
  VolunteerMatch,
  VolunteerProfile,
} from "@/types";

export const responseSignals = [
  {
    label: "Active crises",
    value: "03",
    detail: "Fire, flood, and landslide response rooms are active together.",
  },
  {
    label: "Open tasks",
    value: "21",
    detail: "Prioritized by urgency, skill fit, assets, and location readiness.",
  },
  {
    label: "Registered assets",
    value: "48",
    detail: "Boats, bikes, vehicles, shelter space, and medical kits on standby.",
  },
] as const;

export const problemSolutionPanels: ResponsePillar[] = [
  {
    title: "Problem",
    kicker: "Scattered public help",
    description:
      "During disasters, people want to help but support stays fragmented across calls, chats, spreadsheets, and local contacts. NGOs lose time finding the right people, supplies, and transport.",
    tone: "alert",
  },
  {
    title: "Solution",
    kicker: "AI-powered coordination",
    description:
      "RahatSetu AI connects NGOs, volunteers, donors, and community resources in one crisis-specific platform, so help can be matched faster by location, skills, assets, urgency, and safety level.",
    tone: "safe",
  },
] as const;

export const crisisTypePanels: CrisisTypePanel[] = [
  {
    title: "Fire",
    headline: "Rapid shelter, medicine, and food mobilization",
    description:
      "Best for slum fire or urban blaze responses where relief camps and burn-care support matter first.",
    tone: "alert",
  },
  {
    title: "Flood",
    headline: "Boat owners, swimmers, dry ration, and ORS",
    description:
      "Flood corridors prioritize boats, local water knowledge, shelter, and safe logistics routes.",
    tone: "safe",
  },
  {
    title: "Landslide",
    headline: "Off-road access, guides, rope, and first-aid",
    description:
      "Landslide response shifts the system toward terrain-aware volunteers and transport assets.",
    tone: "warn",
  },
  {
    title: "Earthquake",
    headline: "Doctors, engineers, blood support, and shelters",
    description:
      "Earthquake response prioritizes medical volunteers, structural expertise, blood donors, and rapid shelter coordination.",
    tone: "info",
  },
  {
    title: "Cyclone",
    headline: "Shelter, dry food, medicines, and power backup",
    description:
      "Cyclone relief emphasizes resilient shelter, essential medicines, safe supply routes, and backup power support.",
    tone: "safe",
  },
] as const;

export const landingFeatures: ResponsePillar[] = [
  {
    title: "Crisis-specific matching",
    kicker: "Feature 01",
    description:
      "A flood does not need the same volunteer ordering as a landslide or fire. Matching logic shifts by disaster type, distance, skill fit, assets, and risk level.",
    tone: "safe",
  },
  {
    title: "Community asset registry",
    kicker: "Feature 02",
    description:
      "The platform is ready to register bikes, boats, 4x4 vehicles, shelter space, generators, medical kits, and other high-value local assets.",
    tone: "info",
  },
  {
    title: "Verified NGO dashboard",
    kicker: "Feature 03",
    description:
      "NGOs get one command view for live crises, open tasks, volunteer matches, resource gaps, and impact tracking.",
    tone: "alert",
  },
  {
    title: "Donor and resource pledges",
    kicker: "Feature 04",
    description:
      "Verified campaigns can collect food, medicine, shelter, logistics, and funding pledges while keeping public visibility focused on impact, not private donor amounts.",
    tone: "warn",
  },
  {
    title: "Volunteer certificates",
    kicker: "Feature 05",
    description:
      "Completed relief work can turn into verified contribution records and appreciation certificates for volunteers after NGO confirmation.",
    tone: "safe",
  },
  {
    title: "Live map coordination",
    kicker: "Feature 06",
    description:
      "LocationIQ interactive map views will show crisis areas, task pins, NGO hubs, donors, and nearby responders without blocking the MVP when no key is configured.",
    tone: "info",
  },
] as const;

export const activeCrises: Crisis[] = [
  {
    id: "vikas-nagar-fire-relief",
    title: "Vikas Nagar Fire Relief",
    type: "fire",
    status: "active",
    riskLevel: "yellow",
    location: {
      city: "Lucknow",
      state: "Uttar Pradesh",
      address: "Vikas Nagar camp cluster",
      lat: 26.89,
      lng: 80.96,
    },
    summary:
      "Short-notice relief camp responding to a dense residential fire with shelter, food packets, and medicine needs.",
    description:
      "Short-notice relief camp responding to a dense residential fire with shelter, food packets, medicine support, and family registration needs.",
    createdAt: "2026-04-18T09:00:00.000Z",
    updatedAt: "18 min ago",
    verified: true,
    familiesAffected: 128,
    needs: ["food", "blankets", "medicine", "temporary shelter"],
    urgentNeeds: ["food", "blankets", "medicine", "temporary shelter"],
    requiredResources: [
      "food packets",
      "clothes",
      "blankets",
      "medicines",
      "hygiene kits",
      "temporary shelter kits",
    ],
    suggestedSkills: [
      "first-aid",
      "food distribution",
      "camp coordination",
      "burn-care support",
      "local language support",
    ],
    matchedVolunteers: 19,
    openTasks: 7,
    contactPerson: "Asha Verma",
  },
  {
    id: "kerala-flood-relief",
    title: "Kerala Flood Relief",
    type: "flood",
    status: "active",
    riskLevel: "red",
    location: {
      city: "Aluva",
      state: "Kerala",
      address: "Riverbank support corridor",
      lat: 10.11,
      lng: 76.35,
    },
    summary:
      "Flood response hub coordinating boats, shelter, dry ration, and supervised water-entry support near affected river settlements.",
    description:
      "Flood response hub coordinating boats, shelter, dry ration, ORS, and supervised water-entry support near affected river settlements.",
    createdAt: "2026-04-17T14:30:00.000Z",
    updatedAt: "32 min ago",
    verified: true,
    familiesAffected: 346,
    needs: ["boats", "dry food", "ORS", "life jackets"],
    urgentNeeds: ["boats", "dry food", "ORS", "life jackets"],
    requiredResources: [
      "life jackets",
      "dry food",
      "water",
      "ORS",
      "medicines",
      "shelter kits",
    ],
    suggestedSkills: [
      "water rescue",
      "swimming",
      "first-aid",
      "boat handling",
      "local language support",
    ],
    matchedVolunteers: 24,
    openTasks: 9,
    contactPerson: "Joseph Mathew",
  },
  {
    id: "hill-landslide-relief",
    title: "Hill Landslide Relief",
    type: "landslide",
    status: "stabilizing",
    riskLevel: "yellow",
    location: {
      city: "Mandi",
      state: "Himachal Pradesh",
      address: "Upper slope access road",
      lat: 31.71,
      lng: 76.93,
    },
    summary:
      "Road-blocked hillside settlement requiring off-road vehicles, ropes, first-aid, and controlled logistics support.",
    description:
      "Road-blocked hillside settlement requiring off-road vehicles, ropes, first-aid, local guides, and controlled logistics support.",
    createdAt: "2026-04-16T06:45:00.000Z",
    updatedAt: "54 min ago",
    verified: true,
    familiesAffected: 82,
    needs: ["4x4 vehicles", "medical transport", "ropes", "tarpaulins"],
    urgentNeeds: ["4x4 vehicles", "medical transport", "ropes", "tarpaulins"],
    requiredResources: [
      "ropes",
      "medical supplies",
      "tarpaulins",
      "dry food",
      "water",
      "flashlights",
    ],
    suggestedSkills: [
      "terrain driving",
      "local guidance",
      "first-aid",
      "logistics coordination",
      "drone operation",
    ],
    matchedVolunteers: 14,
    openTasks: 5,
    contactPerson: "Meera Thakur",
  },
];

export const crisisNgoProfiles: Record<string, NGOProfile> = {
  "vikas-nagar-fire-relief": {
    id: "ngo-rahat-seva-trust",
    organizationName: "Rahat Seva Trust",
    registrationNumber: "RST-LKO-2021-114",
    focusAreas: ["fire relief", "camp support", "family registration"],
    contactName: "Asha Verma",
    email: "ops@rahatseva.org",
    phone: "+91 90000 10001",
    location: {
      lat: 26.8907,
      lng: 80.9608,
      address: "Lucknow response desk, Vikas Nagar",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    createdAt: "2026-04-10T08:00:00.000Z",
    updatedAt: "2026-04-20T10:05:00.000Z",
    status: "active",
    verified: true,
  },
  "kerala-flood-relief": {
    id: "ngo-river-relief-collective",
    organizationName: "Kerala River Relief Collective",
    registrationNumber: "KRRC-ALV-2020-238",
    focusAreas: ["flood response", "boat logistics", "medical access"],
    contactName: "Joseph Mathew",
    email: "control@krrc.org",
    phone: "+91 90000 10002",
    location: {
      lat: 10.1115,
      lng: 76.3484,
      address: "Aluva river response hub",
      city: "Aluva",
      state: "Kerala",
    },
    createdAt: "2026-04-08T09:30:00.000Z",
    updatedAt: "2026-04-20T09:35:00.000Z",
    status: "active",
    verified: true,
  },
  "hill-landslide-relief": {
    id: "ngo-mountain-aid-network",
    organizationName: "Mountain Aid Network",
    registrationNumber: "MAN-MND-2019-072",
    focusAreas: ["landslide support", "terrain logistics", "medical relay"],
    contactName: "Meera Thakur",
    email: "field@mountainaid.in",
    phone: "+91 90000 10003",
    location: {
      lat: 31.7118,
      lng: 76.9317,
      address: "Mandi slope response base",
      city: "Mandi",
      state: "Himachal Pradesh",
    },
    createdAt: "2026-04-07T07:20:00.000Z",
    updatedAt: "2026-04-20T08:15:00.000Z",
    status: "active",
    verified: true,
  },
};

export const tasks: ReliefTask[] = [
  {
    id: "task-fire-food-distribution",
    crisisId: "vikas-nagar-fire-relief",
    title: "Food distribution near temporary camp",
    location: {
      lat: 26.891,
      lng: 80.961,
      address: "Lucknow relief camp lane",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    status: "open",
    riskLevel: "green",
    volunteersNeeded: 8,
    assignedCount: 3,
    assignedVolunteerIds: ["vol-ravi-kumar"],
    requiredSkills: ["food distribution", "Hindi"],
    requiredAssets: ["bike", "car"],
    window: "4:00 PM to 7:00 PM",
    locationLabel: "Lucknow relief camp lane",
    createdAt: "2026-04-19T07:45:00.000Z",
    updatedAt: "2026-04-20T10:12:00.000Z",
    verified: true,
  },
  {
    id: "task-fire-medicine-run",
    crisisId: "vikas-nagar-fire-relief",
    title: "Medicine restock and triage support",
    location: {
      lat: 26.892,
      lng: 80.958,
      address: "NGO hub to clinic corridor",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    status: "assigned",
    riskLevel: "yellow",
    volunteersNeeded: 4,
    assignedCount: 2,
    assignedVolunteerIds: ["vol-sana-fatima"],
    requiredSkills: ["first-aid", "coordination"],
    requiredAssets: ["car", "medical kit"],
    window: "5:30 PM to 8:00 PM",
    locationLabel: "NGO hub to clinic corridor",
    createdAt: "2026-04-19T08:10:00.000Z",
    updatedAt: "2026-04-20T10:18:00.000Z",
    verified: true,
  },
  {
    id: "task-flood-boat-evac",
    crisisId: "kerala-flood-relief",
    title: "Boat-supported supply transfer",
    location: {
      lat: 10.113,
      lng: 76.349,
      address: "Aluva riverside sector",
      city: "Aluva",
      state: "Kerala",
    },
    status: "open",
    riskLevel: "red",
    volunteersNeeded: 5,
    assignedCount: 1,
    assignedVolunteerIds: ["vol-aneesh-jose"],
    requiredSkills: ["water rescue", "local language"],
    requiredAssets: ["boat", "life jacket"],
    window: "Immediate",
    locationLabel: "Aluva riverside sector",
    createdAt: "2026-04-18T16:20:00.000Z",
    updatedAt: "2026-04-20T09:52:00.000Z",
    verified: true,
  },
  {
    id: "task-landslide-road-link",
    crisisId: "hill-landslide-relief",
    title: "Off-road medical transport relay",
    location: {
      lat: 31.713,
      lng: 76.931,
      address: "Mandi upper slope access",
      city: "Mandi",
      state: "Himachal Pradesh",
    },
    status: "in-progress",
    riskLevel: "yellow",
    volunteersNeeded: 3,
    assignedCount: 2,
    assignedVolunteerIds: ["vol-meera-thakur"],
    requiredSkills: ["terrain driving", "first-aid"],
    requiredAssets: ["4x4 vehicle", "rope kit"],
    window: "6:00 AM to 11:00 AM",
    locationLabel: "Mandi upper slope access",
    createdAt: "2026-04-18T05:30:00.000Z",
    updatedAt: "2026-04-20T08:40:00.000Z",
    verified: true,
  },
];

export const volunteers: VolunteerProfile[] = [
  {
    id: "vol-ravi-kumar",
    role: "volunteer",
    name: "Ravi Kumar",
    roleTitle: "First-aid volunteer",
    city: "Lucknow",
    location: {
      lat: 26.885,
      lng: 80.951,
      address: "Lucknow volunteer base",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    distanceKm: 1.8,
    skills: ["first-aid", "food distribution", "Hindi"],
    assets: ["bike"],
    languages: ["Hindi", "English"],
    availability: "available_now",
    availableTime: "Daily 6 AM - 9 PM",
    emergencyAvailable: true,
    createdAt: "2026-03-28T09:10:00.000Z",
    updatedAt: "2026-04-20T07:10:00.000Z",
    status: "active",
    verified: true,
    responseRate: "92%",
  },
  {
    id: "vol-aneesh-jose",
    role: "volunteer",
    name: "Aneesh Jose",
    roleTitle: "Boat owner and swimmer",
    city: "Aluva",
    location: {
      lat: 10.115,
      lng: 76.343,
      address: "Aluva river access point",
      city: "Aluva",
      state: "Kerala",
    },
    distanceKm: 2.6,
    skills: ["water rescue", "Malayalam", "logistics"],
    assets: ["boat"],
    languages: ["Malayalam", "English"],
    availability: "available_now",
    availableTime: "Rapid deploy for the next 12 hours",
    emergencyAvailable: true,
    createdAt: "2026-03-22T11:00:00.000Z",
    updatedAt: "2026-04-20T06:48:00.000Z",
    status: "active",
    verified: true,
    responseRate: "96%",
  },
  {
    id: "vol-meera-thakur",
    role: "volunteer",
    name: "Meera Thakur",
    roleTitle: "Mountain logistics lead",
    city: "Mandi",
    location: {
      lat: 31.709,
      lng: 76.928,
      address: "Mandi terrain support garage",
      city: "Mandi",
      state: "Himachal Pradesh",
    },
    distanceKm: 4.1,
    skills: ["terrain driving", "local guidance", "first-aid"],
    assets: ["4x4 vehicle"],
    languages: ["Hindi", "Pahari"],
    availability: "scheduled",
    availableTime: "Today until 8 PM",
    emergencyAvailable: true,
    createdAt: "2026-03-25T08:20:00.000Z",
    updatedAt: "2026-04-20T05:35:00.000Z",
    status: "active",
    verified: true,
    responseRate: "88%",
  },
  {
    id: "vol-sana-fatima",
    role: "volunteer",
    name: "Sana Fatima",
    roleTitle: "Shelter and camp coordinator",
    city: "Lucknow",
    location: {
      lat: 26.894,
      lng: 80.947,
      address: "Lucknow shelter coordination desk",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    distanceKm: 3.2,
    skills: ["camp support", "shelter onboarding", "Hindi"],
    assets: ["car"],
    languages: ["Hindi", "Urdu", "English"],
    availability: "limited",
    availableTime: "Evening shift after 6 PM",
    emergencyAvailable: false,
    createdAt: "2026-03-30T13:40:00.000Z",
    updatedAt: "2026-04-19T19:20:00.000Z",
    status: "pending",
    verified: false,
    responseRate: "81%",
  },
];

export const resourceNeeds: ResourceNeed[] = [
  {
    id: "need-fire-food",
    crisisId: "vikas-nagar-fire-relief",
    label: "Food packets",
    location: {
      lat: 26.8905,
      lng: 80.9601,
      address: "Lucknow camp kitchen",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    quantityNeeded: 500,
    quantityPledged: 320,
    urgency: "critical",
    deadline: "Tonight",
    locationLabel: "Lucknow camp kitchen",
    providerHint: "Community kitchens and food donors",
    createdAt: "2026-04-19T07:30:00.000Z",
    updatedAt: "2026-04-20T10:05:00.000Z",
    status: "partially-fulfilled",
    verified: true,
  },
  {
    id: "need-fire-shelter",
    crisisId: "vikas-nagar-fire-relief",
    label: "Family shelter kits",
    location: {
      lat: 26.8912,
      lng: 80.9623,
      address: "Transit shelter tent line",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    quantityNeeded: 120,
    quantityPledged: 66,
    urgency: "high",
    deadline: "Within 24 hours",
    locationLabel: "Transit shelter tent line",
    providerHint: "Tents, tarpaulins, and bedding providers",
    createdAt: "2026-04-19T08:00:00.000Z",
    updatedAt: "2026-04-20T09:55:00.000Z",
    status: "partially-fulfilled",
    verified: true,
  },
  {
    id: "need-flood-ors",
    crisisId: "kerala-flood-relief",
    label: "ORS and medicine packs",
    location: {
      lat: 10.112,
      lng: 76.347,
      address: "Aluva health station",
      city: "Aluva",
      state: "Kerala",
    },
    quantityNeeded: 300,
    quantityPledged: 118,
    urgency: "critical",
    deadline: "Within 8 hours",
    locationLabel: "Aluva health station",
    providerHint: "Pharmacy partners and medical donors",
    createdAt: "2026-04-18T17:10:00.000Z",
    updatedAt: "2026-04-20T09:35:00.000Z",
    status: "open",
    verified: true,
  },
  {
    id: "need-landslide-transport",
    crisisId: "hill-landslide-relief",
    label: "Off-road transport slots",
    location: {
      lat: 31.712,
      lng: 76.932,
      address: "Mandi slope road",
      city: "Mandi",
      state: "Himachal Pradesh",
    },
    quantityNeeded: 12,
    quantityPledged: 7,
    urgency: "high",
    deadline: "Tomorrow morning",
    locationLabel: "Mandi slope road",
    providerHint: "4x4 owners and medical transport crews",
    createdAt: "2026-04-18T06:00:00.000Z",
    updatedAt: "2026-04-20T08:15:00.000Z",
    status: "partially-fulfilled",
    verified: true,
  },
];

export const resourcePledges: ResourcePledge[] = [
  {
    id: "pledge-fire-food-001",
    crisisId: "vikas-nagar-fire-relief",
    resourceNeedId: "need-fire-food",
    donorId: "donor-community-kitchen",
    itemType: "food packets",
    quantity: 180,
    location: {
      lat: 26.8905,
      lng: 80.9601,
      address: "Lucknow camp kitchen",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    createdAt: "2026-04-19T10:00:00.000Z",
    updatedAt: "2026-04-20T09:20:00.000Z",
    status: "fulfilled",
    verified: true,
  },
  {
    id: "pledge-fire-food-002",
    crisisId: "vikas-nagar-fire-relief",
    resourceNeedId: "need-fire-food",
    donorId: "donor-lucknow-civic-group",
    itemType: "food packets",
    quantity: 140,
    location: {
      lat: 26.8905,
      lng: 80.9601,
      address: "Lucknow camp kitchen",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    createdAt: "2026-04-19T13:10:00.000Z",
    updatedAt: "2026-04-20T09:45:00.000Z",
    status: "verified",
    verified: true,
  },
  {
    id: "pledge-fire-medicine-001",
    crisisId: "vikas-nagar-fire-relief",
    resourceNeedId: "impact-fire-medicine",
    donorId: "donor-burn-care-network",
    itemType: "medicine kits",
    quantity: 74,
    location: {
      lat: 26.8919,
      lng: 80.9589,
      address: "Lucknow clinic corridor",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    createdAt: "2026-04-19T15:20:00.000Z",
    updatedAt: "2026-04-20T08:55:00.000Z",
    status: "fulfilled",
    verified: true,
  },
  {
    id: "pledge-fire-shelter-001",
    crisisId: "vikas-nagar-fire-relief",
    resourceNeedId: "need-fire-shelter",
    donorId: "donor-shelter-partners",
    itemType: "shelter kits",
    quantity: 43,
    location: {
      lat: 26.8912,
      lng: 80.9623,
      address: "Transit shelter tent line",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    createdAt: "2026-04-19T16:30:00.000Z",
    updatedAt: "2026-04-20T09:05:00.000Z",
    status: "fulfilled",
    verified: true,
  },
  {
    id: "pledge-fire-shelter-002",
    crisisId: "vikas-nagar-fire-relief",
    resourceNeedId: "need-fire-shelter",
    donorId: "donor-night-relief-circle",
    itemType: "shelter kits",
    quantity: 23,
    location: {
      lat: 26.8912,
      lng: 80.9623,
      address: "Transit shelter tent line",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    createdAt: "2026-04-19T18:00:00.000Z",
    updatedAt: "2026-04-20T09:42:00.000Z",
    status: "verified",
    verified: true,
  },
  {
    id: "pledge-flood-food-001",
    crisisId: "kerala-flood-relief",
    resourceNeedId: "impact-flood-food",
    donorId: "donor-river-kitchen",
    itemType: "food packets",
    quantity: 260,
    location: {
      lat: 10.1118,
      lng: 76.3471,
      address: "Aluva dry ration dock",
      city: "Aluva",
      state: "Kerala",
    },
    createdAt: "2026-04-19T07:10:00.000Z",
    updatedAt: "2026-04-20T08:40:00.000Z",
    status: "fulfilled",
    verified: true,
  },
  {
    id: "pledge-flood-food-002",
    crisisId: "kerala-flood-relief",
    resourceNeedId: "impact-flood-food",
    donorId: "donor-civic-supply-chain",
    itemType: "food packets",
    quantity: 120,
    location: {
      lat: 10.1118,
      lng: 76.3471,
      address: "Aluva dry ration dock",
      city: "Aluva",
      state: "Kerala",
    },
    createdAt: "2026-04-19T11:40:00.000Z",
    updatedAt: "2026-04-20T09:10:00.000Z",
    status: "verified",
    verified: true,
  },
  {
    id: "pledge-flood-medicine-001",
    crisisId: "kerala-flood-relief",
    resourceNeedId: "need-flood-ors",
    donorId: "donor-medical-relay",
    itemType: "medicine kits",
    quantity: 64,
    location: {
      lat: 10.112,
      lng: 76.347,
      address: "Aluva health station",
      city: "Aluva",
      state: "Kerala",
    },
    createdAt: "2026-04-19T14:20:00.000Z",
    updatedAt: "2026-04-20T08:32:00.000Z",
    status: "fulfilled",
    verified: true,
  },
  {
    id: "pledge-flood-medicine-002",
    crisisId: "kerala-flood-relief",
    resourceNeedId: "need-flood-ors",
    donorId: "donor-pharma-support",
    itemType: "medicine kits",
    quantity: 54,
    location: {
      lat: 10.112,
      lng: 76.347,
      address: "Aluva health station",
      city: "Aluva",
      state: "Kerala",
    },
    createdAt: "2026-04-19T18:15:00.000Z",
    updatedAt: "2026-04-20T08:58:00.000Z",
    status: "verified",
    verified: true,
  },
  {
    id: "pledge-flood-shelter-001",
    crisisId: "kerala-flood-relief",
    resourceNeedId: "impact-flood-shelter",
    donorId: "donor-camp-coalition",
    itemType: "shelter kits",
    quantity: 86,
    location: {
      lat: 10.1109,
      lng: 76.3484,
      address: "Aluva shelter command point",
      city: "Aluva",
      state: "Kerala",
    },
    createdAt: "2026-04-19T20:05:00.000Z",
    updatedAt: "2026-04-20T09:22:00.000Z",
    status: "fulfilled",
    verified: true,
  },
  {
    id: "pledge-landslide-food-001",
    crisisId: "hill-landslide-relief",
    resourceNeedId: "impact-landslide-food",
    donorId: "donor-hill-kitchen",
    itemType: "food packets",
    quantity: 36,
    location: {
      lat: 31.7124,
      lng: 76.9319,
      address: "Mandi slope ration drop",
      city: "Mandi",
      state: "Himachal Pradesh",
    },
    createdAt: "2026-04-18T09:00:00.000Z",
    updatedAt: "2026-04-20T07:50:00.000Z",
    status: "fulfilled",
    verified: true,
  },
  {
    id: "pledge-landslide-food-002",
    crisisId: "hill-landslide-relief",
    resourceNeedId: "impact-landslide-food",
    donorId: "donor-roadside-support",
    itemType: "food packets",
    quantity: 18,
    location: {
      lat: 31.7124,
      lng: 76.9319,
      address: "Mandi slope ration drop",
      city: "Mandi",
      state: "Himachal Pradesh",
    },
    createdAt: "2026-04-18T11:20:00.000Z",
    updatedAt: "2026-04-20T08:10:00.000Z",
    status: "verified",
    verified: true,
  },
  {
    id: "pledge-landslide-medicine-001",
    crisisId: "hill-landslide-relief",
    resourceNeedId: "impact-landslide-medicine",
    donorId: "donor-mountain-medics",
    itemType: "medicine kits",
    quantity: 31,
    location: {
      lat: 31.713,
      lng: 76.931,
      address: "Mandi first-aid relay point",
      city: "Mandi",
      state: "Himachal Pradesh",
    },
    createdAt: "2026-04-18T12:40:00.000Z",
    updatedAt: "2026-04-20T08:18:00.000Z",
    status: "fulfilled",
    verified: true,
  },
  {
    id: "pledge-landslide-shelter-001",
    crisisId: "hill-landslide-relief",
    resourceNeedId: "impact-landslide-shelter",
    donorId: "donor-highland-camps",
    itemType: "shelter kits",
    quantity: 19,
    location: {
      lat: 31.7115,
      lng: 76.9322,
      address: "Mandi temporary shelter ridge",
      city: "Mandi",
      state: "Himachal Pradesh",
    },
    createdAt: "2026-04-18T14:10:00.000Z",
    updatedAt: "2026-04-20T08:05:00.000Z",
    status: "fulfilled",
    verified: true,
  },
];

export const certificates: Certificate[] = [
  {
    id: "cert-ravi-fire-001",
    volunteerId: "vol-ravi-kumar",
    taskId: "task-fire-food-distribution",
    crisisId: "vikas-nagar-fire-relief",
    volunteerName: "Ravi Kumar",
    ngoName: "Rahat Seva Trust",
    crisisTitle: "Vikas Nagar Fire Relief",
    taskTitle: "Food distribution near temporary camp",
    serviceDate: "2026-04-20",
    certificateId: "RS-2026-041",
    certificateNumber: "RS-2026-041",
    serviceHours: 6,
    verificationQrPlaceholder: "Verification QR placeholder for RS-2026-041",
    issuedAt: "2026-04-20T08:00:00.000Z",
    location: {
      lat: 26.891,
      lng: 80.961,
      address: "Lucknow relief camp lane",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    createdAt: "2026-04-20T08:00:00.000Z",
    updatedAt: "2026-04-20T08:00:00.000Z",
    status: "issued",
    verified: true,
  },
  {
    id: "cert-aneesh-flood-001",
    volunteerId: "vol-aneesh-jose",
    taskId: "task-flood-boat-evac",
    crisisId: "kerala-flood-relief",
    volunteerName: "Aneesh Jose",
    ngoName: "Kerala River Relief Collective",
    crisisTitle: "Kerala Flood Relief",
    taskTitle: "Boat-supported supply transfer",
    serviceDate: "2026-04-19",
    certificateId: "KRR-2026-018",
    certificateNumber: "KRR-2026-018",
    serviceHours: 9,
    verificationQrPlaceholder: "Verification QR placeholder for KRR-2026-018",
    issuedAt: "2026-04-19T17:30:00.000Z",
    location: {
      lat: 10.113,
      lng: 76.349,
      address: "Aluva riverside sector",
      city: "Aluva",
      state: "Kerala",
    },
    createdAt: "2026-04-19T17:30:00.000Z",
    updatedAt: "2026-04-19T17:30:00.000Z",
    status: "issued",
    verified: true,
  },
  {
    id: "cert-meera-landslide-001",
    volunteerId: "vol-meera-thakur",
    taskId: "task-landslide-road-link",
    crisisId: "hill-landslide-relief",
    volunteerName: "Meera Thakur",
    ngoName: "Mountain Aid Network",
    crisisTitle: "Hill Landslide Relief",
    taskTitle: "Off-road medical transport relay",
    serviceDate: "2026-04-18",
    certificateId: "MAN-2026-006",
    certificateNumber: "MAN-2026-006",
    serviceHours: 5,
    verificationQrPlaceholder: "Verification QR placeholder for MAN-2026-006",
    issuedAt: "2026-04-18T13:00:00.000Z",
    location: {
      lat: 31.713,
      lng: 76.931,
      address: "Mandi upper slope access",
      city: "Mandi",
      state: "Himachal Pradesh",
    },
    createdAt: "2026-04-18T13:00:00.000Z",
    updatedAt: "2026-04-18T13:00:00.000Z",
    status: "issued",
    verified: true,
  },
];

export const landingMapMarkers: MapMarker[] = [
  { label: "NGO hub", x: 24, y: 34, tone: "neutral" },
  { label: "Camp", x: 44, y: 54, tone: "warn" },
  { label: "Volunteer", x: 63, y: 38, tone: "safe" },
  { label: "Donor", x: 76, y: 62, tone: "info" },
];

export const crisisMapMarkers: Record<string, MapMarker[]> = {
  "vikas-nagar-fire-relief": [
    { label: "NGO HQ", x: 24, y: 30, tone: "neutral" },
    { label: "Camp", x: 47, y: 52, tone: "warn" },
    { label: "Volunteer", x: 61, y: 36, tone: "safe" },
    { label: "Clinic", x: 72, y: 60, tone: "alert" },
  ],
  "kerala-flood-relief": [
    { label: "Boat team", x: 26, y: 40, tone: "safe" },
    { label: "Shelter", x: 50, y: 22, tone: "neutral" },
    { label: "Flood edge", x: 60, y: 56, tone: "alert" },
    { label: "Supply van", x: 78, y: 38, tone: "warn" },
  ],
  "hill-landslide-relief": [
    { label: "4x4 team", x: 31, y: 62, tone: "warn" },
    { label: "Slope camp", x: 50, y: 28, tone: "neutral" },
    { label: "Medical", x: 68, y: 44, tone: "safe" },
    { label: "Blocked road", x: 82, y: 58, tone: "alert" },
  ],
};

export const ngoStats: DashboardStat[] = [
  {
    label: "Active crises",
    value: "3",
    change: "+1 today",
    helper: "One new room spun up for fire relief in the last 24 hours.",
    tone: "warn",
  },
  {
    label: "Open tasks",
    value: "21",
    change: "8 urgent",
    helper: "Task load is weighted toward logistics, shelter, and first-aid support.",
    tone: "alert",
  },
  {
    label: "Volunteer matches",
    value: "57",
    change: "AI queue ready",
    helper: "Nearby responders and asset owners are already visible in the shortlist.",
    tone: "safe",
  },
  {
    label: "Resource pledges",
    value: "196",
    change: "68% filled",
    helper: "Public board shows quantity progress without exposing private donor amounts.",
    tone: "neutral",
  },
  {
    label: "Families helped",
    value: "556",
    change: "rolling total",
    helper: "Impact cards are framed for demo storytelling and crisis reporting.",
    tone: "info",
  },
];

export const ngoRecentMatches: VolunteerMatch[] = [
  {
    id: "match-ravi-fire-food",
    crisisId: "vikas-nagar-fire-relief",
    taskId: "task-fire-food-distribution",
    volunteerId: "vol-ravi-kumar",
    score: 94,
    reasons: ["1.8 km away", "Matches first-aid", "Available now"],
    distanceKm: 1.8,
    location: {
      lat: 26.891,
      lng: 80.961,
      address: "Lucknow relief camp lane",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    createdAt: "2026-04-20T08:45:00.000Z",
    updatedAt: "2026-04-20T09:10:00.000Z",
    status: "accepted",
    verified: true,
  },
  {
    id: "match-ravi-fire-medicine-request",
    crisisId: "vikas-nagar-fire-relief",
    taskId: "task-fire-medicine-run",
    volunteerId: "vol-ravi-kumar",
    score: 88,
    reasons: ["2.4 km away", "Matches coordination skill", "Available now"],
    distanceKm: 2.4,
    location: {
      lat: 26.892,
      lng: 80.958,
      address: "NGO hub to clinic corridor",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    createdAt: "2026-04-20T08:30:00.000Z",
    updatedAt: "2026-04-20T08:58:00.000Z",
    status: "assigned",
    verified: false,
  },
  {
    id: "match-sana-fire-medicine",
    crisisId: "vikas-nagar-fire-relief",
    taskId: "task-fire-medicine-run",
    volunteerId: "vol-sana-fatima",
    score: 81,
    reasons: ["Has car", "Shelter coordination experience", "Nearby city response"],
    distanceKm: 3.2,
    location: {
      lat: 26.892,
      lng: 80.958,
      address: "NGO hub to clinic corridor",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    createdAt: "2026-04-20T08:25:00.000Z",
    updatedAt: "2026-04-20T08:55:00.000Z",
    status: "assigned",
    verified: false,
  },
  {
    id: "match-aneesh-flood-boat",
    crisisId: "kerala-flood-relief",
    taskId: "task-flood-boat-evac",
    volunteerId: "vol-aneesh-jose",
    score: 98,
    reasons: ["Boat owner", "Water rescue skill", "Malayalam support"],
    distanceKm: 2.6,
    location: {
      lat: 10.113,
      lng: 76.349,
      address: "Aluva riverside sector",
      city: "Aluva",
      state: "Kerala",
    },
    createdAt: "2026-04-20T07:50:00.000Z",
    updatedAt: "2026-04-20T08:15:00.000Z",
    status: "accepted",
    verified: true,
  },
  {
    id: "match-meera-landslide-road",
    crisisId: "hill-landslide-relief",
    taskId: "task-landslide-road-link",
    volunteerId: "vol-meera-thakur",
    score: 96,
    reasons: ["4x4 vehicle", "Terrain driving", "Local guide"],
    distanceKm: 4.1,
    location: {
      lat: 31.713,
      lng: 76.931,
      address: "Mandi upper slope access",
      city: "Mandi",
      state: "Himachal Pradesh",
    },
    createdAt: "2026-04-20T06:40:00.000Z",
    updatedAt: "2026-04-20T07:20:00.000Z",
    status: "completed",
    verified: true,
  },
] as const;

export const ngoImpactHighlights = [
  {
    label: "Volunteer hours",
    value: "428",
    detail: "Verified support hours logged across three active crisis rooms.",
  },
  {
    label: "Pledges fulfilled",
    value: "72%",
    detail: "Most urgent food, ORS, and shelter needs are already moving toward closure.",
  },
  {
    label: "Response time",
    value: "14 min",
    detail: "Average time from task publish to first high-fit volunteer match.",
  },
  {
    label: "Certificates ready",
    value: "11",
    detail: "Completed and verified volunteer tasks now ready for certificate issuance.",
  },
] as const;

export const ngoImpactRows = [
  {
    crisisId: "vikas-nagar-fire-relief",
    familiesHelped: 128,
    volunteersActive: 19,
    tasksCompleted: 12,
    pledgedCoverage: "78%",
  },
  {
    crisisId: "kerala-flood-relief",
    familiesHelped: 346,
    volunteersActive: 24,
    tasksCompleted: 9,
    pledgedCoverage: "61%",
  },
  {
    crisisId: "hill-landslide-relief",
    familiesHelped: 82,
    volunteersActive: 14,
    tasksCompleted: 7,
    pledgedCoverage: "58%",
  },
] as const;

export const volunteerStats: DashboardStat[] = [
  {
    label: "Nearby tasks",
    value: "6",
    change: "2 safe now",
    helper: "Green and yellow tasks appear first to keep onboarding simple.",
    tone: "safe",
  },
  {
    label: "Assigned tasks",
    value: "2",
    change: "1 in progress",
    helper: "Role view is ready for accept and decline flows in the next build step.",
    tone: "neutral",
  },
  {
    label: "Completed tasks",
    value: "4",
    change: "certificate-ready",
    helper: "This dashboard already leaves space for verified contribution records.",
    tone: "warn",
  },
  {
    label: "Response radius",
    value: "25 km",
    change: "editable",
    helper: "The placeholder map panel reflects how future radius logic will feel.",
    tone: "info",
  },
];

export const donorStats: DashboardStat[] = [
  {
    label: "Verified campaigns",
    value: "3",
    change: "all active",
    helper: "Only verified crisis rooms are surfaced in the donor-facing experience.",
    tone: "safe",
  },
  {
    label: "Open supply gaps",
    value: "11",
    change: "4 critical",
    helper: "Resource board emphasizes quantity remaining, not vague funding asks.",
    tone: "alert",
  },
  {
    label: "Pledges today",
    value: "38",
    change: "mock flow",
    helper: "The MVP uses static pledges now but keeps the experience payment-ready later.",
    tone: "neutral",
  },
  {
    label: "Impact tracked",
    value: "92%",
    change: "public totals only",
    helper: "Personal donor amounts stay private while campaign delivery stays visible.",
    tone: "info",
  },
];

export const adminStats: DashboardStat[] = [
  {
    label: "Pending NGO reviews",
    value: "5",
    change: "2 urgent",
    helper: "Admin approval is intentionally lightweight for the MVP shell.",
    tone: "warn",
  },
  {
    label: "Volunteer checks",
    value: "12",
    change: "7 verified",
    helper: "Verification placeholders already shape the trust experience across pages.",
    tone: "safe",
  },
  {
    label: "Flagged reports",
    value: "3",
    change: "manual review",
    helper: "Suspicious or duplicate reports have a dedicated oversight space.",
    tone: "alert",
  },
  {
    label: "Red-risk tasks",
    value: "4",
    change: "needs approval",
    helper: "Safety-first messaging keeps high-risk missions visibly gated.",
    tone: "info",
  },
];

export const adminCrisisReports: CrisisReport[] = [
  {
    id: "report-flood-river-bridge",
    crisisId: "kerala-flood-relief",
    reporterName: "Latha Nair",
    reporterRole: "public",
    description:
      "Water has entered homes near the river bridge and two elderly residents may still be stranded on the first floor.",
    priority: "critical",
    needs: ["boat", "medical support", "dry food"],
    riskLevel: "red",
    location: {
      lat: 10.1124,
      lng: 76.3478,
      address: "River bridge lane, Aluva",
      city: "Aluva",
      state: "Kerala",
    },
    createdAt: "2026-04-20T09:05:00.000Z",
    updatedAt: "2026-04-20T09:12:00.000Z",
    status: "reviewing",
    verified: false,
  },
  {
    id: "report-fire-camp-duplicate",
    crisisId: "vikas-nagar-fire-relief",
    reporterName: "Rafiq Khan",
    reporterRole: "public",
    description:
      "Family shelter tents are still short near the camp kitchen and another food distribution point may be needed tonight.",
    priority: "high",
    needs: ["blankets", "food packets", "shelter"],
    riskLevel: "yellow",
    location: {
      lat: 26.8908,
      lng: 80.9604,
      address: "Camp kitchen lane, Lucknow",
      city: "Lucknow",
      state: "Uttar Pradesh",
    },
    createdAt: "2026-04-20T08:45:00.000Z",
    updatedAt: "2026-04-20T08:58:00.000Z",
    status: "submitted",
    verified: false,
  },
  {
    id: "report-landslide-road-warning",
    crisisId: "hill-landslide-relief",
    reporterName: "Pema Sharma",
    reporterRole: "public",
    description:
      "A second slope crack has appeared above the blocked road and small vehicles should not attempt to pass after dark.",
    priority: "high",
    needs: ["local guides", "flashlights", "road barriers"],
    riskLevel: "red",
    location: {
      lat: 31.7133,
      lng: 76.9314,
      address: "Upper slope access road, Mandi",
      city: "Mandi",
      state: "Himachal Pradesh",
    },
    createdAt: "2026-04-20T07:15:00.000Z",
    updatedAt: "2026-04-20T07:34:00.000Z",
    status: "reviewing",
    verified: false,
  },
];

const volunteerIdsByCrisis: Record<string, string[]> = {
  "vikas-nagar-fire-relief": ["vol-ravi-kumar", "vol-sana-fatima"],
  "kerala-flood-relief": ["vol-aneesh-jose", "vol-ravi-kumar"],
  "hill-landslide-relief": ["vol-meera-thakur", "vol-ravi-kumar"],
};

export function getCrisisById(id: string) {
  return activeCrises.find((crisis) => crisis.id === id);
}

export function getNGOProfileByCrisisId(crisisId: string) {
  return crisisNgoProfiles[crisisId];
}

export function getAllNGOProfiles() {
  return Object.values(crisisNgoProfiles);
}

export function getVolunteerById(id: string) {
  return volunteers.find((volunteer) => volunteer.id === id);
}

export function getTaskById(id: string) {
  return tasks.find((task) => task.id === id);
}

export function getTasksByCrisisId(crisisId: string) {
  return tasks.filter((task) => task.crisisId === crisisId);
}

export function getResourcesByCrisisId(crisisId: string) {
  return resourceNeeds.filter((need) => need.crisisId === crisisId);
}

export function getResourceNeedById(id: string) {
  return resourceNeeds.find((need) => need.id === id);
}

export function getVolunteersByCrisisId(crisisId: string) {
  const ids = volunteerIdsByCrisis[crisisId] ?? [];

  return volunteers.filter((volunteer) => ids.includes(volunteer.id));
}

export function getVolunteerMatchesByCrisisId(crisisId: string) {
  return ngoRecentMatches.filter((match) => match.crisisId === crisisId);
}

export function getResourcePledgesByCrisisId(crisisId: string) {
  return resourcePledges.filter((pledge) => pledge.crisisId === crisisId);
}

export function getCertificatesByVolunteerId(volunteerId: string) {
  return certificates.filter((certificate) => certificate.volunteerId === volunteerId);
}

export function getCertificatesByCrisisId(crisisId: string) {
  return certificates.filter((certificate) => certificate.crisisId === crisisId);
}

export function getCertificateById(id: string) {
  return certificates.find((certificate) => certificate.id === id);
}
