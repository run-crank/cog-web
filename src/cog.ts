import * as grpc from 'grpc';
import { Struct, Value } from 'google-protobuf/google/protobuf/struct_pb';
import * as fs from 'fs';
import { Page } from 'puppeteer';
import { Cluster } from 'puppeteer-cluster';

import { Field, StepInterface } from './base-step';

import { ICogServiceServer } from './proto/cog_grpc_pb';
import { ManifestRequest, CogManifest, Step, RunStepRequest, RunStepResponse, FieldDefinition,
  StepDefinition } from './proto/cog_pb';

export class Cog implements ICogServiceServer {

  private cogName: string = 'automatoninc/web';
  private cogVersion: string = JSON.parse(fs.readFileSync('package.json').toString('utf8')).version;
  private authFields: Field[] = [];

  private steps: StepInterface[];

  constructor (private cluster: Cluster, private stepMap: any = {}) {
    // Dynamically reads the contents of the ./steps folder for step definitions and makes the
    // corresponding step classes available on this.steps and this.stepMap.
    this.steps = fs.readdirSync(`${__dirname}/steps`, { withFileTypes: true })
      .filter((file: fs.Dirent) => {
        return file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.js'));
      }).map((file: fs.Dirent) => {
        const step = require(`${__dirname}/steps/${file.name}`).Step;
        const stepInstance: StepInterface = new step();
        this.stepMap[stepInstance.getId()] = step;
        return stepInstance;
      });
  }

  /**
   * Implements the cog:getManifest grpc method, responding with a manifest definition, including
   * details like the name of the cog, the version of the cog, any definitions for required
   * authentication fields, and step definitions.
   */
  getManifest(
    call: grpc.ServerUnaryCall<ManifestRequest>,
    callback: grpc.sendUnaryData<CogManifest>,
  ) {
    const manifest: CogManifest = new CogManifest();
    const stepDefinitions: StepDefinition[] = this.steps.map((step: StepInterface) => {
      return step.getDefinition();
    });

    manifest.setName(this.cogName);
    manifest.setVersion(this.cogVersion);
    manifest.setStepDefinitionsList(stepDefinitions);

    this.authFields.forEach((field: Field) => {
      const authField: FieldDefinition = new FieldDefinition();
      authField.setKey(field.field);
      authField.setOptionality(FieldDefinition.Optionality.REQUIRED);
      authField.setType(field.type);
      authField.setDescription(field.description);
      manifest.addAuthFields(authField);
    });

    callback(null, manifest);
  }

  /**
   * Implements the cog:runSteps grpc method, responding to a stream of RunStepRequests and
   * responding in kind with a stream of RunStepResponses. This method makes no guarantee that the
   * order of step responses sent corresponds at all with the order of step requests received.
   */
  runSteps(call: grpc.ServerDuplexStream<RunStepRequest, RunStepResponse>) {
    let processing = 0;
    let clientEnded = false;

    this.cluster.queue(({ page }) => {
      return new Promise((resolve) => {
        call.on('data', async (runStepRequest: RunStepRequest) => {
          processing = processing + 1;

          const step: Step = runStepRequest.getStep();
          const response: RunStepResponse = await this.dispatchStep(step, page);
          call.write(response);

          processing = processing - 1;

          // If this was the last step to process and the client has ended the stream, then end our
          // stream as well.
          if (processing === 0 && clientEnded) {
            resolve();
            call.end();
          }
        });

        call.on('end', () => {
          clientEnded = true;

          // Only end the stream if we are done processing all steps.
          if (processing === 0) {
            resolve();
            call.end();
          }
        });
      });
    });
  }

  /**
   * Implements the cog:runStep grpc method, responding to a single RunStepRequest with a single
   * RunStepResponse.
   */
  async runStep(
    call: grpc.ServerUnaryCall<RunStepRequest>,
    callback: grpc.sendUnaryData<RunStepResponse>,
  ) {
    const step: Step = call.request.getStep();
    this.cluster.queue(({ page }) => {
      return new Promise(async (resolve) => {
        const response: RunStepResponse = await this.dispatchStep(step, page);
        callback(null, response);
        resolve();
      });
    });
  }

  /**
   * Helper method to dispatch a given step to its corresponding step class and handle error
   * scenarios. Always resolves to a RunStepResponse, regardless of any underlying errors.
   */
  private async dispatchStep(step: Step, page: Page): Promise<RunStepResponse> {
    return new Promise(async (resolve) => {
      const stepId = step.getStepId();
      let response: RunStepResponse = new RunStepResponse();

      if (!this.stepMap.hasOwnProperty(stepId)) {
        response.setOutcome(RunStepResponse.Outcome.ERROR);
        response.setMessageFormat('Unknown step %s');
        response.addMessageArgs(Value.fromJavaScript(stepId));
        resolve(response);
        return;
      }

      try {
        const stepExecutor: StepInterface = new this.stepMap[stepId](page);
        response = await stepExecutor.executeStep(step);
        resolve(response);
      } catch (e) {
        response.setOutcome(RunStepResponse.Outcome.ERROR);
        response.setResponseData(Struct.fromJavaScript(e));
        resolve(response);
      }
    });
  }

}
