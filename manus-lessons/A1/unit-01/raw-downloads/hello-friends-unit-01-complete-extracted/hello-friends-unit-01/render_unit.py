from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, textwrap, shutil

ROOT = Path('/home/ubuntu/hello-friends-unit-01')
W, H = 1920, 1080
C = {
    'navy':'#173B5C','ink':'#173043','cream':'#FFF8E9','paper':'#FFFDF7',
    'sky':'#A7E6F4','blue':'#57B6DA','mint':'#72CDBD','coral':'#FF8C78',
    'yellow':'#FFD36E','lav':'#A89ADD','green':'#78B85A','teal':'#24A6A6',
    'red':'#E96062','sand':'#F2DFC0','brown':'#A66A45','white':'#FFFFFF',
    'darkmint':'#2B827B','grey':'#637280','pink':'#F7B4C4'
}
FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_REG = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_ITAL = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf'

def font(size, bold=False, italic=False):
    return ImageFont.truetype(FONT_BOLD if bold else (FONT_ITAL if italic else FONT_REG), size)

def rgba(h):
    h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))+(255,)

def lighten(h, amt=0.2):
    r,g,b,_=rgba(h); return '#%02x%02x%02x'%(int(r+(255-r)*amt),int(g+(255-g)*amt),int(b+(255-b)*amt))

def image():
    im=Image.new('RGBA',(W,H),rgba(C['cream']))
    d=ImageDraw.Draw(im)
    # subtle radial-ish cream field
    for y in range(H):
        t=y/H
        col=(255,int(248-12*t),int(233-6*t),255)
        d.line((0,y,W,y),fill=col)
    return im

def rr(d, box, radius, fill, outline=None, width=3):
    d.rounded_rectangle(tuple(map(int,box)), radius=radius, fill=rgba(fill) if isinstance(fill,str) else fill, outline=rgba(outline) if isinstance(outline,str) else outline, width=width)

def shadow(im, box, radius=28, offset=(0,10), alpha=55):
    layer=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(layer)
    b=(box[0]+offset[0],box[1]+offset[1],box[2]+offset[0],box[3]+offset[1])
    d.rounded_rectangle(b,radius,fill=(23,48,67,alpha))
    im.alpha_composite(layer.filter(ImageFilter.GaussianBlur(10)))

def text(d, xy, s, size, fill=C['ink'], bold=False, anchor='la', max_width=None, spacing=6):
    f=font(size,bold)
    if max_width:
        words=s.split(); lines=[]; line=''
        for word in words:
            probe=(line+' '+word).strip()
            if d.textlength(probe,font=f)<=max_width or not line: line=probe
            else: lines.append(line); line=word
        if line: lines.append(line)
        s='\n'.join(lines)
    d.multiline_text(xy,s,font=f,fill=rgba(fill),anchor=anchor,spacing=spacing)

def chip(im, x,y,label, color='navy', width=None, icon=None, size=26):
    d=ImageDraw.Draw(im)
    f=font(size,True); tw=d.textlength(label,font=f)
    ww=width or int(tw+72+(36 if icon else 0)); hh=size+34
    shadow(im,(x,y,x+ww,y+hh),hh//2,(0,5),40); d=ImageDraw.Draw(im)
    rr(d,(x,y,x+ww,y+hh),hh//2,C[color])
    if icon:
        d.ellipse((x+19,y+13,x+45,y+39),fill=rgba(C['white']))
        text(d,(x+32,y+27),icon,19,C[color],True,'mm')
    text(d,(x+57 if icon else x+32,y+hh/2),label,size,C['white'],True,'lm')
    return ww,hh

def header(im, lesson, title, minutes, progress, objective):
    d=ImageDraw.Draw(im)
    # navy bar
    d.rounded_rectangle((28,22,W-28,130),30,fill=rgba(C['navy']))
    d.rounded_rectangle((52,42,275,108),22,fill=rgba(C['coral']))
    text(d,(163,75),f'UNIT 01  •  L{lesson:02d}',18,C['white'],True,'mm')
    text(d,(300,73),title,42,C['white'],True,'lm')
    chip(im,1470,44,f'~{minutes} min','mint',width=165,icon='◷',size=20)
    # progress dots
    for i in range(10):
        x=1680+i*18
        d.ellipse((x,66,x+12,78),fill=rgba(C['yellow'] if i<progress else '#5D7590'))
    # objective ribbon
    rr(d,(54,145,910,205),22,C['paper'],C['navy'],3)
    text(d,(83,175),'GOAL',18,C['coral'],True,'lm')
    text(d,(167,175),objective,23,C['ink'],True,'lm')

def footer(im, hint='POINT • MOVE • SAY'):
    d=ImageDraw.Draw(im)
    d.line((55,1010,1865,1010),fill=rgba('#D8CBAF'),width=3)
    text(d,(63,1040),hint,18,C['grey'],True,'lm')
    text(d,(1857,1040),'SUNBEAM SCHOOL  •  HELLO, FRIENDS!',17,C['grey'],True,'rm')

def task_panel(im, x,y,w,h, title, instruction, color='sky', step=None):
    shadow(im,(x,y,x+w,y+h),28,(0,10),50); d=ImageDraw.Draw(im)
    rr(d,(x,y,x+w,y+h),28,C['paper'],C['navy'],4)
    rr(d,(x+18,y+18,x+w-18,y+75),18,C[color])
    if step is not None:
        d.ellipse((x+34,y+27,x+76,y+69),fill=rgba(C['navy']))
        text(d,(x+55,y+48),str(step),22,C['white'],True,'mm')
        text(d,(x+94,y+48),title,25,C['navy'],True,'lm')
    else: text(d,(x+38,y+48),title,25,C['navy'],True,'lm')
    text(d,(x+34,y+98),instruction,25,C['ink'],False,'la',w-68,8)

def bubble(im,x,y,w,h,lines,color='white',tail='bottom',outline='navy',size=34):
    shadow(im,(x,y,x+w,y+h),26,(0,8),45); d=ImageDraw.Draw(im)
    rr(d,(x,y,x+w,y+h),26,C[color],C[outline],4)
    if tail=='bottom': d.polygon([(x+w*.36,y+h),(x+w*.47,y+h),(x+w*.41,y+h+25)],fill=rgba(C[color]),outline=rgba(C[outline]))
    if tail=='left': d.polygon([(x,y+h*.48),(x,y+h*.63),(x-28,y+h*.58)],fill=rgba(C[color]),outline=rgba(C[outline]))
    if tail=='right': d.polygon([(x+w,y+h*.48),(x+w,y+h*.63),(x+w+28,y+h*.58)],fill=rgba(C[color]),outline=rgba(C[outline]))
    d=ImageDraw.Draw(im); text(d,(x+w/2,y+h/2),lines,size,C['ink'],True,'mm',w-42,6)

def star(d,x,y,r,fill):
    pts=[]
    for i in range(10):
        a=-math.pi/2+i*math.pi/5; rr_=r if i%2==0 else r*.46
        pts.append((x+math.cos(a)*rr_,y+math.sin(a)*rr_))
    d.polygon(pts,fill=rgba(fill))

def arrow(d, x1,y1,x2,y2, color='coral', width=8):
    d.line((x1,y1,x2,y2),fill=rgba(C[color]),width=width)
    a=math.atan2(y2-y1,x2-x1); L=23
    d.polygon([(x2,y2),(x2-L*math.cos(a-.55),y2-L*math.sin(a-.55)),(x2-L*math.cos(a+.55),y2-L*math.sin(a+.55))],fill=rgba(C[color]))

def pip(im,x,y,s=1,pose='fly'):
    d=ImageDraw.Draw(im)
    # wing/body
    d.ellipse((x-44*s,y-18*s,x+14*s,y+32*s),fill=rgba(C['teal']),outline=rgba(C['navy']),width=int(3*s))
    d.ellipse((x-10*s,y-36*s,x+52*s,y+30*s),fill=rgba(C['teal']),outline=rgba(C['navy']),width=int(3*s))
    d.ellipse((x+7*s,y-23*s,x+15*s,y-14*s),fill=rgba(C['white']))
    d.ellipse((x+32*s,y-23*s,x+40*s,y-14*s),fill=rgba(C['white']))
    d.ellipse((x+10*s,y-21*s,x+14*s,y-17*s),fill=rgba(C['navy']))
    d.ellipse((x+35*s,y-21*s,x+39*s,y-17*s),fill=rgba(C['navy']))
    d.polygon([(x+52*s,y-7*s),(x+66*s,y),(x+52*s,y+7*s)],fill=rgba(C['yellow']),outline=rgba(C['navy']))
    # bell
    d.ellipse((x+11*s,y+23*s,x+28*s,y+41*s),fill=rgba(C['yellow']),outline=rgba(C['navy']),width=max(1,int(2*s)))
    d.line((x+20*s,y+18*s,x+20*s,y+25*s),fill=rgba(C['navy']),width=max(1,int(2*s)))

def character(im,name,x,y,s=1,pose='wave',label=None):
    d=ImageDraw.Draw(im)
    spec={
      'Maya': {'skin':'#9B5E3F','hair':'#17151B','shirt':'#FF8C78','skirt':'#32466A','acc':'#FFD36E'},
      'Leo': {'skin':'#754325','hair':'#231B1B','shirt':'#72CDBD','skirt':'#29415D','acc':'#A7E6F4'},
      'Jun': {'skin':'#E6B487','hair':'#1E2028','shirt':'#5686D7','skirt':'#C99D58','acc':'#FFD36E'},
      'Nia': {'skin':'#F0C7A5','hair':'#9E4D28','shirt':'#A89ADD','skirt':'#A89ADD','acc':'#72CDBD'}
    }[name]
    # ground shadow
    d.ellipse((x-55*s,y+213*s,x+58*s,y+231*s),fill=(40,60,75,35))
    # legs / shoes
    if name=='Nia':
        d.rectangle((x-31*s,y+172*s,x-6*s,y+211*s),fill=rgba(spec['skin']))
        d.rectangle((x+6*s,y+172*s,x+31*s,y+211*s),fill=rgba(spec['skin']))
    else:
        d.polygon([(x-39*s,y+160*s),(x-2*s,y+160*s),(x-12*s,y+215*s),(x-45*s,y+215*s)],fill=rgba(spec['skirt']),outline=rgba(C['navy']))
        d.polygon([(x+2*s,y+160*s),(x+39*s,y+160*s),(x+45*s,y+215*s),(x+12*s,y+215*s)],fill=rgba(spec['skirt']),outline=rgba(C['navy']))
    d.ellipse((x-51*s,y+204*s,x-7*s,y+222*s),fill=rgba(C['white']),outline=rgba(C['navy']))
    d.ellipse((x+7*s,y+204*s,x+51*s,y+222*s),fill=rgba(C['white']),outline=rgba(C['navy']))
    # backpack behind
    d.rounded_rectangle((x+38*s,y+74*s,x+69*s,y+160*s),radius=int(14*s),fill=rgba(spec['acc']),outline=rgba(C['navy']),width=max(1,int(3*s)))
    # body
    if name=='Nia':
        d.polygon([(x-50*s,y+93*s),(x+50*s,y+93*s),(x+57*s,y+175*s),(x-58*s,y+175*s)],fill=rgba(spec['shirt']),outline=rgba(C['navy']))
    else:
        d.rounded_rectangle((x-48*s,y+94*s,x+48*s,y+175*s),radius=int(18*s),fill=rgba(spec['shirt']),outline=rgba(C['navy']),width=max(1,int(3*s)))
    # arms
    if pose=='wave':
        d.line((x-40*s,y+112*s,x-83*s,y+48*s),fill=rgba(spec['shirt']),width=max(9,int(22*s)))
        d.ellipse((x-95*s,y+35*s,x-74*s,y+58*s),fill=rgba(spec['skin']),outline=rgba(C['navy']),width=max(1,int(2*s)))
        d.line((x+42*s,y+112*s,x+69*s,y+138*s),fill=rgba(spec['shirt']),width=max(9,int(22*s)))
        d.ellipse((x+60*s,y+130*s,x+80*s,y+150*s),fill=rgba(spec['skin']),outline=rgba(C['navy']),width=max(1,int(2*s)))
    elif pose=='bye':
        d.line((x+40*s,y+110*s,x+81*s,y+58*s),fill=rgba(spec['shirt']),width=max(9,int(22*s)))
        d.ellipse((x+72*s,y+43*s,x+94*s,y+67*s),fill=rgba(spec['skin']),outline=rgba(C['navy']),width=max(1,int(2*s)))
    elif pose=='point':
        d.line((x+43*s,y+114*s,x+92*s,y+106*s),fill=rgba(spec['shirt']),width=max(9,int(22*s)))
        d.ellipse((x+84*s,y+97*s,x+104*s,y+116*s),fill=rgba(spec['skin']),outline=rgba(C['navy']),width=max(1,int(2*s)))
    elif pose=='hands':
        d.line((x-39*s,y+117*s,x-65*s,y+145*s),fill=rgba(spec['shirt']),width=max(9,int(22*s)))
        d.line((x+39*s,y+117*s,x+65*s,y+145*s),fill=rgba(spec['shirt']),width=max(9,int(22*s)))
        d.ellipse((x-76*s,y+138*s,x-57*s,y+156*s),fill=rgba(spec['skin']),outline=rgba(C['navy']))
        d.ellipse((x+57*s,y+138*s,x+76*s,y+156*s),fill=rgba(spec['skin']),outline=rgba(C['navy']))
    # neck / head
    d.rectangle((x-13*s,y+76*s,x+13*s,y+101*s),fill=rgba(spec['skin']))
    d.ellipse((x-51*s,y-4*s,x+51*s,y+103*s),fill=rgba(spec['skin']),outline=rgba(C['navy']),width=max(1,int(3*s)))
    # hair variations
    if name=='Maya':
        d.ellipse((x-56*s,y-33*s,x-3*s,y+22*s),fill=rgba(spec['hair']),outline=rgba(C['navy']))
        d.ellipse((x+3*s,y-33*s,x+56*s,y+22*s),fill=rgba(spec['hair']),outline=rgba(C['navy']))
        d.arc((x-49*s,y-11*s,x+49*s,y+63*s),180,355,fill=rgba(spec['hair']),width=max(3,int(16*s)))
    elif name=='Leo':
        for a in range(-38,39,18):
            d.ellipse((x+(a-12)*s,y-16*s,x+(a+16)*s,y+17*s),fill=rgba(spec['hair']),outline=rgba(C['navy']))
    elif name=='Jun':
        d.pieslice((x-54*s,y-20*s,x+54*s,y+68*s),180,360,fill=rgba(spec['hair']),outline=rgba(C['navy']))
        d.polygon([(x-49*s,y+5*s),(x+49*s,y+5*s),(x+38*s,y+28*s),(x-35*s,y+18*s)],fill=rgba(spec['hair']))
        # glasses
        d.ellipse((x-39*s,y+35*s,x-5*s,y+67*s),outline=rgba(C['yellow']),width=max(2,int(4*s)))
        d.ellipse((x+5*s,y+35*s,x+39*s,y+67*s),outline=rgba(C['yellow']),width=max(2,int(4*s)))
        d.line((x-5*s,y+50*s,x+5*s,y+50*s),fill=rgba(C['yellow']),width=max(1,int(3*s)))
    else:
        d.arc((x-55*s,y-28*s,x+55*s,y+92*s),165,375,fill=rgba(spec['hair']),width=max(4,int(18*s)))
        d.ellipse((x+35*s,y-4*s,x+58*s,y+21*s),fill=rgba(spec['hair']))
        d.polygon([(x+37*s,y-12*s),(x+63*s,y-27*s),(x+60*s,y+3*s)],fill=rgba(C['lav']))
    # eyes mouth
    d.ellipse((x-24*s,y+42*s,x-14*s,y+55*s),fill=rgba(C['white'])); d.ellipse((x+14*s,y+42*s,x+24*s,y+55*s),fill=rgba(C['white']))
    d.ellipse((x-20*s,y+45*s,x-16*s,y+51*s),fill=rgba(C['navy'])); d.ellipse((x+16*s,y+45*s,x+20*s,y+51*s),fill=rgba(C['navy']))
    d.arc((x-18*s,y+55*s,x+18*s,y+76*s),0,180,fill=rgba(C['red']),width=max(1,int(3*s)))
    if label:
        tag(im,x-75*s,y+232*s,150*s,46*s,label,C['yellow'])

def tag(im,x,y,w,h,label,color='yellow',small=False):
    d=ImageDraw.Draw(im); shadow(im,(x,y,x+w,y+h),16,(0,5),38); d=ImageDraw.Draw(im)
    fill_color = color if isinstance(color, str) and color.startswith('#') else C[color]
    rr(d,(x,y,x+w,y+h),16,fill_color,C['navy'],3)
    d.ellipse((x+16,y+h/2-6,x+28,y+h/2+6),fill=rgba(C['paper']))
    text(d,(x+w/2+8,y+h/2),label,int(min(30,h*.52)),C['navy'],True,'mm',w-42)

def door(im,x,y,w,h,open_side='left',color='teal',label=None):
    d=ImageDraw.Draw(im)
    rr(d,(x,y,x+w,y+h),18,'#E9D6B3',C['navy'],5)
    rr(d,(x+15,y+15,x+w-15,y+h-15),13,C[color],C['navy'],4)
    d.rectangle((x+w*.18,y+h*.20,x+w*.82,y+h*.50),fill=rgba(C['sky']),outline=rgba(C['navy']),width=3)
    d.line((x+w*.5,y+h*.20,x+w*.5,y+h*.50),fill=rgba(C['navy']),width=3)
    d.line((x+w*.18,y+h*.35,x+w*.82,y+h*.35),fill=rgba(C['navy']),width=3)
    d.ellipse((x+w*.72,y+h*.63,x+w*.78,y+h*.69),fill=rgba(C['yellow']),outline=rgba(C['navy']))
    if label: chip(im,x+18,y+h+16,label,color,width=w-36,size=22)

def flower(im,x,y,s=1,petal='pink',center='yellow',closed=False):
    d=ImageDraw.Draw(im)
    d.line((x,y+35*s,x,y+124*s),fill=rgba(C['green']),width=max(3,int(10*s)))
    d.ellipse((x-28*s,y+75*s,x,y+95*s),fill=rgba(C['green']),outline=rgba(C['darkmint']))
    d.ellipse((x,y+91*s,x+29*s,y+110*s),fill=rgba(C['green']),outline=rgba(C['darkmint']))
    if closed:
        d.polygon([(x,y+18*s),(x-27*s,y+52*s),(x,y+60*s),(x+27*s,y+52*s)],fill=rgba(C[petal]),outline=rgba(C['navy']))
    else:
        for a in range(0,360,72):
            xx=x+math.cos(math.radians(a))*26*s; yy=y+math.sin(math.radians(a))*26*s
            d.ellipse((xx-21*s,yy-16*s,xx+21*s,yy+16*s),fill=rgba(C[petal]),outline=rgba(C['navy']),width=max(1,int(2*s)))
        d.ellipse((x-19*s,y-19*s,x+19*s,y+19*s),fill=rgba(C[center]),outline=rgba(C['navy']),width=max(1,int(2*s)))

def desk(im,x,y,w=210,h=135,number=None):
    d=ImageDraw.Draw(im)
    d.polygon([(x,y),(x+w,y),(x+w-18,y+34),(x+18,y+34)],fill=rgba(C['yellow']),outline=rgba(C['navy']))
    d.rectangle((x+20,y+34,x+38,y+h),fill=rgba(C['brown']),outline=rgba(C['navy']))
    d.rectangle((x+w-38,y+34,x+w-20,y+h),fill=rgba(C['brown']),outline=rgba(C['navy']))
    if number:
        text(d,(x+w/2,y+17),str(number),22,C['navy'],True,'mm')

def school_scene(im, version='door', with_chars=True):
    d=ImageDraw.Draw(im)
    # sky window and flooring
    rr(d,(80,235,1840,920),42,'#E6F4F5',C['navy'],4)
    d.rectangle((82,620,1838,918),fill=rgba('#F5E3BE'))
    for x in range(120,1850,220): d.line((x,620,x-90,918),fill=rgba('#E2C893'),width=3)
    # wall arcs/windows
    for x in [160,1550]:
        rr(d,(x,285,x+210,570),90,C['sky'],C['navy'],5)
        d.line((x+105,295,x+105,560),fill=rgba(C['white']),width=5)
        d.line((x+16,425,x+194,425),fill=rgba(C['white']),width=5)
    # bunting
    pts=[]
    for i,x in enumerate(range(120,1810,130)):
        col=[C['coral'],C['yellow'],C['mint'],C['lav'],C['navy']][i%5]
        d.polygon([(x,255),(x+70,255),(x+35,320)],fill=rgba(col),outline=rgba(C['navy']))
    if version=='door':
        door(im,770,318,380,405,'left','teal')
    elif version=='classroom':
        d.rectangle((690,320,1240,560),fill=rgba(C['navy']))
        d.rectangle((715,345,1215,535),fill=rgba('#254E73'))
        text(d,(965,440),'WELCOME!',52,C['white'],True,'mm')
        for i in range(3): desk(im,700+i*190,670,160,135,i+1)
    elif version=='party':
        d.rectangle((660,305,1270,560),fill=rgba(C['navy']))
        for i in range(5):
            col=[C['coral'],C['yellow'],C['mint'],C['lav'],C['sky']][i]
            d.ellipse((690+i*110,335,760+i*110,415),fill=rgba(col),outline=rgba(C['navy']),width=3)
            d.line((725+i*110,415,725+i*110,520),fill=rgba(C['navy']),width=3)
        rr(d,(720,665,1200,790),28,C['paper'],C['navy'],4)
        for i in range(8): d.ellipse((760+i*52,702,804+i*52,746),fill=rgba([C['coral'],C['yellow'],C['mint'],C['lav']][i%4]),outline=rgba(C['navy']))
    if with_chars:
        character(im,'Maya',305,645,.75,'wave')
        character(im,'Leo',515,650,.75,'hands')
        character(im,'Jun',1365,645,.75,'point')
        character(im,'Nia',1580,645,.75,'wave')
    pip(im,1760,270,.9)

def scene_title(im, title):
    d=ImageDraw.Draw(im)
    f=font(34,True)
    width=min(1120, int(d.textlength(title,font=f)+110))
    x=(W-width)//2
    shadow(im,(x,218,x+width,294),22,(0,6),42)
    d=ImageDraw.Draw(im)
    rr(d,(x,218,x+width,294),22,C['navy'])
    text(d,(W/2,256),title,34,C['white'],True,'mm')

def photo_booth(im,x,y,w=500,h=560):
    d=ImageDraw.Draw(im)
    rr(d,(x,y,x+w,y+h),34,C['coral'],C['navy'],5)
    rr(d,(x+35,y+72,x+w-35,y+h-55),22,C['paper'],C['navy'],4)
    text(d,(x+w/2,y+38),'SUNBEAM PHOTO BOOTH',26,C['white'],True,'mm')
    # string lights
    for i in range(8):
        xx=x+62+i*53; d.ellipse((xx,y+84,xx+18,y+102),fill=rgba(C['yellow']),outline=rgba(C['navy']))

def stamp(im,x,y,label,color='yellow'):
    d=ImageDraw.Draw(im)
    d.ellipse((x,y,x+122,y+122),fill=rgba(C[color]),outline=rgba(C['navy']),width=6)
    d.ellipse((x+12,y+12,x+110,y+110),outline=rgba(C['navy']),width=3)
    text(d,(x+61,y+61),label,22,C['navy'],True,'mm',90)

def word_card(im,x,y,w,h,word,emoji,color='sky',sub=None):
    shadow(im,(x,y,x+w,y+h),26,(0,9),45); d=ImageDraw.Draw(im)
    rr(d,(x,y,x+w,y+h),26,C['paper'],C['navy'],4)
    rr(d,(x+14,y+14,x+w-14,y+h*.56),18,C[color])
    text(d,(x+w/2,y+h*.31),emoji,56,C['navy'],True,'mm')
    text(d,(x+w/2,y+h*.73),word,31,C['ink'],True,'mm',w-25)
    if sub: text(d,(x+w/2,y+h*.90),sub,17,C['grey'],False,'mm',w-25)

def line_card(im,x,y,w,h,parts,colors=None, question=False):
    d=ImageDraw.Draw(im); shadow(im,(x,y,x+w,y+h),22,(0,8),45); d=ImageDraw.Draw(im)
    rr(d,(x,y,x+w,y+h),22,C['paper'],C['navy'],4)
    xx=x+24
    colors=colors or ['sky']*len(parts)
    for i,p in enumerate(parts):
        tw=d.textlength(p,font=font(31,True)); ww=tw+38
        rr(d,(xx,y+20,xx+ww,y+h-20),16,C[colors[i%len(colors)]])
        text(d,(xx+ww/2,y+h/2),p,31,C['navy'],True,'mm')
        xx+=ww+14
    if question:
        d.ellipse((x+w-60,y+11,x+w-12,y+59),fill=rgba(C['yellow']),outline=rgba(C['navy']),width=3)
        text(d,(x+w-36,y+35),'?',30,C['navy'],True,'mm')

# === Individual lesson boards ===
def l1_board(n):
    im=image(); header(im,1,'HELLO & GOODBYE',30,n,'Greet a friend when you arrive and leave.'); d=ImageDraw.Draw(im)
    if n==1:
        school_scene(im,'door'); bubble(im,570,350,770,165,'The school doors are open!\nHow can we welcome our friends?', 'yellow','bottom',size=34)
        chip(im,710,590,'SAY: Hello!', 'coral',width=300,icon='◉')
        task_panel(im,100,730,440,205,'MISSION','Point to a friend. Give a big friendly wave.','mint',1)
        task_panel(im,1380,730,440,205,'NOTICE','Who is coming in? Who will go home later?','sky',2)
    elif n==2:
        # split time arrival/departure
        rr(d,(110,255,1810,900),38,'#DFF4F6',C['navy'],4); d.line((960,280,960,870),fill=rgba(C['navy']),width=6)
        text(d,(500,300),'MORNING',30,C['navy'],True,'mm'); text(d,(1420,300),'HOME TIME',30,C['navy'],True,'mm')
        door(im,260,390,270,330,color='teal'); door(im,1390,390,270,330,color='coral')
        character(im,'Maya',625,560,.9,'wave'); character(im,'Leo',1200,560,.9,'bye')
        bubble(im,340,335,300,90,'Hello!', 'mint','bottom',size=34); bubble(im,1200,335,370,90,'Goodbye!', 'yellow','bottom',size=31)
        task_panel(im,315,760,480,128,'POINT','Who is coming in?','mint',1); task_panel(im,1120,760,480,128,'POINT','Who is going home?','coral',2)
    elif n==3:
        school_scene(im,'classroom',False); scene_title(im,'WAVE WORDS POP!')
        words=[('hello','👋','mint'),('hi','✋','sky'),('goodbye','↔','coral'),('bye','⇢','yellow'),('friend','★','lav')]
        for i,(w,e,c) in enumerate(words): word_card(im,180+i*330,390,270,360,w,e,c,'Listen • point • echo')
        pip(im,135,340,.65); chip(im,730,830,'SAY ALL FIVE WORDS!', 'navy',width=460,icon='◉')
    elif n==4:
        rr(d,(110,250,1810,920),38,'#E6F4F5',C['navy'],4)
        text(d,(500,300),'ARRIVE',32,C['darkmint'],True,'mm'); text(d,(1420,300),'LEAVE',32,C['red'],True,'mm')
        door(im,260,385,390,360,color='mint',label='HELLO DOOR'); door(im,1270,385,390,360,color='coral',label='GOODBYE DOOR')
        character(im,'Maya',820,580,.65,'wave',label='Maya'); character(im,'Leo',1035,580,.65,'bye',label='Leo')
        arrow(d,895,610,560,610,'mint'); arrow(d,1050,610,1360,610,'coral')
        task_panel(im,670,775,590,125,'MOVE','Send each friend to the correct door.','yellow',1)
    elif n==5:
        rr(d,(100,255,1820,900),44,'#F3E5F7',C['navy'],4); text(d,(960,300),'PIP’S ECHO HALL',42,C['navy'],True,'mm')
        gestures=[('BIG WAVE','Hello!','👋','mint'),('SMALL WAVE','Hi!','✋','sky'),('LEAVING WAVE','Goodbye!','↔','coral'),('QUICK WAVE','Bye!','⇢','yellow')]
        for i,(a,b,e,c) in enumerate(gestures):
            x=170+i*420; rr(d,(x,380,x+330,720),34,C['paper'],C['navy'],4); d.ellipse((x+72,425,x+258,611),fill=rgba(C[c]),outline=rgba(C['navy']),width=4); text(d,(x+165,518),e,80,C['navy'],True,'mm'); text(d,(x+165,655),a,20,C['grey'],True,'mm'); chip(im,x+42,740,b,c,width=245,size=24)
        task_panel(im,450,840,1020,98,'ECHO','Copy Pip’s wave. Say the word that matches.','lav',1)
    elif n==6:
        rr(d,(115,260,1805,900),40,'#EAF7E8',C['navy'],4); text(d,(960,306),'BUILD THE BELL ROUTE',42,C['navy'],True,'mm')
        # path tiles
        pts=[(290,630),(600,500),(920,630),(1240,500),(1560,630)]
        for i,(x,y) in enumerate(pts):
            d.ellipse((x-78,y-52,x+78,y+52),fill=rgba([C['mint'],C['sky'],C['yellow'],C['coral'],C['lav']][i]),outline=rgba(C['navy']),width=4)
            if i<len(pts)-1: arrow(d,x+78,y,pts[i+1][0]-78,pts[i+1][1],'navy',6)
        text(d,(290,630),'🔔\nIN',24,C['navy'],True,'mm'); text(d,(1560,630),'🏠\nOUT',24,C['navy'],True,'mm')
        labels=['Hello!','Hi!','friend','Bye!','Goodbye!']
        for i,l in enumerate(labels): tag(im,180+i*330,790,270,70,l,[C['mint'],C['sky'],C['yellow'],C['coral'],C['lav']][i])
        task_panel(im,470,350,980,110,'MOVE + SAY','Put the words in a friendly school-day route.','sky',1)
    elif n==7:
        school_scene(im,'door',False); scene_title(im,'STORY: A NEW FRIEND')
        # three story cards
        for i,(title,line,names,col) in enumerate([('1. AT THE DOOR','Maya: “Hi!”','Maya','mint'),('2. FRIENDS','Leo: “Hello!”','Leo','sky'),('3. HOME TIME','Both: “Bye!”','Nia','coral')]):
            x=155+i*535; rr(d,(x,355,x+430,790),30,C['paper'],C['navy'],4); rr(d,(x+22,377,x+408,445),20,C[col]); text(d,(x+215,411),title,25,C['navy'],True,'mm'); character(im,names,x+215,485,.72,'wave' if i<2 else 'bye'); bubble(im,x+70,690,290,70,line,'white','bottom',size=22)
        task_panel(im,485,825,950,93,'RETELL','Point to each card. Say the wave words.','yellow',1)
    elif n==8:
        rr(d,(115,255,1805,910),42,'#FFF1D8',C['navy'],4); text(d,(960,300),'WAVE CIRCLE',42,C['navy'],True,'mm')
        # circular chars
        coords=[(430,470),(720,400),(1200,400),(1490,470)]
        for (nm,(x,y),p) in zip(['Maya','Leo','Jun','Nia'],coords,['wave','wave','bye','bye']): character(im,nm,x,y,.62,p); tag(im,x-78,y+225,156,45,nm,C['sky'])
        d.ellipse((790,530,1130,820),fill=rgba(C['mint']),outline=rgba(C['navy']),width=6); text(d,(960,610),'YOUR\nTURN',36,C['navy'],True,'mm'); pip(im,1060,770,.6)
        bubble(im,680,878,560,62,'Hello!  …  Goodbye!', 'white','bottom',size=26)
        task_panel(im,145,695,470,130,'ROLEPLAY','Greet. Then say goodbye.','coral',1)
    elif n==9:
        school_scene(im,'door',False); scene_title(im,'WELCOME MAT CHALLENGE')
        # two mats & role cards
        rr(d,(480,675,825,830),26,C['mint'],C['navy'],4); rr(d,(1095,675,1440,830),26,C['coral'],C['navy'],4)
        text(d,(652,752),'ARRIVE',32,C['navy'],True,'mm'); text(d,(1267,752),'LEAVE',32,C['navy'],True,'mm')
        character(im,'Maya',750,405,.82,'wave'); character(im,'Leo',1170,405,.82,'bye')
        task_panel(im,120,350,380,300,'PAIR A','Stand on ARRIVE.\nSay: “Hi!”','mint',1)
        task_panel(im,1420,350,380,300,'PAIR B','Stand on LEAVE.\nSay: “Bye!”','coral',2)
        chip(im,700,865,'SWITCH ROLES!', 'navy',width=520,icon='↔')
    else:
        school_scene(im,'door'); scene_title(im,'WAVE PARADE EXIT')
        # parade banner
        rr(d,(520,405,1400,560),35,C['navy']); text(d,(960,458),'OUR FRIENDLY CLASS',32,C['white'],True,'mm');
        for i in range(7):
            x=600+i*115; d.arc((x,520,x+90,610),180,355,fill=rgba([C['mint'],C['sky'],C['yellow'],C['coral'],C['lav']][i%5]),width=15)
        task_panel(im,175,690,500,190,'EXIT CHECK','Say a greeting.\nSay a goodbye.','yellow',1)
        task_panel(im,1245,690,500,190,'PAYOFF','Add your coloured wave to Pip’s banner!','mint',2)
        chip(im,720,810,'I CAN GREET A FRIEND!', 'coral',width=480,icon='★')
    footer(im); return im

def l2_board(n):
    im=image(); header(im,2,'MY NAME IS…',30,n,'Introduce yourself with a clear name sentence.'); d=ImageDraw.Draw(im)
    if n==1:
        school_scene(im,'classroom'); scene_title(im,'THE LOST NAME TAGS')
        for i,nm in enumerate(['Maya','Leo','Jun','Nia']):
            tag(im,190+i*390,815,270,74,'?', [C['coral'],C['mint'],C['sky'],C['lav']][i])
        bubble(im,630,350,650,118,'Oh no! Pip dropped the name tags.\nLet’s help our friends!', 'yellow','bottom',size=29)
        task_panel(im,140,590,400,170,'NOTICE','Each friend has one special name.','mint',1)
    elif n==2:
        rr(d,(115,260,1805,900),42,'#FFF0DB',C['navy'],4); text(d,(960,303),'WHOSE TAG IS IT?',42,C['navy'],True,'mm')
        for i,nm in enumerate(['Maya','Leo','Jun','Nia']):
            x=175+i*405; character(im,nm,x+135,440,.64,'hands'); tag(im,x,705,270,72,'REVEAL NAME',[C['coral'],C['mint'],C['sky'],C['lav']][i])
        task_panel(im,570,830,780,70,'POINT','Choose a friend. Reveal the tag.','yellow',1)
    elif n==3:
        rr(d,(120,255,1800,900),42,'#E6F4F5',C['navy'],4); text(d,(960,300),'NAME SENTENCE RIBBON',42,C['navy'],True,'mm')
        line_card(im,330,430,1260,125,['My','name','is','Maya.'],['coral','yellow','mint','sky'])
        arrow(d,400,660,1500,660,'coral',8)
        for i,p in enumerate(['MY','NAME','IS','YOUR NAME']):
            tag(im,280+i*380,735,300,82,p,[C['coral'],C['yellow'],C['mint'],C['sky']][i])
        task_panel(im,530,315,860,85,'BUILD + SAY','Put the sentence pieces on the ribbon.','lav',1)
    elif n==4:
        rr(d,(120,260,1800,900),42,'#F0EAFE',C['navy'],4); text(d,(960,300),'I AM  →  I’M',43,C['navy'],True,'mm')
        line_card(im,430,420,1050,130,['I','am','Leo.'],['sky','yellow','mint'])
        arrow(d,810,620,1080,620,'coral',10)
        line_card(im,580,680,760,125,["I’m",'Leo.'],['coral','mint'])
        character(im,'Leo',300,575,.75,'point'); bubble(im,1330,485,330,90,'I’m Leo!', 'white','left',size=31)
        task_panel(im,360,835,1200,62,'SAY','Both are OK: “My name is…” or “I’m…”','yellow',1)
    elif n==5:
        rr(d,(140,255,1780,900),42,'#F1F6ED',C['navy'],4); text(d,(960,300),'MIRROR MODEL',42,C['navy'],True,'mm')
        # mirror
        rr(d,(635,365,1285,800),58,C['sky'],C['navy'],8); rr(d,(675,405,1245,760),42,C['paper'],C['navy'],4)
        character(im,'Maya',960,500,.95,'wave'); bubble(im,1060,455,315,95,'My name\nis Maya.', 'yellow','left',size=28)
        chip(im,680,825,'YOUR TURN: My name is ___.', 'coral',width=560,icon='◉')
        pip(im,460,430,.7); task_panel(im,155,580,365,185,'LOOK + COPY','Say it slowly. Point to yourself.','mint',1)
    elif n==6:
        rr(d,(110,255,1810,900),42,'#FFF0DB',C['navy'],4); text(d,(960,300),'TAG WORKSHOP',42,C['navy'],True,'mm')
        for i,nm in enumerate(['Maya','Leo','Jun','Nia']):
            x=160+i*420; character(im,nm,x+135,440,.67,'hands'); tag(im,x,720,270,80,nm,[C['coral'],C['mint'],C['sky'],C['lav']][i])
        task_panel(im,565,835,790,68,'MOVE + SAY','Put each tag on a friend. “My name is…”','yellow',1)
    elif n==7:
        rr(d,(120,255,1800,900),42,'#EAF7E8',C['navy'],4); text(d,(960,300),'MAKE MY TAG',42,C['navy'],True,'mm')
        # blank tag huge
        tag(im,640,425,640,235,'YOUR NAME',C['yellow']); d.ellipse((710,715,800,805),fill=rgba(C['coral']),outline=rgba(C['navy']),width=4); star(d,960,760,48,C['mint']); d.ellipse((1120,715,1210,805),fill=rgba(C['lav']),outline=rgba(C['navy']),width=4)
        text(d,(960,690),'Choose a colour + a badge.',25,C['grey'],False,'mm')
        task_panel(im,260,800,1400,78,'CREATE + SAY','Write or type your name. Say: “My name is [name].”','sky',1)
    elif n==8:
        rr(d,(130,255,1790,900),42,'#EAF0FF',C['navy'],4); text(d,(960,300),'PHOTO BOOTH TAKE 1',42,C['navy'],True,'mm')
        photo_booth(im,710,345,500,510); character(im,'Nia',960,520,.92,'wave'); bubble(im,1245,470,320,100,"I’m Nia!",'yellow','left',size=30)
        tag(im,205,445,360,85,'MY NAME IS ___',C['coral']); tag(im,205,585,360,85,"I’M ___",C['mint'])
        task_panel(im,220,735,360,125,'CHOOSE','Pick one sentence.\nSpeak into the microphone.','sky',1)
        stamp(im,1320,700,'FLASH','yellow')
    elif n==9:
        school_scene(im,'door',False); scene_title(im,'WELCOME LINE')
        character(im,'Jun',735,470,.9,'wave'); character(im,'Maya',1180,470,.9,'hands')
        bubble(im,390,420,380,105,'Hi! My name\nis Jun.', 'mint','right',size=28); bubble(im,1170,410,400,105,'Hi! I’m Maya.', 'yellow','left',size=28)
        task_panel(im,250,780,540,110,'PAIR A','Greet. Say your name.','mint',1); task_panel(im,1130,780,540,110,'PAIR B','Greet. Say your name.','coral',2)
    else:
        rr(d,(120,255,1800,900),42,'#FFF1D8',C['navy'],4); text(d,(960,300),'NAME GALLERY EXIT',42,C['navy'],True,'mm')
        d.rectangle((430,370,1490,780),fill=rgba(C['navy']))
        for i in range(5):
            x=500+i*200; tag(im,x,450,160,75,['MAYA','LEO','JUN','NIA','YOU'][i],[C['coral'],C['mint'],C['sky'],C['lav'],C['yellow']][i])
            star(d,x+80,620,25,C['yellow'])
        task_panel(im,290,820,1340,65,'EXIT CHECK','Place your tag. Say: “My name is [name].”','coral',1)
    footer(im); return im

def l3_board(n):
    im=image(); header(im,3,'WHAT’S YOUR NAME?',30,n,'Ask and answer a name question with a partner.'); d=ImageDraw.Draw(im)
    if n==1:
        school_scene(im,'classroom'); scene_title(im,'NAME DETECTIVE MISSION')
        stamp(im,300,410,'ASK','yellow'); stamp(im,1430,410,'FIND','mint');
        bubble(im,650,350,620,120,'Pip needs three friendly name clues.\nWhat question can we ask?', 'white','bottom',size=30)
        chip(im,665,780,'SAY: What’s your name?', 'coral',width=590,icon='?')
    elif n==2:
        rr(d,(120,255,1800,900),42,'#EAF0FF',C['navy'],4); text(d,(960,300),'QUESTION EARS',42,C['navy'],True,'mm')
        items=[('What’s your name?','?','yellow'),('My name is Leo.','★','mint'),('Hi!','👋','sky'),('What’s your name?','?','yellow')]
        for i,(t,e,c) in enumerate(items):
            x=150+i*420; rr(d,(x,420,x+340,700),30,C['paper'],C['navy'],4); d.ellipse((x+122,448,x+218,544),fill=rgba(C[c]),outline=rgba(C['navy']),width=3); text(d,(x+170,496),e,44,C['navy'],True,'mm'); text(d,(x+170,610),t,27,C['ink'],True,'mm',290)
        task_panel(im,440,785,1040,80,'LISTEN','Point to the question. Find the question mark.','lav',1)
    elif n==3:
        rr(d,(120,255,1800,900),42,'#FFF0DB',C['navy'],4); text(d,(960,300),'BUILD THE QUESTION',42,C['navy'],True,'mm')
        line_card(im,330,420,1260,130,['What’s','your','name?'],['yellow','sky','coral'],True)
        for i,p in enumerate(['YOUR','WHAT’S','NAME?']): tag(im,410+i*370,710,310,86,p,[C['sky'],C['yellow'],C['coral']][i])
        task_panel(im,390,830,1140,65,'MOVE + SAY','Put the words on the gold question ribbon.','mint',1)
    elif n==4:
        rr(d,(110,255,1810,900),42,'#EAF7E8',C['navy'],4); text(d,(960,300),'QUESTION → ANSWER BRIDGE',42,C['navy'],True,'mm')
        bubble(im,735,370,450,95,'What’s your name?', 'yellow','bottom',size=29)
        names=['Maya','Leo','Jun']; cols=['coral','mint','sky']
        for i,(nm,c) in enumerate(zip(names,cols)):
            x=250+i*570; character(im,nm,x+115,600,.62,'hands'); bubble(im,x+180,550,260,82,f'My name is {nm}.','white','left',size=20); arrow(d,960,495,x+315,545,c,5)
        task_panel(im,430,805,1060,80,'CONNECT','Ask one question. Match it to each answer.','lav',1)
    elif n==5:
        rr(d,(110,255,1810,900),42,'#FFF1D8',C['navy'],4); text(d,(960,300),'MYSTERY LOCKER',42,C['navy'],True,'mm')
        # lockers
        for i in range(4):
            x=240+i*360; rr(d,(x,400,x+250,735),22,[C['coral'],C['mint'],C['sky'],C['lav']][i],C['navy'],4); d.ellipse((x+104,540,x+145,581),fill=rgba(C['yellow']),outline=rgba(C['navy']),width=3); text(d,(x+125,465),'?',70,C['navy'],True,'mm')
        bubble(im,650,760,620,80,'Ask first. Then open a locker!', 'white','bottom',size=29)
        chip(im,665,850,'What’s your name?', 'coral',width=590,icon='?')
    elif n==6:
        rr(d,(120,255,1800,900),42,'#E6F4F5',C['navy'],4); text(d,(960,300),'ASK–ANSWER TURNSTILE',42,C['navy'],True,'mm')
        d.ellipse((690,380,1230,820),fill=rgba(C['sky']),outline=rgba(C['navy']),width=7); d.line((960,440,960,760),fill=rgba(C['navy']),width=8); d.line((760,600,1160,600),fill=rgba(C['navy']),width=8)
        character(im,'Leo',645,480,.72,'point'); character(im,'Nia',1270,480,.72,'hands')
        bubble(im,315,430,380,95,'What’s your\nname?', 'yellow','right',size=28); bubble(im,1220,430,405,95,'My name\nis Nia.', 'mint','left',size=28)
        chip(im,725,840,'↻ SWITCH ROLES', 'coral',width=470,icon='↔')
    elif n==7:
        rr(d,(110,255,1810,900),42,'#F3EAF9',C['navy'],4); text(d,(960,300),'DETECTIVE TRAIL',42,C['navy'],True,'mm')
        pts=[(290,650),(630,500),(960,680),(1290,500),(1610,650)]
        for i,(x,y) in enumerate(pts):
            d.ellipse((x-68,y-48,x+68,y+48),fill=rgba([C['yellow'],C['mint'],C['sky'],C['coral'],C['lav']][i]),outline=rgba(C['navy']),width=4)
            if i<4: arrow(d,x+70,y,pts[i+1][0]-70,pts[i+1][1],'navy',6)
        stamp(im,225,410,'ASK','yellow'); stamp(im,1530,410,'NAME','mint')
        task_panel(im,390,790,1140,80,'PAIR MISSION','Visit two friends. Ask and collect two name stickers.','coral',1)
    elif n==8:
        rr(d,(110,255,1810,900),42,'#EAF7E8',C['navy'],4); text(d,(960,300),'CLASSROOM NAME MAP',42,C['navy'],True,'mm')
        for r in range(2):
            for c in range(3): desk(im,360+c*410,445+r*190,250,145,r*3+c+1)
        tag(im,185,515,150,60,'MAYA',C['coral']); tag(im,185,600,150,60,'LEO',C['mint']); tag(im,185,685,150,60,'JUN',C['sky'])
        task_panel(im,410,845,1100,60,'ASK + MOVE','Ask a friend. Put the name at the correct desk.','yellow',1)
    elif n==9:
        rr(d,(120,255,1800,900),42,'#FFF0DB',C['navy'],4); text(d,(960,300),'SECRET FRIEND INTERVIEW',42,C['navy'],True,'mm')
        # interview frame
        rr(d,(320,370,1600,805),34,C['paper'],C['navy'],5); d.ellipse((850,440,1070,660),fill=rgba(C['yellow']),outline=rgba(C['navy']),width=4); text(d,(960,550),'?',100,C['navy'],True,'mm')
        character(im,'Maya',550,520,.7,'point'); character(im,'Jun',1370,520,.7,'hands')
        bubble(im,390,395,370,90,'What’s your name?', 'yellow','bottom',size=25); bubble(im,1170,395,365,90,'My name is __.', 'mint','bottom',size=25)
        task_panel(im,400,835,1120,60,'ROLEPLAY','Ask your secret friend. Write or say the answer.','coral',1)
    else:
        rr(d,(120,255,1800,900),42,'#EAF0FF',C['navy'],4); text(d,(960,300),'DETECTIVE BADGE EXIT',42,C['navy'],True,'mm')
        stamp(im,840,405,'NAME\nDETECTIVE','yellow'); pip(im,1260,475,.8)
        line_card(im,400,740,1120,95,['What’s your name?','My name is __.'],['yellow','mint'],True)
        task_panel(im,440,855,1040,50,'EXIT CHECK','Complete both lines independently.','coral',1)
    footer(im); return im

def l4_board(n):
    im=image(); header(im,4,'NICE TO MEET YOU',30,n,'Use friendly meeting language with a new friend.'); d=ImageDraw.Draw(im)
    if n==1:
        rr(d,(100,245,1820,910),42,'#EAF7E8',C['navy'],4); text(d,(960,290),'THE FRIENDSHIP GARDEN NEEDS FRIENDS',40,C['navy'],True,'mm')
        for x in [340,650,960,1270,1580]: flower(im,x,550,1.3,['coral','mint','sky','lav','yellow'][[340,650,960,1270,1580].index(x)],closed=True)
        pip(im,250,390,.8); bubble(im,570,360,780,100,'Meet someone new. Help the flowers bloom!', 'white','bottom',size=31)
        chip(im,655,790,'SAY: Nice to meet you.', 'coral',width=610,icon='♥')
    elif n==2:
        rr(d,(110,255,1810,900),42,'#F3EAF9',C['navy'],4); text(d,(960,300),'MEET THE WORDS',42,C['navy'],True,'mm')
        vals=[('nice','☺','coral'),('meet','↔','mint'),('you','☝','sky'),('too','♥','lav')]
        for i,(w,e,c) in enumerate(vals): word_card(im,185+i*390,400,320,350,w,e,c,'Listen • point • echo')
        task_panel(im,430,795,1060,75,'ECHO','Say the four words with Pip.','yellow',1)
    elif n==3:
        rr(d,(120,255,1800,900),42,'#EAF7E8',C['navy'],4); text(d,(960,300),'FIRST FLOWER',42,C['navy'],True,'mm')
        flower(im,960,555,2.25,'coral','yellow')
        line_card(im,420,385,1080,115,['Nice','to','meet','you.'],['coral','yellow','mint','sky'])
        for i,p in enumerate(['NICE','TO','MEET','YOU.']): tag(im,250+i*370,790,300,76,p,[C['coral'],C['yellow'],C['mint'],C['sky']][i])
        task_panel(im,400,880,1120,45,'BUILD + SAY','Put the petals on the stem.','lav',1)
    elif n==4:
        rr(d,(110,255,1810,900),42,'#FDF0D8',C['navy'],4); text(d,(960,300),'ANSWER FLOWER',42,C['navy'],True,'mm')
        flower(im,640,565,1.8,'mint','yellow'); flower(im,1280,565,1.8,'lav','yellow')
        bubble(im,350,375,480,100,'Nice to meet you.', 'white','bottom',size=29); bubble(im,1035,375,570,100,'Nice to meet you, too.', 'white','bottom',size=29)
        arrow(d,830,575,1090,575,'coral',8)
        task_panel(im,430,825,1060,65,'MATCH','Put the reply flower after the first flower.','coral',1)
    elif n==5:
        rr(d,(115,255,1805,900),42,'#E6F4F5',C['navy'],4); text(d,(960,300),'STORY: MAYA MEETS JUN',42,C['navy'],True,'mm')
        story=[('1. HELLO','Hi!','Maya','mint'),('2. NAMES','I’m Jun.','Jun','sky'),('3. MEET','Nice to meet you!','Maya','coral')]
        for i,(t,line,nm,col) in enumerate(story):
            x=145+i*545; rr(d,(x,375,x+445,795),30,C['paper'],C['navy'],4); rr(d,(x+18,395,x+427,458),18,C[col]); text(d,(x+222,427),t,23,C['navy'],True,'mm'); character(im,nm,x+220,490,.69,'wave' if i<2 else 'hands'); bubble(im,x+70,690,305,72,line,'white','bottom',size=21)
        task_panel(im,440,830,1040,60,'RETELL','Read the three friendly steps.','yellow',1)
    elif n==6:
        rr(d,(120,255,1800,900),42,'#F0EAFE',C['navy'],4); text(d,(960,300),'WHO SAYS IT?',42,C['navy'],True,'mm')
        character(im,'Maya',565,460,.95,'hands',label='MAYA'); character(im,'Jun',1350,460,.95,'hands',label='JUN')
        tag(im,570,785,360,72,'Nice to meet you.',C['coral']); tag(im,990,785,420,72,'Nice to meet you, too.',C['mint'])
        task_panel(im,450,330,1020,86,'MOVE','Put each dialogue petal by the right friend.','sky',1)
    elif n==7:
        rr(d,(110,255,1810,900),42,'#FFF0DB',C['navy'],4); text(d,(960,300),'FRIENDSHIP HANDSHAKE',42,C['navy'],True,'mm')
        character(im,'Leo',550,480,.86,'hands'); character(im,'Nia',1370,480,.86,'hands')
        d.ellipse((840,560,1080,760),fill=rgba(C['coral']),outline=rgba(C['navy']),width=5); text(d,(960,658),'♥',90,C['white'],True,'mm')
        arrow(d,680,635,840,635,'mint',8); arrow(d,1080,635,1245,635,'lav',8)
        bubble(im,265,390,390,90,'Nice to meet you.', 'white','bottom',size=24); bubble(im,1265,390,430,90,'Nice to meet you, too.', 'white','bottom',size=24)
        task_panel(im,405,840,1110,52,'PAIR EXCHANGE','Pass the heart. Say the line. Switch roles.','yellow',1)
    elif n==8:
        rr(d,(115,255,1805,900),42,'#EAF7E8',C['navy'],4); text(d,(960,300),'BRACELET BUILDER',42,C['navy'],True,'mm')
        # bracelet
        for i in range(9):
            x=500+i*115; d.ellipse((x,560,x+90,650),fill=rgba([C['coral'],C['yellow'],C['mint'],C['sky'],C['lav']][i%5]),outline=rgba(C['navy']),width=4); star(d,x+45,605,17,C['white'])
        bubble(im,615,420,690,80,'A friendly meeting adds a bead!', 'white','bottom',size=29)
        task_panel(im,320,775,1280,90,'PAIR CHALLENGE','Complete both meeting lines. Choose one bead.','coral',1)
    elif n==9:
        rr(d,(110,255,1810,900),42,'#E6F4F5',C['navy'],4); text(d,(960,300),'BRIDGE TO A NEW FRIEND',42,C['navy'],True,'mm')
        # stepping stones
        labels=['HELLO','I’M ___','NICE TO\nMEET YOU','GOODBYE']
        for i,l in enumerate(labels):
            x=330+i*400; d.ellipse((x,590,x+270,760),fill=rgba([C['mint'],C['sky'],C['yellow'],C['coral']][i]),outline=rgba(C['navy']),width=5); text(d,(x+135,675),l,28,C['navy'],True,'mm')
        character(im,'Maya',230,520,.7,'wave'); character(im,'Leo',1610,520,.7,'bye')
        task_panel(im,390,835,1140,55,'ROLEPLAY','Say every step as you cross the bridge.','lav',1)
    else:
        rr(d,(100,245,1820,910),42,'#EAF7E8',C['navy'],4); text(d,(960,290),'GARDEN GOODBYE',42,C['navy'],True,'mm')
        for i,x in enumerate([320,620,920,1220,1520]): flower(im,x,500,1.35,['coral','mint','sky','lav','yellow'][i],closed=False)
        task_panel(im,250,770,650,110,'EXIT CHECK','Meet a friend. Say goodbye.','coral',1); task_panel(im,1020,770,650,110,'PAYOFF','Place your flower in the garden!','mint',2)
        chip(im,660,675,'Nice to meet you.  Goodbye!', 'navy',width=610,icon='♥')
    footer(im); return im

def l5_board(n):
    im=image(); header(im,5,'MEET THE CLASS',30,n,'Use a full greeting, name, meeting, and goodbye exchange.'); d=ImageDraw.Draw(im)
    if n==1:
        school_scene(im,'party'); scene_title(im,'CLASS PARTY INVITATION')
        bubble(im,570,330,760,105,'Pip’s class party needs every guest to feel welcome!', 'white','bottom',size=31)
        tasks=[('HELLO','mint'),('NAME','sky'),('MEET','yellow'),('GOODBYE','coral')]
        for i,(t,c) in enumerate(tasks): tag(im,260+i*365,765,295,84,t,C[c])
    elif n==2:
        school_scene(im,'party',False); scene_title(im,'PARTY PREP SCAN')
        # find objects
        tag(im,260,395,300,78,'HELLO CARD',C['mint']); tag(im,1360,410,280,78,'NAME TAG',C['sky']); d.polygon([(355,620),(420,720),(290,720)],fill=rgba(C['coral']),outline=rgba(C['navy'])); text(d,(355,680),'BYE',22,C['white'],True,'mm'); bubble(im,1150,640,350,80,'What’s your name?', 'yellow','left',size=22)
        task_panel(im,460,810,1000,70,'FIND','Point to hello, name, question, and goodbye.','lav',1)
    elif n==3:
        rr(d,(115,255,1805,900),42,'#F3EAF9',C['navy'],4); text(d,(960,300),'PHOTO BOOTH HELLO',42,C['navy'],True,'mm')
        photo_booth(im,710,350,500,505); character(im,'Jun',960,520,.92,'wave'); bubble(im,1225,470,355,95,"Hello, I’m Jun!",'yellow','left',size=28)
        tag(im,200,470,380,82,'HELLO!',C['mint']); tag(im,200,590,380,82,"HI!",C['sky']);
        task_panel(im,210,745,390,112,'SPEAK','Choose a greeting.\nIntroduce yourself.','coral',1)
    elif n==4:
        rr(d,(110,255,1810,900),42,'#FFF0DB',C['navy'],4); text(d,(960,300),'GUEST LIST QUESTION',42,C['navy'],True,'mm')
        # guest cards
        for i in range(3):
            x=310+i*470; rr(d,(x,430,x+310,735),28,C['paper'],C['navy'],4); d.ellipse((x+84,480,x+226,622),fill=rgba([C['coral'],C['mint'],C['lav']][i]),outline=rgba(C['navy']),width=4); text(d,(x+155,550),'?',72,C['navy'],True,'mm'); tag(im,x+45,665,220,46,'NAME?',C['yellow'])
        bubble(im,620,350,680,82,'Ask each guest before the name card opens.', 'white','bottom',size=27)
        chip(im,675,800,'What’s your name?', 'coral',width=570,icon='?')
    elif n==5:
        rr(d,(120,255,1800,900),42,'#EAF7E8',C['navy'],4); text(d,(960,300),'CONVERSATION CONVEYOR',42,C['navy'],True,'mm')
        cards=['Hello!','I’m Maya.','What’s your\nname?','I’m Leo.','Nice to\nmeet you.','Goodbye!']
        cols=['mint','sky','yellow','lav','coral','red']
        for i,(v,c) in enumerate(zip(cards,cols)):
            x=150+i*285; rr(d,(x,500,x+235,680),24,C[c],C['navy'],4); text(d,(x+117,590),v,24,C['navy'],True,'mm')
            if i<5: arrow(d,x+238,590,x+277,590,'navy',4)
        door(im,170,350,135,120,color='teal'); d.polygon([(1640,385),(1715,465),(1565,465)],fill=rgba(C['red']),outline=rgba(C['navy'])); text(d,(1640,440),'BYE',18,C['white'],True,'mm')
        task_panel(im,360,785,1200,76,'ORDER + SAY','Move the conversation from door to goodbye flag.','yellow',1)
    elif n==6:
        rr(d,(110,255,1810,900),42,'#EAF0FF',C['navy'],4); text(d,(960,300),'FIX PIP’S MIXED-UP CHAT',42,C['navy'],True,'mm')
        # mixed floor cards left, repaired right
        for i,(v,c) in enumerate(zip(['Goodbye!','What’s your name?','Hello!','Nice to meet you.'],['red','yellow','mint','coral'])):
            x=180+i*390; y=485+(i%2)*115; rr(d,(x,y,x+300,y+90),20,C[c],C['navy'],4); text(d,(x+150,y+45),v,21,C['navy'],True,'mm',260)
        rr(d,(510,785,1410,870),20,C['paper'],C['navy'],4); text(d,(960,828),'REBUILD THE FRIENDLY ORDER HERE',24,C['grey'],True,'mm')
        pip(im,1550,690,.85); task_panel(im,350,345,1220,85,'FIX','Put Pip’s friendly conversation in a natural order.','lav',1)
    elif n==7:
        rr(d,(110,255,1810,900),42,'#FFF1D8',C['navy'],4); text(d,(960,300),'PARTNER PARTY PASSPORT',42,C['navy'],True,'mm')
        rr(d,(560,365,1360,820),35,C['paper'],C['navy'],5); text(d,(960,410),'MY FRIEND PASSPORT',30,C['navy'],True,'mm')
        fields=[('HELLO','✓','mint'),('NAME','✓','sky'),('QUESTION','✓','yellow'),('MEET','✓','coral'),('BYE','✓','lav')]
        for i,(a,b,c) in enumerate(fields):
            y=455+i*65; rr(d,(640,y,1280,y+48),15,C[c]); text(d,(675,y+24),a,20,C['navy'],True,'lm'); d.ellipse((1205,y+8,1265,y+40),fill=rgba(C['white']),outline=rgba(C['navy']),width=2)
        task_panel(im,290,850,1340,48,'COLLECT','Earn two stamps by completing two full partner chats.','coral',1)
    elif n==8:
        rr(d,(110,255,1810,900),42,'#E6F4F5',C['navy'],4); text(d,(960,300),'BUILD THE CLASS MURAL',42,C['navy'],True,'mm')
        # mural shapes
        rr(d,(420,370,1500,790),35,C['navy']); text(d,(960,410),'OUR NEW FRIENDS',28,C['white'],True,'mm')
        for i,nm in enumerate(['Maya','Leo','Jun','Nia']):
            x=515+i*245; d.ellipse((x,485,x+165,650),fill=rgba([C['coral'],C['mint'],C['sky'],C['lav']][i]),outline=rgba(C['white']),width=4); text(d,(x+82,565),nm[0],60,C['white'],True,'mm'); tag(im,x-10,675,185,55,nm,C['yellow'])
        task_panel(im,380,840,1160,55,'ADD + SAY','Meet a friend. Add their portrait and name to the mural.','mint',1)
    elif n==9:
        rr(d,(110,255,1810,900),42,'#F3EAF9',C['navy'],4); text(d,(960,300),'GRAND WELCOME CIRCLE',42,C['navy'],True,'mm')
        d.ellipse((650,435,1270,795),fill=rgba(C['sky']),outline=rgba(C['navy']),width=7); character(im,'Maya',520,530,.72,'wave'); character(im,'Leo',1390,530,.72,'hands'); pip(im,960,595,.8)
        steps=[('HELLO',440,560),('I’M ___',610,405),('WHAT’S YOUR\nNAME?',820,390),('NICE TO\nMEET YOU',1050,405),('GOODBYE',1290,560)]
        step_colors=[C['mint'],C['sky'],C['yellow'],C['coral'],C['lav']]
        for i,(s,x,y) in enumerate(steps):
            d.ellipse((x-82,y-48,x+82,y+48),fill=rgba(step_colors[i]),outline=rgba(C['navy']),width=3); text(d,(x,y),s,17,C['navy'],True,'mm')
        task_panel(im,390,860,1140,42,'PERFORM','Use all five steps with your partner.','yellow',1)
    else:
        school_scene(im,'party'); scene_title(im,'OUR FRIENDS! CELEBRATION EXIT')
        tasks=[('HELLO','mint'),('MY NAME','sky'),('WHAT’S YOUR NAME?','yellow'),('NICE TO MEET YOU','coral'),('GOODBYE','lav')]
        for i,(t,c) in enumerate(tasks):
            x=160+i*340; rr(d,(x,730,x+285,820),20,C[c],C['navy'],3); text(d,(x+142,775),t,19,C['navy'],True,'mm',250); star(d,x+245,752,16,C['white'])
        bubble(im,640,375,650,100,'I can meet a new friend!', 'white','bottom',size=34)
        task_panel(im,330,875,1260,40,'EXIT CHECK','Show your teacher one full mini-conversation.','coral',1)
    footer(im); return im

def create_assets():
    # Simple transparent individual interaction assets by lesson
    data={
      1:[('hello-token','Hello!',C['mint']),('hi-token','Hi!',C['sky']),('goodbye-token','Goodbye!',C['coral']),('bye-token','Bye!',C['yellow']),('friend-token','Friend',C['lav'])],
      2:[('maya-tag','Maya',C['coral']),('leo-tag','Leo',C['mint']),('jun-tag','Jun',C['sky']),('nia-tag','Nia',C['lav'])],
      3:[('question-card','What’s your name?',C['yellow']),('answer-card','My name is __.',C['mint'])],
      4:[('meeting-petal','Nice to meet you.',C['coral']),('reply-petal','Nice to meet you, too.',C['mint'])],
      5:[('hello-card','Hello!',C['mint']),('name-card','I’m __.',C['sky']),('question-card','What’s your name?',C['yellow']),('meet-card','Nice to meet you.',C['coral']),('bye-card','Goodbye!',C['lav'])]
    }
    for l,items in data.items():
        ad=ROOT/f'lesson-{l:02d}'/'assets'/'clean'; ad.mkdir(parents=True,exist_ok=True)
        for slug,label,col in items:
            im=Image.new('RGBA',(600,210),(0,0,0,0)); shadow(im,(20,20,580,185),38,(0,8),45); d=ImageDraw.Draw(im); fill_color = col if isinstance(col, str) and col.startswith('#') else C[col]; rr(d,(20,20,580,185),38,fill_color,C['navy'],5); text(d,(300,102),label,34,C['navy'],True,'mm',500)
            im.save(ad/f'{slug}.png')

def render_all():
    builders={1:l1_board,2:l2_board,3:l3_board,4:l4_board,5:l5_board}
    for lesson,builder in builders.items():
        boarddir=ROOT/f'lesson-{lesson:02d}'/'boards'; boarddir.mkdir(parents=True,exist_ok=True)
        for n in range(1,11):
            im=builder(n).convert('RGB')
            out=boarddir/f'lesson-{lesson:02d}-page-{n:02d}.png'
            im.save(out,compress_level=3)
    create_assets()

if __name__=='__main__':
    render_all()
    print('Rendered 50 boards and clean assets.')
