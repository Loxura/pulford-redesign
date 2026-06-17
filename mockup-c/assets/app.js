/* Direction C — theme toggle + scroll reveal + mobile menu + demo form */
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
  const mnav=document.querySelector('.mnav');
  if(menuBtn&&mnav){menuBtn.addEventListener('click',()=>mnav.classList.toggle('open'));}

  const items=document.querySelectorAll('[data-reveal],[data-rule]');
  if('IntersectionObserver'in window&&items.length){
    const io=new IntersectionObserver((entries)=>{
      entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
    },{threshold:.12,rootMargin:'0px 0px -8% 0px'});
    items.forEach((el,i)=>{el.style.transitionDelay=(Math.min(i%4,3)*90)+'ms';io.observe(el);});
  }else{items.forEach(el=>el.classList.add('in'));}

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
      if(ok&&note){note.textContent='Thank you — this is a design mockup, so nothing was sent. The live form will reach our team directly.';note.style.display='block';form.reset();}
    });
  }
})();
