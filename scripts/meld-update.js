// Stuurt het seintje "er staat een nieuwe versie klaar" naar alle open toestellen —
// via dezelfde Supabase-verbinding die de app ook voor live-synchronisatie gebruikt,
// met enkel de publieke anon-sleutel (geen team-login nodig, zie js/inventaris.js:
// subscribeUpdateSignal).
//
// Draai dit NA elke "git push" die APP_VERSION in js/kern.js heeft opgehoogd:
//   node scripts/meld-update.js
//
// Zonder deze stap werkt alles nog steeds — elk toestel haalt de nieuwe versie
// vanzelf op bij het opstarten, als het weer online komt, of als het scherm weer in
// beeld komt — maar dan duurt het tot zo'n moment zich voordoet, in plaats van meteen.
global.window = global;
global.self = global;

const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'supabase.min.js'), 'utf8');
eval(code);

const SUPABASE_URL = 'https://tbromtomzglqtuyezoav.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicm9tdG9temdscXR1eWV6b2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MDg0MjQsImV4cCI6MjA5NzA4NDQyNH0.RxcKKWjEcat3ji4iUjByO5WxBSL0yvZMBvfzkoM3Jrc';

async function main() {
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const kanaal = sb.channel('bb-update');

  const status = await new Promise((resolve) => {
    kanaal.subscribe((st) => {
      if (st === 'SUBSCRIBED' || st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') resolve(st);
    });
    setTimeout(() => resolve('TIMEOUT-LOKAAL'), 8000);
  });

  if (status !== 'SUBSCRIBED') {
    console.error('Kon niet verbinden met het update-kanaal (status: ' + status + '). ' +
      'Geen man overboord: elk toestel haalt de nieuwe versie later vanzelf op.');
    await sb.removeChannel(kanaal);
    process.exit(1);
  }

  await kanaal.send({ type: 'broadcast', event: 'controleer', payload: { ts: Date.now() } });
  console.log('Seintje verstuurd: alle open toestellen controleren nu of er een nieuwe versie is.');

  await sb.removeChannel(kanaal);
  process.exit(0);
}

main().catch((e) => {
  console.error('Mislukt:', e);
  process.exit(1);
});
