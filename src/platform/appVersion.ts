import { version, androidVersionCode } from '../../package.json';

// Shared with Gradle: changing package.json updates the help footer and binary.
export const APP_VERSION = version;
export const ANDROID_BUILD = androidVersionCode;
