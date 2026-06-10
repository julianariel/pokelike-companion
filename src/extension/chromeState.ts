import type { RawPokelikeState } from '../core/types';

const READ_STATE_MESSAGE = 'POKELIKE_COMPANION_READ_STATE';

type ContentScriptResponse = RawPokelikeState & {
  ok?: boolean;
  error?: string | null;
};

type ScriptReadResult = RawPokelikeState & {
  error?: string | null;
};

function hasChromeTabs(): boolean {
  return (
    typeof globalThis.chrome !== 'undefined' &&
    typeof globalThis.chrome.tabs?.query === 'function' &&
    typeof globalThis.chrome.tabs?.sendMessage === 'function'
  );
}

function canInjectScript(): boolean {
  return (
    typeof globalThis.chrome !== 'undefined' &&
    typeof globalThis.chrome.scripting?.executeScript === 'function'
  );
}

async function readViaContentScript(tabId: number, tabUrl: string): Promise<RawPokelikeState> {
  const response = await chrome.tabs.sendMessage<unknown, ContentScriptResponse>(tabId, {
    type: READ_STATE_MESSAGE,
  });

  if (!response?.ok && response?.error) {
    throw new Error(response.error);
  }

  return {
    currentRun: response?.currentRun ?? null,
    endlessState: response?.endlessState ?? null,
    actionScreen: response?.actionScreen ?? null,
    capturedAt: response?.capturedAt,
    url: response?.url ?? tabUrl,
  };
}

async function readViaInjectedScript(tabId: number, tabUrl: string): Promise<RawPokelikeState> {
  if (!canInjectScript()) {
    throw new Error('Content script is not ready. Reload the Pokelike tab and try again.');
  }

  const [result] = await chrome.scripting.executeScript<[], ScriptReadResult>({
    target: { tabId },
    func: () => {
      try {
        return {
          currentRun: localStorage.getItem('poke_current_run'),
          endlessState: localStorage.getItem('poke_endless_state'),
          actionScreen: (() => {
            const cleanText = (text: unknown) => String(text || '').replace(/\s+/g, ' ').trim();
            const getChoiceText = (el: Element) => {
              const label =
                el.querySelector('.item-name, .equip-poke-name, .trade-member-name, .pokemon-name, .poke-name, h3, button')?.textContent ||
                el.getAttribute('aria-label') ||
                el.textContent;
              const detail =
                el.querySelector('.item-desc, .equip-item-desc, .equip-poke-lv, .trade-member-level, .pokemon-meta, .poke-level')?.textContent ||
                '';
              return { label: cleanText(label), detail: cleanText(detail) };
            };
            const extractChoices = (root: Element | Document | null, selector: string, kind: string) => {
              if (!root) return [];
              return [...root.querySelectorAll(selector)]
                .map((el, index) => ({ index, kind, ...getChoiceText(el) }))
                .filter((choice) => choice.label);
            };
            const modal = document.getElementById('item-equip-modal') || document.getElementById('usable-item-modal');
            if (modal) {
              return {
                id: modal.id,
                title: cleanText(modal.querySelector('.equip-item-name')?.textContent || 'Action'),
                prompt: cleanText(modal.querySelector('.equip-item-desc')?.textContent || ''),
                choices: extractChoices(modal, '.equip-pokemon-row, button[data-tutor], [data-idx]', 'modal-choice'),
              };
            }
            const active = document.querySelector('.screen.active');
            if (!active) return null;
            const id = active.id || 'unknown-screen';
            const selectorsByScreen: Record<string, string> = {
              'catch-screen': '#catch-choices .poke-choice-wrap, #catch-choices .poke-card',
              'item-screen': '#item-choices .item-card',
              'swap-screen': '#swap-choices .poke-card, #swap-choices button, #swap-incoming .poke-card',
              'trade-screen': '#trade-team-list .trade-member-row',
              'stat-buff-screen': '#stat-buff-choices .stat-buff-poke-wrap, #stat-buff-choices .stat-buff-row, #stat-buff-choices button',
              'elite-prep-screen': '#elite-prep-player-team .team-member, #elite-prep-items button, #btn-elite-prep-continue',
              'battle-screen': '#btn-auto-battle, #btn-continue-battle',
              'badge-screen': '#btn-next-map',
            };
            return {
              id,
              title: cleanText(active.querySelector('h1, h2, .battle-header h2, #stat-buff-title, .gameover-title, .win-title')?.textContent || id),
              prompt: cleanText(active.querySelector('p, #swap-prompt, #trade-desc, #stat-buff-subtitle, #battle-subtitle')?.textContent || ''),
              choices: extractChoices(active, selectorsByScreen[id] || 'button, [role="button"]', id.replace('-screen', '')),
            };
          })(),
          capturedAt: new Date().toISOString(),
          url: window.location.href,
          error: null,
        };
      } catch (err) {
        return {
          currentRun: null,
          endlessState: null,
          capturedAt: new Date().toISOString(),
          url: window.location.href,
          error: err instanceof Error ? err.message : 'Unable to read Pokelike localStorage.',
        };
      }
    },
  });

  const value = result?.result;
  if (value?.error) throw new Error(value.error);

  return {
    currentRun: value?.currentRun ?? null,
    endlessState: value?.endlessState ?? null,
    actionScreen: value?.actionScreen ?? null,
    capturedAt: value?.capturedAt ?? new Date().toISOString(),
    url: value?.url ?? tabUrl,
  };
}

export async function readPokelikeStateFromActiveTab(): Promise<RawPokelikeState> {
  if (!hasChromeTabs()) {
    return {
      currentRun: null,
      endlessState: null,
      capturedAt: new Date().toISOString(),
    };
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('No active tab available.');
  }

  if (!tab.url?.startsWith('https://pokelike.xyz/')) {
    return {
      currentRun: null,
      endlessState: null,
      capturedAt: new Date().toISOString(),
      url: tab.url,
    };
  }

  try {
    return await readViaContentScript(tab.id, tab.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('Receiving end does not exist')) {
      throw error;
    }
  }

  return readViaInjectedScript(tab.id, tab.url);
}
