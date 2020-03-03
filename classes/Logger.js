class Logger {
  constructor(name, debug = 'log') {
    this.name = name;
    this.verbosity = debug;
  }

  log(...obj) {
    obj.forEach(o => console.log(typeof(o) === 'object' ? o : `${this.name}: ${o}`));
  }

  debug(...obj) {
    if (this.verbosity === 'debug')
      obj.forEach(o => console.log(typeof(o) === 'object' ? o : `${this.name}: ${o}`));
  }
}