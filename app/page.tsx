"use client";
import { AppErrorBoundary } from "@/components/error-boundary";
import { DemoShell } from "@/components/demo-shell";
import { stateRepository } from "@/lib/repository";

export default function Home(){
  return <AppErrorBoundary onReset={()=>stateRepository.clearAll()}><DemoShell/></AppErrorBoundary>;
}
