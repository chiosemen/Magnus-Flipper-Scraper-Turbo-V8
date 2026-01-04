import { PipelineExecutionPlan } from '@repo/types/pipeline';
import { PipelineResultEnvelope, PipelineStepReport } from '@repo/types/pipelineResult';
import { IdempotencyReceipt } from '@repo/types/idempotency';
import { runStep, StepHandler } from './stepRunner';

export interface PipelineExecutorConfig {
  handlers: Partial<Record<PipelineStep['name'], StepHandler>>;
}

export class PipelineExecutor {
  constructor(private config: PipelineExecutorConfig) {}

  private buildReceipt(plan: PipelineExecutionPlan, startedAt: string, finishedAt: string): IdempotencyReceipt {
    const idempotencyKey = `pipeline:${plan.runId}`;
    return {
      idempotencyKey,
      scope: 'GLOBAL',
      replayMode: 'RETURN_PRIOR_RESULT',
      firstSeenAt: startedAt,
      lastSeenAt: finishedAt,
      runId: plan.runId,
      resultRef: `pipelineResult:${plan.runId}`,
    };
  }

  async execute(plan: PipelineExecutionPlan): Promise<PipelineResultEnvelope> {
    const startedAt = new Date().toISOString();
    const stepReports: PipelineStepReport[] = [];

    for (const step of plan.graph.steps) {
      const handler = this.config.handlers[step.name];
      const report = await runStep(step, plan, handler);
      stepReports.push(report);
    }

    const finishedAt = new Date().toISOString();
    const receipt = this.buildReceipt(plan, startedAt, finishedAt);

    const decision = stepReports.some((report) => report.status === 'FAILED')
      ? 'FAILED_STRICT'
      : 'SUCCESS';

    return {
      runId: plan.runId,
      decision,
      startedAt,
      finishedAt,
      idempotencyKey: receipt.idempotencyKey,
      steps: stepReports,
      publications: [],
    };
  }
}
