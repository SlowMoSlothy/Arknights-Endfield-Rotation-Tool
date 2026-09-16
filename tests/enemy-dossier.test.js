import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEnemyDescription,renderEnemyDossier} from '../tools/enemy-dossier.js';
test('editor data becomes a level table without losing unrecognized notes',()=>{
 const data=parseEnemyDescription('Intro\nLevel | HP | ATK | DEF\n1 | 1,385 | 66 | 100\nStagger HP: 280\nCustom field: 42');
 assert.deepEqual(data.levels,[['1','1,385','66','100']]);
 assert.deepEqual(data.attributes,[['Stagger HP','280']]);
 assert.match(data.prose,/Custom field: 42/);
});
test('dossier escapes descriptions, skills and stat values and preserves zero values',()=>{
 const html=renderEnemyDossier({description:'<script>alert(1)</script>',hp:0,defense:0,resistances:{physical:0},skills:[{name:'Phase — <img>',description:'<script>'}]});
 assert.doesNotMatch(html,/<script>|<img>/);
 assert.match(html,/0×/);assert.match(html,/<strong>0<\/strong>/);
 assert.match(html,/&lt;script&gt;/);
});
