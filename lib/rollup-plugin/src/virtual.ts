type Config = {
  [k: string]: string
}

let modules: Config = {
};

export function setVirtual(key: string, code: string) {
  modules[key] = code;
}

export function getVirtual(key: string) {
  return modules[key];
}