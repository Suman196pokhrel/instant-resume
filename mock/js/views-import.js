/* Resume import mock. TXT/pasted text is parsed locally; PDF/DOCX extraction is explicitly simulated. */
const ResumeImport = {
  parse(text) {
    const kb = emptyDraft();
    const lines = text.replace(/\r/g, '').split('\n');
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phone = text.match(/(?:\+?\d[\d ()-]{7,}\d)/);
    kb.contact = {id:'kb-contact', name:(lines.find(l=>l.trim()) || '').trim(), email:email ? email[0] : '', phone:phone ? phone[0] : ''};
    const headings = {
      'experience':'roles','work experience':'roles','employment history':'roles','professional experience':'roles',
      'volunteer work':'volunteering','volunteering':'volunteering','volunteer experience':'volunteering',
      'education':'education','qualifications':'education','skills':'skills','technical skills':'skills',
      'projects':'portfolio','portfolio':'portfolio','certifications':'credentials','awards':'credentials','publications':'credentials',
      'references':'referees','referees':'referees','work rights':'workRights',
    };
    const sections = []; let current = {title:'Contact and introductory details',kind:'additional',lines:[]};
    for (const line of lines) {
      const value=line.trim(), key=value.replace(/:$/,'').toLowerCase();
      const header = headings[key] || (/^[A-Z][A-Z &/-]{2,45}:?$/.test(value) || /^[A-Za-z][A-Za-z &/-]{1,45}:$/.test(value) ? 'additional' : null);
      if (header) { if(current.lines.some(l=>l.trim())) sections.push(current); current={title:value.replace(/:$/,''),kind:header,lines:[]}; }
      else current.lines.push(line);
    }
    if(current.lines.some(l=>l.trim())) sections.push(current);
    for (const section of sections) {
      const content=section.lines.join('\n').trim();
      const blocks=content.split(/\n\s*\n/).filter(Boolean);
      // Preserve the entire source as well as structured fields so heuristic extraction never loses sections.
      if(section.kind==='additional') kb.additional.push({id:uid('extra'),title:section.title,notes:content,referenceOnly:section.title==='Contact and introductory details'});
      else if(section.kind==='workRights') { kb.workRights.notes=content; }
      else for(const block of blocks) {
        const rows=block.split('\n').map(l=>l.trim()).filter(Boolean);
        const parts=rows[0].split(/\s+\|\s+/);
        const highlights=rows.slice(1).map(t=>({id:uid('hl'),text:t.replace(/^[•*\-]\s*/,''),skills:[]}));
        switch(section.kind) {
          case 'roles': case 'volunteering':
            kb[section.kind].push({id:uid(section.kind==='roles'?'role':'vol'),title:parts[0],company:parts[1]||'',location:'',start:'',end:'',highlights}); break;
          case 'education': kb.education.push({id:uid('ed'),degree:parts[0],institution:parts[1]||'',year:'',notes:rows.slice(1).join('\n')}); break;
          case 'skills': kb.skills.push({id:uid('sk'),group:section.title,items:rows.join(', ').split(/[,;](?![^()]*\))/).map(s=>s.trim()).filter(Boolean)}); break;
          case 'portfolio': kb.portfolio.push({id:uid('pf'),name:parts[0],summary:parts.slice(1).join(' | '),link:'',highlights}); break;
          case 'credentials': kb.credentials.push({id:uid('cr'),kind:/publication/i.test(section.title)?'Publication':/award/i.test(section.title)?'Award':'Certification',title:rows.join(' — '),issuer:'',year:''}); break;
          case 'referees': kb.referees.push({id:uid('ref'),name:parts[0],title:parts[1]||'',company:'',contact:rows.slice(1).join('\n')}); break;
        }
      }
    }
    kb.additional.push({id:uid('extra'),title:'Original resume text (reference)',notes:text,referenceOnly:true});
    return kb;
  },
  sample() {
    const kb=normalizeKnowledgeBase(clone(MOCK.kb));
    kb.volunteering=[{id:uid('vol'),title:'Volunteer coding mentor',company:'Community Code Club',start:'2023',end:'Present',location:'Sydney',highlights:[{id:uid('hl'),text:'Helped adult learners build their first websites during weekly workshops.',skills:['Mentoring']}]}];
    kb.additional=[{id:uid('extra'),title:'Languages',notes:'English — fluent\nFrench — conversational'}];
    return kb;
  }
};

Views.import = function(root) {
  let alive=true;
  const state=Store.state;
  const draft=state.resumeImport ||= {text:'',fileName:''};
  function render() {
    root.innerHTML=shell(`<div class="new-wrap">
      <div class="page-head"><div><h1>Import your resume</h1><p class="muted">Bring your background into the knowledge base, then review it before saving.</p></div></div>
      <section class="panel new-panel">
        <label class="import-drop" for="resume-file">${icon('upload',28)}<strong>Choose an existing resume</strong><span class="muted">PDF, Word (.docx), or plain text (.txt) · up to 10 MB</span><input id="resume-file" type="file" accept=".pdf,.docx,.txt" aria-describedby="import-limit"></label>
        <p class="small import-tip">${icon('info',13)} No resume handy? Use your LinkedIn profile's <strong>Save to PDF</strong> option and import that file.</p>
        <p id="import-limit" class="muted small">Mock: PDF and Word uploads demonstrate extraction using clearly labelled sample details. TXT files and pasted text use a basic local parser. No files or API keys are sent anywhere.</p>
        <p data-file class="small" aria-live="polite">${esc(draft.fileName)}</p>
        <div class="field"><label for="resume-text">Or paste your resume text</label><textarea id="resume-text" rows="12" placeholder="Your name and contact details&#10;&#10;EXPERIENCE&#10;Role | Organisation&#10;What you did…&#10;&#10;VOLUNTEER WORK&#10;…">${esc(draft.text)}</textarea></div>
        <div class="callout"><div><strong>Every section has a place.</strong><p>Contact, experience, volunteer work, education, skills, projects, credentials and referees are editable. Other sections are kept under Additional sections. Original text is retained for comparison.</p></div></div>
        <div class="field-error" data-error hidden role="alert"></div>
        <div class="new-foot"><a class="btn btn-ghost" href="#/onboarding/manual">Enter manually instead</a><button class="btn btn-primary" data-extract>Extract and review</button></div>
        <button class="btn btn-ghost btn-sm" data-example>Try sample extraction</button>
      </section></div>`,{route:'kb',title:'Import resume'});
    bindShell(root);
    const input=$('#resume-text',root), file=$('#resume-file',root), error=$('[data-error]',root);
    const fail=message=>{error.textContent=message;error.hidden=false;};
    input.oninput=()=>{draft.text=input.value;draft.fileName='';draft.simulated=false;Store.save();};
    file.onchange=async()=>{
      const f=file.files[0]; if(!f)return;
      error.hidden=true;
      if(!/\.(pdf|docx|txt)$/i.test(f.name))return fail('Choose a PDF, DOCX or TXT file.');
      if(f.size>10*1024*1024)return fail('This file is larger than 10 MB. Choose a smaller file or paste the text.');
      if(!f.size)return fail('This file is empty. Choose another file or paste the text.');
      try {
        const text=/\.txt$/i.test(f.name)?await f.text():'';
        if(!alive)return;
        draft.text=text;draft.fileName=f.name;draft.simulated=!/\.txt$/i.test(f.name);Store.saveNow();
        input.value=text;
        $('[data-file]',root).textContent=f.name+(draft.simulated?' — sample extraction preview only; paste its text above to use your actual details.':' — ready to extract locally');
        $('[data-extract]',root).textContent=draft.simulated?'Preview sample extraction':'Extract and review';
      }catch{if(alive)fail('Could not read the file. Try another file or paste its text.');}
    };
    function review(kb,label) {
      if(state.onboarding.draft && state.onboarding.visited) {
        openModal({title:'Replace the unfinished onboarding draft?',body:'<p>Your saved knowledge base stays unchanged. This starts a new review from the imported details.</p>',actions:[{label:'Cancel'},{label:'Review import',kind:'btn-primary',fn:()=>start(kb,label)}]});
      }else start(kb,label);
    }
    function start(kb,label) {
      state.onboarding={step:ONB_STEPS.length-1,maxStep:ONB_STEPS.length-1,draft:kb,visited:true,imported:label,replace:!!state.sampleKb};
      Store.saveNow(); location.hash='#/onboarding';
    }
    $('[data-extract]',root).onclick=()=>{
      if(draft.simulated)return review(ResumeImport.sample(),'Sample extraction — not the contents of '+draft.fileName);
      if(draft.text.trim().length<20)return fail('Paste your resume text or choose a non-empty TXT file.');
      review(ResumeImport.parse(draft.text),draft.fileName||'Pasted resume text');
    };
    $('[data-example]',root).onclick=()=>review(ResumeImport.sample(),'Sample extraction — demonstration data');
  }
  render();
  return()=>{alive=false;};
};
