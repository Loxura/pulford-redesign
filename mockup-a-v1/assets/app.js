/* theme toggle + scroll reveal + mobile menu */
(function(){
  const root=document.documentElement;
  const toggle=document.querySelector('.theme-toggle');
  if(toggle){
    toggle.addEventListener('click',()=>{
      const next=root.getAttribute('data-theme')==='dark'?'light':'dark';
      root.setAttribute('data-theme',next);
      try{localStorage.setItem('pf-theme',next);}catch(e){}
      toggle.setAttribute('aria-label',next==='dark'?'Switch to light mode':'Switch to dark mode');
    });
  }
  const menuBtn=document.querySelector('.menu-toggle');
  const nav=document.querySelector('.nav');
  if(menuBtn&&nav){menuBtn.addEventListener('click',()=>nav.classList.toggle('open'));}

  const items=document.querySelectorAll('[data-reveal]');
  if('IntersectionObserver'in window&&items.length){
    const io=new IntersectionObserver((entries)=>{
      entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
    },{threshold:.14,rootMargin:'0px 0px -8% 0px'});
    items.forEach((el,i)=>{el.style.transitionDelay=(Math.min(i%5,4)*70)+'ms';io.observe(el);});
  }else{items.forEach(el=>el.classList.add('in'));}

  // narrative thread — scroll progress (0..1) drives the spine + node
  const setProgress=()=>{
    const h=document.documentElement;
    const max=h.scrollHeight-h.clientHeight;
    const p=max>0?Math.min(1,Math.max(0,h.scrollTop/max)):0;
    h.style.setProperty('--scroll',p.toFixed(4));
  };
  let ticking=false;
  const onScroll=()=>{if(!ticking){ticking=true;requestAnimationFrame(()=>{setProgress();ticking=false;});}};
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',setProgress);setProgress();

  // hero shader — flowing warm "light through the door" (WebGL, graceful fallback)
  (function(){
    const cv=document.querySelector('.hero-shader');
    if(!cv)return;
    const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
    let gl;try{gl=cv.getContext('webgl')||cv.getContext('experimental-webgl');}catch(e){}
    if(!gl){cv.style.display='none';return;}  // CSS bg shows through if no WebGL

    const VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const FS=`precision highp float;
      uniform vec2 uRes;uniform float uTime;uniform vec3 uBg;uniform vec3 uGlow;uniform vec2 uMouse;
      vec2 hash(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));
        return -1.+2.*fract(sin(p)*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
        return mix(mix(dot(hash(i+vec2(0.,0.)),f-vec2(0.,0.)),dot(hash(i+vec2(1.,0.)),f-vec2(1.,0.)),u.x),
                   mix(dot(hash(i+vec2(0.,1.)),f-vec2(0.,1.)),dot(hash(i+vec2(1.,1.)),f-vec2(1.,1.)),u.x),u.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
      void main(){
        vec2 uv=gl_FragCoord.xy/uRes.xy;
        vec2 toM=uv-uMouse;float md=length(toM);
        vec2 warp=normalize(toM+vec2(1e-4))*(0.05*exp(-md*3.5));
        vec2 p=uv+warp;p.x*=uRes.x/uRes.y;
        float t=uTime*0.085;
        vec2 q=vec2(fbm(p*1.25+vec2(0.,t)),fbm(p*1.25+vec2(3.6,-t*0.9)));
        vec2 r=vec2(fbm(p*1.25+q*1.8+vec2(1.7*t,0.3)),fbm(p*1.25+q*1.8+vec2(-t,2.0)));
        float n=fbm(p*1.25+r*1.6+vec2(t*1.1,t*0.4));
        n=n*0.5+0.5;
        vec2 rp=vec2((p.x+p.y)*0.5,(p.y-p.x)*0.10);
        float rays=fbm(rp*3.2+vec2(t*1.8,0.));
        rays=pow(clamp(rays*0.5+0.5,0.,1.),3.0);
        float bias=smoothstep(-0.15,1.25,uv.x*0.8+uv.y*0.45);
        float light=pow(clamp(n*0.78+bias*0.5,0.,1.),1.45);
        vec3 col=mix(uBg,uGlow,light*0.66);
        col+=uGlow*rays*0.28*bias;
        float d=distance(uv,uMouse);
        col+=uGlow*smoothstep(0.58,0.0,d)*0.40;
        col*=1.0-0.10*smoothstep(0.4,1.2,distance(uv,vec2(0.5)));
        float g=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
        col+=(g-0.5)*0.02;
        gl_FragColor=vec4(col,1.);}`;
    const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o;};
    const prog=gl.createProgram();
    gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){cv.style.display='none';return;}
    gl.useProgram(prog);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const uRes=gl.getUniformLocation(prog,'uRes'),uTime=gl.getUniformLocation(prog,'uTime'),
          uBg=gl.getUniformLocation(prog,'uBg'),uGlow=gl.getUniformLocation(prog,'uGlow'),
          uMouse=gl.getUniformLocation(prog,'uMouse');
    const PAL={light:{bg:[.965,.957,.937],glow:[.86,.64,.38]},dark:{bg:[.055,.047,.039],glow:[.55,.36,.17]}};
    const resize=()=>{const dpr=Math.min(devicePixelRatio||1,1.5);
      cv.width=Math.max(1,cv.clientWidth*dpr);cv.height=Math.max(1,cv.clientHeight*dpr);
      gl.viewport(0,0,cv.width,cv.height);};
    addEventListener('resize',resize);resize();
    // cursor makes the light malleable — target follows the pointer, eased in the frame loop;
    // the fbm domain also bulges gently toward it (the warp above) so the glow feels physical.
    let mx=0.82,my=0.72,tmx=0.82,tmy=0.72;
    const hero=document.querySelector('.hero');
    if(hero&&!reduce){
      hero.addEventListener('pointermove',(e)=>{
        const r=hero.getBoundingClientRect();
        tmx=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));
        tmy=Math.min(1,Math.max(0,1-(e.clientY-r.top)/r.height));
      },{passive:true});
      hero.addEventListener('pointerleave',()=>{tmx=0.82;tmy=0.72;});
    }
    let raf,visible=true,start=null,running=true;
    window.__pfPauseShader=()=>{running=false;cancelAnimationFrame(raf);};
    const frame=(ts)=>{
      if(!running)return;
      if(start===null)start=ts;
      const pal=PAL[root.getAttribute('data-theme')==='dark'?'dark':'light'];
      gl.uniform2f(uRes,cv.width,cv.height);
      gl.uniform1f(uTime,reduce?12.0:(ts-start)/1000);
      gl.uniform3fv(uBg,pal.bg);gl.uniform3fv(uGlow,pal.glow);
      mx+=(tmx-mx)*0.07;my+=(tmy-my)*0.07;
      gl.uniform2f(uMouse,mx,my);
      gl.drawArrays(gl.TRIANGLES,0,3);
      if(!reduce&&visible&&running)raf=requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    // pause when hero scrolls offscreen (perf)
    if('IntersectionObserver'in window){
      new IntersectionObserver((es)=>{es.forEach(e=>{
        visible=e.isIntersecting;
        if(visible&&!reduce){cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}
      });},{threshold:0}).observe(cv);
    }
  })();

  // contact form demo validation (no backend)
  const form=document.querySelector('form[data-demo]');
  if(form){
    form.addEventListener('submit',(ev)=>{
      ev.preventDefault();let ok=true;
      form.querySelectorAll('[required]').forEach(inp=>{
        const f=inp.closest('.field');const bad=!inp.value.trim()||(inp.type==='email'&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inp.value));
        f.classList.toggle('invalid',bad);if(bad)ok=false;
      });
      const note=form.querySelector('.form-note');
      if(ok&&note){note.textContent='Thanks — this is a demo, so nothing was sent. Wire to Resend on launch.';note.style.display='block';form.reset();}
    });
  }
})();
