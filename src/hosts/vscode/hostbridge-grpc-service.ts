import { ServiceRegistry } from "../../core/controller/grpc-service";

/**
 * Creates a service registry for VSCode hostbridge gRPC services
 */
export function createServiceRegistry(name: string): ServiceRegistry {
  return new ServiceRegistry(name);
}
