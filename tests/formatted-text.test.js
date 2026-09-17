import test from 'node:test';
import assert from 'node:assert/strict';
import {renderFormattedText} from '../tools/formatted-text.js';
test('format headings, emphasis and both list types without raw HTML',()=>{
 const html=renderFormattedText('# Strategy\n\n**Important** and *optional*\n\n- First\n- Second\n\n1. Start\n2. End');
 assert.equal(html,'<h3>Strategy</h3><p><strong>Important</strong> and <em>optional</em></p><ul><li>First</li><li>Second</li></ul><ol><li>Start</li><li>End</li></ol>');
 assert.equal(renderFormattedText('a\nb\n\nc'),'<p>a<br>b</p><p>c</p>');
 const unsafe=renderFormattedText('**<script>alert(1)</script>**\n<img src=x onerror=alert(1)>\n[jump](javascript:alert(1))');
 assert.doesNotMatch(unsafe,/<script|<img|href=/);assert.match(unsafe,/&lt;script&gt;/);
});
