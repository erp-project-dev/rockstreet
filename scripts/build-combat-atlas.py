"""Trim metadata only for single transparent combat objects and effects."""
from pathlib import Path
from PIL import Image
import json
for folder,names in [('projectiles',['bottle','contract','note']),('effects',['impact','wave','ring','bolt'])]:
 for name in names:
  p=Path('public/assets')/folder;im=Image.open(p/f'{name}.png');assert im.mode=='RGBA',(name,im.mode)
  a=im.getchannel('A');assert a.getextrema()[0]==0
  # Ignore imperceptible alpha noise but include the visible glow.
  box=a.point(lambda v:255 if v>=6 else 0).getbbox();assert box
  l,t,r,b=box;assert l>0 and t>0 and r<im.width and b<im.height,(name,'clipped',box)
  l=max(0,l-2);t=max(0,t-2);r=min(im.width,r+2);b=min(im.height,b+2)
  frame={'frame':{'x':l,'y':t,'w':r-l,'h':b-t},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':l,'y':t,'w':r-l,'h':b-t},'sourceSize':{'w':im.width,'h':im.height}}
  (p/f'{name}-atlas.json').write_text(json.dumps({'frames':{'0':frame},'meta':{'image':f'{name}.png','size':{'w':im.width,'h':im.height},'scale':'1'}},indent=2))
  print(name,'alpha and crop verified',box)
