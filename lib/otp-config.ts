export type OtpRuntimeConfig={secret:string;demo:boolean;source:"configured"|"demo-fallback"};

export function resolveOtpRuntimeConfig(env:Record<string,string|undefined>):OtpRuntimeConfig|null{
  const configured=env.KAAMSABHA_OTP_SECRET?.trim();
  const demoFlag=env.KAAMSABHA_DEMO_MODE?.trim().toLowerCase();
  if(configured){
    return{secret:configured,demo:demoFlag==="true",source:"configured"};
  }
  if(demoFlag==="false")return null;
  const deploymentIdentity=env.VERCEL_PROJECT_ID||env.VERCEL_PROJECT_PRODUCTION_URL||env.VERCEL_URL||"local-sih-demo";
  return{
    secret:`kaamsabha-sih-demo:${deploymentIdentity}:26089`,
    demo:true,
    source:"demo-fallback"
  };
}
