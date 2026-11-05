/* PERK: all demo state stays in memory. No network requests, cookies, or storage. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const ui = {
    count: $('list-count'), pace: $('demo-pace'), options: $('demo-options'),
    stage: $('demo-stage'), counter: $('demo-count'), progress: $('demo-progress-fill'),
    screen: $('screen-content'), instruction: $('demo-instruction'),
    start: $('demo-start'), next: $('demo-next'), reset: $('demo-reset'),
    responses: $('response-buttons'), old: $('answer-old'), new: $('answer-new'),
    announce: $('demo-announcement')
  };
  const LISTS = [
    {
      words: ['GEAR', 'HEAR', 'WEAR', 'YEAR', 'FEAR', 'REAR'],
      probes: [{word: 'YEAR', old: true}, {word: 'DEAR', old: false}],
      label: 'Pronunciation-inconsistent example', critical: 'WEAR', target: 'YEAR'
    },
    {
      words: ['LIGHT', 'NIGHT', 'SIGHT', 'MIGHT', 'RIGHT', 'TIGHT'],
      probes: [{word: 'FIGHT', old: false}, {word: 'MIGHT', old: true}],
      label: 'Pronunciation-consistent example', critical: 'SIGHT', target: 'MIGHT'
    }
  ];
  const state = {phase: 'idle', round: 0, total: 2, pace: 'timed', steps: [], index: 0, answers: [], timer: null};
  function clearTimer() { if (state.timer !== null) window.clearTimeout(state.timer); state.timer = null; }
  function announce(text) { ui.announce.textContent = text; }
  function hideResponses() { ui.responses.hidden = true; ui.old.disabled = true; ui.new.disabled = true; }
  function setScreen(text, kind = 'stimulus') { ui.screen.className = kind; ui.screen.textContent = text; }
  function setProgress(fraction) { ui.progress.style.width = `${Math.round(fraction * 100)}%`; }
  function focus(element) { element.focus({preventScroll: true}); }
  function makeSteps(list) {
    const steps = [{type: 'fixation', text: '+', duration: 500}];
    list.words.forEach((word, index) => {
      steps.push({type: 'word', text: word, number: index + 1, duration: 600});
      if (index < list.words.length - 1) steps.push({type: 'blank', text: '', duration: 200});
    });
    steps.push({type: 'delay', text: '', duration: 1000});
    list.probes.forEach((probe, index) => {
      steps.push({type: 'probe', text: probe.word, probe: index, duration: 900});
      steps.push({type: 'response', text: probe.word, probe: index, duration: null});
    });
    return steps;
  }
  function reset() {
    clearTimer();
    Object.assign(state, {phase: 'idle', round: 0, index: 0, steps: [], answers: []});
    ui.options.disabled = false; ui.start.hidden = false; ui.start.textContent = 'Start the example →';
    ui.next.hidden = true; ui.reset.hidden = true; hideResponses();
    ui.stage.textContent = 'Ready when you are';
    ui.counter.textContent = `${ui.count.value} example ${ui.count.value === '1' ? 'list' : 'lists'}`;
    ui.instruction.textContent = 'An interactive illustration, not a research assessment.';
    ui.screen.className = 'screen-intro';
    ui.screen.innerHTML = '<span class="screen-symbol" aria-hidden="true">+</span><h4>A little attention.<br>A little memory.</h4><p>Choose a mode, then begin.</p>';
    setProgress(0); announce('Example reset. Ready to begin.');
  }
  function start() {
    clearTimer();
    state.total = Number(ui.count.value); state.pace = ui.pace.value; state.round = 0; state.answers = [];
    ui.options.disabled = true; ui.start.hidden = true; ui.reset.hidden = false;
    beginRound();
  }
  function beginRound() {
    state.phase = 'running'; state.index = 0; state.steps = makeSteps(LISTS[state.round]);
    ui.counter.textContent = `List ${state.round + 1} of ${state.total}`;
    renderStep();
  }
  function advance() {
    clearTimer();
    if (state.phase === 'between') { state.round += 1; beginRound(); return; }
    if (state.phase === 'paused') { beginRound(); return; }
    if (state.phase !== 'running') return;
    const step = state.steps[state.index];
    if (step.type === 'response') return;
    state.index += 1; renderStep();
  }
  function renderStep() {
    clearTimer(); hideResponses(); ui.next.hidden = true;
    if (state.index >= state.steps.length) { finishRound(); return; }
    const step = state.steps[state.index];
    setProgress((state.round + state.index / state.steps.length) / state.total);
    setScreen(step.text || '\u00a0', step.type === 'fixation' ? 'stimulus fixation' : 'stimulus');
    switch(step.type) {
      case 'fixation': ui.stage.textContent = 'Focus'; ui.instruction.textContent = 'Look at the cross.'; break;
      case 'word': ui.stage.textContent = `Read & remember · word ${step.number} of 6`; ui.instruction.textContent = 'Read silently and remember the words.'; break;
      case 'blank': ui.stage.textContent = 'Read & remember'; ui.instruction.textContent = 'A brief blank between words.'; break;
      case 'delay': ui.stage.textContent = 'Hold the words in mind'; ui.instruction.textContent = 'The test words are coming next.'; break;
      case 'probe':
        ui.stage.textContent = `Test word ${step.probe + 1} of 2 · wait`;
        ui.instruction.textContent = 'Look at the test word. Wait for the response cue.';
        ui.responses.hidden = false;
        break;
      case 'response':
        ui.stage.textContent = `Test word ${step.probe + 1} of 2 · answer now`;
        ui.instruction.textContent = 'Was this word in the list? Choose Old or New.';
        ui.responses.hidden = false; ui.old.disabled = false; ui.new.disabled = false;
        announce(`${step.text}. Answer now. Was this word in the list? Old or New.`);
        focus(ui.old);
        return;
    }
    if (state.pace === 'guided') {
      ui.next.textContent = step.type === 'probe' ? 'Show response cue →' : 'Next step →';
      ui.next.hidden = false;
      const spoken = step.type === 'word' ? `Word ${step.number}: ${step.text}.` : step.type === 'probe' ? `Test word: ${step.text}. Do not answer yet.` : ui.instruction.textContent;
      announce(`${spoken} Select Next to continue.`);
      focus(ui.next);
    } else {
      if (step.type === 'fixation') announce(`List ${state.round + 1} is starting. Read six words silently.`);
      state.timer = window.setTimeout(() => { state.timer = null; advance(); }, step.duration);
    }
  }
  function answer(isOld) {
    if (state.phase !== 'running') return;
    const step = state.steps[state.index];
    if (!step || step.type !== 'response') return;
    const probe = LISTS[state.round].probes[step.probe];
    state.answers.push({round: state.round, word: probe.word, old: probe.old, choice: isOld, correct: probe.old === isOld});
    hideResponses(); state.index += 1; renderStep();
  }
  function finishRound() {
    clearTimer(); hideResponses(); setProgress((state.round + 1) / state.total);
    if (state.round + 1 < state.total) {
      state.phase = 'between'; ui.stage.textContent = 'First list complete';
      ui.screen.className = 'demo-result';
      ui.screen.innerHTML = '<h4>Ready for one more?</h4><p>A different set of six words. The task stays the same: read, remember, then recognize.</p>';
      ui.instruction.textContent = 'Your choices will be explained after the final list.';
      ui.next.textContent = 'Begin second list →'; ui.next.hidden = false;
      announce('First list complete. Select Begin second list when ready.'); focus(ui.next);
    } else finishDemo();
  }
  function finishDemo() {
    state.phase = 'done'; ui.next.hidden = true; ui.start.hidden = false; ui.start.textContent = 'Try again →'; ui.options.disabled = false;
    ui.stage.textContent = 'Example complete'; ui.counter.textContent = `${state.total} ${state.total === 1 ? 'list' : 'lists'} explored`;
    const correct = state.answers.filter(a => a.correct).length;
    ui.screen.className = 'demo-result';
    ui.screen.innerHTML = `<h4>Example complete.</h4><p>You answered ${correct} of ${state.answers.length} probes correctly. This is feedback for these examples, not a measure of your memory ability.</p>`;
    const list = document.createElement('ul'); list.className = 'result-list';
    state.answers.forEach(a => {
      const li = document.createElement('li');
      const title = document.createElement('strong'); title.textContent = a.word;
      const detail = document.createElement('span'); detail.textContent = `${a.old ? 'Old' : 'New'} · ${a.correct ? 'correct' : 'you chose ' + (a.choice ? 'Old' : 'New')}`;
      li.append(title, detail); list.append(li);
    });
    ui.screen.append(list);
    const note = document.createElement('p'); note.className = 'result-note';
    note.textContent = state.total === 2 ? 'WEAR broke the first list’s sound pattern; YEAR followed it. The second list was a consistent comparison, with MIGHT as the next-word target. Two examples cannot test the hypothesis.' : 'WEAR was the pronunciation mismatch; YEAR was the next-word target. One example cannot test the hypothesis.';
    ui.screen.append(note);
    ui.instruction.textContent = 'The study asks whether patterns emerge across many trials and participants.';
    announce(`Example complete. ${correct} of ${state.answers.length} correct. This is illustrative feedback, not a memory assessment.`);
    focus(ui.start);
  }
  function pauseForVisibility() {
    if (document.hidden && state.phase === 'running') {
      clearTimer(); state.phase = 'paused'; hideResponses();
      // Discard this interrupted list so repeat answers cannot count twice.
      state.answers = state.answers.filter(a => a.round !== state.round);
      ui.stage.textContent = 'Example paused'; ui.screen.className = 'demo-result';
      ui.screen.innerHTML = '<h4>Let’s start that list again.</h4><p>The page was out of view, so the sequence stopped. Restart this list when you’re ready.</p>';
      ui.instruction.textContent = 'Earlier completed lists are kept. This interrupted list will restart.';
      ui.next.hidden = false; ui.next.textContent = 'Restart this list →';
      announce('Example paused because the page was out of view. Restart this list when ready.');
    }
  }
  ui.start.addEventListener('click', start);
  ui.next.addEventListener('click', advance);
  ui.reset.addEventListener('click', () => { reset(); focus(ui.start); });
  ui.old.addEventListener('click', () => answer(true));
  ui.new.addEventListener('click', () => answer(false));
  ui.count.addEventListener('change', () => { if (state.phase === 'idle') reset(); });
  document.addEventListener('visibilitychange', pauseForVisibility);
  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName) || event.target.isContentEditable) return;
    const key = event.key.toLowerCase();
    if (key === 'escape' && !['idle', 'done'].includes(state.phase)) { event.preventDefault(); reset(); focus(ui.start); }
    else if (state.phase === 'running' && (key === 'o' || key === 'n') && state.steps[state.index].type === 'response') { event.preventDefault(); answer(key === 'o'); }
    else if (event.code === 'Space' && state.phase === 'running' && state.pace === 'guided' && !ui.next.hidden) { event.preventDefault(); advance(); }
  });
  // Motion only enhances the static page; content remains visible without JavaScript.
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries) => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), {threshold: 0.08});
    document.querySelectorAll('.section-heading, .person-card, .lab-copy, .poster-copy').forEach(element => { element.classList.add('reveal'); observer.observe(element); });
  }
})();
