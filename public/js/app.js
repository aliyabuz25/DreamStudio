// DreamWork Studio - Main App JS

document.addEventListener('DOMContentLoaded', () => {
  // Sync credits across all tabs when they change
  document.addEventListener('credit-update', (e) => {
    const val = e.detail.credits;
    document.querySelectorAll('[id^="credit-count"]').forEach(el => {
      el.textContent = val;
    });
    const bigCredits = document.getElementById('credits-big');
    if (bigCredits) bigCredits.textContent = val;
  });
});