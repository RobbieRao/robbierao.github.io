document.addEventListener('DOMContentLoaded', function () {
  const terminal = document.getElementById('terminal');
  const buttons = document.querySelectorAll('.tags button');
  const commands = {};
  const history = [];
  let historyIndex = -1;
  const builtInNames = new Set([
    'help',
    'clear',
    'color',
    'theme',
    'ls',
    'pwd',
    'date',
    'sudo',
    'rm -rf /',
    'dance',
    'quake',
    'matrix',
    'party',
    'glitch'
  ]);
  const builtInHandlers = {
    ls: () => typeText('assets  images  scripts', printLine('')),
    pwd: () => typeText('~', printLine('')),
    date: () => typeText(new Date().toString(), printLine('')),
    sudo: () => typeText('Nice try.', printLine('')),
    'rm -rf /': () => typeText('Not that kind of terminal.', printLine('')),
    party: () => confetti({ spread: 70, origin: { y: 0.6 } }),
    matrix: startMatrix,
    quake: triggerQuake,
    dance: triggerQuake,
    glitch: triggerGlitch
  };

  function typeText(text, container) {
    let index = 0;
    function type() {
      if (index < text.length) {
        container.textContent += text.charAt(index);
        index++;
        setTimeout(type, 15);
      }
    }
    type();
  }

  function printLine(text, className) {
    const line = document.createElement('div');
    line.textContent = text || '';
    if (className) line.className = className;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
    return line;
  }

  function processCommand(value) {
    const lower = value.toLowerCase();
      if (lower === 'clear') {
        terminal.innerHTML = '';
        return;
      }
      if (lower.startsWith('color')) {
        const color = value.split(' ')[1];
        terminal.style.color = color || '#fff';
        return;
      }
      if (lower.startsWith('theme')) {
        const mode = value.split(' ')[1];
        if (mode === 'dark') {
          document.body.classList.add('dark-theme');
          document.body.classList.remove('light-theme');
        } else if (mode === 'light') {
          document.body.classList.add('light-theme');
          document.body.classList.remove('dark-theme');
        } else {
          typeText('Usage: theme <dark|light>', printLine(''));
        }
        return;
      }
      if (lower === 'help') {
        const builtIns = ['help', 'clear', 'color <color>', 'theme <mode>', 'ls', 'pwd', 'date', 'sudo', 'rm -rf /', 'dance', 'quake', 'matrix', 'party', 'glitch'];
        const list = builtIns.concat(Object.keys(commands));
        typeText('Supported commands:\n' + list.join('\n'), printLine(''));
        return;
      }
      if (builtInHandlers[lower]) {
        builtInHandlers[lower]();
        return;
      }
    if (commands[value]) {
      typeText(commands[value], printLine(''));
    } else {
      typeText('Command not found. Please enter "help" to view available commands.', printLine(''));
    }
  }

  function triggerQuake() {
    document.body.classList.add('quake');
    setTimeout(() => document.body.classList.remove('quake'), 500);
  }

  function triggerGlitch() {
    document.body.classList.add('glitch');
    setTimeout(() => document.body.classList.remove('glitch'), 3000);
  }

  function startMatrix() {
    if (document.getElementById('matrix-overlay')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'matrix-overlay';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);
    function draw() {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f0';
      ctx.font = fontSize + 'px monospace';
      for (let i = 0; i < drops.length; i++) {
        const text = letters.charAt(Math.floor(Math.random() * letters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }
    const interval = setInterval(draw, 33);
    setTimeout(() => {
      clearInterval(interval);
      canvas.remove();
    }, 5000);
  }

  function setCaretToEnd(el) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function appendPrompt() {
    const line = document.createElement('div');
    line.className = 'command';
    const prompt = document.createElement('span');
    prompt.className = 'prompt';
    prompt.textContent = '> ';
    const input = document.createElement('span');
    input.className = 'input';
    input.contentEditable = true;
    line.appendChild(prompt);
    line.appendChild(input);
    terminal.appendChild(line);
    input.focus();

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = input.textContent.trim();
        input.contentEditable = false;
        if (value) {
          history.push(value);
          historyIndex = -1;
          processCommand(value);
        }
        appendPrompt();
      } else if (e.key === 'ArrowUp') {
        if (!history.length) return;
        e.preventDefault();
        if (historyIndex === -1) historyIndex = history.length - 1;
        else if (historyIndex > 0) historyIndex--;
        input.textContent = history[historyIndex] || '';
        setCaretToEnd(input);
      } else if (e.key === 'ArrowDown') {
        if (!history.length) return;
        e.preventDefault();
        if (historyIndex !== -1) historyIndex++;
        if (historyIndex >= history.length) {
          historyIndex = -1;
          input.textContent = '';
        } else {
          input.textContent = history[historyIndex];
        }
        setCaretToEnd(input);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const value = input.textContent.trim();
        const all = Array.from(new Set([...builtInNames, ...Object.keys(commands)]));
        const matches = all.filter(c => c.startsWith(value));
        if (matches.length === 1) {
          input.textContent = matches[0];
          setCaretToEnd(input);
        }
      }
    });
  }

  buttons.forEach(btn => {
    const cmd = btn.dataset.cmd;
    const key = btn.dataset.key;
    if (key) {
      const content = (profileData[key] || '').split('\n').join('\n\n').trim();
      commands[cmd] = content;
    }
    btn.addEventListener('click', () => {
      const current = terminal.querySelector('.input[contenteditable="true"]');
      if (current) {
        current.textContent = cmd;
        current.contentEditable = false;
      } else {
        printLine('> ' + cmd, 'command');
      }
      processCommand(cmd);
      appendPrompt();
    });
  });

  appendPrompt();
});

