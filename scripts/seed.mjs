// Regenerates the committed mock dataset (decision D2: fixed seed, JSON committed, dates as day offsets).
import { writeFileSync } from 'node:fs'
import { generateDataset } from '../src/mock/generate.ts'

const data = generateDataset(20261115)
writeFileSync(new URL('../src/mock/data/dataset.json', import.meta.url), JSON.stringify(data))
console.log(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])))
