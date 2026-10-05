"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProductApp } from "@/components/product-app";
import { signIn } from "@/lib/commands";
import type { AppState, Role } from "@/lib/domain";
import { stateRepository } from "@/lib/repository";
import { authenticateDemoAccount, DEMO_PASSWORD, demoAccounts, rolePermissions, roleTitle } from "@/lib/demo-auth";
import { resetRegister, SCENARIOS } from "@/lib/demo-scenarios";

/**
 * Seventeen screens across three roles is a lot to drive from a cold start. These jump the
 * register to the state a given story needs, using the same commands a person would — nothing
 * is written directly — so what appears afterwards is the product working, not a mock-up.
 */
function ScenarioPicker({onSeed}:{onSeed:(state:AppState,signInAs:string)=>void}){
  const[open,setOpen]=useState(false);
  const[ran,setRan]=useState<string|null>(null);
  return <section className="scenarioPicker">
    <button type="button" className="scenarioToggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      <span>{open?"Hide demo shortcuts":"Jump straight to a story"}</span>
      <span aria-hidden="true">{open?"▴":"▾"}</span>
    </button>
    {open&&<div className="scenarioBody">
      <p className="scenarioNote">
        Each one books and advances real jobs through the same dispatch rules the app uses. It
        replaces the clicking, not the logic. Running one clears the register first.
      </p>
      <ul className="scenarioList">
        {SCENARIOS.map(scenario=><li key={scenario.id}>
          <div>
            <strong>{scenario.name}</strong>
            <span>{scenario.sets}</span>
            <small>{scenario.then}</small>
          </div>
          <button type="button" onClick={()=>{onSeed(scenario.run(),scenario.signInAs);setRan(scenario.id);}}>
            {ran===scenario.id?"Set up ✓":"Set up"}
          </button>
        </li>)}
      </ul>
      <button type="button" className="scenarioReset" onClick={()=>{onSeed(resetRegister(),"customer");setRan(null);}}>
        Clear the register and start from the seed
      </button>
    </div>}
  </section>;
}

function DemoLogin({state,onLogin,onSeed,initialUsername="customer"}:{state:AppState;onLogin:(role:Role,identity:string)=>void;onSeed:(state:AppState,signInAs:string)=>void;initialUsername?:string}){
  const[username,setUsername]=useState(initialUsername);
  const[password,setPassword]=useState(DEMO_PASSWORD);
  const[showPassword,setShowPassword]=useState(false);
  const[error,setError]=useState("");
  const accounts=demoAccounts(state);
  const featured=accounts.filter(account=>["customer","ravi","admin"].includes(account.username));
  const active=accounts.find(account=>account.username===username.trim().toLowerCase());

  function choose(next:string){
    setUsername(next);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const account=authenticateDemoAccount(state,username,password);
    if(!account){
      setError("Incorrect username or password. Demo password is 12345.");
      return;
    }
    setError("");
    onLogin(account.role,account.userId);
  }

  return <main className="namedLoginShell">
    <section className="namedLoginCard">
      <div className="namedLoginIntro">
        <div className="namedBrand">K</div>
        <div className="namedLoginBrandCopy">
          <span>KAAMSABHA</span>
          <small>Fair work · trusted service · cooperative control</small>
        </div>
        <div className="namedLoginTrust">
          <span>✓ Account-bound roles</span>
          <span>✓ Shared cooperative register</span>
          <span>✓ Protected worker rules</span>
        </div>
      </div>
      <form className="namedLoginForm" onSubmit={submit}>
        <div className="namedLoginHeading">
          <p className="eyebrow">SECURE DEMO ACCESS</p>
          <h1>Welcome back</h1>
          <p>Sign in with a KaamSabha account. The account decides the workspace and permissions automatically.</p>
        </div>

        <div className="namedQuickAccess">
          <span className="namedFieldLabel">Quick demo accounts</span>
          <div className="namedQuickGrid">
            {featured.map(account=><button type="button" key={account.username} className={username===account.username?"namedQuickCard active":"namedQuickCard"} onClick={()=>choose(account.username)}>
              <small>{roleTitle(account.role)}</small>
              <strong>{account.displayName}</strong>
              <span>@{account.username}</span>
            </button>)}
          </div>
        </div>

        <label className="namedField">
          <span>Username</span>
          <input value={username} onChange={event=>{setUsername(event.target.value);setError("");}} autoComplete="username" placeholder="customer, ravi, admin…" />
        </label>

        <label className="namedField">
          <span>Password</span>
          <div className="namedPasswordInput">
            <input type={showPassword?"text":"password"} value={password} onChange={event=>{setPassword(event.target.value);setError("");}} autoComplete="current-password" inputMode="numeric" placeholder="Enter password" />
            <button type="button" onClick={()=>setShowPassword(value=>!value)}>{showPassword?"Hide":"Show"}</button>
          </div>
        </label>

        {error&&<p className="namedLoginError" role="alert">{error}</p>}

        <button className="namedOpen" type="submit">Sign in securely →</button>

        {active&&<div className="namedAccessPreview">
          <div><span>{roleTitle(active.role)}</span><strong>{active.displayName}</strong><small>{active.subtitle}</small></div>
          <ul>{rolePermissions[active.role].slice(0,3).map(item=><li key={item}>✓ {item}</li>)}</ul>
        </div>}

        <ScenarioPicker onSeed={onSeed}/>

        <div className="namedDemoHint">
          <strong>Demo credentials</strong>
          <span>Every account uses password <b>12345</b>.</span>
          <small>Workers can sign in with their first name in lowercase.</small>
        </div>
      </form>
    </section>
    <p className="namedSecurityNote">Demo-only authentication for the SIH prototype. Production requires server-side identity, hashed credentials, secure sessions and backend authorization.</p>
  </main>;
}

export function DemoShell(){
  const[loaded,setLoaded]=useState(false);
  const[session,setSession]=useState<AppState["session"]>(null);
  const[loginState,setLoginState]=useState<AppState|null>(null);
  const[appKey,setAppKey]=useState(0);
  const[usernameHint,setUsernameHint]=useState("customer");

  useEffect(()=>{
    const current=stateRepository.load();setLoginState(current);setSession(current.session);setLoaded(true);
    // The poll watches for a sign-out that happened in another part of the app. It must
    // compare by value: handing React a freshly parsed object every tick re-rendered the
    // whole workspace several times a second and tore down the observers below with it.
    let lastKey=current.session?`${current.session.role}:${current.session.userId}`:"";
    const timer=window.setInterval(()=>{
      const next=stateRepository.load();
      const key=next.session?`${next.session.role}:${next.session.userId}`:"";
      if(key===lastKey)return;
      lastKey=key;
      setSession(next.session);
      if(!next.session){setLoginState(next);}
    },700);
    return()=>window.clearInterval(timer);
  },[]);

  useEffect(()=>{
    if(!session)return;
    const decorateProductUi=()=>{
      const root=document.querySelector(".productShell");if(!root)return;
      const state=stateRepository.load();
      // Member IDs left in older components are swapped for names — in the reader's own script,
      // so a Marathi screen does not end up with one Latin name in the middle of it.
      const names=new Map(state.workers.map(w=>[w.id,state.locale==="en"?w.name:(w.nameDevanagari||w.name)]));
      // Leaflet rewrites its own DOM constantly while a map pans or re-measures. Walking
      // into it would make this run on every tile move for no benefit, so it is skipped.
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
        acceptNode:node=>(node.parentElement?.closest(".leafletHost")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT)
      });let node=walker.nextNode();
      while(node){
        const value=node.nodeValue??"";
        const replaced=value
          .replace(/\bW\d{2}\b/g,id=>names.get(id)??id)
          .replace(/\bpolicy-ai\b/g,"Policy Signal Monitor")
          .replace(/\bcustomer01\b/g,"Customer 01")
          .replace(/\badmin01\b/g,"Cooperative Admin");
        if(replaced!==value)node.nodeValue=replaced;node=walker.nextNode();
      }
      root.querySelectorAll<HTMLElement>(".caseRow p").forEach(note=>{
        const text=(note.textContent??"").trim();
        if(text.startsWith("POLICY_INSIGHT_JSON:")){
          note.dataset.machineMetadata="true";
          note.setAttribute("aria-hidden","true");
          note.textContent="";
        }
      });
    };
    decorateProductUi();
    const observer=new MutationObserver(records=>{
      // Ignore mutations that came from inside a map; they never carry member names.
      const relevant=records.some(record=>{
        const target=record.target.nodeType===Node.ELEMENT_NODE?record.target as Element:record.target.parentElement;
        return !target?.closest(".leafletHost");
      });
      if(relevant)decorateProductUi();
    });
    const root=document.querySelector(".productShell");if(root)observer.observe(root,{subtree:true,childList:true,characterData:true});
    return()=>observer.disconnect();
  },[session,appKey]);

  function logout(next:AppState){
    stateRepository.save(next);setLoginState(next);setSession(null);
  }

  function login(role:Role,identity:string){
    const base=stateRepository.load(),next=signIn(base,identity,role);stateRepository.save(next);setSession(next.session);setAppKey(k=>k+1);
  }

  /** A scenario replaces the register outright, so the login screen has to be told to redraw. */
  function seed(next:AppState,signInAs:string){
    stateRepository.save({...next,session:null});
    const reloaded=stateRepository.load();
    setLoginState(reloaded);
    setSession(null);
    setUsernameHint(signInAs);
    setAppKey(k=>k+1);
  }

  if(!loaded||!loginState)return <main className="shell loading">Loading KaamSabha…</main>;
  if(!session)return <DemoLogin key={appKey} state={loginState} onLogin={login} onSeed={seed} initialUsername={usernameHint}/>;
  return <div className="demoShellRoot"><ProductApp key={appKey} onSignOut={logout}/></div>;
}
