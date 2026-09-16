async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_SETTINGS = {
  enabled: true,
  blockImages: true,
  blockVideos: true,
  blockText: true,
  thresholds: { porn: 0.55, hentai: 0.55, sexy: 0.75 },
  passwordHash: null,
  blockedCount: 0
};

async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return settings || { ...DEFAULT_SETTINGS };
}

function show(id) { document.getElementById(id).style.display = 'block'; }
function hide(id) { document.getElementById(id).style.display = 'none'; }
function $(id) { return document.getElementById(id); }

async function boot() {
  const s = await getSettings();
  if (!s.passwordHash) {
    show('setup');
  } else {
    hide('setup'); show('locked');
  }
}

$('setPass').onclick = async () => {
  const p = $('newPass').value;
  if (p.length < 4) return alert('Senha muito curta.');
  const s = await getSettings();
  s.passwordHash = await sha256(p);
  await chrome.storage.local.set({ settings: s });
  hide('setup'); openPanel(s);
};

$('unlock').onclick = async () => {
  const p = $('unlockPass').value;
  const s = await getSettings();
  if ((await sha256(p)) === s.passwordHash) { hide('locked'); openPanel(s); }
  else $('err').textContent = 'Senha incorreta.';
};

function openPanel(s) {
  show('panel');
  const th = s.thresholds || { porn: 0.55, hentai: 0.55, sexy: 0.75 };
  $('enabled').checked = s.enabled; $('blockImages').checked = s.blockImages;
  $('blockVideos').checked = s.blockVideos; $('blockText').checked = s.blockText;
  $('thPorn').value = th.porn * 100; $('thHentai').value = th.hentai * 100; $('thSexy').value = th.sexy * 100;
  const upd = () => {
    $('vPorn').textContent = $('thPorn').value + '%';
    $('vHentai').textContent = $('thHentai').value + '%';
    $('vSexy').textContent = $('thSexy').value + '%';
  };
  $('thPorn').oninput = $('thHentai').oninput = $('thSexy').oninput = upd; upd();

  $('save').onclick = async () => {
    s.enabled = $('enabled').checked; s.blockImages = $('blockImages').checked;
    s.blockVideos = $('blockVideos').checked; s.blockText = $('blockText').checked;
    s.thresholds = {
      porn: $('thPorn').value / 100,
      hentai: $('thHentai').value / 100,
      sexy: $('thSexy').value / 100
    };
    await chrome.storage.local.set({ settings: s });
    $('saved').textContent = 'Salvo!';
    setTimeout(() => $('saved').textContent = '', 1500);
  };
}

boot();
