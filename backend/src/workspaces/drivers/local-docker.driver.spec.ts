import { LocalDockerDriver } from './local-docker.driver';

describe('LocalDockerDriver sandbox args (W1-2 security ◆)', () => {
  const driver = new LocalDockerDriver();

  it('emits ALL mandatory isolation flags, argv-only', () => {
    const args = driver.buildRunArgs('ws123', { kind: 'dev_container' }, 'w1vol-ws123');
    // argv form (no shell interpolation): every token is a discrete array element
    expect(Array.isArray(args)).toBe(true);
    expect(args[0]).toBe('run');
    // mandatory sandbox flags
    expect(args).toContain('--cap-drop=ALL');
    expect(args).toContain('no-new-privileges');
    expect(args).toContain('--read-only');
    expect(args).toContain('--pids-limit');
    expect(args).toContain('--cpus');
    expect(args).toContain('--memory');
    expect(args).toContain('--network=none'); // network off by default
    expect(args).toContain('--user'); // non-root
    expect(args.some((a) => a.startsWith('w1vol-'))).toBe(true); // dedicated volume mount
    // NO host bind mount (no `-v /host:...` — only the named volume)
    expect(args.filter((a) => a === '-v').length).toBe(1);
    const volMount = args[args.indexOf('-v') + 1];
    expect(volMount.startsWith('/')).toBe(false); // named volume, not a host path
  });

  it('opens the network only when explicitly requested, still no host mount', () => {
    const args = driver.buildRunArgs('ws9', { kind: 'dev_container', network: true }, 'w1vol-ws9');
    expect(args).toContain('--network=bridge');
    expect(args).not.toContain('--network=none');
    expect(args.filter((a) => a === '-v').length).toBe(1);
  });

  it('applies caller resource limits', () => {
    const args = driver.buildRunArgs('ws5', { kind: 'vm', cpuLimit: 2, memoryMb: 2048, pidsLimit: 256 }, 'v');
    expect(args[args.indexOf('--cpus') + 1]).toBe('2');
    expect(args[args.indexOf('--memory') + 1]).toBe('2048m');
    expect(args[args.indexOf('--pids-limit') + 1]).toBe('256');
  });
});
