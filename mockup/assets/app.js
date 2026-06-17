/* Direction A·redux "Daylight, through the door" —
   theme toggle, reveal, mobile menu, the doorway shader, demo form */
(function(){
  const root=document.documentElement;

  // Daylight / Dusk toggle (persisted, pf-theme)
  const toggle=document.querySelector('.theme-toggle');
  if(toggle){
    toggle.addEventListener('click',()=>{
      const next=root.getAttribute('data-theme')==='dark'?'light':'dark';
      root.setAttribute('data-theme',next);
      try{localStorage.setItem('pf-theme',next);}catch(e){}
      toggle.setAttribute('aria-label',next==='dark'?'Switch to daylight':'Switch to dusk');
    });
  }

  const menuBtn=document.querySelector('.menu-toggle');
  const nav=document.querySelector('.nav');
  if(menuBtn&&nav){
    menuBtn.addEventListener('click',()=>{
      const open=nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded',open?'true':'false');
    });
  }

  const items=document.querySelectorAll('[data-reveal]');
  if('IntersectionObserver'in window&&items.length){
    const io=new IntersectionObserver((entries)=>{
      entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
    },{threshold:.12,rootMargin:'0px 0px -8% 0px'});
    items.forEach((el,i)=>{el.style.transitionDelay=(Math.min(i%4,3)*80)+'ms';io.observe(el);});
  }else{items.forEach(el=>el.classList.add('in'));}

  // ---- the doorway shader — daylight pouring through the arch ----
  // (WebGL FBM domain-warp; CSS radial gradient in .hero-door is the fallback)
  (function(){
    const cv=document.querySelector('.hero-shader');
    if(!cv)return;
    const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
    let gl;try{gl=cv.getContext('webgl')||cv.getContext('experimental-webgl');}catch(e){}
    if(!gl){cv.style.display='none';return;}

    const VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const FS=`precision highp float;
      uniform vec2 uRes;uniform float uTime;uniform vec3 uBg;uniform vec3 uGlow;uniform vec3 uSky;uniform vec2 uMouse;
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
        vec2 q=vec2(fbm(p*1.3+vec2(0.,t)),fbm(p*1.3+vec2(3.6,-t*0.9)));
        vec2 r=vec2(fbm(p*1.3+q*1.8+vec2(1.7*t,0.3)),fbm(p*1.3+q*1.8+vec2(-t,2.0)));
        float n=fbm(p*1.3+r*1.6+vec2(t*1.1,t*0.4));
        n=n*0.5+0.5;
        /* sun disc, high in the arch */
        vec2 sp=uv-vec2(0.5,0.78);sp.x*=uRes.x/uRes.y;
        float sun=smoothstep(0.34,0.05,length(sp));
        /* rays fanning down from the sun */
        vec2 rp=vec2((p.x)*0.62,(1.0-p.y)*0.16);
        float rays=fbm(rp*3.4+vec2(t*1.7,0.));
        rays=pow(clamp(rays*0.5+0.5,0.,1.),3.0)*smoothstep(0.1,0.9,uv.y);
        /* daylight: brighter toward the top-centre of the doorway */
        float bias=smoothstep(-0.2,1.15,uv.y*0.9+0.18-abs(uv.x-0.5)*0.5);
        float light=pow(clamp(n*0.7+bias*0.55,0.,1.),1.4);
        vec3 col=mix(uBg,uGlow,light*0.72);
        col=mix(col,uSky,(1.0-light)*0.16*smoothstep(0.3,1.0,uv.y));
        col+=uGlow*rays*0.30;
        col+=uGlow*sun*0.55;
        float d=distance(uv,uMouse);
        col+=uGlow*smoothstep(0.55,0.0,d)*0.38;
        col*=1.0-0.10*smoothstep(0.5,1.25,distance(uv,vec2(0.5,0.55)));
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
    const U=n=>gl.getUniformLocation(prog,n);
    const uRes=U('uRes'),uTime=U('uTime'),uBg=U('uBg'),uGlow=U('uGlow'),uSky=U('uSky'),uMouse=U('uMouse');
    // Daylight: cream paper warmed by marigold, a brush of prairie sky.
    // Dusk: deep spruce night, amber lamplight.
    const PAL={
      light:{bg:[.980,.953,.894],glow:[.949,.663,.231],sky:[.655,.800,.910]},
      dark:{bg:[.071,.118,.094],glow:[.910,.635,.231],sky:[.180,.290,.360]}
    };
    const resize=()=>{const dpr=Math.min(devicePixelRatio||1,1.5);
      cv.width=Math.max(1,cv.clientWidth*dpr);cv.height=Math.max(1,cv.clientHeight*dpr);
      gl.viewport(0,0,cv.width,cv.height);};
    addEventListener('resize',resize);resize();
    // the light leans toward the cursor (eased), so the doorway feels alive
    let mx=.5,my=.62,tmx=.5,tmy=.62;
    const hero=document.querySelector('.hero');
    if(hero&&!reduce){
      hero.addEventListener('pointermove',(e)=>{
        const r=cv.getBoundingClientRect();
        tmx=Math.min(1.2,Math.max(-.2,(e.clientX-r.left)/r.width));
        tmy=Math.min(1.2,Math.max(-.2,1-(e.clientY-r.top)/r.height));
      },{passive:true});
      hero.addEventListener('pointerleave',()=>{tmx=.5;tmy=.62;});
    }
    let raf,visible=true,start=null,running=true;
    window.__pfPauseShader=()=>{running=false;cancelAnimationFrame(raf);};
    const frame=(ts)=>{
      if(!running)return;
      if(start===null)start=ts;
      const pal=PAL[root.getAttribute('data-theme')==='dark'?'dark':'light'];
      gl.uniform2f(uRes,cv.width,cv.height);
      gl.uniform1f(uTime,reduce?12.0:(ts-start)/1000);
      gl.uniform3fv(uBg,pal.bg);gl.uniform3fv(uGlow,pal.glow);gl.uniform3fv(uSky,pal.sky);
      mx+=(tmx-mx)*0.07;my+=(tmy-my)*0.07;
      gl.uniform2f(uMouse,mx,my);
      gl.drawArrays(gl.TRIANGLES,0,3);
      if(!reduce&&visible&&running)raf=requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    if('IntersectionObserver'in window){
      new IntersectionObserver((es)=>{es.forEach(e=>{
        visible=e.isIntersecting;
        if(visible&&!reduce&&running){cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}
      });},{threshold:0}).observe(cv);
    }
  })();

  // contact form demo validation (no backend)
  const form=document.querySelector('form[data-demo]');
  if(form){
    form.addEventListener('submit',(ev)=>{
      ev.preventDefault();let ok=true;
      form.querySelectorAll('[required]').forEach(inp=>{
        const f=inp.closest('.field');
        const bad=!inp.value.trim()||(inp.type==='email'&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inp.value));
        f.classList.toggle('invalid',bad);if(bad)ok=false;
      });
      const note=form.querySelector('.form-note');
      if(ok&&note){note.textContent='Thanks — this is a demo, so nothing was sent. Wire to Resend on launch.';note.style.display='block';form.reset();}
    });
  }
})();
