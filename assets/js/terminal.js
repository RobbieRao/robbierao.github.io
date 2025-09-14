document.addEventListener('DOMContentLoaded', function () {
  const terminal = document.getElementById('terminal');
  const buttons = document.querySelectorAll('.tags button');

  function typeText(text, container) {
    let index = 0;
    function type() {
      if (index < text.length) {
        container.textContent += text.charAt(index);
        index++;
        setTimeout(type, 30);
      }
    }
    type();
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      const content = btn.dataset.content.replace(/\\n/g, '\n');
      terminal.innerHTML = '';

      const commandLine = document.createElement('div');
      commandLine.className = 'command';
      commandLine.textContent = '> ' + cmd;
      terminal.appendChild(commandLine);

      const outputLine = document.createElement('div');
      outputLine.className = 'output';
      terminal.appendChild(outputLine);

      typeText('\n' + content, outputLine);
    });
  });
});

