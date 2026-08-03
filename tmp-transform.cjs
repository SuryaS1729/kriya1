const babel = require('@babel/core');
const fs = require('fs');

process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

const result = babel.transformFileSync('app/share2.tsx', {
  cwd: process.cwd(),
  caller: { name: 'metro', bundler: 'metro', platform: 'android' },
});
fs.writeFileSync('share2.compiled.js', result.code);
console.log('wrote share2.compiled.js', result.code.length);
