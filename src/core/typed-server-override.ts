import * as grpc from '@grpc/grpc-js';

// Override the addService method to allow for typed service implementations see: https://github.com/agreatfool/grpc_tools_node_protoc_ts/issues/79
export class TypedServerOverride extends grpc.Server {
  constructor() {
    super();
  }

  addServiceTyped<TypedServiceImplementation extends Record<any, any>>(service: grpc.ServiceDefinition, implementation: TypedServiceImplementation): void {
    this.addService(service, implementation);
  }
}
