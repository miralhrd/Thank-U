/* 감사해U 겨울 — 눈 내리는 배경
 * · 캔버스 1장 + requestAnimationFrame (외부 라이브러리·DOM 요소 추가 없음)
 * · 눈송이는 미리 그려 둔 작은 그림(스프라이트)을 찍기만 함 → 매 프레임 그리기 비용 최소
 * · 눈송이 수는 화면 넓이에 맞춰 제한(폰 약 25개 · PC 최대 70개)
 * · 탭이 숨겨지거나(visibilitychange) 창(모달)이 열리면 멈춤 · 움직임 줄이기 설정이면 멈춘 한 장면만
 */
(function(){
  var cv = document.getElementById("snow");
  if(!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d");
  if(!ctx) return;
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0, H = 0, flakes = [], raf = 0, last = 0, t = 0, wind = 0;
  var SPR = [];

  /* 동그란 눈송이: 가운데는 흰색, 가장자리는 옅은 푸른 테 → 흰 바탕에서도 보임 */
  function dot(r){
    var s = Math.ceil((r * 2 + 2) * DPR), c = document.createElement("canvas"); c.width = c.height = s;
    var g = c.getContext("2d"), m = s / 2, gr = g.createRadialGradient(m, m, 0, m, m, m);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.5, "rgba(255,255,255,0.93)");
    gr.addColorStop(0.78, "rgba(214,225,240,0.38)");
    gr.addColorStop(1, "rgba(214,225,240,0)");
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    return { c: c, s: s / DPR };
  }
  /* 결정 눈송이(여섯 갈래): 아주 가끔만 섞어 세련된 느낌 */
  function crystal(r){
    var s = Math.ceil((r * 2 + 4) * DPR), c = document.createElement("canvas"); c.width = c.height = s;
    var g = c.getContext("2d"), m = s / 2, R = r * DPR;
    g.strokeStyle = "rgba(150,178,214,0.9)"; g.lineCap = "round"; g.lineWidth = Math.max(1, 1.3 * DPR);
    g.shadowColor = "rgba(255,255,255,0.9)"; g.shadowBlur = 2 * DPR;
    g.beginPath();
    for(var k = 0; k < 6; k++){
      var a = Math.PI / 3 * k, sx = Math.sin(a), cy = -Math.cos(a);
      g.moveTo(m, m); g.lineTo(m + R * sx, m + R * cy);
      var bx = m + R * 0.55 * sx, by = m + R * 0.55 * cy, L = R * 0.3;
      g.moveTo(bx + L * Math.sin(a + 0.8), by - L * Math.cos(a + 0.8)); g.lineTo(bx, by); g.lineTo(bx + L * Math.sin(a - 0.8), by - L * Math.cos(a - 0.8));
    }
    g.stroke();
    return { c: c, s: s / DPR };
  }
  function sprites(){ SPR = [dot(1.8), dot(2.6), dot(3.6), dot(4.8), crystal(6.5), crystal(8.5)]; }
  sprites();

  function target(){ return Math.max(14, Math.min(70, Math.round(W * H / 12000))); }
  function make(y){
    var near = Math.random(), k;
    if(Math.random() < 0.07) k = near > 0.5 ? 5 : 4;            // 결정 7%
    else k = near < 0.35 ? 0 : near < 0.65 ? 1 : near < 0.9 ? 2 : 3;
    var depth = (k % 4 + 1) / 4;                                  // 클수록 가깝고 빠름(원근)
    return {
      k: k, x: Math.random() * W, y: y == null ? Math.random() * H : y,
      vy: 16 + depth * 34 + Math.random() * 10,                   // 초당 px — 천천히
      sw: 6 + Math.random() * 18, sf: 0.3 + Math.random() * 0.5, ph: Math.random() * 6.28,
      o: 0.55 + depth * 0.4, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.6
    };
  }
  function resize(){
    var w = window.innerWidth, h = window.innerHeight, d = Math.min(window.devicePixelRatio || 1, 1.5);
    if(d !== DPR){ DPR = d; sprites(); W = 0; }                 // 다른 해상도 화면으로 옮긴 경우
    if(w === W && h === H) return;
    W = w; H = h;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var n = target();
    while(flakes.length < n) flakes.push(make());
    if(flakes.length > n) flakes.length = n;
    for(var i = 0; i < flakes.length; i++){ if(flakes[i].x > W) flakes[i].x = Math.random() * W; if(flakes[i].y > H) flakes[i].y = Math.random() * H; }
  }
  function draw(){
    ctx.clearRect(0, 0, W, H);
    for(var i = 0; i < flakes.length; i++){
      var f = flakes[i], sp = SPR[f.k], x = f.x + Math.sin(t * f.sf + f.ph) * f.sw, half = sp.s / 2;
      ctx.globalAlpha = f.o;
      if(f.k >= 4){
        ctx.save(); ctx.translate(x, f.y); ctx.rotate(f.rot); ctx.drawImage(sp.c, -half, -half, sp.s, sp.s); ctx.restore();
      }else{
        ctx.drawImage(sp.c, x - half, f.y - half, sp.s, sp.s);
      }
    }
    ctx.globalAlpha = 1;
  }
  function step(now){
    raf = 0;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now; t += dt;
    wind = Math.sin(t * 0.07) * 8;                                // 아주 느린 바람
    for(var i = 0; i < flakes.length; i++){
      var f = flakes[i];
      f.y += f.vy * dt; f.x += wind * dt * (0.4 + f.vy / 60); f.rot += f.vr * dt;
      if(f.y - 10 > H){ var n = make(-10); n.x = Math.random() * W; flakes[i] = n; }
      else if(f.x < -30) f.x += W + 60; else if(f.x > W + 30) f.x -= W + 60;
    }
    draw();
    start();
  }
  function paused(){ return document.hidden || document.body.classList.contains("modal-open") || (mq && mq.matches); }
  function start(){ if(!raf && !paused()) raf = requestAnimationFrame(step); }
  function stop(){ if(raf){ cancelAnimationFrame(raf); raf = 0; } last = 0; }
  function sync(){ if(paused()){ stop(); draw(); } else start(); }

  resize(); draw();
  var rt = 0;
  window.addEventListener("resize", function(){ clearTimeout(rt); rt = setTimeout(function(){ resize(); if(paused()) draw(); }, 150); }, { passive: true });
  document.addEventListener("visibilitychange", sync);
  if(window.MutationObserver) new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  if(mq){ if(mq.addEventListener) mq.addEventListener("change", sync); else if(mq.addListener) mq.addListener(sync); }
  start();
  window.__snow = { count: function(){ return flakes.length; }, running: function(){ return !!raf; } };   // 점검용(동작 무관)
})();
