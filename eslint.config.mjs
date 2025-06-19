import { generateEslintConfig } from './node_modules/@companion-module/tools/eslint/config.mjs'

export default generateEslintConfig({
    enableTypescript: true, // Or false if it's pure JavaScript
})