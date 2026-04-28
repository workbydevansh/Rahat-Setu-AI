import type { CrisisType } from "@/types";

export interface DisasterTemplate {
  suggestedSkills: string[];
  suggestedResources: string[];
  safePublicTasks: string[];
  riskyTasks: string[];
  defaultNeeds: string[];
  priorityAssets: string[];
}

export const disasterTemplates: Record<CrisisType, DisasterTemplate> = {
  fire: {
    suggestedSkills: [
      "first-aid",
      "food distribution",
      "camp coordination",
      "burn-care support",
      "local language support",
    ],
    suggestedResources: [
      "food packets",
      "clothes",
      "blankets",
      "medicines",
      "hygiene kits",
      "temporary shelter kits",
    ],
    safePublicTasks: [
      "food packing",
      "clothes sorting",
      "relief camp help desk support",
      "shelter kit distribution",
      "family registration support",
    ],
    riskyTasks: [
      "entry near active fire zone",
      "burn victim transport without medical supervision",
      "debris clearance in unstable structures",
      "crowd control near hazardous areas",
    ],
    defaultNeeds: [
      "food",
      "clothes",
      "shelter",
      "medicine",
      "hygiene kits",
    ],
    priorityAssets: [
      "car",
      "pickup truck",
      "medical kit",
      "temporary shelter space",
      "generator",
    ],
  },
  flood: {
    suggestedSkills: [
      "water rescue",
      "swimming",
      "first-aid",
      "boat handling",
      "local language support",
    ],
    suggestedResources: [
      "life jackets",
      "dry food",
      "water",
      "ORS",
      "medicines",
      "shelter kits",
    ],
    safePublicTasks: [
      "dry ration packing",
      "relief material sorting",
      "camp kitchen support",
      "shelter registration",
      "supply unloading in safe zones",
    ],
    riskyTasks: [
      "boat rescue in fast-moving water",
      "entering flooded homes",
      "night transport through waterlogged roads",
      "river-edge evacuation support",
    ],
    defaultNeeds: [
      "boats",
      "life jackets",
      "dry food",
      "ORS",
      "shelter",
    ],
    priorityAssets: [
      "boat",
      "life jacket",
      "rescue rope",
      "car",
      "medical kit",
    ],
  },
  landslide: {
    suggestedSkills: [
      "terrain driving",
      "local guidance",
      "first-aid",
      "logistics coordination",
      "drone operation",
    ],
    suggestedResources: [
      "ropes",
      "medical supplies",
      "tarpaulins",
      "dry food",
      "water",
      "flashlights",
    ],
    safePublicTasks: [
      "medical supply packing",
      "relief inventory support",
      "safe-zone shelter management",
      "route information coordination",
      "communications desk support",
    ],
    riskyTasks: [
      "movement on unstable slopes",
      "debris crossing without expert supervision",
      "vehicle access on damaged mountain roads",
      "search activity in slide-prone zones",
    ],
    defaultNeeds: [
      "off-road transport",
      "ropes",
      "first-aid",
      "local guides",
      "medical transport",
    ],
    priorityAssets: [
      "4x4 vehicle",
      "rope kit",
      "tractor",
      "drone",
      "medical kit",
    ],
  },
  earthquake: {
    suggestedSkills: [
      "first-aid",
      "doctor support",
      "structural assessment",
      "camp coordination",
      "blood donation coordination",
    ],
    suggestedResources: [
      "medical supplies",
      "blankets",
      "water",
      "shelter kits",
      "blood donation support",
      "lighting equipment",
    ],
    safePublicTasks: [
      "blanket distribution",
      "water distribution",
      "family registration",
      "camp setup support",
      "blood donor queue coordination",
    ],
    riskyTasks: [
      "entry into damaged buildings",
      "structural rescue without trained supervision",
      "aftershock-zone search operations",
      "debris removal in unstable areas",
    ],
    defaultNeeds: [
      "doctors",
      "first-aid",
      "structural engineers",
      "blood donors",
      "shelter",
    ],
    priorityAssets: [
      "medical kit",
      "ambulance access",
      "temporary shelter space",
      "generator",
      "pickup truck",
    ],
  },
  cyclone: {
    suggestedSkills: [
      "camp coordination",
      "logistics support",
      "first-aid",
      "power restoration support",
      "local language support",
    ],
    suggestedResources: [
      "shelter kits",
      "dry food",
      "water",
      "medicines",
      "power backup",
      "tarpaulins",
    ],
    safePublicTasks: [
      "shelter setup",
      "dry ration packing",
      "water distribution",
      "community kitchen support",
      "family check-in desk support",
    ],
    riskyTasks: [
      "movement through damaged power line areas",
      "coastal evacuation in severe weather",
      "road clearing during active storm impact",
      "boat movement in unsafe cyclone conditions",
    ],
    defaultNeeds: [
      "shelter",
      "dry food",
      "water",
      "medicines",
      "power backup",
    ],
    priorityAssets: [
      "temporary shelter space",
      "generator",
      "boat",
      "pickup truck",
      "medical kit",
    ],
  },
};

export function getTemplateByCrisisType(type: CrisisType) {
  return disasterTemplates[type];
}
