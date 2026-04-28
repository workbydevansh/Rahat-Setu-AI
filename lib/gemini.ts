import { getTemplateByCrisisType } from "@/lib/disasterTemplates";
import type { CrisisType, ReliefTask, VolunteerProfile } from "@/types";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type JsonSchema = Record<string, unknown>;

type ParsedCrisisType = CrisisType | "unknown";
type ParsedPriority = "low" | "medium" | "high" | "critical";
type ParsedRiskLevel = "green" | "yellow" | "red";
type ParsedAvailability = "available_now" | "limited" | "scheduled" | "unavailable";
type ParsedRiskComfort = "low" | "medium" | "high";

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export interface VolunteerProfileExtraction {
  skills: string[];
  languages: string[];
  assets: string[];
  availability: ParsedAvailability;
  riskComfort: ParsedRiskComfort;
}

export interface ParsedNGONeed {
  crisisType: ParsedCrisisType;
  requiredSkills: string[];
  requiredResources: string[];
  requiredAssets: string[];
  priority: ParsedPriority;
  riskLevel: ParsedRiskLevel;
}

export interface CrisisReportClassification {
  category: ParsedCrisisType;
  priority: ParsedPriority;
  needs: string[];
  safetyWarning: string;
  requiresVerification: boolean;
}

export const geminiPlaceholder = {
  label: "Gemini JSON layer",
  capabilities: [
    "Volunteer profile extraction",
    "NGO need parsing",
    "Crisis report classification",
    "Volunteer match explanation",
  ],
  note: "Uses Gemini when GEMINI_API_KEY is present and falls back to local heuristics otherwise.",
};

const languagePatterns = [
  { label: "Hindi", matches: [" hindi ", " speaks hindi", " speak hindi"] },
  { label: "English", matches: [" english ", " speaks english", " speak english"] },
  { label: "Urdu", matches: [" urdu ", " speaks urdu", " speak urdu"] },
  { label: "Malayalam", matches: [" malayalam "] },
  { label: "Tamil", matches: [" tamil "] },
  { label: "Telugu", matches: [" telugu "] },
  { label: "Kannada", matches: [" kannada "] },
  { label: "Marathi", matches: [" marathi "] },
  { label: "Gujarati", matches: [" gujarati "] },
  { label: "Punjabi", matches: [" punjabi "] },
  { label: "Bengali", matches: [" bengali ", " bangla "] },
  { label: "Odia", matches: [" odia ", " oriya "] },
  { label: "Assamese", matches: [" assamese "] },
  { label: "Nepali", matches: [" nepali "] },
  { label: "Pahari", matches: [" pahari "] },
];

const skillPatterns = [
  { label: "first-aid", matches: ["first aid", "first-aid", "triage"] },
  { label: "doctor support", matches: ["doctor", "physician", "medical officer"] },
  { label: "nursing", matches: ["nurse", "nursing"] },
  { label: "paramedic support", matches: ["paramedic", "emt"] },
  { label: "water rescue", matches: ["water rescue", "rescue swimmer"] },
  { label: "swimming", matches: ["swimmer", "swimming"] },
  { label: "boat handling", matches: ["boat handling", "boat operator", "fisherman", "fishermen"] },
  { label: "food distribution", matches: ["food distribution", "ration distribution"] },
  { label: "camp coordination", matches: ["camp coordination", "camp support", "shelter coordination"] },
  { label: "logistics coordination", matches: ["logistics", "dispatch", "supply chain"] },
  { label: "local guidance", matches: ["local guide", "local guidance"] },
  { label: "terrain driving", matches: ["terrain driving", "off-road driving", "4x4 driving"] },
  { label: "drone operation", matches: ["drone", "uav"] },
  { label: "translation", matches: ["translator", "translation", "interpretation"] },
  { label: "search and rescue", matches: ["search and rescue", "sar"] },
  { label: "structural assessment", matches: ["structural engineer", "structural assessment", "civil engineer"] },
  { label: "blood donation", matches: ["blood donor", "blood donation"] },
  { label: "counselling", matches: ["counselling", "counseling", "mental health"] },
  { label: "burn-care support", matches: ["burn care", "burn-care"] },
  { label: "local language support", matches: ["local language", "community translation"] },
];

const assetPatterns = [
  { label: "bike", matches: [" bike ", "bicycle"] },
  { label: "car", matches: [" car ", "car owner"] },
  { label: "pickup truck", matches: ["pickup truck", "pickup"] },
  { label: "4x4 vehicle", matches: ["4x4", "four wheel drive", "off-road vehicle"] },
  { label: "tractor", matches: [" tractor "] },
  { label: "boat", matches: [" boat ", "dinghy"] },
  { label: "shelter space", matches: ["shelter space", "spare room", "temporary shelter"] },
  { label: "medical kit", matches: ["medical kit", "first aid kit", "first-aid kit"] },
  { label: "generator", matches: [" generator ", "power backup"] },
  { label: "drone", matches: [" drone ", "uav"] },
  { label: "life jacket", matches: ["life jacket", "life jackets"] },
  { label: "rope kit", matches: ["rope kit", "ropes", "rope"] },
];

const resourcePatterns = [
  { label: "money", matches: ["fund", "funding", "cash", "money", "donation"] },
  { label: "food", matches: ["food", "meal", "ration"] },
  { label: "dry food", matches: ["dry food", "dry ration"] },
  { label: "clothes", matches: ["clothes", "clothing", "garments"] },
  { label: "medicine", matches: ["medicine", "medicines", "medication"] },
  { label: "water", matches: ["drinking water", "water"] },
  { label: "shelter", matches: ["shelter", "temporary shelter"] },
  { label: "hygiene kits", matches: ["hygiene kit", "hygiene kits", "sanitary kit"] },
  { label: "blankets", matches: ["blanket", "blankets"] },
  { label: "tarpaulins", matches: ["tarpaulin", "tarpaulins", "tarp"] },
  { label: "life jackets", matches: ["life jacket", "life jackets"] },
  { label: "ropes", matches: ["rope", "ropes"] },
  { label: "medical supplies", matches: ["medical supplies", "medical stock", "medical support"] },
  { label: "blood", matches: ["blood", "blood units"] },
  { label: "power backup", matches: ["power backup", "generator", "backup power"] },
  { label: "boats", matches: ["boats", "boat support"] },
  { label: "vehicle support", matches: ["vehicle", "transport vehicle", "pickup truck"] },
  { label: "ors", matches: ["ors", "oral rehydration"] },
];

const crisisPatterns: Array<{ label: ParsedCrisisType; matches: string[] }> = [
  { label: "fire", matches: ["fire", "blaze", "burning", "smoke"] },
  { label: "flood", matches: ["flood", "waterlogging", "submerged", "inundation"] },
  { label: "landslide", matches: ["landslide", "mudslide", "slope collapse", "hill slip"] },
  { label: "earthquake", matches: ["earthquake", "aftershock", "tremor", "collapsed building"] },
  { label: "cyclone", matches: ["cyclone", "storm surge", "hurricane", "typhoon"] },
];

function normalizeText(text: string) {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

function uniqueStrings(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
}

function coerceStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(value.filter((item): item is string => typeof item === "string"));
}

function detectMatches(
  text: string,
  patterns: Array<{ label: string; matches: string[] }>,
) {
  const normalizedText = normalizeText(text);

  return patterns
    .filter((entry) =>
      entry.matches.some((match) => normalizedText.includes(normalizeText(match))),
    )
    .map((entry) => entry.label);
}

function detectCrisisType(text: string): ParsedCrisisType {
  return (
    crisisPatterns.find((entry) =>
      entry.matches.some((match) => normalizeText(text).includes(normalizeText(match))),
    )?.label ?? "unknown"
  );
}

function detectAvailability(text: string): ParsedAvailability {
  const normalizedText = normalizeText(text);

  if (
    normalizedText.includes(" unavailable ") ||
    normalizedText.includes(" not available ") ||
    normalizedText.includes(" cannot help ")
  ) {
    return "unavailable";
  }

  if (
    normalizedText.includes(" available now ") ||
    normalizedText.includes(" immediately ") ||
    normalizedText.includes(" right now ") ||
    normalizedText.includes(" anytime ") ||
    normalizedText.includes(" 24 7 ")
  ) {
    return "available_now";
  }

  if (
    normalizedText.includes(" weekend ") ||
    normalizedText.includes(" evenings ") ||
    normalizedText.includes(" evening ") ||
    normalizedText.includes(" limited ") ||
    normalizedText.includes(" after work ") ||
    normalizedText.includes(" part time ")
  ) {
    return "limited";
  }

  if (
    normalizedText.includes(" scheduled ") ||
    normalizedText.includes(" shift ") ||
    normalizedText.includes(" from ") ||
    normalizedText.includes(" between ") ||
    normalizedText.includes(" morning ") ||
    normalizedText.includes(" afternoon ")
  ) {
    return "scheduled";
  }

  return "limited";
}

function detectRiskComfort(text: string): ParsedRiskComfort {
  const normalizedText = normalizeText(text);

  if (
    normalizedText.includes(" high risk ") ||
    normalizedText.includes(" red zone ") ||
    normalizedText.includes(" field deployment ") ||
    normalizedText.includes(" rescue ")
  ) {
    return "high";
  }

  if (
    normalizedText.includes(" moderate ") ||
    normalizedText.includes(" supervised ") ||
    normalizedText.includes(" medium risk ") ||
    normalizedText.includes(" yellow ")
  ) {
    return "medium";
  }

  return "low";
}

function detectPriority(text: string): ParsedPriority {
  const normalizedText = normalizeText(text);

  if (
    normalizedText.includes(" critical ") ||
    normalizedText.includes(" life threatening ") ||
    normalizedText.includes(" immediate ") ||
    normalizedText.includes(" urgent ")
  ) {
    return "critical";
  }

  if (
    normalizedText.includes(" high priority ") ||
    normalizedText.includes(" severe ") ||
    normalizedText.includes(" urgent support ")
  ) {
    return "high";
  }

  if (normalizedText.includes(" low priority ") || normalizedText.includes(" routine ")) {
    return "low";
  }

  return "medium";
}

function detectRiskLevel(text: string): ParsedRiskLevel {
  const normalizedText = normalizeText(text);

  if (
    normalizedText.includes(" red ") ||
    normalizedText.includes(" dangerous ") ||
    normalizedText.includes(" trapped ") ||
    normalizedText.includes(" rising water ") ||
    normalizedText.includes(" live wire ") ||
    normalizedText.includes(" spreading fire ")
  ) {
    return "red";
  }

  if (
    normalizedText.includes(" yellow ") ||
    normalizedText.includes(" unstable ") ||
    normalizedText.includes(" supervised ") ||
    normalizedText.includes(" caution ")
  ) {
    return "yellow";
  }

  return "green";
}

function crisisTypeToTemplate(type: ParsedCrisisType) {
  return type === "unknown" ? null : getTemplateByCrisisType(type);
}

function fallbackVolunteerProfileExtraction(text: string): VolunteerProfileExtraction {
  return {
    skills: detectMatches(text, skillPatterns),
    languages: detectMatches(text, languagePatterns),
    assets: detectMatches(text, assetPatterns),
    availability: detectAvailability(text),
    riskComfort: detectRiskComfort(text),
  };
}

function fallbackNGONeed(text: string): ParsedNGONeed {
  const crisisType = detectCrisisType(text);
  const template = crisisTypeToTemplate(crisisType);
  const requiredSkills = detectMatches(text, skillPatterns);
  const requiredResources = detectMatches(text, resourcePatterns);
  const requiredAssets = detectMatches(text, assetPatterns);

  return {
    crisisType,
    requiredSkills:
      requiredSkills.length > 0
        ? requiredSkills
        : template?.suggestedSkills.slice(0, 4) ?? [],
    requiredResources:
      requiredResources.length > 0
        ? requiredResources
        : template?.suggestedResources.slice(0, 5) ?? [],
    requiredAssets:
      requiredAssets.length > 0 ? requiredAssets : template?.priorityAssets.slice(0, 4) ?? [],
    priority: detectPriority(text),
    riskLevel: detectRiskLevel(text),
  };
}

function buildSafetyWarning(category: ParsedCrisisType, text: string) {
  const normalizedText = normalizeText(text);

  if (normalizedText.includes(" live wire ") || normalizedText.includes("electric")) {
    return "Possible electrical hazard. Keep volunteers away until local authorities confirm the area is safe.";
  }

  if (category === "fire") {
    return "Possible fire scene. Keep civilians away from smoke, gas leaks, and unstable structures until responders verify safety.";
  }

  if (category === "flood") {
    return "Possible flood zone. Avoid water entry without trained responders, flotation gear, and verified safe routes.";
  }

  if (category === "landslide") {
    return "Possible landslide zone. Stay clear of unstable slopes, rockfall areas, and blocked roads until verified.";
  }

  if (category === "earthquake") {
    return "Possible structural damage. Watch for aftershocks, falling debris, and unsafe buildings before sending volunteers in.";
  }

  if (category === "cyclone") {
    return "Possible cyclone impact. Avoid downed lines, flooded roads, and unstable shelter structures until conditions are verified.";
  }

  return "Treat this report as unverified until an NGO or local authority confirms the situation and safety conditions.";
}

function fallbackCrisisReportClassification(text: string): CrisisReportClassification {
  const category = detectCrisisType(text);
  const template = crisisTypeToTemplate(category);
  const needs = detectMatches(text, resourcePatterns);

  return {
    category,
    priority: detectPriority(text),
    needs: needs.length > 0 ? needs : template?.defaultNeeds.slice(0, 4) ?? [],
    safetyWarning: buildSafetyWarning(category, text),
    requiresVerification: true,
  };
}

function fallbackMatchExplanation(task: ReliefTask, volunteer: VolunteerProfile) {
  const matchingSkills = task.requiredSkills.filter((skill) =>
    volunteer.skills.some(
      (volunteerSkill) => volunteerSkill.toLowerCase() === skill.toLowerCase(),
    ),
  );
  const matchingAssets = task.requiredAssets.filter((asset) =>
    volunteer.assets.some(
      (volunteerAsset) => volunteerAsset.toLowerCase() === asset.toLowerCase(),
    ),
  );
  const explanationParts: string[] = [];

  if (matchingSkills.length > 0) {
    explanationParts.push(`matches ${matchingSkills.slice(0, 2).join(" and ")}`);
  }

  if (matchingAssets.length > 0) {
    explanationParts.push(`can bring ${matchingAssets.slice(0, 2).join(" and ")}`);
  }

  if (volunteer.availability === "available_now") {
    explanationParts.push("is available now");
  } else if (volunteer.availableTime) {
    explanationParts.push(`is available during ${volunteer.availableTime}`);
  }

  if (volunteer.verified) {
    explanationParts.push("is already verified");
  }

  if (explanationParts.length === 0) {
    return `${volunteer.name} is a reasonable fit for ${task.title} based on current profile data and availability.`;
  }

  return `${volunteer.name} is suitable for ${task.title} because the volunteer ${explanationParts.join(", ")}.`;
}

function cleanJsonText(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Gemini returned an empty JSON response.");
  }

  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    return withoutFence.trim();
  }

  return trimmed;
}

function getResponseText(response: GeminiApiResponse) {
  const text = response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error(response.error?.message || "Gemini returned no usable text.");
  }

  return text;
}

async function callGeminiJson<T>({
  prompt,
  schema,
  systemInstruction,
}: {
  prompt: string;
  schema: JsonSchema;
  systemInstruction: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [
          {
            text: `${systemInstruction} Respond with JSON only.`,
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        temperature: 0.2,
      },
    }),
    cache: "no-store",
  });

  const responseData = (await response.json()) as GeminiApiResponse;

  if (!response.ok) {
    throw new Error(
      responseData.error?.message || "Gemini API request failed.",
    );
  }

  const responseText = cleanJsonText(getResponseText(responseData));

  return JSON.parse(responseText) as T;
}

function sanitizeVolunteerProfileExtraction(
  value: unknown,
  fallback: VolunteerProfileExtraction,
): VolunteerProfileExtraction {
  const record = typeof value === "object" && value !== null ? value : {};
  const availabilityValue =
    typeof (record as { availability?: unknown }).availability === "string"
      ? (record as { availability: string }).availability
      : fallback.availability;
  const riskComfortValue =
    typeof (record as { riskComfort?: unknown }).riskComfort === "string"
      ? (record as { riskComfort: string }).riskComfort
      : fallback.riskComfort;
  const availability = (
    ["available_now", "limited", "scheduled", "unavailable"] as const
  ).includes(availabilityValue as ParsedAvailability)
    ? (availabilityValue as ParsedAvailability)
    : fallback.availability;
  const riskComfort = (["low", "medium", "high"] as const).includes(
    riskComfortValue as ParsedRiskComfort,
  )
    ? (riskComfortValue as ParsedRiskComfort)
    : fallback.riskComfort;

  return {
    skills: coerceStringArray((record as { skills?: unknown }).skills),
    languages: coerceStringArray((record as { languages?: unknown }).languages),
    assets: coerceStringArray((record as { assets?: unknown }).assets),
    availability,
    riskComfort,
  };
}

function sanitizeNGONeed(value: unknown, fallback: ParsedNGONeed): ParsedNGONeed {
  const record = typeof value === "object" && value !== null ? value : {};
  const crisisTypeValue =
    typeof (record as { crisisType?: unknown }).crisisType === "string"
      ? (record as { crisisType: string }).crisisType
      : fallback.crisisType;
  const priorityValue =
    typeof (record as { priority?: unknown }).priority === "string"
      ? (record as { priority: string }).priority
      : fallback.priority;
  const riskLevelValue =
    typeof (record as { riskLevel?: unknown }).riskLevel === "string"
      ? (record as { riskLevel: string }).riskLevel
      : fallback.riskLevel;

  return {
    crisisType: (
      ["fire", "flood", "landslide", "earthquake", "cyclone", "unknown"] as const
    ).includes(crisisTypeValue as ParsedCrisisType)
      ? (crisisTypeValue as ParsedCrisisType)
      : fallback.crisisType,
    requiredSkills:
      coerceStringArray((record as { requiredSkills?: unknown }).requiredSkills).length > 0
        ? coerceStringArray((record as { requiredSkills?: unknown }).requiredSkills)
        : fallback.requiredSkills,
    requiredResources:
      coerceStringArray((record as { requiredResources?: unknown }).requiredResources).length >
      0
        ? coerceStringArray(
            (record as { requiredResources?: unknown }).requiredResources,
          )
        : fallback.requiredResources,
    requiredAssets:
      coerceStringArray((record as { requiredAssets?: unknown }).requiredAssets).length > 0
        ? coerceStringArray((record as { requiredAssets?: unknown }).requiredAssets)
        : fallback.requiredAssets,
    priority: (["low", "medium", "high", "critical"] as const).includes(
      priorityValue as ParsedPriority,
    )
      ? (priorityValue as ParsedPriority)
      : fallback.priority,
    riskLevel: (["green", "yellow", "red"] as const).includes(
      riskLevelValue as ParsedRiskLevel,
    )
      ? (riskLevelValue as ParsedRiskLevel)
      : fallback.riskLevel,
  };
}

function sanitizeCrisisReportClassification(
  value: unknown,
  fallback: CrisisReportClassification,
): CrisisReportClassification {
  const record = typeof value === "object" && value !== null ? value : {};
  const categoryValue =
    typeof (record as { category?: unknown }).category === "string"
      ? (record as { category: string }).category
      : fallback.category;
  const priorityValue =
    typeof (record as { priority?: unknown }).priority === "string"
      ? (record as { priority: string }).priority
      : fallback.priority;
  const safetyWarning =
    typeof (record as { safetyWarning?: unknown }).safetyWarning === "string" &&
    (record as { safetyWarning: string }).safetyWarning.trim()
      ? (record as { safetyWarning: string }).safetyWarning.trim()
      : fallback.safetyWarning;

  return {
    category: (
      ["fire", "flood", "landslide", "earthquake", "cyclone", "unknown"] as const
    ).includes(categoryValue as ParsedCrisisType)
      ? (categoryValue as ParsedCrisisType)
      : fallback.category,
    priority: (["low", "medium", "high", "critical"] as const).includes(
      priorityValue as ParsedPriority,
    )
      ? (priorityValue as ParsedPriority)
      : fallback.priority,
    needs:
      coerceStringArray((record as { needs?: unknown }).needs).length > 0
        ? coerceStringArray((record as { needs?: unknown }).needs)
        : fallback.needs,
    safetyWarning,
    requiresVerification:
      typeof (record as { requiresVerification?: unknown }).requiresVerification ===
      "boolean"
        ? (record as { requiresVerification: boolean }).requiresVerification
        : fallback.requiresVerification,
  };
}

function sanitizeExplanation(value: unknown, fallback: string) {
  const record = typeof value === "object" && value !== null ? value : {};
  const explanation =
    typeof (record as { explanation?: unknown }).explanation === "string"
      ? (record as { explanation: string }).explanation.trim()
      : "";

  return explanation || fallback;
}

function logGeminiFallback(functionName: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown Gemini error.";
  console.warn(`[gemini] ${functionName} fallback: ${message}`);
}

export async function extractVolunteerProfile(text: string) {
  const fallback = fallbackVolunteerProfileExtraction(text);

  try {
    const response = await callGeminiJson<VolunteerProfileExtraction>({
      systemInstruction:
        "Extract structured volunteer readiness information from the user's free text.",
      prompt: [
        "Extract the volunteer profile from the text below.",
        "Return skills, languages, assets, availability, and riskComfort.",
        "Use availability values: available_now, limited, scheduled, unavailable.",
        "Use riskComfort values: low, medium, high.",
        "",
        text,
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          skills: {
            type: "array",
            items: { type: "string" },
            description: "Volunteer skills relevant to disaster response.",
          },
          languages: {
            type: "array",
            items: { type: "string" },
            description: "Languages the volunteer can use in the field.",
          },
          assets: {
            type: "array",
            items: { type: "string" },
            description: "Vehicles, tools, space, or other assets the volunteer can provide.",
          },
          availability: {
            type: "string",
            enum: ["available_now", "limited", "scheduled", "unavailable"],
          },
          riskComfort: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
        },
        required: ["skills", "languages", "assets", "availability", "riskComfort"],
      },
    });

    return sanitizeVolunteerProfileExtraction(response, fallback);
  } catch (error) {
    logGeminiFallback("extractVolunteerProfile", error);
    return fallback;
  }
}

export async function parseNGONeed(text: string) {
  const fallback = fallbackNGONeed(text);

  try {
    const response = await callGeminiJson<ParsedNGONeed>({
      systemInstruction:
        "Extract NGO relief requirements into structured operational fields.",
      prompt: [
        "Parse the NGO free-text need below.",
        "Return crisisType, requiredSkills, requiredResources, requiredAssets, priority, and riskLevel.",
        "Use crisisType values: fire, flood, landslide, earthquake, cyclone, unknown.",
        "Use priority values: low, medium, high, critical.",
        "Use riskLevel values: green, yellow, red.",
        "",
        text,
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          crisisType: {
            type: "string",
            enum: ["fire", "flood", "landslide", "earthquake", "cyclone", "unknown"],
          },
          requiredSkills: {
            type: "array",
            items: { type: "string" },
          },
          requiredResources: {
            type: "array",
            items: { type: "string" },
          },
          requiredAssets: {
            type: "array",
            items: { type: "string" },
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
          },
          riskLevel: {
            type: "string",
            enum: ["green", "yellow", "red"],
          },
        },
        required: [
          "crisisType",
          "requiredSkills",
          "requiredResources",
          "requiredAssets",
          "priority",
          "riskLevel",
        ],
      },
    });

    return sanitizeNGONeed(response, fallback);
  } catch (error) {
    logGeminiFallback("parseNGONeed", error);
    return fallback;
  }
}

export async function classifyCrisisReport(text: string) {
  const fallback = fallbackCrisisReportClassification(text);

  try {
    const response = await callGeminiJson<CrisisReportClassification>({
      systemInstruction:
        "Classify crisis reports into structured fields and include a short public safety warning.",
      prompt: [
        "Classify the crisis report below.",
        "Return category, priority, needs, safetyWarning, and requiresVerification.",
        "Use category values: fire, flood, landslide, earthquake, cyclone, unknown.",
        "Use priority values: low, medium, high, critical.",
        "Set requiresVerification to true unless the report is already clearly confirmed by trusted responders.",
        "",
        text,
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["fire", "flood", "landslide", "earthquake", "cyclone", "unknown"],
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
          },
          needs: {
            type: "array",
            items: { type: "string" },
          },
          safetyWarning: {
            type: "string",
          },
          requiresVerification: {
            type: "boolean",
          },
        },
        required: [
          "category",
          "priority",
          "needs",
          "safetyWarning",
          "requiresVerification",
        ],
      },
    });

    return sanitizeCrisisReportClassification(response, fallback);
  } catch (error) {
    logGeminiFallback("classifyCrisisReport", error);
    return fallback;
  }
}

export async function explainMatch(task: ReliefTask, volunteer: VolunteerProfile) {
  const fallback = fallbackMatchExplanation(task, volunteer);

  try {
    const response = await callGeminiJson<{ explanation: string }>({
      systemInstruction:
        "Explain volunteer suitability for a relief task in one short operational sentence.",
      prompt: [
        "Explain why this volunteer is suitable for the task.",
        "Keep the explanation short, practical, and grounded in the provided data.",
        "",
        `Task title: ${task.title}`,
        `Task description: ${task.description ?? "No description provided."}`,
        `Required skills: ${task.requiredSkills.join(", ") || "None listed"}`,
        `Required assets: ${task.requiredAssets.join(", ") || "None listed"}`,
        `Risk level: ${task.riskLevel}`,
        `Volunteer name: ${volunteer.name}`,
        `Volunteer skills: ${volunteer.skills.join(", ") || "None listed"}`,
        `Volunteer assets: ${volunteer.assets.join(", ") || "None listed"}`,
        `Volunteer availability: ${volunteer.availability}`,
        `Volunteer verified: ${volunteer.verified ? "yes" : "no"}`,
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          explanation: {
            type: "string",
            description: "One short explanation sentence.",
          },
        },
        required: ["explanation"],
      },
    });

    return sanitizeExplanation(response, fallback);
  } catch (error) {
    logGeminiFallback("explainMatch", error);
    return fallback;
  }
}
