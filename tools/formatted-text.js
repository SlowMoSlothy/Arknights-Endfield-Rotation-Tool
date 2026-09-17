// Deliberately small Markdown subset: no raw HTML, embeds or executable URLs.
const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function renderFormattedText(text) {
 const inline = value => escape(value).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'<em>$1</em>');
 const blocks=[], paragraph=[], items=[]; let listType=null;
 const flushP=()=>{if(paragraph.length){blocks.push('<p>'+paragraph.join('<br>')+'</p>');paragraph.length=0;}};
 const flushList=()=>{if(items.length){blocks.push(`<${listType}>`+items.map(s=>'<li>'+s+'</li>').join('')+`</${listType}>`);items.length=0;}listType=null;};
 for(const line of String(text || '').split(/\r?\n/)) {
  const heading=/^(#{1,3})\s+(.+)$/.exec(line),item=/^\s*(?:([-*]) |(\d+)\. )(.+)$/.exec(line);
  if(!line.trim()){flushP();flushList();}
  else if(heading){flushP();flushList();const level=heading[1].length+2;blocks.push(`<h${level}>`+inline(heading[2])+`</h${level}>`);}
  else if(item){flushP();const current=item[1]?'ul':'ol';if(listType!==current)flushList();listType=current;items.push(inline(item[3]));}
  else {flushList();paragraph.push(inline(line));}
 }
 flushP();flushList();return blocks.join('');
}
