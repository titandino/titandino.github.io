const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pointer = { x: innerWidth * 0.16, y: innerHeight * 0.2, tx: innerWidth * 0.16, ty: innerHeight * 0.2 };

const VERTEX = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uPtr;
uniform float uTime;
uniform float uScroll;
uniform float uCell;

float h1(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 h2(vec2 p) {
  float n = h1(p);
  return vec2(n, h1(p + n + 17.1));
}

float lamp(vec3 n, vec2 at, vec2 src, float height, float reach) {
  vec2 d = src - at;
  vec3 l = normalize(vec3(d, height));
  vec3 h = normalize(l + vec3(0., 0., 1.));
  float fall = 1. / (1. + dot(d, d) / (reach * reach));
  return (pow(max(dot(n, h), 0.), 42.) + .05 * max(dot(n, l), 0.)) * fall;
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = (frag + vec2(0., uScroll)) / uCell;
  p.y += sin(p.x * .085) * 1.5 + sin(p.x * .021 + 1.7) * 2.4;
  p.x += h1(vec2(floor(p.y), 3.)) + sin(p.y * .05) * 1.2;

  vec2 id = floor(p);
  vec2 f = fract(p);
  vec2 r = h2(id);
  vec2 half_ = .5 - vec2(.05 + .06 * r.x, .05 + .06 * r.y);
  vec2 q = abs(f - .5);
  float tile = smoothstep(0., .08, half_.x - q.x) * smoothstep(0., .08, half_.y - q.y);

  vec2 tilt = (h2(id + 7.3) - .5) * 1.15;
  tilt += .07 * vec2(sin(uTime * .7 + r.x * 40.), cos(uTime * .55 + r.y * 40.));
  vec3 n = normalize(vec3(tilt, 1.));

  float flicker = .86 + .09 * sin(uTime * 9.1) * sin(uTime * 5.3) + .05 * sin(uTime * 23.);
  float unit = uRes.y;
  vec2 wanderA = uRes * (.5 + .42 * vec2(sin(uTime * .061), cos(uTime * .047)));
  vec2 wanderB = uRes * (.5 + .45 * vec2(cos(uTime * .039 + 2.), sin(uTime * .053 + 1.)));

  float light = lamp(n, frag, uPtr, uCell * 7., unit * .30) * 1.5 * flicker;
  light += lamp(n, frag, wanderA, uCell * 10., unit * .34) * .55;
  light += lamp(n, frag, wanderB, uCell * 10., unit * .30) * .4;

  float kind = h1(id + 91.7);
  vec3 tone = mix(vec3(.93, .68, .26), vec3(1., .87, .52), r.x * .6);
  if (kind < .045) tone = vec3(.80, .22, .12);
  else if (kind < .075) tone = vec3(.16, .30, .62);

  vec3 col = tone * tile * (light + .013);

  vec2 dp = uPtr - frag;
  float pool = 1. / (1. + dot(dp, dp) / (unit * unit * .05));
  col += vec3(.95, .55, .2) * .03 * pool * flicker;

  vec2 uv = frag / uRes - .5;
  col *= 1. - .55 * dot(uv, uv);
  gl_FragColor = vec4(col, 1.);
}`;

function startMosaic() {
  const canvas = document.getElementById('mosaic');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = name => gl.getUniformLocation(program, name);
  const uRes = uniform('uRes');
  const uPtr = uniform('uPtr');
  const uTime = uniform('uTime');
  const uScroll = uniform('uScroll');
  const uCell = uniform('uCell');

  let dpr = 1;
  let frame = 0;

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uCell, 13 * dpr);
  };

  const draw = now => {
    pointer.x += (pointer.tx - pointer.x) * 0.12;
    pointer.y += (pointer.ty - pointer.y) * 0.12;
    gl.uniform2f(uPtr, pointer.x * dpr, pointer.y * dpr);
    gl.uniform1f(uTime, reducedMotion ? 12 : now / 1000);
    gl.uniform1f(uScroll, scrollY * dpr * 0.35);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const loop = now => {
    draw(now);
    frame = requestAnimationFrame(loop);
  };

  const once = () => requestAnimationFrame(draw);

  resize();
  addEventListener('resize', () => {
    resize();
    if (reducedMotion) once();
  });

  if (reducedMotion) {
    once();
    addEventListener('scroll', once, { passive: true });
  } else {
    frame = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(loop);
    });
  }
  canvas.classList.add('lit');
}

function trackPointer() {
  const gilded = [...document.querySelectorAll('.gild')];
  let queued = false;

  const apply = () => {
    queued = false;
    root.style.setProperty('--px', (pointer.tx / innerWidth).toFixed(3));
    for (const el of gilded) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > innerHeight + 200) continue;
      el.style.setProperty('--lx', `${pointer.tx - rect.left}px`);
      el.style.setProperty('--ly', `${pointer.ty - rect.top}px`);
    }
  };

  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  };

  addEventListener('pointermove', e => {
    pointer.tx = e.clientX;
    pointer.ty = e.clientY;
    queue();
  }, { passive: true });
  addEventListener('scroll', queue, { passive: true });
}

function tiltPlates() {
  if (reducedMotion || !matchMedia('(hover: hover)').matches) return;
  for (const plate of document.querySelectorAll('.plate')) {
    plate.addEventListener('pointermove', e => {
      const rect = plate.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      plate.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
      plate.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
    });
    plate.addEventListener('pointerleave', () => {
      plate.style.removeProperty('--rx');
      plate.style.removeProperty('--ry');
    });
  }
}

function placeHinges() {
  const main = document.querySelector('main');
  const place = () => {
    const rect = main.getBoundingClientRect();
    root.style.setProperty('--hinge-l', `${rect.left}px`);
    root.style.setProperty('--hinge-r', `${rect.right}px`);
  };
  place();
  new ResizeObserver(place).observe(document.body);
}

function revealOnScroll() {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function spySections() {
  const links = new Map([...document.querySelectorAll('[data-spy]')].map(a => [a.dataset.spy, a]));
  const strip = document.querySelector('.sections');
  const mark = id => links.forEach((a, key) => {
    a.classList.toggle('here', key === id);
    if (key !== id) return a.removeAttribute('aria-current');
    a.setAttribute('aria-current', 'true');
    if (strip.scrollWidth > strip.clientWidth)
      strip.scrollTo({ left: a.offsetLeft - (strip.clientWidth - a.offsetWidth) / 2, behavior: reducedMotion ? 'auto' : 'smooth' });
  });
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries)
      if (entry.isIntersecting && entry.target.tagName === 'SECTION') mark(entry.target.id);
  }, { rootMargin: '-35% 0px -60% 0px' });
  document.querySelectorAll('main section').forEach(section => observer.observe(section));

  const craft = document.getElementById('capabilities');
  new IntersectionObserver(entries => {
    const stacked = getComputedStyle(craft).position !== 'sticky';
    for (const entry of entries)
      if (stacked && entry.isIntersecting) mark('capabilities');
  }, { rootMargin: '-35% 0px -60% 0px' }).observe(craft);
  mark('profile');
}

function goTo(id) {
  const target = document.getElementById(id);
  target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  target.classList.remove('flash');
  void target.offsetWidth;
  target.classList.add('flash');
}

function traceSkills() {
  const users = [...document.querySelectorAll('[data-uses]')].map(el => ({ el, keys: new Set(el.dataset.uses.split(' ')) }));
  const skills = [...document.querySelectorAll('[data-skill]')];
  const gloss = document.getElementById('gloss');
  const idle = gloss.textContent;

  const clear = () => {
    root.classList.remove('illumine', 'tracing');
    skills.forEach(skill => skill.classList.remove('lit'));
    users.forEach(user => user.el.classList.remove('lit'));
    gloss.textContent = idle;
  };

  for (const user of users) {
    const light = () => {
      root.classList.add('illumine');
      skills.forEach(skill => skill.classList.toggle('lit', user.keys.has(skill.dataset.skill)));
    };
    user.el.addEventListener('pointerenter', light);
    user.el.addEventListener('focusin', light);
    user.el.addEventListener('pointerleave', clear);
    user.el.addEventListener('focusout', clear);
  }

  for (const skill of skills) {
    skill.addEventListener('pointerenter', () => {
      const matches = users.filter(user => user.keys.has(skill.dataset.skill));
      if (!matches.length) {
        gloss.textContent = `${skill.textContent} — across independent work.`;
        return;
      }
      root.classList.add('tracing');
      users.forEach(user => user.el.classList.toggle('lit', matches.includes(user)));
      gloss.replaceChildren(`${skill.textContent} — `, Object.assign(document.createElement('b'), { textContent: matches.map(user => user.el.dataset.name).join(', ') }));
    });
    skill.addEventListener('pointerleave', clear);
  }
}

function buildPalette() {
  const dialog = document.getElementById('palette');
  const input = document.getElementById('palette-input');
  const list = document.getElementById('palette-list');
  const email = 'me@trentonkress.com';
  const open = href => () => window.open(href, '_blank', 'noopener');
  const section = id => () => goTo(id);

  const commands = [
    ['Profile', 'Go to', section('profile')],
    ['Experience', 'Go to', section('experience')],
    ['Projects', 'Go to', section('projects')],
    ['Education', 'Go to', section('education')],
    ['Capabilities', 'Go to', section('capabilities')],
    ['GitLab', 'Open', open('https://gitlab.com/titandino')],
    ['GitHub', 'Open', open('https://github.com/titandino')],
    ['LinkedIn', 'Open', open('https://www.linkedin.com/in/trenton-kress')],
    ['Résumé (PDF)', 'Open', open('https://drive.google.com/file/d/19GOUde92zU4j8xA2kPkXCQIMkXFKGWsH/view?usp=sharing')],
    ['Darkan', 'Open', open('https://darkan.org')],
    ['Play Asteroids', 'Open', () => location.assign('/asteroids/')],
    ['Copy email address', 'Copy', () => navigator.clipboard?.writeText(email)],
    ['Write an email', 'Mail', () => location.assign(`mailto:${email}`)],
    ['Print this page as a résumé', 'Print', () => setTimeout(() => print(), 150)]
  ];

  let shown = [];
  let cursor = 0;

  const select = index => {
    cursor = index;
    [...list.children].forEach((item, i) => item.setAttribute('aria-selected', String(i === cursor)));
    list.children[cursor]?.scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', shown.length ? `cmd-${cursor}` : '');
  };

  const run = index => {
    const command = shown[index];
    if (!command) return;
    dialog.close();
    command[2]();
  };

  const render = () => {
    const query = input.value.trim().toLowerCase();
    shown = commands.filter(([label, kind]) => `${kind} ${label}`.toLowerCase().includes(query));
    list.replaceChildren(...shown.map(([label, kind], i) => {
      const item = document.createElement('li');
      item.id = `cmd-${i}`;
      item.setAttribute('role', 'option');
      item.append(label, Object.assign(document.createElement('small'), { textContent: kind }));
      item.addEventListener('click', () => run(i));
      item.addEventListener('pointermove', () => i !== cursor && select(i));
      return item;
    }));
    if (!shown.length) {
      const none = Object.assign(document.createElement('li'), { className: 'none', textContent: 'Nothing found' });
      none.setAttribute('role', 'option');
      none.setAttribute('aria-disabled', 'true');
      list.append(none);
    }
    select(0);
  };

  const summon = () => {
    if (dialog.open) return;
    input.value = '';
    render();
    dialog.showModal();
  };

  input.addEventListener('input', render);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (shown.length) select((cursor + (e.key === 'ArrowDown' ? 1 : shown.length - 1)) % shown.length);
    }
  });
  dialog.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    run(cursor);
  });
  dialog.addEventListener('click', e => e.target === dialog && dialog.close());
  document.querySelector('.summon').addEventListener('click', summon);
  addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName);
    if ((e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
      e.preventDefault();
      summon();
    }
  });

  if (/Mac|iPhone|iPad/.test(navigator.platform)) document.querySelector('.summon kbd').textContent = '⌘';
}

placeHinges();
revealOnScroll();
spySections();
trackPointer();
tiltPlates();
traceSkills();
buildPalette();
(window.requestIdleCallback || setTimeout)(startMosaic);
