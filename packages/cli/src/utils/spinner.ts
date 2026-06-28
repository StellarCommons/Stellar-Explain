let spinnerActive = false;
const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let frameIdx = 0;
let timer: ReturnType<typeof setInterval> | null = null;

export function startSpinner(text: string, quiet = false): void {
  if (quiet || spinnerActive) return;
  spinnerActive = true;
  frameIdx = 0;
  timer = setInterval(() => {
    process.stdout.write(`\r${frames[frameIdx % frames.length]} ${text}`);
    frameIdx++;
  }, 80);
}

export function stopSpinner(success = true): void {
  if (!spinnerActive) return;
  if (timer) { clearInterval(timer); timer = null; }
  spinnerActive = false;
  process.stdout.write(`\r${success ? "✔" : "✖"}\n`);
}
