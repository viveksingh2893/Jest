/**
 * Type declarations for env variables loaded via react-native-dotenv.
 * Every variable defined in .env is listed here so TypeScript is happy.
 *
 * Module: '@env'
 * Plugin:  react-native-dotenv  (see babel.config.js)
 */
declare module '@env' {
  /** OpenAI secret key — set this in your .env file */
  export const OPENAI_API_KEY: string;
}
