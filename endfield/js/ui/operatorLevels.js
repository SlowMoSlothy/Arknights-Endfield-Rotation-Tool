(() => {
    const section=document.getElementById('stats');
    const picker=section?.querySelector('.operator-level-picker');
    if(!picker) return;
    const slider=picker.querySelector('input'),output=picker.querySelector('output');
    const rows=[...section.querySelectorAll('.operator-level-table tbody tr')];
    const values=[...section.querySelectorAll('.attribute-stats .stat strong')];
    if(rows.length!==90||values.length!==6) return;
    const render=()=>{
        const level=Number(slider.value);
        output.textContent=String(level);
        slider.setAttribute('aria-valuetext',`Level ${level}`);
        [...rows[level-1].querySelectorAll('td')].forEach((cell,index)=>{values[index].textContent=cell.textContent;});
        section.querySelector('.attribute-level').textContent=`Values shown at Level ${level}`;
    };
    section.querySelector('.attribute-stats').setAttribute('aria-live','polite');
    section.querySelector('.attribute-stats').setAttribute('aria-atomic','true');
    slider.addEventListener('input',render);
    render();
    section.querySelector('.operator-all-levels').open=false;
    picker.hidden=false;
})();
