import { describe, expect, it } from "vitest";
import type { SiteAdapter } from "../src/adapters/site-adapter";
import { NovelUIRuntime } from "../src/core/observer";
import { RendererRegistry, type NovelUIRenderer } from "../src/core/renderer-registry";

const raw='[[novel-ui]] {"schema":"novel-ui","version":"1.0","component":"test","variant":"card","props":{"text":"UI"}} [[/novel-ui]]';
const TestRenderer:NovelUIRenderer<{text:string}>={component:"test",variant:"card",styles:"",validate(value):value is {text:string}{return typeof (value as {text?:unknown})?.text==="string";},render(props){const el=document.createElement("div");el.textContent=props.text;return el;}};

describe("Novel UI runtime",()=>{
  it("renders at the marker position only once",()=>{
    document.body.innerHTML=`<article data-message-author-role="assistant"><p>before ${raw} after</p></article>`;
    const message=document.querySelector("article") as HTMLElement;
    let notify:(messages:HTMLElement[])=>void=()=>{};
    const adapter:SiteAdapter={name:"test",match:()=>true,getAssistantMessages:()=>[message],observe(callback){notify=callback;return()=>{};}};
    const registry=new RendererRegistry();registry.register(TestRenderer);
    new NovelUIRuntime(adapter,registry).start();
    notify([message]);
    new NovelUIRuntime(adapter,registry).start();
    expect(message.querySelectorAll('[data-novel-ui-runtime="true"]')).toHaveLength(1);
    const source=message.querySelector('[data-novel-ui-raw="true"]') as HTMLElement;
    expect(source.hidden).toBe(true);
    expect(source.nextElementSibling?.hasAttribute("data-novel-ui-runtime")).toBe(true);
  });

  it("leaves unsupported blocks visible",()=>{
    document.body.innerHTML=`<article>${raw.replace('"test"','"missing"')}</article>`;
    const message=document.querySelector("article") as HTMLElement;
    const adapter:SiteAdapter={name:"test",match:()=>true,getAssistantMessages:()=>[message],observe:()=>()=>{}};
    new NovelUIRuntime(adapter,new RendererRegistry()).start();
    expect(message.textContent).toContain("[[novel-ui]]");
  });

  it("renders a new block appended to an already processed streaming message",()=>{
    document.body.innerHTML=`<article data-message-author-role="assistant"><p>${raw}</p></article>`;
    const message=document.querySelector("article") as HTMLElement;
    let notify:(messages:HTMLElement[])=>void=()=>{};
    const adapter:SiteAdapter={name:"test",match:()=>true,getAssistantMessages:()=>[message],observe(callback){notify=callback;return()=>{};}};
    const registry=new RendererRegistry();registry.register(TestRenderer);
    new NovelUIRuntime(adapter,registry).start();

    const second=raw.replace('"UI"','"SECOND"');
    message.append(document.createTextNode(second));
    notify([message]);

    expect(message.querySelectorAll('[data-novel-ui-runtime="true"]')).toHaveLength(2);
    expect(message.textContent).toContain("SECOND");
  });
});
