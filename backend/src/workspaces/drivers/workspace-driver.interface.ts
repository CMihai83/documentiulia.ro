/**
 * W-1 workspace driver contract. A driver owns the actual compute lifecycle;
 * WorkspaceService owns persistence, authz, billing and events. Drivers must be
 * pure about side effects: provision/stop/destroy do exactly what they say and
 * nothing else, so the service can reason about state transitions deterministically.
 */

export type WorkspaceKind = 'dev_container' | 'vm' | 'gpu_pod';

export interface WorkspaceSpec {
  kind: WorkspaceKind;
  image?: string; // dev_container base image (sandboxed)
  cpuLimit?: number; // cores
  memoryMb?: number;
  pidsLimit?: number;
  /** Whether the container may reach the network. Default false (--network none). */
  network?: boolean;
}

export interface ProvisionResult {
  containerRef: string | null; // driver-native handle (container id / pod id)
  volumeRef: string | null;
  connectInfo: Record<string, unknown> | null;
}

export interface DriverStatus {
  status: 'provisioning' | 'running' | 'stopped' | 'destroyed' | 'error';
  detail?: string;
}

export interface WorkspaceDriver {
  readonly name: 'mock' | 'local_docker' | 'runpod';
  /** False when the driver's backend is not configured (e.g. RunPod without a key). */
  isAvailable(): boolean;
  provision(workspaceId: string, spec: WorkspaceSpec): Promise<ProvisionResult>;
  status(containerRef: string): Promise<DriverStatus>;
  stop(containerRef: string): Promise<void>;
  /** Removes the container AND its volume — teardown must leave no residue. */
  destroy(containerRef: string, volumeRef: string | null): Promise<void>;
}

export class DriverUnavailableError extends Error {
  constructor(driver: string, reason: string) {
    super(`Workspace driver '${driver}' is not available: ${reason}`);
    this.name = 'DriverUnavailableError';
  }
}
