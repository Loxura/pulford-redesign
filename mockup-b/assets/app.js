/* Direction B "Daylight" — reveal, mobile menu, demo form */
(function(){
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
