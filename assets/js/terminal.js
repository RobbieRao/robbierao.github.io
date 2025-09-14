document.addEventListener('DOMContentLoaded', function () {
  const terminal = document.getElementById('terminal');
  const buttons = document.querySelectorAll('.tags button');
  const commands = {};

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

  function printLine(text) {
    const line = document.createElement('div');
    line.textContent = text || '';
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
    if (lower.startsWith('color ')) {
      const color = value.split(' ')[1];
      terminal.style.color = color || '#0f0';
      return;
    }
    if (lower === 'help') {
      const builtIns = ['help', 'clear', 'color <color>'];
      const list = builtIns.concat(Object.keys(commands));
      typeText('Supported commands:\n' + list.join('\n'), printLine(''));
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
    const prompt = document.createElement('span');
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
    const content = (profileData[key] || '').split('\n').join('\n\n').trim();
    commands[cmd] = content;
    btn.addEventListener('click', () => {
      const current = terminal.querySelector('.input[contenteditable="true"]');
      if (current) {
        current.textContent = cmd;
        current.contentEditable = false;
      } else {
        printLine('> ' + cmd);
      }
      processCommand(cmd);
      appendPrompt();
    });
  });

  appendPrompt();
});

