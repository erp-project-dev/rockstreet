"""Build metadata only, preserving generated PNG pixels. Requires Pillow.
Usage: python3 scripts/build-character-atlas.py character-name[:rows] ...
Default rows=4; existing punk/Sid sheets use :3. Columns are always four.
"""
from PIL import Image
from pathlib import Path
import sys,json
for arg in sys.argv[1:]:
 name, _, rows_text = arg.partition(':'); rows = int(rows_text or '4')
 p=Path('public/assets/characters')/name;im=Image.open(p/(name+'-sheet.png'));w,h=im.size;assert im.mode=='RGBA';data=im.getchannel('A').tobytes();seen=bytearray(w*h);comps=[]
 for j,v in enumerate(data):
  if v<12 or seen[j]:continue
  seen[j]=1;stack=[j];n=0;l=w;t=h;r=b=0
  while stack:
   k=stack.pop();x=k%w;y=k//w;n+=1;l=min(l,x);t=min(t,y);r=max(r,x);b=max(b,y)
   for q in (k-1 if x else -1,k+1 if x<w-1 else -1,k-w if y else -1,k+w if y<h-1 else -1):
    if q>=0 and not seen[q] and data[q]>=12:seen[q]=1;stack.append(q)
  if n>4000:comps.append((l,t,r+1,b+1))
 assert len(comps)==4*rows,(name,len(comps))
 comps.sort(key=lambda c:(int(((c[1]+c[3])/2)/(h/rows)),int(((c[0]+c[2])/2)/(w/4))))
 frames={};size=512
 for i,(l,t,r,b) in enumerate(comps):
  assert l>0 and t>0 and r<w and b<h,(name,i,'clipped',l,t,r,b)
  l=max(0,l-2);t=max(0,t-2);r=min(w,r+2);b=min(h,b+2);fw=r-l;fh=b-t
  # Center each column at the same character pivot and align grounded soles.
  x=round(size/2+l-(i%4+.5)*w/4);y=round(size*.92)-fh
  assert 0<=x and x+fw<=size and y>=0,(name,i,x,y,fw,fh)
  frames[str(i)]={'frame':{'x':l,'y':t,'w':fw,'h':fh},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':x,'y':y,'w':fw,'h':fh},'sourceSize':{'w':size,'h':size}}
 (p/(name+'-atlas.json')).write_text(json.dumps({'frames':frames,'meta':{'image':name+'-sheet.png','size':{'w':w,'h':h},'scale':'1'}},indent=2))
 print(name, ': isolated complete silhouettes, transparency and atlas bounds verified.')
