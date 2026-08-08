// Nagemaakte Supabase-client: genoeg om inventaris.js echt te laten draaien in jsc.
// Ondersteunt select/insert/upsert/update/delete met .eq()/.order()/.limit()/.maybeSingle().
// 'kolomWeg' is optioneel: {formulieren:['finalevraag']} doet alsof die kolom nog niet
// bestaat. Net als de echte database geeft een select óf een insert die de kolom noemt
// dan een fout — zo kunnen we testen dat de app daar netjes mee omgaat.
function maakNepSupabase(db,ontbrekend,kolomWeg){
  ontbrekend=ontbrekend||{};       // tabellen die "nog niet bestaan"
  kolomWeg=kolomWeg||{};           // kolommen die "nog niet bestaan", per tabel
  const log=[];
  function kolomOntbreekt(tabel,naam){ return (kolomWeg[tabel]||[]).indexOf(naam)>=0; }
  function query(tabel){
    const st={tabel:tabel,soort:'select',filters:[],payload:null,limiet:null,single:false,kolommen:null};
    const q={
      select:function(c){ st.soort='select'; st.kolommen=c||null; return q; },
      insert:function(p){ st.soort='insert'; st.payload=p; return q; },
      upsert:function(p){ st.soort='upsert'; st.payload=p; return q; },
      update:function(p){ st.soort='update'; st.payload=p; return q; },
      delete:function(){ st.soort='delete'; return q; },
      eq:function(k,v){ st.filters.push([k,v]); return q; },
      neq:function(k,v){ st.filters.push(['!'+k,v]); return q; },
      in:function(k,vals){ st.filters.push(['in:'+k,vals||[]]); return q; },
      order:function(){ return q; },
      limit:function(n){ st.limiet=n; return q; },
      maybeSingle:function(){ st.single=true; return q; },
      then:function(res,rej){ return Promise.resolve(voerUit(st)).then(res,rej); }
    };
    return q;
  }
  function past(rij,filters){
    return filters.every(function(f){
      const k=f[0], v=f[1];
      if(k.slice(0,3)==='in:') return v.indexOf(rij[k.slice(3)])>=0;
      if(k.charAt(0)==='!') return rij[k.slice(1)]!==v;
      return rij[k]===v;
    });
  }
  function voerUit(st){
    log.push(st.soort+' '+st.tabel);
    if(ontbrekend[st.tabel]) return {data:null,error:{message:'relation "'+st.tabel+'" does not exist'}};
    // Een onbekende kolom laat de héle opdracht mislukken — precies zoals PostgREST doet.
    const genoemd=[];
    if(st.soort==='select' && typeof st.kolommen==='string')
      st.kolommen.split(',').forEach(function(c){ const n=c.trim(); if(n && n!=='*') genoemd.push(n); });
    if(st.soort!=='select')
      (Array.isArray(st.payload)?st.payload:[st.payload]).forEach(function(r){
        if(r&&typeof r==='object') Object.keys(r).forEach(function(k){ if(genoemd.indexOf(k)<0) genoemd.push(k); });
      });
    const fout=genoemd.filter(function(k){ return kolomOntbreekt(st.tabel,k); })[0];
    if(fout) return {data:null,error:{code:'PGRST204',
      message:"Could not find the '"+fout+"' column of '"+st.tabel+"' in the schema cache"}};
    db[st.tabel]=db[st.tabel]||[];
    const t=db[st.tabel];
    if(st.soort==='select'){
      let rijen=t.filter(function(r){return past(r,st.filters);});
      if(st.limiet) rijen=rijen.slice(0,st.limiet);
      if(st.single) return {data:rijen[0]||null,error:null};
      return {data:rijen.map(function(r){return Object.assign({},r);}),error:null};
    }
    const lijst=Array.isArray(st.payload)?st.payload:[st.payload];
    if(st.soort==='insert'){ lijst.forEach(function(r){ t.push(Object.assign({},r)); }); return {data:lijst,error:null}; }
    if(st.soort==='upsert'){
      lijst.forEach(function(r){
        const i=t.findIndex(function(x){return x.id===r.id;});
        if(i>=0) t[i]=Object.assign({},r); else t.push(Object.assign({},r));
      });
      return {data:lijst,error:null};
    }
    if(st.soort==='update'){
      t.forEach(function(r,i){ if(past(r,st.filters)) t[i]=Object.assign({},r,st.payload); });
      return {data:null,error:null};
    }
    if(st.soort==='delete'){
      db[st.tabel]=t.filter(function(r){ return !past(r,st.filters); });
      return {data:null,error:null};
    }
    return {data:null,error:null};
  }
  return {
    client:{
      from:query,
      // Sinds de beveiliging (zie docs/BEVEILIGING.md) meldt de app zich eerst aan met een
      // gedeelde toegangscode. In de test doen we alsof dit toestel al aangemeld is.
      auth:{
        getSession:function(){ return Promise.resolve({data:{session:{user:{email:'team@bazarbizarre.app'}}},error:null}); },
        signInWithPassword:function(){ return Promise.resolve({data:{},error:null}); }
      },
      channel:function(){ return {on:function(){return this;},subscribe:function(){return this;}}; },
      storage:{from:function(){ return {
        upload:function(){ return Promise.resolve({data:{},error:null}); },
        getPublicUrl:function(p){ return {data:{publicUrl:'https://opslag/'+p}}; }
      };}}
    },
    db:db, log:log
  };
}
