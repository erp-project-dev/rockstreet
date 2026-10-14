"""Metadata-only atlases for supplemental motion sheets; original pixels preserved."""
from pathlib import Path
from PIL import Image
import sys,json
for name in sys.argv[1:]:
 p=Path('public/assets/characters')/name;im=Image.open(p/f'{name}-motion.png');w,h=im.size;assert im.mode=='RGBA'
 rows=3 if name=='axel' else 2;expected=rows*4;a=im.getchannel('A').tobytes();seen=bytearray(w*h);bounds=[]
 for j,v in enumerate(a):
  if v<12 or seen[j]:continue
  seen[j]=1;stack=[j];n=0;l=w;t=h;r=b=0
  while stack:
   k=stack.pop();x=k%w;y=k//w;n+=1;l=min(l,x);t=min(t,y);r=max(r,x);b=max(b,y)
   for q in (k-1 if x else -1,k+1 if x<w-1 else -1,k-w if y else -1,k+w if y<h-1 else -1):
    if q>=0 and not seen[q] and a[q]>=12:seen[q]=1;stack.append(q)
  if n>4000:bounds.append((l,t,r+1,b+1))
 assert len(bounds)==expected,(name,len(bounds),bounds)
 bounds.sort(key=lambda c:(int(((c[1]+c[3])/2)/(h/rows)),int(((c[0]+c[2])/2)/(w/4))))
 old=json.loads((p/f'{name}-atlas.json').read_text())['frames']['0'];refheight=bounds[0][3]-bounds[0][1]
 size=round(old['sourceSize']['h']*refheight/old['frame']['h'])
 frames={}
 for i,(l,t,r,b) in enumerate(bounds):
  assert l>0 and t>0 and r<w and b<h,(name,i,'clipped')
  l-=2;t-=2;r+=2;b+=2;fw=r-l;fh=b-t
  x=round(size/2+l-(i%4+.5)*w/4);y=round(size*.92)-fh
  assert x>=0 and y>=0 and x+fw<=size,(name,i,'source bounds',size,x,y,fw,fh)
  frames[str(i)]={'frame':{'x':l,'y':t,'w':fw,'h':fh},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':x,'y':y,'w':fw,'h':fh},'sourceSize':{'w':size,'h':size}}
  for j,other in enumerate(bounds[:i]):
   ol,ot,orr,ob=other;assert min(r,orr)-max(l,ol)<=4 or min(b,ob)-max(t,ot)<=4,(name,i,j,'overlap')
 (p/f'{name}-motion-atlas.json').write_text(json.dumps({'frames':frames,'meta':{'image':f'{name}-motion.png','size':{'w':w,'h':h},'scale':'1'}},indent=2))
 print(name,expected,'isolated frames; matched original body scale; source',size)
