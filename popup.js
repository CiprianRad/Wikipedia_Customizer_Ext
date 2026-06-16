document.addEventListener('DOMContentLoaded', () => {
  const toggles = {
    'toggle-left-sidebar': 'hide-left-sidebar',
    'toggle-banners': 'hide-banners',
    'toggle-right-sidebar': 'hide-right-sidebar',
    'toggle-top-header': 'hide-top-header',
    'toggle-bottom-info': 'hide-bottom-info',
    'toggle-refs-links': 'hide-refs-links',
    'toggle-see-also': 'hide-see-also',
    'toggle-categories': 'hide-categories'
  };

  // Load saved states
  chrome.storage.local.get(Object.values(toggles), (result) => {
    for (const [id, className] of Object.entries(toggles)) {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.checked = result[className] || false;
        
        checkbox.addEventListener('change', (e) => {
          const isChecked = e.target.checked;
          
          // Save to storage
          chrome.storage.local.set({ [className]: isChecked });
          
          // Send message to active tab
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0] && tabs[0].url.includes("wikipedia.org")) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "toggle-class",
                className: className,
                enable: isChecked
              });
            }
          });
        });
      }
    }
  });
});
