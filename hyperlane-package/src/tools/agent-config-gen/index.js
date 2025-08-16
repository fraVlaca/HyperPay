#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error('usage: agent-config-gen <input-args.(yaml|json)> <output-agent-config.json>');
  process.exit(1);
}
const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
let args;
try {
  args = YAML.parse(raw);
} catch (e) {
  try {
    args = JSON.parse(raw);
  } catch (e2) {
    console.error('failed to parse args as YAML or JSON');
    process.exit(2);
  }
}
const chains = args.chains || [];
const out = {};
for (const ch of chains) {
  const existing = ch.existing_addresses || {};
  out[ch.name] = {
    connection: { url: ch.rpc_url },
    mailbox: existing.mailbox || "",
    igp: existing.igp || "",
    validatorAnnounce: existing.validatorAnnounce || "",
    ism: existing.ism || ""
  };
}
fs.writeFileSync(path.resolve(outputPath), JSON.stringify({ chains: out }, null, 2));
