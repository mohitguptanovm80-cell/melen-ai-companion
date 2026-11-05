export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  chatModel: string;
  transcriptionModel: string;
}

export const defaultProvider: ProviderConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  chatModel: 'gpt-4o-mini',
  transcriptionModel: 'whisper-1',
};

export class ServiceError extends Error {
  constructor(message: string, public readonly kind: 'configuration' | 'permission' | 'network' | 'service' = 'service') {
    super(message);
  }
}

let config: ProviderConfig | null = null;
export function configureProvider(value: ProviderConfig) {
  const url = new URL(value.baseUrl.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new ServiceError('Use an HTTPS API base URL without credentials, query, or fragment.', 'configuration');
  }
  if (!value.apiKey.trim() || !value.chatModel.trim() || !value.transcriptionModel.trim()) {
    throw new ServiceError('Enter the API key and both model names.', 'configuration');
  }
  config = {
    baseUrl: url.toString().replace(/\/$/, ''),
    apiKey: value.apiKey.trim(),
    chatModel: value.chatModel.trim(),
    transcriptionModel: value.transcriptionModel.trim(),
  };
}
export function clearProvider() { config = null; }
export function getProvider(): ProviderConfig {
  if (!config) throw new ServiceError('Open Voice setup and connect a provider to start a conversation.', 'configuration');
  return { ...config };
}

// Never log request headers, audio, credentials, or provider response bodies.
export async function providerRequest(path: string, body: BodyInit, signal: AbortSignal, json = false): Promise<unknown> {
  const provider = getProvider();
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) controller.abort();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 45000);
  try {
    const response = await fetch(`${provider.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        ...(json ? { 'Content-Type': 'application/json' } : {}),
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      const message = response.status === 401 || response.status === 403
        ? 'The provider rejected access. Check your API key and model permissions in Voice setup.'
        : response.status === 429
          ? 'Provider usage limit reached. Check your quota or try again later.'
          : `Provider request failed (${response.status}). Check the endpoint and model names, then retry.`;
      throw new ServiceError(message);
    }
    return await response.json();
  } catch (error) {
    if (signal.aborted) throw error;
    if (timedOut) throw new ServiceError('The request timed out. Check your internet connection and retry.', 'network');
    if (error instanceof ServiceError) throw error;
    if (error instanceof SyntaxError) throw new ServiceError('The provider returned an invalid response.');
    throw new ServiceError('Cannot reach the provider. Check your internet connection and retry.', 'network');
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
  }
}
