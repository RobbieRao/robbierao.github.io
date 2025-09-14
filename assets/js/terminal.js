document.addEventListener('DOMContentLoaded', function () {
  const terminal = document.getElementById('terminal');
  const buttons = document.querySelectorAll('.tags button');
  const commands = {};
  const builtInHandlers = {
    ls: () => typeText('assets  images  scripts', printLine('')),
    pwd: () => typeText('~', printLine('')),
    date: () => typeText(new Date().toString(), printLine('')),
    sudo: () => typeText('Nice try.', printLine('')),
    'rm -rf /': () => typeText('Not that kind of terminal.', printLine('')),
    dance: () => typeText('You found an easter egg!', printLine(''))
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
      if (lower === 'help') {
        const builtIns = ['help', 'clear', 'color <color>', 'ls', 'pwd', 'date', 'sudo', 'rm -rf /', 'dance'];
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
      typeText('Command not found', printLine(''));
    }
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
          processCommand(value);
        }
        appendPrompt();
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

