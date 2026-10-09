// One service an agent offers (/$owner/skills/$slug), in place of ClawHub's
// skill page. A service is a skill on the agent's A2A card: "a distinct
// capability or function that an agent can perform" (A2A specification,
// AgentSkill). The agent performs it for whoever asks; nobody installs it.
//
// Rendered with ClawHub's own SkillDetailPageView, the way ClawHub shows a
// skills.sh entry (src/components/SkillsShCatalogDetail.tsx): the hero holds
// the service's name, description and tags; the sidebar is ClawHub's
// SidebarMetadata with the service's terms as Rails stores them; the install
// area is left empty, because there is nothing to install.
//
// Data: skills:getBySlug (urbicana/data/functions.ts) from
// GET /api/v1/registry/services/:handle/:skill_id.

import { EmptyState } from "../../src/components/EmptyState";
import { Container } from "../../src/components/layout/Container";
import { SidebarMetadata } from "../../src/components/SidebarMetadata";
import { SkillDetailPageView } from "../../src/components/SkillDetailPageView";
import { buildSkillDetailHref } from "../../src/lib/ownerRoute";
import { timeAgo } from "../../src/lib/timeAgo";

// The service's terms (service_listings via agent_skills), as Rails returns them.
export type ServiceTerms = {
  price?: string | null;
  pricing_type?: string | null;
  delivery_format?: string | null;
  location?: string | null;
};

type ServicePageData = {
  result?: {
    skill: Parameters<typeof SkillDetailPageView>[0]["skill"];
    owner: Parameters<typeof SkillDetailPageView>[0]["owner"];
    service?: ServiceTerms;
  } | null;
} | null;

// Values are stored lowercase ("fixed", "digital"); labels are sentence case
// (openclaw-brand).
function sentence(value?: string | null) {
  const text = value?.trim().replace(/_/g, " ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : null;
}

// The price as stored. TEMPORARY: no currency is shown, because neither
// agent_skills nor service_listings records one.
function price(value?: string | null) {
  const amount = value ? Number(value) : Number.NaN;
  return Number.isFinite(amount)
    ? amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : null;
}

export function ServicePage({
  owner,
  slug,
  initialData,
}: {
  owner: string;
  slug: string;
  initialData: unknown;
}) {
  const result = (initialData as ServicePageData)?.result;

  if (!result?.skill) {
    return (
      <main className="py-10">
        <Container size="narrow">
          <EmptyState
            title="Service not found"
            description="This service does not exist or has been removed."
          />
        </Container>
      </main>
    );
  }

  const { skill } = result;
  const terms = result.service ?? {};

  return (
    <SkillDetailPageView
      skill={skill}
      owner={result.owner}
      ownerHandle={owner}
      latestVersion={null}
      modInfo={null}
      canManage={false}
      isAuthenticated
      isStaff={false}
      isStarred={false}
      onToggleStar={() => undefined}
      onOpenReport={() => undefined}
      onRequireSignIn={() => undefined}
      forkOf={null}
      forkOfLabel="fork of"
      forkOfHref={null}
      forkOfOwnerHandle={null}
      canonical={null}
      canonicalHref={null}
      canonicalOwnerHandle={null}
      staffVisibilityTag={null}
      isAutoHidden={false}
      isRemoved={false}
      nixPlugin={undefined}
      hasPluginBundle={false}
      configRequirements={undefined}
      cliHelp={undefined}
      clawdis={undefined}
      categories={[]}
      showArchiveMetadata={false}
      showBookmarkAction={false}
      showReportAction={false}
      breadcrumbSkillHref={buildSkillDetailHref(owner, slug)}
      // Nothing to install: the agent performs the service.
      installContent={<></>}
      renderSidebarContent={() => (
        <div className="skill-hero-sidebar-stack">
          <SidebarMetadata
            ariaLabel="Service terms"
            density="compact"
            blocks={[
              { label: "Price", value: price(terms.price), large: true },
              { label: "Pricing", value: sentence(terms.pricing_type) },
              { label: "Delivery", value: sentence(terms.delivery_format) },
              { label: "Location", value: terms.location?.trim() || null },
              {
                label: "Last updated",
                value: skill.updatedAt ? (
                  <span title={new Date(skill.updatedAt).toLocaleString()}>
                    {timeAgo(skill.updatedAt)}
                  </span>
                ) : null,
              },
            ]}
          />
        </div>
      )}
    />
  );
}
