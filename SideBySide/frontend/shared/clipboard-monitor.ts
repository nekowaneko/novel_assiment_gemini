
import { clipboard } from 'electron';

let lastText = '';
let intervalId: NodeJS.Timeout | null = null;

export function startClipboardPoll(callback: (text: string) => void) {
    if (intervalId) return; // Prevent multiple intervals

    lastText = clipboard.readText();

    intervalId = setInterval(() => {
        const text = clipboard.readText();
        if (text !== lastText) {
            lastText = text;
            callback(text);
        }
    }, 1000); // Poll every 1s
}

export function stopClipboardPoll() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}
