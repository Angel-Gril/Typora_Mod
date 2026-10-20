'use strict';
// 在 JSC 中定位字母表与相关常量字符串（ASCII/UTF-16 双模式）
const fs = require('fs');
const path = require('path');
const file = process.argv[2];
const buf = fs.readFileSync(file);
const targets = [
  'L23456789ABCDEFGHJKMNPQRSTUVWXYZ',
  '23456789ABCDEFGHJKMNPQRSTUVWXYZ',
  'ABCDEFGHJKMNPQRSTUVWXYZ',
  'DeviceID',
  'deviceId',
  'fingerprint',
  'lastRetry',
  'hasActivated',
  'SLicense',
  'Please input a valid license code',
  'Invalid license code',
];

function findAscii(needle) {
  const n = Buffer.from(needle, 'ascii');
  const hits = [];
  let i = 0;
  while ((i = buf.indexOf(n, i)) !== -1) { hits.push(i); i++; }
  return hits;
}
function findUtf16(needle) {
  const n = Buffer.from(needle, 'utf16le');
  const hits = [];
  let i = 0;
  while ((i = buf.indexOf(n, i)) !== -1) { hits.push(i); i++; }
  return hits;
}

for (const t of targets) {
  const a = findAscii(t);
  const u = findUtf16(t);
  console.log(`${t.slice(0, 34).padEnd(36)} ascii=${a.length} ${a.slice(0,3).join(',')}  utf16=${u.length} ${u.slice(0,3).join(',')}`);
}
