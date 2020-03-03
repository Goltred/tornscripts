class Logger {
  constructor(debug = 'log') {
    this.verbosity = debug;
  }

  log(...obj) {
    obj.forEach(o => console.log(typeof(o) === 'object' ? o : `TCCSC: ${o}`));
  }

  debug(...obj) {
    if (this.verbosity === 'debug')
      obj.forEach(o => console.log(typeof(o) === 'object' ? o : `TCCSC: ${o}`));
  }
}