// Finish line offset - distance from duck center to right edge of 150px icon
// 75px = half of 150px icon width (center of icon)
export const FINISH_LINE_OFFSET = 75;

// Minimum participants required to start/continue a race
export const MINIMUM_PARTICIPANTS = 5;

// Helper function to safely get element and perform action
export function safeElementAction(id, action) {
  const element = document.getElementById(id);
  if (element && action) {
    action(element);
  }
  return element;
}
