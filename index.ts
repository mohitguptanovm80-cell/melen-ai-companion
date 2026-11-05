import { LogBox } from 'react-native';

// Optional floating-point render targets are unavailable on some mobile GPUs.
// This viewer uses the default framebuffer and does not require that extension.
LogBox.ignoreLogs(['THREE.WebGLRenderer: EXT_color_buffer_float extension not supported.']);

import 'expo-router/entry';
