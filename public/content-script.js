const READ_STATE_MESSAGE = 'POKELIKE_COMPANION_READ_STATE';

function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function getChoiceText(el) {
  const label =
    el.querySelector('.item-name, .equip-poke-name, .trade-member-name, .pokemon-name, .poke-name, h3, button')?.textContent ||
    el.getAttribute('aria-label') ||
    el.textContent;
  const detail =
    el.querySelector('.item-desc, .equip-item-desc, .equip-poke-lv, .trade-member-level, .pokemon-meta, .poke-level')?.textContent ||
    '';
  return { label: cleanText(label), detail: cleanText(detail) };
}

function extractChoices(root, selector, kind) {
  if (!root) return [];
  return [...root.querySelectorAll(selector)]
    .map((el, index) => ({ index, kind, ...getChoiceText(el) }))
    .filter((choice) => choice.label);
}

function readActionScreen() {
  const modal = document.getElementById('item-equip-modal') || document.getElementById('usable-item-modal');
  if (modal) {
    const title = cleanText(modal.querySelector('.equip-item-name')?.textContent || 'Action');
    const prompt = cleanText(modal.querySelector('.equip-item-desc')?.textContent || '');
    return {
      id: modal.id,
      title,
      prompt,
      choices: extractChoices(modal, '.equip-pokemon-row, button[data-tutor], [data-idx]', 'modal-choice'),
    };
  }

  const active = document.querySelector('.screen.active');
  if (!active) return null;
  const id = active.id || 'unknown-screen';
  const title = cleanText(active.querySelector('h1, h2, .battle-header h2, #stat-buff-title, .gameover-title, .win-title')?.textContent || id);
  const prompt = cleanText(active.querySelector('p, #swap-prompt, #trade-desc, #stat-buff-subtitle, #battle-subtitle')?.textContent || '');

  const selectorsByScreen = {
    'catch-screen': '#catch-choices .poke-choice-wrap, #catch-choices .poke-card',
    'item-screen': '#item-choices .item-card',
    'swap-screen': '#swap-choices .poke-card, #swap-choices button, #swap-incoming .poke-card',
    'trade-screen': '#trade-team-list .trade-member-row',
    'stat-buff-screen': '#stat-buff-choices .stat-buff-poke-wrap, #stat-buff-choices .stat-buff-row, #stat-buff-choices button',
    'elite-prep-screen': '#elite-prep-player-team .team-member, #elite-prep-items button, #btn-elite-prep-continue',
    'battle-screen': '#btn-auto-battle, #btn-continue-battle',
    'badge-screen': '#btn-next-map',
  };
  const selector = selectorsByScreen[id] || 'button, [role="button"]';
  return {
    id,
    title,
    prompt,
    choices: extractChoices(active, selector, id.replace('-screen', '')),
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== READ_STATE_MESSAGE) return false;

  let currentRun = null;
  let endlessState = null;
  let actionScreen = null;
  let error = null;

  try {
    currentRun = localStorage.getItem('poke_current_run');
    endlessState = localStorage.getItem('poke_endless_state');
    actionScreen = readActionScreen();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unable to read Pokelike localStorage.';
  }

  sendResponse({
    ok: !error,
    url: window.location.href,
    capturedAt: new Date().toISOString(),
    currentRun,
    endlessState,
    actionScreen,
    error,
  });

  return false;
});
