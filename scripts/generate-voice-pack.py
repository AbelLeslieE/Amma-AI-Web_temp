"""Generate only authored demo replies. No user recordings or conversations are uploaded."""
import asyncio,json,hashlib,os
from pathlib import Path
import edge_tts
ROOT=Path(__file__).resolve().parent.parent
async def main():
 lines=json.loads((ROOT/'scripts/voice-lines.json').read_text(encoding='utf-8'))
 out=ROOT/'public/audio';out.mkdir(exist_ok=True,parents=True)
 available=await edge_tts.list_voices()
 for name in {line['voice'] for line in lines}:
  voice=next((v for v in available if v['ShortName']==name),None)
  expected=next(line['gender'] for line in lines if line['voice']==name)
  if not voice or voice['Gender']!=expected:raise RuntimeError('Requested voice unavailable: '+name)
 semaphore=asyncio.Semaphore(4);done=0
 async def generate(line):
  nonlocal done
  path=out/(line['id']+'.mp3')
  if not path.exists() or path.stat().st_size<1000:
   async with semaphore:
    for attempt in range(2):
     try:
      temp=path.with_suffix('.part')
      await asyncio.wait_for(edge_tts.Communicate(line['text'],line['voice'],rate=line['rate'],pitch=line['pitch']).save(str(temp)),timeout=45)
      if temp.stat().st_size<1000:raise RuntimeError('Empty audio')
      os.replace(temp,path);break
     except Exception:
      if attempt:raise
      await asyncio.sleep(2)
  done+=1
  if done%10==0:print(f'Generated {done}/{len(lines)} clips',flush=True)
  return line['key'],{'src':'/audio/'+path.name,'voice':line['voice'],'language':line['language'],'gender':line['gender'],'speaker':line['speaker'],'rate':line['rate'],'pitch':line['pitch'],'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 results=await asyncio.gather(*(generate(line) for line in lines))
 manifest={'version':2,'provider':'Microsoft Edge neural speech','clips':dict(results)}
 tmp=ROOT/'lib/voice-manifest.tmp';tmp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8',newline='\n');os.replace(tmp,ROOT/'lib/voice-manifest.json')
 print(f'Complete: {len(results)} verified voice assets.',flush=True)
asyncio.run(main())
