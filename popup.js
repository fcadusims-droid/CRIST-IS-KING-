(async () => {
  const { settings } = await chrome.storage.local.get('settings');
  document.getElementById('status').textContent = settings?.enabled ? 'Ativo ✓' : 'Desativado';
  document.getElementById('count').textContent = settings?.blockedCount ?? 0;
  document.getElementById('options').onclick = () => chrome.runtime.openOptionsPage();
})();
