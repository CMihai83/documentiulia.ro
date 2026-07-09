import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DriverStatus,
  DriverUnavailableError,
  ProvisionResult,
  WorkspaceDriver,
  WorkspaceSpec,
} from './workspace-driver.interface';

/**
 * GPU-pod driver against the RunPod REST API. HARD-GATED: without RUNPOD_API_KEY
 * it reports unavailable and every method throws DriverUnavailableError — the
 * service turns that into a clear "GPU pods not configured" response. It NEVER
 * fabricates a running pod. Live provisioning + its security review are W-1.5,
 * pending the key and a security-engineer sign-off.
 */
@Injectable()
export class RunPodDriver implements WorkspaceDriver {
  readonly name = 'runpod' as const;
  private readonly logger = new Logger(RunPodDriver.name);
  private readonly apiKey: string | undefined;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('RUNPOD_API_KEY') || process.env.RUNPOD_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private ensure(): void {
    if (!this.apiKey) {
      throw new DriverUnavailableError('runpod', 'RUNPOD_API_KEY is not set (GPU pods not configured)');
    }
  }

  async provision(workspaceId: string, spec: WorkspaceSpec): Promise<ProvisionResult> {
    this.ensure();
    // Live provisioning intentionally not enabled this sprint (W-1.5). The API
    // shape is documented here so the driver can be finished behind the key.
    throw new DriverUnavailableError(
      'runpod',
      'live GPU provisioning is disabled pending security review (W-1.5)',
    );
  }

  async status(_ref: string): Promise<DriverStatus> {
    this.ensure();
    throw new DriverUnavailableError('runpod', 'disabled pending W-1.5');
  }

  async stop(_ref: string): Promise<void> {
    this.ensure();
    throw new DriverUnavailableError('runpod', 'disabled pending W-1.5');
  }

  async destroy(_ref: string, _vol: string | null): Promise<void> {
    this.ensure();
    throw new DriverUnavailableError('runpod', 'disabled pending W-1.5');
  }
}
