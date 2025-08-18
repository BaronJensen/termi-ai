function stripAnsiAndControls(input) {
  try {
    return String(input || '')
      .replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, '')
      .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
      .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
      .replace(/\[[0-9;]*m/g, '')
      .replace(/\r(?!\n)/g, '\n')
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
  } catch {
    return String(input || '');
  }
}

module.exports = {
  stripAnsiAndControls,
  stripAnsi: stripAnsiAndControls,
};


