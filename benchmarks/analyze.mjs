import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const B=path.dirname(fileURLToPath(import.meta.url)),dir=path.resolve(process.argv[2]||B+'/results/release'),tasks=JSON.parse(fs.readFileSync(fs.existsSync(dir+'/tasks.json')?dir+'/tasks.json':B+'/tasks.json'));
const rows=[];const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;const geometric=xs=>Math.exp(mean(xs.map(Math.log)));
for(const name of fs.readdirSync(dir).sort()){
 const d=dir+'/'+name;if(!fs.existsSync(d+'/metrics.json'))continue;const m=JSON.parse(fs.readFileSync(d+'/metrics.json'));
 const task=tasks.find(t=>t.id===(m.task||'feedback_theme'));if(!task)throw Error('Unknown benchmark task');const gold=new Map(task.expected.map(x=>[x.id,x.label]));
 let output=[],answer={};try{output=fs.readFileSync(d+'/decisions.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse);answer=JSON.parse(fs.readFileSync(d+'/answer.json'));}catch{}
 const valid=output.every(x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')==='id,label'&&typeof x.id==='string');
 const labels=new Map(output.filter(x=>x&&typeof x==='object').map(x=>[x.id,x.label]));const wrong=[...gold].filter(([id,label])=>labels.get(id)!==label).map(([id])=>id);
 const correct=valid&&output.length===gold.size&&labels.size===gold.size&&[...labels.keys()].every(id=>gold.has(id))&&!wrong.length&&answer.output_path==='decisions.jsonl'&&answer.records===gold.size&&m.inputs_unchanged&&m.code===0&&!m.timedOut;
 const provider=fs.existsSync(d+'/provider.jsonl')?fs.readFileSync(d+'/provider.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
 const events=fs.readFileSync(d+'/events.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse),items=events.filter(x=>x.type==='item.completed').map(x=>x.item),calls=items.filter(x=>x.type==='mcp_tool_call'&&x.tool==='jev_label');
 const failed_commands=items.filter(x=>x.type==='command_execution'&&x.exit_code!==0).map(x=>({command:x.command,exit_code:x.exit_code}));
 const raw=provider.flatMap(x=>x.decisions||[]),raw_errors=raw.filter(x=>gold.get(x.id)!==x.label);
 const usage=Object.fromEntries(['input_tokens','cached_input_tokens','output_tokens'].map(k=>[k,m.usage.reduce((s,u)=>s+(u[k]||0),0)]));
 rows.push({...m,task:task.id,usage:undefined,...usage,uncached_input_tokens:usage.input_tokens-usage.cached_input_tokens,correct,incorrect_ids:wrong,provider_requests:provider.length,provider_failures:provider.filter(x=>x.status!==200).length,raw_errors,high_confidence_errors:raw_errors.filter(x=>x.confidence>=.8),provider_input_tokens:provider.reduce((s,x)=>s+(x.usage?.input_tokens||0),0),provider_output_tokens:provider.reduce((s,x)=>s+(x.usage?.output_tokens||0),0),actual_jev:calls.some(x=>x.status==='completed'&&!x.error&&!x.result?.isError)&&raw.length===gold.size&&new Set(raw.map(x=>x.id)).size===gold.size&&provider.every(x=>x.status===200),failed_commands});
}
const ratios=ps=>Object.fromEntries(['input_tokens','elapsed_ms','uncached_input_tokens','output_tokens'].map(k=>[k,ps.length?geometric(ps.map(p=>Math.max(1,p.N[k])/Math.max(1,p.A[k]))):null]));
const by_task=tasks.map(task=>{
 const subset=rows.filter(r=>r.task===task.id),pairs=[];
 for(let rep=0;rep<4;rep++){
  const a=subset.filter(r=>r.rep===rep&&r.arm==='A'),n=subset.filter(r=>r.rep===rep&&r.arm==='N');
  if(a.length===1&&n.length===1)pairs.push({A:a[0],N:n[0]});
 }
 const r=ratios(pairs),all_correct=subset.length===8&&subset.every(x=>x.correct),all_interventions_used_jev=pairs.length===4&&pairs.every(p=>p.N.actual_jev);
 return {task:task.id,sessions:subset.length,pairs:pairs.length,all_correct,all_interventions_used_jev,ratios:r,
 gate_pass:all_correct&&all_interventions_used_jev&&((r.input_tokens<=.8&&r.elapsed_ms<=1.1)||(r.elapsed_ms<=.8&&r.input_tokens<=1.1)),
 sensitivity:{note:'Post-hoc whole-pair exclusion for failed shell commands; primary keeps all assigned runs.',ratios:ratios(pairs.filter(p=>!p.A.failed_commands.length&&!p.N.failed_commands.length))}};
});
const result={sessions:rows.length,all_correct:by_task.every(t=>t.all_correct),all_interventions_used_jev:by_task.every(t=>t.all_interventions_used_jev),gate_pass:rows.length===tasks.length*8&&by_task.every(t=>t.gate_pass),by_task,rows};
fs.writeFileSync(dir+'/summary.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,rows:undefined},null,2));if(process.argv.includes('--require-pass')&&!result.gate_pass)process.exitCode=1;
