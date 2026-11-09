import React, { useEffect, useState } from "react";
import { appParams } from "@/lib/app-params";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

const OPERATION_VERBS = { read: "consulter", create: "créer", update: "modifier", delete: "supprimer" };
const COLLAPSED_DATA_ROWS = 6;

// Entity tools arrive one per operation; show each entity once, naming only the
// operations it actually grants.
function groupTools(tools) {
  const operationsByEntity = new Map();
  const agents = [];
  const actions = [];
  for (const tool of tools) {
    if (tool.kind === "entity" && tool.entity) {
      if (!operationsByEntity.has(tool.entity)) operationsByEntity.set(tool.entity, []);
      operationsByEntity.get(tool.entity).push(tool.operation);
    } else if (tool.kind === "agent") {
      agents.push(tool);
    } else {
      actions.push(tool);
    }
  }
  const data = [...operationsByEntity].map(([entity, operations]) => ({
    entity,
    operations: Object.keys(OPERATION_VERBS).filter((op) => operations.includes(op)),
  }));
  return { data, agents, actions };
}

const humanize = (name) =>
  name.split(/[_-]+/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ") || name;

// "Consulter, créer et supprimer des enregistrements" — delete est mis en
// valeur pour ne pas se fondre parmi les verbes anodins.
function OperationSummary({ operations }) {
  return (
    <>
      {operations.map((op, i) => {
        const verb = OPERATION_VERBS[op];
        const separator = i === 0 ? "" : i === operations.length - 1 ? " et " : ", ";
        return (
          <React.Fragment key={op}>
            {separator}
            <span className={op === "delete" ? "font-medium text-destructive" : undefined}>
              {i === 0 ? verb[0].toUpperCase() + verb.slice(1) : verb}
            </span>
          </React.Fragment>
        );
      })}{" "}
      des enregistrements
    </>
  );
}

function ToolSection({ title, children }) {
  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">{title}</h3>
      <ul className="divide-y divide-border rounded-lg border border-border">{children}</ul>
    </section>
  );
}

function ToolRow({ title, children }) {
  return (
    <li className="flex flex-col gap-0.5 px-3 py-2">
      <span className="font-medium text-foreground">{title}</span>
      {children && <span className="text-muted-foreground">{children}</span>}
    </li>
  );
}

// App-side OAuth consent page for the app's MCP server. The platform redirects
// AI clients here (see base44/mcp/config.json `consent_path`) with an opaque
// `ctx` handle — the authorization request itself lives on the server. This page
// gates on the app-user session, fetches the display info for that handle, shows
// the categories of access being granted, and posts the approve/deny decision.
// Do not change the fetch calls, headers, or the `ctx` handle handling — styling
// and copy are safe to edit.
export default function OAuthConsent() {
  const ctx = new URLSearchParams(window.location.search).get("ctx");
  const [info, setInfo] = useState(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decided, setDecided] = useState("");
  const [error, setError] = useState("");
  const [reconnect, setReconnect] = useState("");
  const [showAllData, setShowAllData] = useState(false);

  useEffect(() => {
    (async () => {
      let redirecting = false;
      try {
        if (!ctx) {
          setError("Ce lien d'autorisation est invalide ou a expiré.");
          return;
        }
        // Resolve the handle first: a dead handle must never render
        // approve/deny, and the response carries the app's configured login
        // route for the signed-out redirect below. Send the session (cookie +
        // bearer token) so the server can list the granted tools for a
        // signed-in user — the same auth the approve/deny call sends; without
        // it the display request is anonymous and shows no tools.
        const infoHeaders = {};
        if (appParams.token) infoHeaders.Authorization = "Bearer " + appParams.token;
        const res = await fetch(
          `/api/apps/${appParams.appId}/mcp/consent-info?handle=${encodeURIComponent(ctx)}`,
          { credentials: "include", headers: infoHeaders },
        );
        if (!res.ok) {
          setError("Ce lien d'autorisation est invalide ou a expiré.");
          return;
        }
        const data = await res.json();
        // Gate on the server's auth result, NOT base44.auth.isAuthenticated():
        // the SDK check runs the bearer path, so a cookie-only session (platform
        // login/SSO, or a private app with a stale localStorage token) would read
        // as signed-out and redirect — even though /consent-info just
        // authenticated this same request via its cookie fallback. data.authenticated
        // keeps the redirect decision in agreement with what the server returned.
        if (!data.authenticated) {
          // The short handle rides back in returnTo; login_path is
          // owner-configured and validated server-side as a same-origin path.
          // Send from_url too: a custom-auth app coerced to platform auth (e.g.
          // public_without_login under workspace SSO) serves the platform login,
          // which honors from_url rather than returnTo. Rebuild the query from
          // `ctx` alone — never forward window.location.search raw: the platform
          // resume returns from_url verbatim, so crafted extras on the consent
          // link (app_base_url, access_token, …) would ride through the login
          // round-trip and app-params.js would persist them into the freshly
          // authenticated session.
          const returnTo =
            window.location.pathname + "?ctx=" + encodeURIComponent(ctx);
          const encoded = encodeURIComponent(returnTo);
          redirecting = true; // keep the spinner while the browser navigates
          window.location.href =
            (data.login_path || "/login") + "?returnTo=" + encoded + "&from_url=" + encoded;
          return;
        }
        setInfo(data);
      } catch (e) {
        setError("Impossible de charger cette demande d'autorisation. Veuillez réessayer.");
      } finally {
        if (!redirecting) setChecking(false);
      }
    })();
  }, [ctx]);

  const respond = async (action) => {
    setSubmitting(true);
    setError("");
    try {
      const headers = { "Content-Type": "application/json" };
      // Cookie-backed sessions carry no token; sending "Bearer null" would
      // shadow the valid cookie, so add the header only when a token exists.
      if (appParams.token) headers.Authorization = "Bearer " + appParams.token;
      const res = await fetch(`/api/apps/${appParams.appId}/mcp/authorize-grant`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ ctx, action }),
      });
      if (!res.ok) {
        // 401 = the session expired before the (single-use, still-unconsumed)
        // handle was spent; retrying the same controls re-sends the dead session
        // forever. Send the user back through login preserving `ctx` — the same
        // redirect the initial signed-out path uses — so they can return and
        // approve the still-valid handle.
        if (res.status === 401) {
          const returnTo = window.location.pathname + "?ctx=" + encodeURIComponent(ctx);
          const encoded = encodeURIComponent(returnTo);
          window.location.href =
            ((info && info.login_path) || "/login") + "?returnTo=" + encoded + "&from_url=" + encoded;
          return;
        }
        // These all come AFTER the single-use handle is atomically consumed
        // (409 tool set changed; 403 host/resource/app mismatch; 404 access
        // gone; 400 malformed/handle already used), so retrying can only 404.
        // Show a terminal reconnect state, not an impossible "try again".
        if ([400, 403, 404, 409].includes(res.status)) {
          let detail = "";
          try { detail = (await res.json()).detail; } catch (_) { /* keep default */ }
          setReconnect(detail || "Cette autorisation ne peut plus être validée. Reconnectez-vous depuis votre client IA pour réessayer.");
          setSubmitting(false);
          return;
        }
        throw new Error("Impossible de finaliser l'autorisation. Veuillez réessayer.");
      }
      const data = await res.json();
      window.location.href = data.redirect_url;
      if (!/^https?:/i.test(data.redirect_url)) {
        // Custom-scheme redirect (native AI clients, e.g. cursor://): browsers
        // may block or not visibly navigate, so show a terminal state instead
        // of an eternal spinner.
        setDecided(action);
        setSubmitting(false);
      }
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <AuthLayout icon={ShieldCheck} title="Autoriser l'accès">
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
          Chargement…
        </div>
      </AuthLayout>
    );
  }

  const client = (info && info.client_name) || "Un client IA";
  const appName = (info && info.app_name) || "cette application";

  if (decided) {
    return (
      <AuthLayout
        icon={ShieldCheck}
        title={decided === "approve" ? "Accès accordé" : "Accès refusé"}
        subtitle={`Vous pouvez retourner sur ${client} et fermer cette fenêtre.`}
      />
    );
  }

  // Terminal: the authorization request is no longer valid (tool set changed +
  // handle consumed). Retrying can't succeed, so show reconnect guidance with
  // no approve/deny controls.
  if (reconnect) {
    return (
      <AuthLayout icon={ShieldCheck} title="Reconnexion requise">
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {reconnect}
        </div>
      </AuthLayout>
    );
  }

  // No consent details means nothing trustworthy to approve: a failed
  // consent-info load (expired handle, rate limit, transient error) renders
  // the error alone, never the approve/deny controls.
  if (error && !info) {
    return (
      <AuthLayout icon={ShieldCheck} title="Autoriser l'accès">
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      </AuthLayout>
    );
  }

  const tools = Array.isArray(info.tools) ? info.tools : [];
  const { data, agents, actions } = groupTools(tools);

  return (
    <AuthLayout
      icon={ShieldCheck}
      title="Autoriser l'accès"
      subtitle={`${client} souhaite accéder à ${appName} en votre nom`}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <p className="text-sm font-medium text-foreground mb-3">
        {tools.length ? `${client} pourra :` : "Aucun outil demandé"}
      </p>
      {tools.length > 0 && (
        <div className="space-y-4 text-sm mb-6">
          {data.length > 0 && (
            <ToolSection title={`Données (${data.length})`}>
              {(showAllData ? data : data.slice(0, COLLAPSED_DATA_ROWS)).map(({ entity, operations }) => (
                <ToolRow key={entity} title={entity}>
                  <OperationSummary operations={operations} />
                </ToolRow>
              ))}
              {data.length > COLLAPSED_DATA_ROWS && (
                <li className="px-3 py-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={() => setShowAllData((shown) => !shown)}
                  >
                    {showAllData ? "Afficher moins" : `Afficher les ${data.length}`}
                  </button>
                </li>
              )}
            </ToolSection>
          )}
          {agents.length > 0 && (
            <ToolSection title="Agents">
              {agents.map((tool) => (
                <ToolRow key={tool.name} title={tool.agent ? humanize(tool.agent) : tool.title || tool.name}>
                  {tool.description}
                </ToolRow>
              ))}
            </ToolSection>
          )}
          {actions.length > 0 && (
            <ToolSection title="Actions">
              {actions.map((tool) => (
                <ToolRow key={tool.name} title={tool.title || tool.name}>
                  {tool.description}
                </ToolRow>
              ))}
            </ToolSection>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-12 font-medium"
          disabled={submitting}
          onClick={() => respond("deny")}
        >
          Refuser
        </Button>
        <Button
          className="flex-1 h-12 font-medium"
          disabled={submitting}
          onClick={() => respond("approve")}
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Autoriser
        </Button>
      </div>
    </AuthLayout>
  );
}
