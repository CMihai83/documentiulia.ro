import { Injectable } from '@nestjs/common';
import {
  DriverStatus,
  ProvisionResult,
  WorkspaceDriver,
  WorkspaceSpec,
} from './workspace-driver.interface';

/**
 * Deterministic in-memory driver. The default under tests and the safe fallback
 * everywhere: it models the lifecycle state machine without touching any real
 * compute, so the full escrow/delivery loop can be exercised end-to-end offline.
 */
@Injectable()
export class MockDriver implements WorkspaceDriver {
  readonly name = 'mock' as const;
  private readonly state = new Map<string, DriverStatus['status']>();

  isAvailable(): boolean {
    return true;
  }

  async provision(workspaceId: string, _spec: WorkspaceSpec): Promise<ProvisionResult> {
    const ref = `mock-${workspaceId}`;
    this.state.set(ref, 'running');
    return {
      containerRef: ref,
      volumeRef: `vol-${ref}`,
      connectInfo: { type: 'mock', url: `mock://workspace/${workspaceId}`, note: 'simulated' },
    };
  }

  async status(containerRef: string): Promise<DriverStatus> {
    return { status: this.state.get(containerRef) ?? 'destroyed' };
  }

  async stop(containerRef: string): Promise<void> {
    if (this.state.has(containerRef)) this.state.set(containerRef, 'stopped');
  }

  async destroy(containerRef: string, _volumeRef: string | null): Promise<void> {
    this.state.set(containerRef, 'destroyed');
  }
}
