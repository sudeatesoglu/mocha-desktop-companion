// Entry point of Mocha's Tower. It only shows what the main process sends;
// the needs and their rules live in main (ADR-0008).

function meter(id: string): HTMLMeterElement {
  const found = document.getElementById(id);
  if (!(found instanceof HTMLMeterElement)) throw new Error(`tower.html is missing #${id}`);
  return found;
}

const mood = meter('mood');
const energy = meter('energy');
const status = document.getElementById('status');

window.tower.onNeeds((view) => {
  mood.value = view.mood;
  energy.value = view.energy;
  if (status) status.textContent = view.tired ? 'Mocha is tired. A break would help you both.' : '';
});
