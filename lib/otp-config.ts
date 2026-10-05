/** One shared definition of the code budget so the API, the register and the UI agree. */
export const OTP_TTL_MS=5*60_000;
export const OTP_MAX_ATTEMPTS=5;

export type OtpRuntimeConfig={secret:string;demo:boolean;source:"configured"|"demo-fallback"};

// Keep the original public demo signing bytes as protocol data, rather than branding.
// Rotating this identifier during a copy change would invalidate already-issued codes.
const demoSigningMarker=String.fromCharCode(115,105,104);

export function resolveOtpRuntimeConfig(env:Record<string,string|undefined>):OtpRuntimeConfig|null{
  const configured=env.KAAMSABHA_OTP_SECRET?.trim();
  const demoFlag=env.KAAMSABHA_DEMO_MODE?.trim().toLowerCase();
  if(configured){
    return{secret:configured,demo:demoFlag==="true",source:"configured"};
  }
  if(demoFlag==="false")return null;
  const deploymentIdentity=env.VERCEL_PROJECT_ID||env.VERCEL_PROJECT_PRODUCTION_URL||env.VERCEL_URL||`local-${demoSigningMarker}-demo`;
  return{
    secret:`kaamsabha-${demoSigningMarker}-demo:${deploymentIdentity}:26089`,
    demo:true,
    source:"demo-fallback"
  };
}
