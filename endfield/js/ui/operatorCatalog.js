(() => {
 const root=document.querySelector('[data-catalog-skills]');if(!root)return;
 const picker=root.querySelector('[data-catalog-rank-picker]'),slider=picker?.querySelector('input'),output=picker?.querySelector('output');
 const panels=[...root.querySelectorAll('[data-catalog-rank]')];if(!slider||!output||!panels.length)return;
 const render=()=>{
   output.textContent=slider.value;slider.setAttribute('aria-valuetext',`Skill rank ${slider.value}`);
   for(const panel of panels){panel.hidden=panel.dataset.catalogRank!==slider.value;panel.open=!panel.hidden;}
 };
 slider.addEventListener('input',render);render();root.classList.add('catalog-enhanced');picker.hidden=false;
})();
