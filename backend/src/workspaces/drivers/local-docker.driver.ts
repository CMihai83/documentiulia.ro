import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  DriverStatus,
  ProvisionResult,
  WorkspaceDriver,
  WorkspaceSpec,
} from './workspace-driver.interface';

const run = promisify(execFile);

/**
 * Runs a sandboxed dev container on the host via the docker CLI. SECURITY (◆):
 * every invocation is argv-only (never a shell string), and the sandbox flags
 * below are MANDATORY and non-negotiable — no host mounts, all caps dropped,
 * no privilege escalation, resource caps, network off by default, non-root, and
 * a dedicated named volume that is destroyed on teardown. Anything that would
 * loosen isolation is deliberately absent.
 */
@Injectable()
export class LocalDockerDriver implements WorkspaceDriver {
  readonly name = 'local_docker' as const;
  private readonly logger = new Logger(LocalDockerDriver.name);
  /** Test-mode tags every object so afterAll cleanup can force-remove residue. */
  readonly label = process.env.W1_TEST === '1' ? 'w1test=1' : 'w1=1';

  isAvailable(): boolean {
    return true; // docker presence is verified at provision time
  }

  /** Build the exact `docker run` argv. Exposed for unit assertion. */
  buildRunArgs(workspaceId: string, spec: WorkspaceSpec, volumeName: string): string[] {
    const name = `w1-${workspaceId}`;
    const image = spec.image ?? 'alpine:3.20';
    const cpus = String(spec.cpuLimit ?? 1);
    const mem = `${spec.memoryMb ?? 512}m`;
    const pids = String(spec.pidsLimit ?? 128);
    const args = [
      'run',
      '-d',
      '--name', name,
      '--label', this.label,
      // --- mandatory sandbox flags ---
      '--cap-drop=ALL',
      '--security-opt', 'no-new-privileges',
      '--read-only',
      '--pids-limit', pids,
      '--cpus', cpus,
      '--memory', mem,
      '--user', '1000:1000',
      spec.network ? '--network=bridge' : '--network=none',
      // dedicated volume mounted at a scratch path (the only writable location)
      '-v', `${volumeName}:/workspace`,
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
      image,
      // keep-alive so the container has a lifecycle to manage
      'sh', '-c', 'while true; do sleep 3600; done',
    ];
    return args;
  }

  async provision(workspaceId: string, spec: WorkspaceSpec): Promise<ProvisionResult> {
    const volumeName = `w1vol-${workspaceId}`;
    // Create the dedicated volume first (labelled for cleanup).
    await run('docker', ['volume', 'create', '--label', this.label, volumeName]);
    const args = this.buildRunArgs(workspaceId, spec, volumeName);
    try {
      const { stdout } = await run('docker', args);
      const containerRef = stdout.trim();
      return {
        containerRef,
        volumeRef: volumeName,
        connectInfo: { type: 'docker', container: `w1-${workspaceId}`, exec: 'docker exec' },
      };
    } catch (e: any) {
      // Roll back the volume so a failed provision leaves nothing behind.
      await run('docker', ['volume', 'rm', '-f', volumeName]).catch(() => undefined);
      throw e;
    }
  }

  async status(containerRef: string): Promise<DriverStatus> {
    try {
      const { stdout } = await run('docker', ['inspect', '-f', '{{.State.Status}}', containerRef]);
      const s = stdout.trim();
      if (s === 'running') return { status: 'running' };
      if (s === 'exited' || s === 'created') return { status: 'stopped' };
      return { status: 'error', detail: s };
    } catch {
      return { status: 'destroyed' };
    }
  }

  async stop(containerRef: string): Promise<void> {
    await run('docker', ['stop', '-t', '3', containerRef]).catch((e) =>
      this.logger.warn(`stop ${containerRef}: ${e?.message}`),
    );
  }

  async destroy(containerRef: string, volumeRef: string | null): Promise<void> {
    await run('docker', ['rm', '-f', containerRef]).catch(() => undefined);
    if (volumeRef) await run('docker', ['volume', 'rm', '-f', volumeRef]).catch(() => undefined);
  }
}
