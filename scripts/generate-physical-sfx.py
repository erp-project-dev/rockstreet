"""Only physical impacts, thrown picks and non-musical pickups. Requires ffmpeg."""
from pathlib import Path
import subprocess,array,wave,struct,math,json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/assets/audio/sfx';SRC=ROOT/'scripts/audio-sources';SR=44100
cache={};recipes={}
def load(path):
 if path not in cache:
  a=array.array('f');a.frombytes(subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar',str(SR),'-f','f32le','-']));cache[path]=a
 return cache[path]
def clip(path,d,gain=1,speed=1):
 a=load(path);peak=max(map(abs,a));onset=next((i for i in range(0,len(a),220) if max(map(abs,a[i:i+220]))>peak*.15),0);start=max(0,onset-100)
 out=[]
 for i in range(round(d*SR)):
  j=start+int(i*speed);v=a[j] if j<len(a) else 0
  out.append(v*gain*min(1,i/45,(d*SR-1-i)/(SR*.025)))
 return out,{'file':str(path.relative_to(ROOT)),'duration':d,'gain':gain,'speed':speed,'start':start/SR}
def ken(name,d,gain=1,speed=1):return clip(SRC/'kenney-impact/Audio'/(name+'.ogg'),d,gain,speed)
def punch(n,d,gain=1,speed=1):return clip(SRC/'pilot/qubodupPunch'/f'qubodupPunch{n:02}.flac',d,gain,speed)
def whoosh(d,speed=1):return clip(SRC/'pilot/whoosh.wav',d,1,speed)
def make(name,d,*layers):
 a=[0.] * round(d*SR)
 for b,_ in layers:
  for i,v in enumerate(b[:len(a)]):a[i]+=v
 dc=sum(a)/len(a);a=[v-dc for v in a];peak=max(map(abs,a)) or 1
 with wave.open(str(OUT/(name+'.wav')),'wb') as f:
  f.setparams((1,2,SR,len(a),'NONE','not compressed'));f.writeframes(struct.pack('<'+'h'*len(a),*[round(v/peak*.72*32767) for v in a]))
 recipes[name]=[m for _,m in layers]
for i in range(1,4):make(f'hit-{i}',.24,punch(i,.24))
make('heavy',.32,punch(4,.32,1,.88),ken('impactWood_heavy_001',.18,.23))
make('hurt',.22,punch(5,.22))
make('slam',.4,ken('impactWood_heavy_003',.4,1,.82),punch(4,.3,.4,.85))
make('break',.4,ken('impactWood_heavy_001',.35),ken('impactTin_medium_001',.4,.5))
make('pickThrow',.13,whoosh(.13,1.7))
make('pickHit',.16,punch(2,.16,.6,1.15),ken('impactMetal_light_000',.14,.18,1.5))
make('cash',.14,ken('impactMetal_light_002',.14,1,1.3))
make('heal',.12,ken('impactGeneric_light_001',.12,1,1.25))
make('energy',.15,ken('impactTin_medium_001',.15,1,1.8))
make('life',.18,ken('impactGeneric_light_003',.18,1,1.2))
make('boost',.18,ken('impactPlate_light_001',.18,1,1.4))
(ROOT/'scripts/physical-sfx-recipes.json').write_text(json.dumps(recipes,indent=2))
print('Generated',len(recipes),'non-musical effects')
