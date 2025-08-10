
const fs = require('fs');
const path = require('path');

class HistoryStore {
  constructor(app) {
    this.file = path.join(app.getPath('userData'), 'history.json');
    if (!fs.existsSync(this.file)) {
      fs.writeFileSync(this.file, JSON.stringify([]));
    }
  }
  read() {
    try {
      const txt = fs.readFileSync(this.file, 'utf8');
      return JSON.parse(txt);
    } catch (e) {
      return [];
    }
  }
  push(item) {
    const data = this.read();
    data.push({ ...item, saved_at: new Date().toISOString() });
    fs.writeFileSync(this.file, JSON.stringify(data, null, 2));
  }
  clear() {
    fs.writeFileSync(this.file, JSON.stringify([]));
  }
}

module.exports = { HistoryStore };
