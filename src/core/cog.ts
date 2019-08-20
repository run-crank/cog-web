import * as grpc from 'grpc';
import { Struct, Value } from 'google-protobuf/google/protobuf/struct_pb';
import * as fs from 'fs';
import { Field, StepInterface } from './base-step';

import { ICogServiceServer } from '../proto/cog_grpc_pb';
import { ManifestRequest, CogManifest, Step, RunStepRequest, RunStepResponse, FieldDefinition,
  StepDefinition } from '../proto/cog_pb';
import { ClientWrapper } from '../client/client-wrapper';
import { Cluster } from 'puppeteer-cluster';
import { Page } from 'puppeteer';

export class Cog implements ICogServiceServer {

  private steps: StepInterface[];

  constructor (private cluster: Cluster, private clientWrapperClass, private stepMap: any = {}) {
    this.steps = fs.readdirSync(`${__dirname}/../steps`, { withFileTypes: true })
      .filter((file: fs.Dirent) => {
        return file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.js'));
      }).map((file: fs.Dirent) => {
        const step = require(`${__dirname}/../steps/${file.name}`).Step;
        const stepInstance: StepInterface = new step(clientWrapperClass);
        this.stepMap[stepInstance.getId()] = step;
        return stepInstance;
      });
  }

  getManifest(
    call: grpc.ServerUnaryCall<ManifestRequest>,
    callback: grpc.sendUnaryData<CogManifest>,
  ) {
    const manifest: CogManifest = new CogManifest();
    const pkgJson: Record<string, any> = JSON.parse(
      fs.readFileSync('package.json').toString('utf8'),
    );
    const stepDefinitions: StepDefinition[] = this.steps.map((step: StepInterface) => {
      return step.getDefinition();
    });

    manifest.setName(pkgJson.cog.name);
    manifest.setLabel(pkgJson.cog.label);
    manifest.setVersion(pkgJson.version);
    if (pkgJson.cog.homepage) {
      manifest.setHomepage(pkgJson.cog.homepage);
    }
    if (pkgJson.cog.authHelpUrl) {
      manifest.setAuthHelpUrl(pkgJson.cog.authHelpUrl);
    }

    manifest.setStepDefinitionsList(stepDefinitions);

    ClientWrapper.expectedAuthFields.forEach((field: Field) => {
      const authField: FieldDefinition = new FieldDefinition();
      authField.setKey(field.field);
      authField.setOptionality(FieldDefinition.Optionality.REQUIRED);
      authField.setType(field.type);
      authField.setDescription(field.description);
      manifest.addAuthFields(authField);
    });

    callback(null, manifest);
  }

  runSteps(call: grpc.ServerDuplexStream<RunStepRequest, RunStepResponse>) {
    let processing = 0;
    let clientEnded = false;

    this.cluster.queue(({ page }) => {
      return new Promise((resolve) => {
        call.on('data', async (runStepRequest: RunStepRequest) => {
          processing = processing + 1;

          const step: Step = runStepRequest.getStep();
          const response: RunStepResponse = await this.dispatchStep(step, page, call.metadata);
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

  async runStep(
    call: grpc.ServerUnaryCall<RunStepRequest>,
    callback: grpc.sendUnaryData<RunStepResponse>,
  ) {
    const step: Step = call.request.getStep();
    this.cluster.queue(({ page }) => {
      return new Promise(async (resolve) => {
        const response: RunStepResponse = await this.dispatchStep(step, page, call.metadata);
        callback(null, response);
        resolve();
      });
    });
  }

  private async dispatchStep(
    step: Step,
    page: Page,
    metadata: grpc.Metadata,
  ): Promise<RunStepResponse> {
    const client = this.getClientWrapper(page, metadata);
    const stepId = step.getStepId();
    let response: RunStepResponse = new RunStepResponse();

    if (!this.stepMap.hasOwnProperty(stepId)) {
      response.setOutcome(RunStepResponse.Outcome.ERROR);
      response.setMessageFormat('Unknown step %s');
      response.addMessageArgs(Value.fromJavaScript(stepId));
      return response;
    }

    try {
      const stepExecutor: StepInterface = new this.stepMap[stepId](client);
      response = await stepExecutor.executeStep(step);
    } catch (e) {
      response.setOutcome(RunStepResponse.Outcome.ERROR);
      response.setResponseData(Struct.fromJavaScript(e));
    }

    return response;
  }

  private getClientWrapper(page: Page, auth: grpc.Metadata) {
    return new this.clientWrapperClass(page, auth);
  }

}
