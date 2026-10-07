/**
 * DialogueUI — the on-screen conversation box.
 *
 * Layout follows the spec: NPC name centered at the top, dialogue text in the
 * body, player choices as buttons along the bottom. Styling mirrors the existing
 * HUD (dark translucent panels, gold key accents).
 *
 * The UI is deliberately dumb: it renders whatever the controller tells it and
 * reports mouse interaction back through callbacks. Typewriter reveal is driven
 * by the game loop via `update(dt)` so there are no stray timers.
 */

const CHARS_PER_SECOND = 90;

interface Segment {
  text: string;
  italic: boolean;
}

/** Split `*emphasised*` runs out of a line of dialogue. */
function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  const parts = raw.split('*');
  parts.forEach((part, i) => {
    if (part.length === 0) return;
    segments.push({ text: part, italic: i % 2 === 1 });
  });
  if (segments.length === 0) segments.push({ text: '', italic: false });
  return segments;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class DialogueUI {
  private overlay: HTMLElement;
  private box: HTMLElement;
  private nameEl: HTMLElement;
  private textEl: HTMLElement;
  private choicesEl: HTMLElement;
  private continueEl: HTMLElement;
  private promptEl: HTMLElement;
  private promptTargetEl: HTMLElement;

  private segments: Segment[] = [];
  private totalChars = 0;
  private revealed = 0;
  private selectedIndex = 0;
  private choiceButtons: HTMLButtonElement[] = [];
  private showingChoices = false;

  /** Fired when the player clicks a choice button. */
  public onChoiceClicked: ((index: number) => void) | null = null;
  /** Fired when the player clicks a single-response line. */
  public onAdvanceClicked: (() => void) | null = null;
  /** Fired when the player clicks the interaction prompt. */
  public onPromptClicked: (() => void) | null = null;

  constructor() {
    this.overlay = document.getElementById('dialogue-overlay')!;
    this.box = document.getElementById('dialogue-box')!;
    this.nameEl = document.getElementById('dialogue-name')!;
    this.textEl = document.getElementById('dialogue-text')!;
    this.choicesEl = document.getElementById('dialogue-choices')!;
    this.continueEl = document.getElementById('dialogue-continue')!;
    this.promptEl = document.getElementById('interact-prompt')!;
    this.promptTargetEl = document.getElementById('interact-target')!;

    this.box.addEventListener('mousedown', (e) => {
      // Clicking the box body advances single-response dialogue.
      if (this.showingChoices) return;
      if ((e.target as HTMLElement).closest('#dialogue-choices')) return;
      e.stopPropagation();
      this.onAdvanceClicked?.();
    });

    this.promptEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onPromptClicked?.();
    });
  }

  // --- Visibility ---

  get isOpen(): boolean {
    return this.overlay.classList.contains('dialogue-visible');
  }

  open(npcName: string): void {
    this.nameEl.textContent = npcName;
    this.textEl.textContent = '';
    this.choicesEl.innerHTML = '';
    this.choiceButtons = [];
    this.showingChoices = false;
    this.overlay.classList.add('dialogue-visible');
    this.continueEl.classList.remove('continue-visible');
  }

  close(): void {
    this.overlay.classList.remove('dialogue-visible');
    this.choicesEl.innerHTML = '';
    this.choiceButtons = [];
    this.showingChoices = false;
    this.continueEl.classList.remove('continue-visible');
  }

  showPrompt(targetName: string): void {
    this.promptTargetEl.textContent = targetName;
    this.promptEl.classList.add('prompt-visible');
  }

  hidePrompt(): void {
    this.promptEl.classList.remove('prompt-visible');
  }

  // --- Text ---

  /** Start typing out a single NPC line. */
  showLine(text: string): void {
    this.segments = parseSegments(text);
    this.totalChars = this.segments.reduce((sum, s) => sum + s.text.length, 0);
    this.revealed = 0;
    this.choicesEl.innerHTML = '';
    this.choiceButtons = [];
    this.showingChoices = false;
    this.continueEl.classList.remove('continue-visible');
    this.renderText();
  }

  get isTyping(): boolean {
    return this.revealed < this.totalChars;
  }

  /** Reveal the whole line immediately (used when advancing mid-type). */
  finishTyping(): void {
    this.revealed = this.totalChars;
    this.renderText();
  }

  /** Advance the typewriter. Called from the game loop. */
  update(dt: number): void {
    if (!this.isOpen) return;
    if (this.isTyping) {
      this.revealed = Math.min(this.totalChars, this.revealed + dt * CHARS_PER_SECOND);
      this.renderText();
    }
  }

  private renderText(): void {
    const shown = Math.floor(this.revealed);
    let remaining = shown;
    let html = '';
    for (const segment of this.segments) {
      if (remaining <= 0) break;
      const slice = segment.text.slice(0, remaining);
      remaining -= slice.length;
      const escaped = escapeHtml(slice);
      html += segment.italic ? `<em>${escaped}</em>` : escaped;
    }
    this.textEl.innerHTML = html;
    this.updateContinueHint();
  }

  // --- Choices ---

  showChoices(options: string[]): void {
    this.showingChoices = true;
    this.choicesEl.innerHTML = '';
    this.choiceButtons = options.map((label, index) => {
      const button = document.createElement('button');
      button.className = 'dialogue-choice';
      button.type = 'button';
      button.dataset.index = String(index);
      button.innerHTML = `<span class="choice-marker">&gt;</span> <span class="choice-text">"${escapeHtml(label)}"</span>`;
      button.addEventListener('mouseenter', () => this.setSelected(index));
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setSelected(index);
        this.onChoiceClicked?.(index);
      });
      this.choicesEl.appendChild(button);
      return button;
    });
    this.setSelected(0);
    this.updateContinueHint();
  }

  get choiceCount(): number {
    return this.choiceButtons.length;
  }

  get hasChoices(): boolean {
    return this.showingChoices && this.choiceButtons.length > 0;
  }

  setSelected(index: number): void {
    if (this.choiceButtons.length === 0) return;
    const clamped = Math.max(0, Math.min(this.choiceButtons.length - 1, index));
    this.selectedIndex = clamped;
    this.choiceButtons.forEach((button, i) => {
      button.classList.toggle('selected', i === clamped);
    });
  }

  selectNext(delta: number): void {
    if (this.choiceButtons.length === 0) return;
    const count = this.choiceButtons.length;
    this.setSelected((this.selectedIndex + delta + count) % count);
  }

  get currentSelectedIndex(): number {
    return this.selectedIndex;
  }

  private updateContinueHint(): void {
    const show = !this.showingChoices && !this.isTyping;
    this.continueEl.classList.toggle('continue-visible', show);
    if (show) {
      this.continueEl.textContent = 'Press E / Click to continue';
    }
    if (this.isTyping) {
      this.continueEl.classList.remove('continue-visible');
    }
  }
}
