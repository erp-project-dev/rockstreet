"""Build dash atlas metadata without modifying the source PNG."""
from PIL import Image
from pathlib import Path
import json
p=Path('public/assets/characters/axel');im=Image.open(p/'axel-dash-sheet.png');assert im.mode=='RGBA'
w,h=im.size
data=im.getchannel('A').tobytes();seen=bytearray(w*h);bounds=[]
for j,v in enumerate(data):
 if v<12 or seen[j]:continue
 seen[j]=1;stack=[j];n=0;l=w;t=h;r=b=0
 while stack:
  k=stack.pop();x=k%w;y=k//w;n+=1;l=min(l,x);t=min(t,y);r=max(r,x);b=max(b,y)
  for q in (k-1 if x else -1,k+1 if x<w-1 else -1,k-w if y else -1,k+w if y<h-1 else -1):
   if q>=0 and not seen[q] and data[q]>=12:seen[q]=1;stack.append(q)
 if n>4000:bounds.append((l-2,t-2,r+3,b+3))
assert len(bounds)==3,bounds
bounds.sort()
for l,t,r,b in bounds:assert l>0 and t>0 and r<w and b<h
size=round(max(b-t for l,t,r,b in bounds)*384/265)
frames={}
for i,(l,t,r,b) in enumerate(bounds):
 fw=r-l;fh=b-t;x=round(size/2-fw/2);y=round(size*.92)-fh
 assert x>=0 and y>=0 and x+fw<=size
 frames[str(i)]={'frame':{'x':l,'y':t,'w':fw,'h':fh},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':x,'y':y,'w':fw,'h':fh},'sourceSize':{'w':size,'h':size}}
(p/'axel-dash-atlas.json').write_text(json.dumps({'frames':frames,'meta':{'image':'axel-dash-sheet.png','size':{'w':w,'h':h},'scale':'1'}},indent=2))
print('Three complete transparent frames; soles aligned; source size',size)
