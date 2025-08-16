#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import https from 'https';
import YAML from 'yaml';

function fetchYaml(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return resolve(null);
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(YAML.parse(data));
          } catch (e) {
            resolve(null);
          }
        });
      })
      .on('error', () => resolve(null));
  });
}

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
const REG_BASE = 'https://raw.githubusercontent.com/hyperlane-xyz/hyperlane-registry/main/chains';

function readCoreAddressesFromConfigsDir(chainName) {
  try {
    const p = path.resolve('/configs', `addresses-${chainName}.json`);
    if (fs.existsSync(p)) {
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      const mailbox = j.mailbox || j.Mailbox || '';
      const igp = j.interchainGasPaymaster || j.igp || '';
      const validatorAnnounce = j.validatorAnnounce || j.ValidatorAnnounce || '';
      const ism = j.interchainSecurityModule || j.defaultIsm || j.ism || '';
      return { mailbox, igp, validatorAnnounce, ism };
    }
  } catch {}
  try {
    const p2 = path.resolve('/configs/registry/chains', chainName, 'addresses.yaml');
    if (fs.existsSync(p2)) {
      const y = YAML.parse(fs.readFileSync(p2, 'utf8'));
      const mailbox = y.mailbox || '';
      const igp = y.interchainGasPaymaster || '';
      const validatorAnnounce = y.validatorAnnounce || '';
      const ism = y.interchainSecurityModule || '';
      return { mailbox, igp, validatorAnnounce, ism };
    }
  } catch {}
  return null;
}

async function build() {
  for (const ch of chains) {
    const existing = ch.existing_addresses || {};
    let mailbox = existing.mailbox || '';
    let igp = existing.igp || '';
    let validatorAnnounce = existing.validatorAnnounce || '';
    let ism = existing.ism || '';

    const deployed = readCoreAddressesFromConfigsDir(ch.name);
    if (deployed) {
      mailbox = deployed.mailbox || mailbox;
      igp = deployed.igp || igp;
      validatorAnnounce = deployed.validatorAnnounce || validatorAnnounce;
      ism = deployed.ism || ism;
    }

    if ((!mailbox || !igp || !validatorAnnounce || !ism) && process.env.DISABLE_PUBLIC_FALLBACK !== 'true') {
      const url = `${REG_BASE}/${ch.name}/addresses.yaml`;
      const doc = await fetchYaml(url);
      if (doc && typeof doc === 'object') {
        mailbox = mailbox || doc.mailbox || '';
        igp = igp || doc.interchainGasPaymaster || '';
        validatorAnnounce = validatorAnnounce || doc.validatorAnnounce || '';
        ism = ism || doc.interchainSecurityModule || '';
      }
    }

    out[ch.name] = {
      connection: { url: ch.rpc_url },
      mailbox,
      igp,
      validatorAnnounce,
      ism,
    };
  }
  fs.writeFileSync(path.resolve(outputPath), JSON.stringify({ chains: out }, null, 2));
}

build().catch(() => {
  fs.writeFileSync(path.resolve(outputPath), JSON.stringify({ chains: out }, null, 2));
});
