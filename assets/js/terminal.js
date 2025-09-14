document.addEventListener('DOMContentLoaded', function () {
  const terminal = document.getElementById('terminal');
  const buttons = document.querySelectorAll('.tags button');
  const input = document.getElementById('terminal-input');
  const commands = {};
  input.focus();

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

  function runCommand(cmd, content) {
    terminal.innerHTML = '';

    const commandLine = document.createElement('div');
    commandLine.className = 'command';
    commandLine.textContent = '> ' + cmd;
    terminal.appendChild(commandLine);

    const outputLine = document.createElement('div');
    outputLine.className = 'output';
    terminal.appendChild(outputLine);

    typeText('\n' + content, outputLine);
  }

  buttons.forEach(btn => {
    const cmd = btn.dataset.cmd;
    const content = btn.dataset.content.split('\\n').join('\n\n').trim();
    commands[cmd] = content;
    btn.addEventListener('click', () => {
      runCommand(cmd, content);
    });
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const value = input.value.trim();
      if (value) {
        const content = commands[value] || 'Command not found';
        runCommand(value, content);
      }
      input.value = '';
    }
  });
});

