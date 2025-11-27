/**
 * Service registry for managing gRPC service handlers
 */
export class ServiceRegistry {
  private serviceName: string;
  private methods: Map<string, { handler: Function; isStreaming?: boolean }> =
    new Map();

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Register a method handler
   */
  registerMethod(
    methodName: string,
    handler: Function,
    options?: { isStreaming?: boolean }
  ): void {
    this.methods.set(methodName, {
      handler,
      isStreaming: options?.isStreaming,
    });
  }

  /**
   * Handle a regular request
   */
  async handleRequest(methodName: string, ...args: any[]): Promise<any> {
    const method = this.methods.get(methodName);
    if (!method) {
      throw new Error(
        `Method ${methodName} not found in service ${this.serviceName}`
      );
    }
    return method.handler(...args);
  }

  /**
   * Handle a streaming request
   */
  async handleStreamingRequest(
    methodName: string,
    ...args: any[]
  ): Promise<any> {
    const method = this.methods.get(methodName);
    if (!method) {
      throw new Error(
        `Method ${methodName} not found in service ${this.serviceName}`
      );
    }
    return method.handler(...args);
  }
}

/**
 * Creates a service registry
 */
export function createServiceRegistry(serviceName: string): ServiceRegistry {
  return new ServiceRegistry(serviceName);
}
