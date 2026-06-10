async function enableSidePanelAction() {
  if (!chrome.sidePanel?.setPanelBehavior) return;
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn('Unable to enable side panel action behavior.', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void enableSidePanelAction();
});

chrome.runtime.onStartup?.addListener(() => {
  void enableSidePanelAction();
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!chrome.sidePanel?.open || tab.windowId === undefined) return;
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.warn('Unable to open side panel.', error);
  }
});
