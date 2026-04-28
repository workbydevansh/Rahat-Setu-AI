import type {
  CrisisReportClassification,
  ParsedNGONeed,
  ReliefTask,
  VolunteerProfile,
  VolunteerProfileExtraction,
} from "@/types";

type AiAction =
  | {
      action: "extractVolunteerProfile";
      text: string;
    }
  | {
      action: "parseNGONeed";
      text: string;
    }
  | {
      action: "classifyCrisisReport";
      text: string;
    }
  | {
      action: "explainMatch";
      task: ReliefTask;
      volunteer: VolunteerProfile;
    };

async function postAiAction<T>(payload: AiAction) {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseData = (await response.json()) as
    | { data: T }
    | { error: string };

  if (!response.ok || !("data" in responseData)) {
    throw new Error(
      "error" in responseData
        ? responseData.error
        : "Unable to complete the AI request right now.",
    );
  }

  return responseData.data;
}

export function requestVolunteerProfileExtraction(text: string) {
  return postAiAction<VolunteerProfileExtraction>({
    action: "extractVolunteerProfile",
    text,
  });
}

export function requestNGONeedParsing(text: string) {
  return postAiAction<ParsedNGONeed>({
    action: "parseNGONeed",
    text,
  });
}

export function requestCrisisReportClassification(text: string) {
  return postAiAction<CrisisReportClassification>({
    action: "classifyCrisisReport",
    text,
  });
}

export function requestMatchExplanation(task: ReliefTask, volunteer: VolunteerProfile) {
  return postAiAction<string>({
    action: "explainMatch",
    task,
    volunteer,
  });
}
