// Nagemaakte Supabase-client: genoeg om inventaris.js echt te laten draaien in jsc.
// Ondersteunt select/insert/upsert/update/delete met .eq()/.order()/.limit()/.maybeSingle().
function maakNepSupabase(db,ontbrekend){
  ontbrekend=ontbrekend||{};       // tabellen die "nog niet bestaan"
  const log=[];
  function query(tabel){
    const st={tabel:tabel,soort:'select',filters:[],payload:null,limiet:null,single:false};
    const q={
      select:function(){ st.soort='select'; return q; },
      insert:function(p){ st.soort='insert'; st.payload=p; return q; },
      upsert:function(p){ st.soort='upsert'; st.payload=p; return q; },
      update:function(p){ st.soort='update'; st.payload=p; return q; },
      delete:function(){ st.soort='delete'; return q; },
      eq:function(k,v){ st.filters.push([k,v]); return q; },
      neq:function(k,v){ st.filters.push(['!'+k,v]); return q; },
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
      if(k.charAt(0)==='!') return rij[k.slice(1)]!==v;
      return rij[k]===v;
    });
  }
  function voerUit(st){
    log.push(st.soort+' '+st.tabel);
    if(ontbrekend[st.tabel]) return {data:null,error:{message:'relation "'+st.tabel+'" does not exist'}};
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
      channel:function(){ return {on:function(){return this;},subscribe:function(){return this;}}; },
      storage:{from:function(){ return {
        upload:function(){ return Promise.resolve({data:{},error:null}); },
        getPublicUrl:function(p){ return {data:{publicUrl:'https://opslag/'+p}}; }
      };}}
    },
    db:db, log:log
  };
}
