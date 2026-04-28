interface Section {
  title: string;
  steps: string[];
}

const GUIDE: Section[] = [
  {
    title: "Local Setup",
    steps: [
      "Clone the repo and run `npm install` from the monorepo root.",
      "Navigate to `packages/cli` and run `npm run build`.",
      "Use `npm run dev` to watch for TypeScript changes.",
    ],
  },
  {
    title: "Running Tests",
    steps: [
      "Run `npm test` inside `packages/cli` to execute the Vitest suite.",
      "Run `npm run typecheck` to verify types without emitting output.",
      "All tests must pass before opening a pull request.",
    ],
  },
  {
    title: "Coding Conventions",
    steps: [
      "Use TypeScript strict mode — no implicit `any`.",
      "Keep functions small and single-purpose.",
      "Prefer named exports over default exports.",
      "Add a test for every new public function.",
    ],
  },
];

function renderSection(section: Section): string {
  const items = section.steps.map((s) => `- ${s}`).join("\n");
  return `## ${section.title}\n\n${items}`;
}

export function generateContributingGuide(): string {
  return GUIDE.map(renderSection).join("\n\n");
}

export function getSectionTitles(): string[] {
  return GUIDE.map((s) => s.title);
}
