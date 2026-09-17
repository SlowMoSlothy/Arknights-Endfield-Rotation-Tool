import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderEnemyAbility,renderEnemyDossier} from '../tools/enemy-dossier.js';
test('ability elements produce safe card tones and labels',()=>{
 for(const element of ['physical','heat','cryo','electric','nature','aether']){
  const html=renderEnemyAbility({name:'Hit',damage_element:element});
  assert.match(html,new RegExp('tone-'+element)); assert.match(html,/ability-element/);
 }
 assert.match(renderEnemyAbility({name:'<script>',damage_element:'invalid'}),/tone-unknown/);
 assert.doesNotMatch(renderEnemyAbility({name:'<script>'}),/<script>/);
 assert.match(renderEnemyDossier({skills:[{name:'Hit',damage_element:'heat'}]}),/enemy-ability tone-heat/);
});
