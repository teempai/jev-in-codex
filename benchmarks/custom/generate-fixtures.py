from pathlib import Path
import json, random, hashlib
B=Path('benchmarks/custom'); tasks=[]
policies={
'action_needed':{'question':'Does the recipient have an outstanding requested action in this message?','criteria':{'action':'The recipient is explicitly asked to do something or answer a question, and that request has not been withdrawn or completed.','no_action':'Informational, resolved or cancelled requests, or actions assigned only to someone else. A past request alone does not count.'}},
'sentiment':{'question':'What is the writer\'s overall current assessment of their experience?','criteria':{'positive':'The writer clearly endorses the current experience overall, even if they describe an earlier problem or a minor caveat.','negative':'The writer clearly criticizes the current experience overall, even if they mention an earlier success or a minor benefit.','neutral':'Factual description without an overall positive or negative assessment, or explicitly balanced and undecided.'}},
'document_route':{'question':'Which collection should hold this document, based on its main current purpose rather than incidental mentions?','criteria':{'engineering':'Technical implementation, system operations, debugging or deployment instructions.','research':'Study design, experiment methods or interpretation of research observations.','commercial':'Sales, customer contracts, purchasing or billing operations.','people':'Recruitment, onboarding, staff development or leave administration.','other':'None of those purposes, including facilities, community events or personal notes.'}}
}
contexts=[('inventory export','the warehouse team','a Monday handover'),('calendar sync','the support desk','the next shift'),('accessibility audit','the design group','the review session'),('translation workspace','the regional office','the monthly meeting'),('image archive','the editorial team','the publishing window'),('delivery dashboard','the logistics group','the afternoon briefing'),('membership portal','the service desk','the weekly check-in'),('training library','the learning team','the next cohort'),('equipment register','the facilities team','the quarterly review'),('survey workflow','the insights team','the next study'),('partner directory','the alliances group','the upcoming handover'),('booking calendar','the reception team','the next opening'),('volunteer roster','the community team','the weekend session'),('budget workbook','the planning team','the next forecast'),('release checklist','the product group','the next launch'),('incident archive','the operations team','the retrospective')]
for name,policy in policies.items():
 rows=[]; gold=[]
 for i,(topic,team,event) in enumerate(contexts):
  for j in range(4):
   intro=f'This note concerns the {topic} used by {team}. It follows our discussion about {event}. The shared folder includes the earlier working copy and a dated attachment, so readers can distinguish the current situation from the previous version. '
   if name=='action_needed':
    endings=[f'Please inspect the attached changes and send me your approval before {event}. I have prepared the background, but your review is still outstanding. No one else can supply your response.',f'I had asked you to inspect the attached changes before {event}. That request is now withdrawn because we are keeping the previous version. This message is for your information; nothing is required from you.',f'Morgan will inspect the attached changes and supply approval before {event}. Your earlier contribution is complete. I am copying you so that you know who owns the remaining work; there is nothing further for you to do.',f'You already supplied the first review, and Morgan will update the attachment. There is one remaining question for you: which of the two proposed dates can you attend? Please reply with your choice so we can finish scheduling {event}.']
    label=['action','no_action','no_action','action'][j]; text=intro+endings[j]
   elif name=='sentiment':
    endings=[f'The first attempt was frustrating and I reported several problems. Those have been fixed. After using the current version throughout the week, I am pleased with the result and would recommend it to colleagues. The remaining cosmetic detail does not change that assessment.',f'The first demonstration impressed me and the presentation is still attractive. In daily use, however, the experience has been consistently disappointing. I would not recommend the current version; the small visual improvement does not make up for the difficulties.',f'The current version has three sections and a revised summary view. I tried it on Tuesday and Thursday using the same sample records. This note records the dates and the steps followed. I have not formed an overall opinion about the experience.',f'There are advantages and disadvantages in the current version. Some parts take less time while others take more. I am still undecided about whether the overall experience is good or bad, and I want another week of ordinary use before reaching a conclusion.']
    label=['positive','negative','neutral','neutral'][j];text=intro+endings[j]
   else:
    label=['engineering','research','commercial','people','other'][(i*4+j)%5]
    main={
     'engineering':f'The main body is a runbook for diagnosing timeout errors in the {topic}. It gives configuration keys, log locations, rollback commands and a sequence for verifying the deployed service. The closing note mentions the sales team and staff training, but those are downstream readers, not the purpose of this document.',
     'research':f'The main body defines a controlled study of how users interact with the {topic}. It specifies the sampling method, comparison groups, outcome measures and limits on interpreting the observations. A price estimate and a server description appear in the appendix only to explain the study resources.',
     'commercial':f'The main body sets out a renewal proposal for the {topic}. It lists the service quantities, quoted fees, purchasing milestones and the customer acceptance process. An engineering diagram and a staff contact list are attachments, included to support the purchasing decision rather than to teach system operation.',
     'people':f'The main body is an induction plan for new staff joining {team}. It assigns mentors, lists orientation sessions and explains how managers record completion and arrange follow-up development conversations. The {topic} appears as one example of equipment used during training, alongside a short budget note.',
     'other':f'The main body coordinates a neighborhood gathering near the office. It covers room layout, refreshments, cleanup volunteers and directions for visitors. The {topic}, a research poster and a customer brochure are mentioned only as objects to move off the tables. It is not a staff induction or work training event.'}
    text=intro+main[label]
   ident='item-'+hashlib.sha256(f'{name}:{i}:{j}:fixed-v1'.encode()).hexdigest()[:12]
   rows.append({'id':ident,'text':text});gold.append({'id':ident,'label':label})
 random.Random(9321).shuffle(rows); byid={x['id']:x for x in gold};gold=[byid[x['id']] for x in rows]
 d=B/'fixtures'/name;d.mkdir(exist_ok=True)
 (d/'items.jsonl').write_text(''.join(json.dumps(x)+'\n' for x in rows))
 (d/'policy.json').write_text(json.dumps(policy,indent=2)+'\n')
 prompt='Classify every record in items.jsonl under the supplied policy. Write decisions.jsonl with exactly one JSON object per input record, containing only id and label. Keep original IDs. Do not modify input files or take external actions. Return the output filename and number of records. The authoritative decision policy is supplied here so no separate policy-file read is needed: '+json.dumps(policy)
 tasks.append({'id':name,'policy':policy,'prompt':prompt,'expected':gold})
# Preserve the original known feedback data as a regression task, through the preset interface.
import shutil
shutil.copytree('benchmarks/fixtures',B/'fixtures/feedback_theme',dirs_exist_ok=True)
f=json.loads(Path('benchmarks/tasks.json').read_text())[0];f['policy']='feedback_theme';tasks.append(f)
(B/'tasks.json').write_text(json.dumps(tasks,indent=2)+'\n')
