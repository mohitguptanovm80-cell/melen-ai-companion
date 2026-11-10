import Constants from 'expo-constants';
import { TurboModuleRegistry, type TurboModule } from 'react-native';
import { configureBackend } from './providerService';
import { resolveBackendUrl } from '../utils/backendUrl';

const backendUrl = process.env.EXPO_PUBLIC_AI_BACKEND_URL;
const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
interface SourceCode extends TurboModule {
  getConstants(): { scriptURL?: string };
}
// Native debug builds without Expo Dev Launcher have no manifest hostUri.
// Read the actual bundle origin, as React Native's own dev tools do.
const scriptUrl = __DEV__ ? TurboModuleRegistry.get<SourceCode>('SourceCode')?.getConstants().scriptURL : undefined;
const resolvedUrl = resolveBackendUrl(backendUrl, hostUri, scriptUrl, __DEV__);
if (resolvedUrl) {
  configureBackend(resolvedUrl, __DEV__);
}
