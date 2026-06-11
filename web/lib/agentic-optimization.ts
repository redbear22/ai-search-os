const ARCHIVE_KEY = "agentic_optimization_archive";

export type EvolutionActionType =
  | "content_update"
  | "citation_build"
  | "schema_add"
  | "entity_link";

export interface EvolutionAction {
  type: EvolutionActionType;
  target: string;
  parameters: Record<string, number | string | boolean>;
}

export interface EvolutionPerformance {
  mentionRate: number;
  citationCount: number;
  shareOfVoice: number;
  fitnessScore: number;
}

export interface EvolutionStrategy {
  id: string;
  name: string;
  actions: EvolutionAction[];
  performance: EvolutionPerformance;
  generation: number;
}

export interface MAPElitesArchive {
  cells: Map<string, EvolutionStrategy[]>;
  dimensions: string[];
}

export interface OptimizationMetricsInput {
  brandMentionRate?: { percentage?: number };
  citationDensity?: { yourCitations?: number };
  shareOfVoice?: { brand?: number };
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function calculateFitness(performance: EvolutionPerformance): number {
  const mention = Math.min(100, performance.mentionRate) / 100;
  const citations = Math.min(50, performance.citationCount) / 50;
  const sov = Math.min(100, performance.shareOfVoice) / 100;
  return Math.round((mention * 0.4 + citations * 0.3 + sov * 0.3) * 100) / 100;
}

function serializeArchive(archive: MAPElitesArchive): string {
  return JSON.stringify({
    dimensions: archive.dimensions,
    cells: Object.fromEntries(archive.cells),
  });
}

function deserializeArchive(raw: string): MAPElitesArchive {
  const parsed = JSON.parse(raw) as {
    dimensions: string[];
    cells: Record<string, EvolutionStrategy[]>;
  };
  return {
    dimensions: parsed.dimensions ?? ["mention_rate", "citation_density"],
    cells: new Map(Object.entries(parsed.cells ?? {})),
  };
}

function loadArchive(): MAPElitesArchive {
  if (!isBrowser()) {
    return { cells: new Map(), dimensions: ["mention_rate", "citation_density"] };
  }

  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    if (!raw) {
      return { cells: new Map(), dimensions: ["mention_rate", "citation_density"] };
    }
    return deserializeArchive(raw);
  } catch {
    return { cells: new Map(), dimensions: ["mention_rate", "citation_density"] };
  }
}

function saveArchive(archive: MAPElitesArchive): void {
  if (!isBrowser()) return;
  localStorage.setItem(ARCHIVE_KEY, serializeArchive(archive));
}

function seedStrategies(performance: EvolutionPerformance): EvolutionStrategy[] {
  const baseFitness = calculateFitness(performance);

  return [
    {
      id: `seed_citation_${Date.now()}`,
      name: "Citation authority push",
      generation: 0,
      performance: { ...performance, fitnessScore: baseFitness + 0.15 },
      actions: [
        {
          type: "citation_build",
          target: "top_competitor_sources",
          parameters: { intensity: 0.7, priority: "high" },
        },
        {
          type: "entity_link",
          target: "industry_publications",
          parameters: { intensity: 0.6 },
        },
      ],
    },
    {
      id: `seed_schema_${Date.now()}`,
      name: "Structured entity reinforcement",
      generation: 0,
      performance: { ...performance, fitnessScore: baseFitness + 0.1 },
      actions: [
        {
          type: "schema_add",
          target: "Organization",
          parameters: { intensity: 0.8, includeSameAs: true },
        },
        {
          type: "content_update",
          target: "faq_sections",
          parameters: { intensity: 0.5, format: "direct_answers" },
        },
      ],
    },
    {
      id: `seed_content_${Date.now()}`,
      name: "Extractable content refresh",
      generation: 0,
      performance: { ...performance, fitnessScore: baseFitness + 0.08 },
      actions: [
        {
          type: "content_update",
          target: "priority_queries",
          parameters: { intensity: 0.65, addStatistics: true },
        },
        {
          type: "citation_build",
          target: "review_platforms",
          parameters: { intensity: 0.55 },
        },
      ],
    },
  ];
}

class CoEvolvingCritic {
  async evaluate(strategies: EvolutionStrategy[]): Promise<EvolutionStrategy[]> {
    return strategies.map((strategy) => ({
      ...strategy,
      performance: {
        ...strategy.performance,
        fitnessScore: this.predictFitness(strategy),
      },
    }));
  }

  private predictFitness(strategy: EvolutionStrategy): number {
    let fitness = strategy.performance.fitnessScore;

    for (const action of strategy.actions) {
      switch (action.type) {
        case "content_update":
          fitness += 0.12;
          break;
        case "citation_build":
          fitness += 0.2;
          break;
        case "schema_add":
          fitness += 0.16;
          break;
        case "entity_link":
          fitness += 0.24;
          break;
      }

      const intensity =
        typeof action.parameters.intensity === "number"
          ? action.parameters.intensity
          : 0.5;
      fitness += intensity * 0.05;
    }

    return Math.min(1, Math.round(fitness * 100) / 100);
  }
}

class CrossDomainTransfer {
  async transfer(
    strategies: EvolutionStrategy[],
    targetPerformance: EvolutionPerformance
  ): Promise<EvolutionStrategy[]> {
    const domainWeight = this.calculateDomainWeight(targetPerformance);

    return strategies
      .map((strategy) => ({
        ...strategy,
        actions: strategy.actions.map((action) => ({
          ...action,
          parameters: {
            ...action.parameters,
            domainWeight,
          },
        })),
      }))
      .sort((a, b) => b.performance.fitnessScore - a.performance.fitnessScore)
      .slice(0, 5);
  }

  private calculateDomainWeight(performance: EvolutionPerformance): number {
    if (performance.mentionRate < 20) return 0.9;
    if (performance.mentionRate < 50) return 0.75;
    if (performance.shareOfVoice < 30) return 0.65;
    return 0.5;
  }
}

export class AgenticOptimizer {
  private archive: MAPElitesArchive;
  private critic: CoEvolvingCritic;
  private transferLearner: CrossDomainTransfer;

  constructor(archive?: MAPElitesArchive) {
    this.archive = archive ?? loadArchive();
    this.critic = new CoEvolvingCritic();
    this.transferLearner = new CrossDomainTransfer();
  }

  async evolve(
    currentPerformance: EvolutionPerformance
  ): Promise<EvolutionStrategy[]> {
    const performance = {
      ...currentPerformance,
      fitnessScore: calculateFitness(currentPerformance),
    };

    let similarStrategies = this.findSimilarStrategies(performance);
    if (similarStrategies.length === 0) {
      similarStrategies = seedStrategies(performance);
    }

    const mutations = this.mutateStrategies(similarStrategies);
    const evaluated = await this.critic.evaluate(mutations);
    this.updateArchive(evaluated);
    saveArchive(this.archive);

    return this.transferLearner.transfer(evaluated, performance);
  }

  getArchive(): MAPElitesArchive {
    return this.archive;
  }

  private findSimilarStrategies(
    performance: EvolutionPerformance
  ): EvolutionStrategy[] {
    const cellKey = this.getCellKey(performance);
    return this.archive.cells.get(cellKey) ?? [];
  }

  private mutateStrategies(
    strategies: EvolutionStrategy[]
  ): EvolutionStrategy[] {
    return strategies.map((strategy) => ({
      ...strategy,
      id: `${strategy.id}_g${strategy.generation + 1}_${Date.now()}`,
      actions: this.mutateActions(strategy.actions, strategy.generation),
      generation: strategy.generation + 1,
    }));
  }

  private mutateActions(
    actions: EvolutionAction[],
    generation: number
  ): EvolutionAction[] {
    const drift = ((generation % 5) - 2) * 0.04;

    return actions.map((action, index) => {
      const currentIntensity =
        typeof action.parameters.intensity === "number"
          ? action.parameters.intensity
          : 0.5;
      const mutation = drift + (index % 2 === 0 ? 0.05 : -0.03);

      return {
        ...action,
        parameters: {
          ...action.parameters,
          intensity: Math.max(
            0.1,
            Math.min(1, currentIntensity + mutation)
          ),
        },
      };
    });
  }

  private getCellKey(performance: EvolutionPerformance): string {
    const mentionBucket = Math.floor(performance.mentionRate / 10) * 10;
    const citationBucket = Math.floor(performance.citationCount / 5) * 5;
    return `${mentionBucket}_${citationBucket}`;
  }

  private updateArchive(strategies: EvolutionStrategy[]): void {
    for (const strategy of strategies) {
      const key = this.getCellKey(strategy.performance);
      const existing = this.archive.cells.get(key) ?? [];
      const updated = [...existing, strategy]
        .sort((a, b) => b.performance.fitnessScore - a.performance.fitnessScore)
        .slice(0, 10);
      this.archive.cells.set(key, updated);
    }
  }
}

export async function getOptimizationRecommendations(
  domain: string,
  currentMetrics: OptimizationMetricsInput
): Promise<EvolutionStrategy[]> {
  const optimizer = new AgenticOptimizer();

  const currentPerformance: EvolutionPerformance = {
    mentionRate: currentMetrics.brandMentionRate?.percentage ?? 0,
    citationCount: currentMetrics.citationDensity?.yourCitations ?? 0,
    shareOfVoice: currentMetrics.shareOfVoice?.brand ?? 0,
    fitnessScore: 0,
  };

  const strategies = await optimizer.evolve(currentPerformance);

  return strategies.map((strategy) => ({
    ...strategy,
    name: domain
      ? `${strategy.name} (${domain})`
      : strategy.name,
  }));
}
