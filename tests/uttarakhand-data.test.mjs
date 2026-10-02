import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileRepositoryState } from '../tools/state-pack/lib/app-compiler.mjs';
import { validateRepositoryState } from '../tools/state-pack/lib/validation.mjs';

test('Uttarakhand routes have consistent references and conservative intake', async () => {
  assert.deepEqual(await validateRepositoryState('uttarakhand'), { ok: true, errors: [] });
  const data = await compileRepositoryState('uttarakhand');
  assert.equal(data.meta.stateId, 'STATE-IN-UK');
  assert.equal(data.meta.stateName, 'Uttarakhand');
  assert.ok(data.schemes.some(s => s.id === 'SCH-UK-MSY-2'));
  assert.ok(data.schemes.some(s => s.origin === 'central'));
  assert.ok(data.contacts.length > 0);
  assert.doesNotMatch(JSON.stringify(data), /Himachal|\bHP\b|Punjab|Baddi|HIMURJA|Kangra|agriculture\.hp\.gov|himachal\.nic/i);
  assert.ok(data.schemes.every(s => s.statusDetail.intake === 'current-intake-unconfirmed'));
  for (const links of Object.values(data.links)) for (const row of links) assert.ok(data.schemes[row[0]]);
  for (const [i, scheme] of data.schemes.entries()) {
    const actual = Object.values(data.links).filter(rows => rows.some(row => row[0] === i)).length;
    assert.equal(scheme.reach, actual);
    assert.ok(actual > 0, scheme.name);
  }
});

test('Uttarakhand activity mappings respect programme scope and current homestay rule', async () => {
  const data = await compileRepositoryState('uttarakhand');
  const routes = term => {
    const i = data.sectors.findIndex(s => s.a.toLowerCase().includes(term));
    assert.ok(i >= 0, term);
    return data.links[i].map(row => data.schemes[row[0]].id);
  };
  assert.ok(routes('rural uttarakhand homestay').includes('SCH-UK-HOMESTAY'));
  assert.ok(!routes('wheat cultivation').includes('SCH-UK-MSME23-CAPITAL'));
  assert.ok(!routes('wheat cultivation').includes('SCH-UK-HORT-APPLE'));
  assert.ok(routes('electric rickshaw').includes('SCH-UK-E-RICKSHAW'));
  const homestay = data.schemes.find(s => s.id === 'SCH-UK-HOMESTAY');
  assert.match(homestay.eligible, /Permanent.*rural/);
  assert.ok(homestay.evidenceLinks.some(s => s.id === 'SOURCE-UK-HOMESTAY'));
  const coverage = JSON.parse(await readFile('scheme-data/states/uttarakhand/coverage.json', 'utf8'));
  assert.ok(coverage.coverage.some(c => c.outcome === 'candidate-pending'));
  assert.ok(data.meta.research.limitations.some(s => /full statewide research acceptance is not claimed/.test(s)));
});

test('expanded Uttarakhand pack covers productive segments without duplicate national routes', async () => {
  const data = await compileRepositoryState('uttarakhand');
  assert.ok(data.schemes.length > 90, 'Expanded multi-segment inventory');
  assert.equal(new Set(data.schemes.map(s => s.id)).size, data.schemes.length);
  for (const term of ['Millet', 'REAP', 'Udyamshala', 'Service Sector', 'Wool', 'CGTMSE', 'ZED', 'ECGC']) {
    assert.ok(data.schemes.some(s => s.name.includes(term)), term);
  }
  const weaving = data.sectors.findIndex(s => /Handloom weaving/.test(s.a));
  const garment = data.sectors.findIndex(s => /Garment manufacturing/.test(s.a));
  const handloom = data.schemes.findIndex(s => /National Handloom Development/.test(s.name));
  assert.ok(weaving >= 0 && garment >= 0 && handloom >= 0);
  assert.ok(data.links[weaving].some(row => row[0] === handloom));
  assert.ok(!data.links[garment].some(row => row[0] === handloom));
  const shared = data.schemes.find(s => /ZED/.test(s.name) && s.origin === 'central');
  assert.match(shared.benefit, /80%/);
  assert.doesNotMatch(shared.benefit, /Himachal/);
});
