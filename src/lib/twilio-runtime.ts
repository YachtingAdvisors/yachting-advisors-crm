export type TwilioRuntimeConfig =
  | { kind: 'auth-token'; accountSid: string; authToken: string }
  | { kind: 'api-key'; accountSid: string; apiKeySid: string; apiKeySecret: string }
  | null;

export function resolveTwilioRuntime(env: Record<string, string | undefined> = process.env): TwilioRuntimeConfig {
  const accountSid = env.TWILIO_ACCOUNT_SID || env.TWILIO_YA_ACCOUNT_SID;
  if (!accountSid) return null;
  if (env.TWILIO_AUTH_TOKEN) return { kind: 'auth-token', accountSid, authToken: env.TWILIO_AUTH_TOKEN };
  if (env.TWILIO_YA_API_KEY_SID && env.TWILIO_YA_API_KEY_SECRET) {
    return { kind: 'api-key', accountSid, apiKeySid: env.TWILIO_YA_API_KEY_SID, apiKeySecret: env.TWILIO_YA_API_KEY_SECRET };
  }
  return null;
}
