// Measure the real header instead of assuming the same height on every device.
(() => {
  const header=document.querySelector('.top');if(!header)return;
  let measured=0;
  function resize(){const height=Math.ceil(header.getBoundingClientRect().height);if(height>0&&height!==measured){measured=height;document.documentElement.style.setProperty('--top-height',height+'px')}}
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(header);
  window.addEventListener('resize',resize);window.addEventListener('pageshow',resize);
  document.fonts?.ready.then(resize);resize();
})();
