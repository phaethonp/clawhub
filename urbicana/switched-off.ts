// ClawHub pages Urbicana does not serve (MAPPING.md "Switched off"). The
// root route's beforeLoad (copy.ts rule on src/routes/__root.tsx) answers
// not found for these paths, on the server and on client-side navigation,
// with ClawHub's own not-found page.
//
// Kept for now, though not Urbicana's: /add and /skills/publish,
// /plugins/publish (the "Add a service / product" links lead there until
// their Urbicana flow exists).

const SWITCHED_OFF: Array<{ pattern: RegExp; why: string }> = [
  { pattern: /^\/audits\/?$/, why: "security scans of installable skills and plugins" },
  { pattern: /\/security-audit\/?$/, why: "a skill's or plugin's security audit" },
  { pattern: /\/security\/[^/]+\/?$/, why: "one scanner's report" },
  { pattern: /^\/skills-sh(\/|$)/, why: "mirror of the external skills.sh catalogue" },
  { pattern: /^\/import\/?$/, why: "GitHub import of SKILL.md files" },
  { pattern: /^\/cli\/(auth|device)\/?$/, why: "ClawHub CLI sign-in" },
  { pattern: /^\/auth\/docs\/?$/, why: "OpenClaw docs sign-in" },
  { pattern: /^\/management\/?$/, why: "ClawHub staff moderation" },
  { pattern: /^\/[^/]+\/[^/]+\/settings\/?$/, why: "per-skill settings" },
  { pattern: /^\/[^/]+\/skills\/[^/]+\/settings\/?$/, why: "per-skill settings" },
  { pattern: /\/\.well-known\/agent-skills\//, why: "install discovery for skills agents install" },
  { pattern: /^\/plugins\/new\/?$/, why: "plugin publishing" },
];

export function isSwitchedOff(pathname: string) {
  return SWITCHED_OFF.some(({ pattern }) => pattern.test(pathname));
}
