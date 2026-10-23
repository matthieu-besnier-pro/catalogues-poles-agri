import { createClientFromRequest } from "npm:@base44/sdk";

const VALID_ROLES = ["admin", "user"];

// Same restriction as listUsers: the User entity can't be written to from a
// normal frontend call, admin or not. Role changes go through this function
// instead, which re-checks admin-only access and blocks self-demotion
// server-side (the UI already blocks it, but this is the boundary that
// actually matters).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller || caller.role !== "admin") {
      return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const { userId, role } = await req.json();
    if (!userId || !VALID_ROLES.includes(role)) {
      return Response.json({ error: "Paramètres invalides." }, { status: 400 });
    }
    if (userId === caller.id && role !== "admin") {
      return Response.json({ error: "Vous ne pouvez pas retirer votre propre accès administrateur." }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.User.update(userId, { role });
    return Response.json({ user: updated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
