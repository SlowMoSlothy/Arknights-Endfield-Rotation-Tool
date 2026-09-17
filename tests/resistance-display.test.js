import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatResistance} from '../tools/enemy-dossier.js';
test('resistance percentages and separately recorded ranks',()=>{
 assert.equal(formatResistance(.8),'20%'); assert.equal(formatResistance(1),'0%');
 assert.equal(formatResistance(0),'100%'); assert.equal(formatResistance(1.2),'-20%');
 assert.equal(formatResistance(null),'Unknown'); assert.equal(formatResistance(.7,'C'),'C · 30%');
 assert.equal(formatResistance(null,'B'),'B · Unknown');
});
import {renderEnemyDossier} from '../tools/enemy-dossier.js';
test('dossier uses percent output',()=>{
 const html=renderEnemyDossier({resistances:{physical:.8},skills:[]});
 assert.match(html,/<strong>20%<\/strong>/); assert.doesNotMatch(html,/0\.8×/);
});
