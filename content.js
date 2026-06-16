const classes = [
  'hide-left-sidebar',
  'hide-banners',
  'hide-right-sidebar',
  'hide-top-header',
  'hide-bottom-info',
  'hide-refs-links',
  'hide-see-also',
  'hide-categories',
  'quiz-mode'
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
  
  if (document.body.classList.contains('quiz-mode')) {
    initQuizMode();
  } else {
    disableQuizMode();
  }
}

// --- Systematic Learning Mode ---
let quizState = {
  sections: [],
  currentIndex: 0,
  isActive: false,
  cooldownUntil: 0,
  cooldownInterval: null
};

function initQuizMode() {
  if (quizState.isActive) return;
  quizState.isActive = true;
  quizState.currentIndex = 0;
  
  parseSections();
  renderQuizMode();
}

function disableQuizMode() {
  if (!quizState.isActive) return;
  quizState.isActive = false;
  
  quizState.sections.forEach(sec => {
    sec.elements.forEach(el => el.classList.remove('quiz-locked'));
    if (sec.heading) sec.heading.classList.remove('quiz-locked');
  });
  
  const btn = document.getElementById('wiki-quiz-btn');
  if (btn) btn.remove();
}

function parseSections() {
  const parserOutput = document.querySelector('.mw-parser-output');
  if (!parserOutput) return;
  
  quizState.sections = [];
  let currentSection = { heading: null, elements: [] };
  
  const children = Array.from(parserOutput.children);
  for (const child of children) {
    const isH2 = child.tagName === 'H2' || (child.classList && child.classList.contains('mw-heading') && child.querySelector('h2'));
    if (isH2) {
      quizState.sections.push(currentSection);
      currentSection = { heading: child, elements: [] };
      continue;
    }
    currentSection.elements.push(child);
  }
  quizState.sections.push(currentSection);
}

function renderQuizMode() {
  if (!quizState.isActive) return;
  
  quizState.sections.forEach((sec, index) => {
    const isLocked = index > quizState.currentIndex;
    
    if (isLocked) {
      if (sec.heading) sec.heading.classList.add('quiz-locked');
      sec.elements.forEach(el => el.classList.add('quiz-locked'));
    } else {
      if (sec.heading) sec.heading.classList.remove('quiz-locked');
      sec.elements.forEach(el => el.classList.remove('quiz-locked'));
    }
  });
  
  injectQuizButton();
}

function injectQuizButton() {
  const oldBtn = document.getElementById('wiki-quiz-btn');
  if (oldBtn) oldBtn.remove();
  
  if (quizState.currentIndex >= quizState.sections.length - 1) return;
  
  const currentSec = quizState.sections[quizState.currentIndex];
  let targetHeading = currentSec.heading;
  
  if (!targetHeading) {
    targetHeading = document.getElementById('firstHeading');
  }
  
  if (targetHeading) {
    const btn = document.createElement('button');
    btn.id = 'wiki-quiz-btn';
    
    const updateCooldown = () => {
      const remaining = Math.ceil((quizState.cooldownUntil - Date.now()) / 1000);
      if (remaining > 0) {
        btn.disabled = true;
        btn.innerText = `Cooldown (${remaining}s)`;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.disabled = false;
        btn.innerText = 'Take Quiz to Unlock Next Section';
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        clearInterval(quizState.cooldownInterval);
      }
    };
    
    if (Date.now() < quizState.cooldownUntil) {
      updateCooldown();
      clearInterval(quizState.cooldownInterval);
      quizState.cooldownInterval = setInterval(updateCooldown, 1000);
    } else {
      btn.innerText = 'Take Quiz to Unlock Next Section';
    }
    
    btn.onclick = openQuizModal;
    
    if (targetHeading.classList.contains('mw-heading')) {
       // Vector 2022 uses a wrapper .mw-heading containing the h2
       const h2 = targetHeading.querySelector('h2');
       if (h2) {
          h2.style.display = 'inline-block';
          h2.style.verticalAlign = 'middle';
          targetHeading.insertBefore(btn, h2.nextSibling);
       } else {
          targetHeading.appendChild(btn);
       }
    } else {
       // Older skins or the main firstHeading H1
       targetHeading.appendChild(btn);
    }
  }
}

function openQuizModal() {
  const modalHtml = `
    <div id="wiki-quiz-overlay">
      <div id="wiki-quiz-modal">
        <h3>Section Review</h3>
        <p>Before advancing, please answer a quick question to verify your understanding of this section.</p>
        <div class="quiz-question-box">
          <strong>Question:</strong> Did you read and understand the material in this section?
        </div>
        <div class="quiz-options">
          <button class="quiz-option" data-correct="false">No, I skipped it.</button>
          <button class="quiz-option" data-correct="false">What is a Wikipedia?</button>
          <button class="quiz-option" data-correct="true">Yes, I am ready to unlock the next section!</button>
          <button class="quiz-option" data-correct="false">I need more time.</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  document.querySelectorAll('.quiz-option').forEach(btn => {
    btn.onclick = function() {
      if (this.dataset.correct === 'true') {
        this.style.backgroundColor = '#4caf50';
        this.style.color = 'white';
        this.style.borderColor = '#4caf50';
        setTimeout(() => {
          document.getElementById('wiki-quiz-overlay').remove();
          quizState.currentIndex++;
          renderQuizMode();
          
          // Scroll to the newly unlocked section
          const newSec = quizState.sections[quizState.currentIndex];
          if (newSec && newSec.heading) {
            newSec.heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 600);
      } else {
        this.style.backgroundColor = '#ffebee';
        this.style.color = '#c62828';
        this.style.borderColor = '#ef9a9a';
        
        // Close modal after a brief pause and trigger 30s cooldown
        setTimeout(() => {
          const overlay = document.getElementById('wiki-quiz-overlay');
          if (overlay) overlay.remove();
          
          quizState.cooldownUntil = Date.now() + 30000;
          injectQuizButton(); // Re-render button to show cooldown
        }, 1000);
      }
    };
  });
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
