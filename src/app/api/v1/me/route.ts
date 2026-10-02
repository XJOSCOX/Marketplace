import { authContext } from "@/auth/server";
import { errorResponse, AppError } from "@/domain/errors";
export async function GET(request: Request) {
  try {
    const auth = await authContext(request);
    const user = await auth.requireUser();
    const { data, error } = await auth.db
      .from("marketplace_memberships")
      .select("marketplace_id,roles,status")
      .eq("user_id", user.id);
    if (error)
      throw new AppError(
        503,
        "PROFILE_UNAVAILABLE",
        "Your profile is temporarily unavailable.",
      );
    return Response.json(
      { data: { id: user.id, email: user.email, memberships: data } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
