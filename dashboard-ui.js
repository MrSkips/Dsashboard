/* Shared dialog and navigation primitives.
   Domain features stay in app.js; this file owns reusable interaction chrome. */
function closeToolsMenu(){
  document.querySelector('.tools-menu')?.removeAttribute('open');
}

document.addEventListener('pointerdown', event=>{
  const menu = document.querySelector('.tools-menu[open]');
  if(menu && !menu.contains(event.target)) closeToolsMenu();
});

let editDialogResolve = null;

function openEditDialog({title, description='', submitLabel='Save', fields=[]}){
  if(editDialogResolve){
    const previous = editDialogResolve;
    editDialogResolve = null;
    previous(null);
  }
  document.getElementById('editDialogTitle').textContent = title;
  document.getElementById('editDialogDescription').textContent = description;
  document.getElementById('editDialogSubmit').textContent = submitLabel;
  const root = document.getElementById('editDialogFields');
  root.replaceChildren();

  for(const field of fields){
    const wrap = document.createElement('div');
    wrap.className = 'edit-field';
    const id = 'editField_' + field.name;
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = field.label;
    let input;

    if(field.type === 'select'){
      input = document.createElement('select');
      for(const option of field.options || []){
        const el = document.createElement('option');
        el.value = typeof option === 'string' ? option : option.value;
        el.textContent = typeof option === 'string' ? option : option.label;
        input.appendChild(el);
      }
    } else if(field.type === 'textarea'){
      input = document.createElement('textarea');
    } else {
      input = document.createElement('input');
      input.type = field.type || 'text';
    }

    input.id = id;
    input.name = field.name;
    input.value = field.value ?? '';
    if(field.placeholder) input.placeholder = field.placeholder;
    if(field.required) input.required = true;
    if(field.min !== undefined) input.min = field.min;
    if(field.max !== undefined) input.max = field.max;
    if(field.step !== undefined) input.step = field.step;
    wrap.append(label, input);
    root.appendChild(wrap);
  }

  const target = document.getElementById('editDialogOverlay');
  const active = Array.from(document.querySelectorAll('.modal-overlay.open')).at(-1);
  if(active){
    target.classList.add('open');
    updateOverlayInert(target);
    target.querySelector('input,select,textarea,button')?.focus();
  } else {
    showOverlay('editDialogOverlay');
  }
  return new Promise(resolve=>{ editDialogResolve = resolve; });
}

function submitEditDialog(event){
  event.preventDefault();
  const form = document.getElementById('editDialogForm');
  if(!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const resolve = editDialogResolve;
  editDialogResolve = null;
  hideOverlay('editDialogOverlay');
  resolve?.(values);
}

function cancelEditDialog(){
  const resolve = editDialogResolve;
  editDialogResolve = null;
  hideOverlay('editDialogOverlay');
  resolve?.(null);
}

function cancelEditDialogFromOverlay(){
  if(!editDialogResolve) return;
  const resolve = editDialogResolve;
  editDialogResolve = null;
  resolve(null);
}

function openConfirmDialog({title,description,confirmLabel='Continue'}){
  return openEditDialog({title,description,submitLabel:confirmLabel,fields:[]});
}
