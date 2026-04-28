import {
  classifyCrisisReport,
  explainMatch,
  extractVolunteerProfile,
  parseNGONeed,
} from "@/lib/gemini";
import type { ReliefTask, VolunteerProfile } from "@/types";

export const runtime = "nodejs";

function isReliefTask(value: unknown): value is ReliefTask {
  return typeof value === "object" && value !== null && "title" in value && "crisisId" in value;
}

function isVolunteerProfile(value: unknown): value is VolunteerProfile {
  return typeof value === "object" && value !== null && "name" in value && "skills" in value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as
      | { action?: string; text?: string }
      | { action?: string; task?: unknown; volunteer?: unknown };

    switch (body.action) {
      case "extractVolunteerProfile": {
        const text = "text" in body && typeof body.text === "string" ? body.text : "";

        if (!text.trim()) {
          return Response.json(
            { error: "Volunteer help description is required." },
            { status: 400 },
          );
        }

        const data = await extractVolunteerProfile(text);
        return Response.json({ data });
      }

      case "parseNGONeed": {
        const text = "text" in body && typeof body.text === "string" ? body.text : "";

        if (!text.trim()) {
          return Response.json(
            { error: "Relief need description is required." },
            { status: 400 },
          );
        }

        const data = await parseNGONeed(text);
        return Response.json({ data });
      }

      case "classifyCrisisReport": {
        const text = "text" in body && typeof body.text === "string" ? body.text : "";

        if (!text.trim()) {
          return Response.json(
            { error: "Local public report text is required." },
            { status: 400 },
          );
        }

        const data = await classifyCrisisReport(text);
        return Response.json({ data });
      }

      case "explainMatch": {
        if (!("task" in body) || !("volunteer" in body)) {
          return Response.json(
            { error: "Task and volunteer data are required." },
            { status: 400 },
          );
        }

        if (!isReliefTask(body.task) || !isVolunteerProfile(body.volunteer)) {
          return Response.json(
            { error: "The provided task or volunteer payload is invalid." },
            { status: 400 },
          );
        }

        const data = await explainMatch(body.task, body.volunteer);
        return Response.json({ data });
      }

      default:
        return Response.json(
          { error: "Unsupported AI action." },
          { status: 400 },
        );
    }
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete the AI request right now.",
      },
      { status: 500 },
    );
  }
}
