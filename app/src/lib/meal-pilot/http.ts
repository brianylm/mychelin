import { NextResponse } from "next/server";
import { MealPilotError } from "./service";

export function mealPilotErrorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof MealPilotError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }
  console.error(context, error);
  return NextResponse.json({ error: "Meal planning request failed" }, { status: 500 });
}

export function numericRouteId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
