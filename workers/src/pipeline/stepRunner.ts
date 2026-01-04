import { PipelineExecutionPlan } from '@repo/types/pipeline';
import { PipelineStep } from '@repo/types/pipelineSteps';
import { PipelineStepReport } from '@repo/types/pipelineResult';

export type StepHandlerStatus = 'OK' | 'SKIPPED' | 'FAILED';

export type StepHandler = (
  step: PipelineStep,
  plan: PipelineExecutionPlan
) => Promise<StepHandlerStatus>;

export async function runStep(
  step: PipelineStep,
  plan: PipelineExecutionPlan,
  handler?: StepHandler
): Promise<PipelineStepReport> {
  const startedAt = new Date().toISOString();
  let status: StepHandlerStatus = 'SKIPPED';
  let errorCode: string | undefined;
  let errorMessage: string | undefined;

  try {
    status = handler ? await handler(step, plan) : 'SKIPPED';
  } catch (error) {
    status = 'FAILED';
    errorCode = 'STEP_EXCEPTION';
    errorMessage = (error as Error).message;
  }

  if (!['OK', 'SKIPPED', 'FAILED'].includes(status)) {
    status = 'FAILED';
    errorCode = 'INVALID_STATUS';
    errorMessage = 'Step handler returned unsupported status';
  }

  const finishedAt = new Date().toISOString();

  return {
    step: step.name,
    status,
    startedAt,
    finishedAt,
    errorCode,
    errorMessage,
    producedKeys: [],
  };
}
