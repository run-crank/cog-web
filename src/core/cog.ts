import * as grpc from '@grpc/grpc-js';
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
    this.steps = [].concat(...Object.values(this.getSteps(`${__dirname}/../steps`, clientWrapperClass)));
  }

  private getSteps(dir: string, clientWrapperClass) {
    const steps = fs.readdirSync(dir, { withFileTypes: true })
    .map((file: fs.Dirent) => {
      if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.js'))) {
        const step = require(`${dir}/${file.name}`).Step;
        const stepInstance: StepInterface = new step(clientWrapperClass);
        this.stepMap[stepInstance.getId()] = step;
        return stepInstance;
      } if (file.isDirectory()) {
        return this.getSteps(`${__dirname}/../steps/${file.name}`, clientWrapperClass);
      }
    });

    // Note: this filters out files that do not match the above (e.g. READMEs
    // or .js.map files in built folder, etc).
    return steps.filter((s) => s !== undefined);
  }

  getManifest(
    call: grpc.ServerUnaryCall<ManifestRequest, CogManifest>,
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
    let client: any = null;
    let idMap: any = null;
    let clientCreated = false;

    this.cluster.queue(({ page }) => {
      return new Promise((resolve) => {
        call.on('data', async (runStepRequest: RunStepRequest) => { // tslint:disable-line
          processing = processing + 1;

          if (!clientCreated) {
            idMap = {
              requestId: runStepRequest.getRequestId(),
              scenarioId: runStepRequest.getScenarioId(),
              requestorId: runStepRequest.getRequestorId(),
            };
            client = await this.getClientWrapper(page, call.metadata, idMap);
            clientCreated = true;
          }

          const step: Step = runStepRequest.getStep();
          const response: RunStepResponse = await this.dispatchStep(step, page, runStepRequest, call.metadata, client);
          call.write(response);

          processing = processing - 1;

          // If this was the last step to process and the client has ended the stream, then end our
          // stream as well.
          if (processing === 0 && clientEnded) {
            resolve(null);
            call.end();
          }
        });

        call.on('end', () => {
          clientEnded = true;

          // Only end the stream if we are done processing all steps.
          if (processing === 0) {
            resolve(null);
            call.end();
          }
        });
      });
    });
  }

  async runStep(
    call: grpc.ServerUnaryCall<RunStepRequest, CogManifest>,
    callback: grpc.sendUnaryData<RunStepResponse>,
  ) {
    const step: Step = call.request.getStep();
    this.cluster.queue(({ page }) => {
      return new Promise(async (resolve, reject) => {
        const response: RunStepResponse = await this.dispatchStep(step, page, call.request, call.metadata);
        callback(null, response);
        resolve(null);
      });
    });
  }

  private async dispatchStep(
    step: Step,
    page: Page,
    runStepRequest: RunStepRequest,
    metadata: grpc.Metadata,
    client = null,
  ): Promise<RunStepResponse> {
    let wrapper = client;
    if (!client) {
      // Get scoped IDs for building cache keys
      const idMap: {} = {
        requestId: runStepRequest.getRequestId(),
        scenarioId: runStepRequest.getScenarioId(),
        requestorId: runStepRequest.getRequestorId(),
      };
      wrapper = this.getClientWrapper(page, metadata, idMap);
    }

    const stepId = step.getStepId();
    let response: RunStepResponse = new RunStepResponse();

    if (!this.stepMap.hasOwnProperty(stepId)) {
      response.setOutcome(RunStepResponse.Outcome.ERROR);
      response.setMessageFormat('Unknown step %s');
      response.addMessageArgs(Value.fromJavaScript(stepId));
      return response;
    }

    try {
      const stepExecutor: StepInterface = new this.stepMap[stepId](wrapper);
      response = await stepExecutor.executeStep(step);
    } catch (e) {
      response.setOutcome(RunStepResponse.Outcome.ERROR);
      response.setResponseData(Struct.fromJavaScript(e));
    }

    return response;
  }

  private getClientWrapper(page: Page, auth: grpc.Metadata, idMap: {} = null) {
    return new this.clientWrapperClass(page, auth, idMap);
  }

}
