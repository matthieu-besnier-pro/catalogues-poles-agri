import { createClientFromRequest } from "npm:@base44/sdk";

// The User entity refuses list/read to any frontend caller, even an admin —
// it's a platform-level restriction, not something an entity `rls` rule can
// override. Listing users at all requires asServiceRole from inside a
// function, so we gate admin-only access ourselves, here.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller || caller.role !== "admin") {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    // The User entity only supports list() — filter/aggregate are refused
    // ("use the app users endpoints"), even with asServiceRole.
    const result = await base44.asServiceRole.entities.User.list("-created_date");
    return Response.json({ items: Array.isArray(result) ? result : [] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}