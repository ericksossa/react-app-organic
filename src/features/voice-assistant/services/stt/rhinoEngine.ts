export type RhinoInference = {
  isFinalized?: boolean;
  isUnderstood?: boolean;
  intent?: string;
  slots?: Record<string, string>;
};

export type RhinoInstance = {
  process: (pcm: number[]) => Promise<RhinoInference>;
  reset?: () => Promise<void> | void;
  frameLength: number;
  sampleRate: number;
  delete?: () => Promise<void> | void;
};

type RhinoCreateFn = (
  accessKey: string,
  contextPath: string,
  modelPath?: string,
  device?: string,
  sensitivity?: number,
  endpointDurationSec?: number,
  requireEndpoint?: boolean
) => Promise<RhinoInstance>;

type RhinoFactory = {
  create: RhinoCreateFn;
};

type RhinoEngineConfig = {
  accessKey: string;
  contextPath: string;
  modelPath?: string;
  sensitivity?: number;
  endpointDurationSec?: number;
  onInference?: (inference: RhinoInference) => void;
};

type RhinoSingletonState = {
  key: string;
  refCount: number;
  instance: RhinoInstance;
};

let singleton: RhinoSingletonState | null = null;

function buildKey(config: RhinoEngineConfig): string {
  return JSON.stringify({
    accessKey: config.accessKey,
    contextPath: config.contextPath,
    modelPath: config.modelPath ?? '',
    sensitivity: config.sensitivity ?? 0.6,
    endpointDurationSec: config.endpointDurationSec ?? 1.0
  });
}

export async function createRhino(
  factory: RhinoFactory,
  config: RhinoEngineConfig
): Promise<{ instance: RhinoInstance; key: string }> {
  const key = buildKey(config);
  if (singleton && singleton.key === key) {
    singleton.refCount += 1;
    return { instance: singleton.instance, key };
  }

  if (singleton) {
    try {
      await singleton.instance.delete?.();
    } finally {
      singleton = null;
    }
  }

  const instance = await factory.create(
    config.accessKey,
    config.contextPath,
    config.modelPath,
    undefined,
    config.sensitivity ?? 0.6,
    config.endpointDurationSec ?? 1.0,
    true
  );

  if (config.onInference) {
    // The low-level provider loop invokes Rhino.process() and can forward inferences to this callback.
    // We keep the callback in config for API compatibility with a higher-level engine contract.
    void config.onInference;
  }

  singleton = {
    key,
    refCount: 1,
    instance
  };

  return { instance, key };
}

export async function releaseRhino(key: string | null): Promise<void> {
  if (!singleton || !key || singleton.key !== key) return;

  singleton.refCount -= 1;
  if (singleton.refCount > 0) return;

  const instance = singleton.instance;
  singleton = null;
  await instance.delete?.();
}

export async function resetRhino(key: string | null): Promise<void> {
  if (!singleton || !key || singleton.key !== key) return;
  await singleton.instance.reset?.();
}

export async function startRhino(key: string | null): Promise<boolean> {
  if (!singleton || !key || singleton.key !== key) return false;
  return true;
}

export async function stopRhino(key: string | null): Promise<void> {
  if (!singleton || !key || singleton.key !== key) return;
  await singleton.instance.reset?.();
}
