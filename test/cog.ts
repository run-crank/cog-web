import * as fs from 'fs';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RunStepRequest } from '../src/proto/cog_pb';
import { Cog } from '../src/cog';
import { CogManifest } from '../src/proto/cog_pb';
import { Metadata } from 'grpc';
import { Duplex } from 'stream';

chai.use(sinonChai);

describe('Cog:GetManifest', () => {
  const expect = chai.expect;
  let cogUnderTest: Cog;
  let apiClientStub: any;

  beforeEach(() => {
    apiClientStub = sinon.stub();
    apiClientStub.launch = sinon.stub();
    cogUnderTest = new Cog(apiClientStub);
  });

  it('should return expected cog metadata', (done) => {
    const version: string = JSON.parse(fs.readFileSync('package.json').toString('utf8')).version;
    cogUnderTest.getManifest(null, (err, manifest: CogManifest) => {
      expect(manifest.getName()).to.equal('automatoninc/web');
      expect(manifest.getVersion()).to.equal(version);
      done();
    });
  });

  it('should return expected cog auth fields', (done) => {
    cogUnderTest.getManifest(null, (err, manifest: CogManifest) => {
      const authFields: any[] = manifest.getAuthFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      // No auth fields
      expect(authFields.length).to.equal(0);

      done();
    });
  });

  it('should return expected step definitions', (done) => {
    cogUnderTest.getManifest(null, (err, manifest: CogManifest) => {
      const stepDefs: StepDefinition[] = manifest.getStepDefinitionsList();

      // Step definitions list includes navigate-to-page step.
      const hasNavigateTopage: boolean = stepDefs.filter(s => s.getStepId() === 'NavigateToPage').length === 1;
      expect(hasNavigateTopage).to.equal(true);

      // Step definitions list includes fill-out-field step.
      const fillOutField: boolean = stepDefs.filter(s => s.getStepId() === 'EnterValueIntoField').length === 1;
      expect(fillOutField).to.equal(true);

      // Step definitions list includes navigate-to-page step.
      const submitFormByClickingButton: boolean = stepDefs.filter(s => s.getStepId() === 'SubmitFormByClickingButton').length === 1;
      expect(submitFormByClickingButton).to.equal(true);
      done();
    });
  });

});

describe('Cog:RunStep', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let grpcUnaryCall: any = {};
  let cogUnderTest: Cog;
  let pageStub: any;
  let clusterStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    grpcUnaryCall.request = {
      getStep: function () {return protoStep},
      metadata: null
    };
    pageStub = sinon.stub();
    clusterStub = sinon.stub();
    clusterStub.queue = sinon.stub();
    clusterStub.queue.callsArgWith(0, {page: pageStub});
    cogUnderTest = new Cog(clusterStub);
  });

  it('responds with error when called with unknown stepId', (done) => {
    protoStep.setStepId('NotRealStep');

    cogUnderTest.runStep(grpcUnaryCall, (err, response: RunStepResponse) => {
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      expect(response.getMessageFormat()).to.equal('Unknown step %s');
      done();
    });
  });

  it('invokes step class as expected', (done) => {
    const expectedResponse = new RunStepResponse();
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.resolves(expectedResponse);
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);

    cogUnderTest = new Cog(clusterStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');

    cogUnderTest.runStep(grpcUnaryCall, (err, response: RunStepResponse) => {
      expect(mockTestStepMap.TestStepId).to.have.been.calledOnce;
      expect(mockStepExecutor.executeStep).to.have.been.calledWith(protoStep);
      expect(response).to.deep.equal(expectedResponse);
      done();
    });
  });

  it('responds with error when step class throws an exception', (done) => {
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.throws()
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);

    cogUnderTest = new Cog(clusterStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');

    cogUnderTest.runStep(grpcUnaryCall, (err, response: RunStepResponse) => {
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      done();
    });
  });

});

describe('Cog:RunSteps', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let runStepRequest: RunStepRequest;
  let grpcDuplexStream: any;
  let cogUnderTest: Cog;
  let clusterStub: any;
  let pageStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    runStepRequest = new RunStepRequest();
    grpcDuplexStream = new Duplex({objectMode: true});
    grpcDuplexStream._write = sinon.stub().callsArg(2);
    grpcDuplexStream._read = sinon.stub();
    grpcDuplexStream.metadata = new Metadata();
    pageStub = sinon.stub();
    clusterStub = sinon.stub();
    clusterStub.queue = sinon.stub();
    clusterStub.queue.callsArgWith(0, {page: pageStub});
    cogUnderTest = new Cog(clusterStub);
  });

  it('responds with error when called with unknown stepId', (done) => {
    // Construct step request
    protoStep.setStepId('NotRealStep');
    runStepRequest.setStep(protoStep);

    // Open the stream and write a request.
    cogUnderTest.runSteps(grpcDuplexStream);
    grpcDuplexStream.emit('data', runStepRequest);

    // Allow the event loop to continue, then make assertions.
    setTimeout(() => {
      const result: RunStepResponse = grpcDuplexStream._write.lastCall.args[0];
      expect(result.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      expect(result.getMessageFormat()).to.equal('Unknown step %s');
      done();
    }, 1)
  });

  it('invokes step class as expected', (done) => {
    // Construct a mock step executor and request request
    const expectedResponse = new RunStepResponse();
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.resolves(expectedResponse);
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);
    cogUnderTest = new Cog(clusterStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');
    runStepRequest.setStep(protoStep);

    // Allow puppeteer client instantiation to occur.
    setTimeout(() => {
      // Open the stream and write a request.
      cogUnderTest.runSteps(grpcDuplexStream);
      grpcDuplexStream.emit('data', runStepRequest);

      // Allow the event loop to continue, then make assertions.
      setTimeout(() => {
        expect(mockTestStepMap.TestStepId).to.have.been.calledOnce;
        expect(mockStepExecutor.executeStep).to.have.been.calledWith(protoStep);
        expect(grpcDuplexStream._write.lastCall.args[0]).to.deep.equal(expectedResponse);
        done();
      }, 1)
    }, 1);
  });

  it('responds with error when step class throws an exception', (done) => {
    // Construct a mock step executor and request request
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.throws()
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);
    cogUnderTest = new Cog(clusterStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');
    runStepRequest.setStep(protoStep);

    // Allow puppeteer client instantiation to occur.
    setTimeout(() => {
      // Open the stream and write a request.
      cogUnderTest.runSteps(grpcDuplexStream);
      grpcDuplexStream.emit('data', runStepRequest);

      // Allow the event loop to continue, then make assertions.
      setTimeout(() => {
        const response: RunStepResponse = grpcDuplexStream._write.lastCall.args[0];
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
        done();
      }, 1);
    }, 1);
  });

});
