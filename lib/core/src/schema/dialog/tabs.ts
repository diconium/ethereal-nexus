import { EntryMask } from '../../types';
import { Field } from './types';

export class Tabs<TEntries> {
  private tabs = new Map<string, EntryMask<TEntries>>();

  addTab(name: string, entries: EntryMask<TEntries>) {
    this.tabs.set(name, entries);
  }

  parse(entries: Field[]) {
    const result = []
    const usedEntries = new Set();

    if(this.tabs.size === 0) {
      return entries
    }

    for(const [name, mask] of this.tabs) {
      const children = []

      if(!mask) {
        throw new Error(`Entry "${String(name)}" does not have an appropriate tab configuration.`);
      }

      for(const [key,] of Object.entries(mask)) {
        const field = entries.find(f => f.id === key)

        if (usedEntries.has(key)) {
          throw new Error(`Entry "${String(name)}.${String(key)}" is already used in another tab.`);
        }

        if(!field) {
          throw new Error(`Field with id "${key}" not found`);
        }

        children.push(entries.find(f => f.id === key))
      }

      result.push({
        type: 'tab',
        label: name,
        id: `tab_${name.toLowerCase().replaceAll(' ', '')}`,
        children
      })
    }

    return [{
      type: 'tabs',
      id: 'tabs',
      children: result
    }]
  }
}