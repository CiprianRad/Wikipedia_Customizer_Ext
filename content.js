const classes = [
  'hide-left-sidebar',
  'hide-banners',
  'hide-right-sidebar',
  'hide-top-header',
  'hide-bottom-info',
  'hide-refs-links',
  'hide-see-also',
  'hide-categories'
];

// Load initial states and apply to body
chrome.storage.local.get(classes, (result) => {
  for (const className of classes) {
    if (result[className]) {
      document.body.classList.add(className);
    }
  }
  updateWikipediaNativeWidth();
  applySectionToggles();
});

function updateWikipediaNativeWidth() {
  const leftHidden = document.body.classList.contains('hide-left-sidebar');
  const rightHidden = document.body.classList.contains('hide-right-sidebar');
  
  if (leftHidden || rightHidden) {
    document.documentElement.classList.remove('vector-feature-limited-width-content-enabled');
    document.documentElement.classList.add('vector-feature-limited-width-content-disabled');
    document.body.classList.remove('vector-feature-limited-width-content-enabled');
    document.body.classList.add('vector-feature-limited-width-content-disabled');
  } else {
    // Let it revert to standard if no sidebars are hidden (optional, but safe)
    document.documentElement.classList.add('vector-feature-limited-width-content-enabled');
    document.documentElement.classList.remove('vector-feature-limited-width-content-disabled');
    document.body.classList.add('vector-feature-limited-width-content-enabled');
    document.body.classList.remove('vector-feature-limited-width-content-disabled');
  }
}

function toggleWikipediaSection(sectionIds, shouldHide) {
  for (const sectionId of sectionIds) {
    const headingSpan = document.getElementById(sectionId);
    if (!headingSpan) continue;
    
    // Wikipedia Vector 2022 wraps headings in .mw-heading. Older skins don't.
    // We must find the outer-most heading element to traverse siblings properly.
    const headingElement = headingSpan.closest('.mw-heading') || headingSpan.closest('h2, h3');
    if (!headingElement) continue;
    
    if (shouldHide) {
      headingElement.classList.add('hidden-by-extension');
    } else {
      headingElement.classList.remove('hidden-by-extension');
    }

    let nextNode = headingElement.nextElementSibling;
    while (nextNode && !nextNode.classList.contains('mw-heading') && nextNode.tagName !== 'H2' && nextNode.tagName !== 'H3') {
      if (shouldHide) {
        nextNode.classList.add('hidden-by-extension');
      } else {
        nextNode.classList.remove('hidden-by-extension');
      }
      nextNode = nextNode.nextElementSibling;
    }
  }
}

function applySectionToggles() {
  const hideRefsLinks = document.body.classList.contains('hide-refs-links');
  toggleWikipediaSection(['Notes', 'References', 'External_links'], hideRefsLinks);

  const hideSeeAlso = document.body.classList.contains('hide-see-also');
  toggleWikipediaSection(['See_also'], hideSeeAlso);
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle-class") {
    if (request.enable) {
      document.body.classList.add(request.className);
    } else {
      document.body.classList.remove(request.className);
    }
    updateWikipediaNativeWidth();
    applySectionToggles();
  }
});
