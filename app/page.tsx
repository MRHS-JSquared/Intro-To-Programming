'use client';
/*
Virtual Pet — Updated

Changes in this version:
- Uses TailwindCSS + instructions for shadcn UI (shadcn setup is optional but recommended).
- Playful pastel color palette derived from your image (slightly tuned for contrast).
- Reorganized into a single-page multi-section app: Home, Dashboard, Playground.
- 3D scene extracted to <PetScene /> component using three.js and OrbitControls.
  - Skybox (soft pastel), PawPrint wireframe room, and a colored PawPrint pet placeholder.
  - Orbit controls enabled (for developer use; users won't swap models at runtime).
- Only the developer (you) can swap models by editing the loadPetModel function in the PetScene component.
- TypeScript-safe expense typing fixed.

npm install (recommended):
  npm install three lucide-react
  # Tailwind + shadcn setup (optional but recommended):
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p

  # shadcn UI (optional):
  npm i -D @stitches/react
  # then follow shadcn-ui setup: https://ui.shadcn.com/docs

Notes:
- This file is pages/index.tsx (Next.js + TypeScript). If you prefer plain .jsx, change types and remove type annotations accordingly.
- To replace the placeholder PawPrint with a real GLTF model, edit the loadPetModel function inside PetScene (commented instructions included). Only you (the coder) should modify models — users have no UI to upload models.
*/

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Home, Activity, PawPrint } from 'lucide-react';

// --------------------
// Color palette (tuned)
// --------------------
const COLORS = {
  lightPeach: '#FFD88C',
  coral: '#FF8574',
  mint: '#D8EEEA',
  softGreen: '#C5E2D0',
  background: '#071023',
  card: '#07182a',
  accent: '#1466ff'
};

// Types
type Expense = { label: string; amount: number; date: string };

type PetType = 'dog' | 'cat' | 'rabbit' | 'other';

export default function VirtualPetPage() {
  // UI state: which section is active
  const [section, setSection] = useState<'home'|'dashboard'|'playground'>('home');

  // Pet profile
  const [name, setName] = useState('Fluffy');
  const [type, setType] = useState<PetType>('dog');
  const [created, setCreated] = useState(false);

  // Stats: range 0-100
  const [hunger, setHunger] = useState(50);
  const [happiness, setHappiness] = useState(70);
  const [health, setHealth] = useState(90);
  const [cleanliness, setCleanliness] = useState(80);
  const [energy, setEnergy] = useState(75);

  // Money & expenses
  const [money, setMoney] = useState(50);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Other UI
  const [message, setMessage] = useState('Welcome! Create your pet to begin.');

  // 3D refs (passed to PetScene via props)
  const sceneKey = `${type}-${name}`; // simple key to re-init scene when pet changes

  // Save/load to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('virtual-pet-v1');
    if (saved) {
      const data = JSON.parse(saved);
      setName(data.name || 'Fluffy');
      setType(data.type || 'dog');
      setCreated(data.created || false);
      setHunger(data.hunger ?? 50);
      setHappiness(data.happiness ?? 70);
      setHealth(data.health ?? 90);
      setCleanliness(data.cleanliness ?? 80);
      setEnergy(data.energy ?? 75);
      setMoney(data.money ?? 50);
      setExpenses(data.expenses || []);
      setMessage('Loaded your saved pet.');
    }
  }, []);

  useEffect(() => {
    const save = { name, type, created, hunger, happiness, health, cleanliness, energy, money, expenses };
    localStorage.setItem('virtual-pet-v1', JSON.stringify(save));
  }, [name, type, created, hunger, happiness, health, cleanliness, energy, money, expenses]);

  // Time decay: every 10 seconds, stats change slightly
  useEffect(() => {
    const interval = setInterval(() => {
      setHunger(h => clamp(h + 3, 0, 100));
      setHappiness(h => clamp(h - 2, 0, 100));
      setCleanliness(c => clamp(c - 1.5, 0, 100));
      setEnergy(e => clamp(e - 2.5, 0, 100));

      setHealth(prev => {
        let h = prev;
        if (hunger > 90 || cleanliness < 10) h = clamp(h - 4, 0, 100);
        else if (happiness > 80 && cleanliness > 50) h = clamp(h + 1, 0, 100);
        return h;
      });
      evaluateMood();
    }, 10000);
    return () => clearInterval(interval);
  }, [hunger, happiness, cleanliness, energy]);

  // Evaluate pet mood and set message
  function evaluateMood() {
    if (!created) return;
    if (health < 40) setMessage(`${name} looks sick — consider a vet visit.`);
    else if (hunger > 75) setMessage(`${name} is very hungry.`);
    else if (happiness < 30) setMessage(`${name} seems sad.`);
    else if (energy < 20) setMessage(`${name} needs rest.`);
    else setMessage(`${name} seems happy and playful!`);
  }

  // Actions (same as before)
  function createPet() { setCreated(true); setMessage(`Say hello to ${name} the ${type}!`); setSection('dashboard'); }
  function feed() { if (!created) return setMessage('Create a pet first.'); const cost = 5; if (money < cost) return setMessage("You don't have enough funds to buy food — do chores to earn money."); setMoney(m => m - cost); addExpense('Food', cost); setHunger(h => clamp(h - 25, 0, 100)); setHappiness(h => clamp(h + 8, 0, 100)); setMessage(`${name} ate and looks more satisfied.`); }
  function play() { if (!created) return setMessage('Create a pet first.'); setHappiness(h => clamp(h + 12, 0, 100)); setEnergy(e => clamp(e - 15, 0, 100)); setMessage(`${name} had fun playing!`); }
  function rest() { if (!created) return setMessage('Create a pet first.'); setEnergy(e => clamp(e + 30, 0, 100)); setHappiness(h => clamp(h + 4, 0, 100)); setMessage(`${name} rested and regained energy.`); }
  function clean() { if (!created) return setMessage('Create a pet first.'); const cost = 3; if (money < cost) return setMessage("You don't have enough funds to buy cleaning supplies."); setMoney(m => m - cost); addExpense('Cleaning supplies', cost); setCleanliness(c => clamp(c + 30, 0, 100)); setMessage(`${name} smells fresh!`); }
  function vet() { if (!created) return setMessage('Create a pet first.'); const cost = 25; if (money < cost) return setMessage("You don't have enough for a vet visit."); setMoney(m => m - cost); addExpense('Vet visit', cost); setHealth(h => clamp(h + 40, 0, 100)); setMessage(`${name} had a vet checkup and is feeling better.`); }
  function buyToy() { if (!created) return setMessage('Create a pet first.'); const cost = 8; if (money < cost) return setMessage("You can't afford that toy right now."); setMoney(m => m - cost); addExpense('Toy', cost); setHappiness(h => clamp(h + 18, 0, 100)); setMessage(`${name} loves the new toy!`); }
  function doChore() { if (!created) return setMessage('Create a pet first.'); const earn = Math.floor(Math.random() * 11) + 5; setMoney(m => m + earn); setMessage(`You completed a chore and earned $${earn}.`); }
  function addExpense(label: string, amount: number) { const entry = { label, amount, date: new Date().toISOString().slice(0, 19).replace('T', ' ') }; setExpenses(es => [entry, ...es]); }

  function clamp(v:number,a:number,b:number){ return Math.max(a, Math.min(b, v)); }

  function resetDemo(){ setHunger(50); setHappiness(70); setHealth(90); setCleanliness(80); setEnergy(75); setMoney(50); setExpenses([]); setMessage('Demo reset.'); }

  return (
    <div className="min-h-screen" style={{ background: COLORS.background, color: '#e6eef8', fontFamily: 'Inter, system-ui, Arial' }}>
      <div className="max-w-6xl mx-auto p-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Virtual Pet — Care & Finance</h1>
            <p className="text-sm text-slate-300">Playful, educational, and modern — keep your pet happy and your budget safe.</p>
          </div>

          <nav className="flex gap-2 items-center">
            <button onClick={() => setSection('home')} className={`px-3 py-2 rounded-lg ${section==='home' ? 'bg-white/10' : 'bg-transparent'}` }><Home size={16}/> Home</button>
            <button onClick={() => setSection('dashboard')} className={`px-3 py-2 rounded-lg ${section==='dashboard' ? 'bg-white/10' : 'bg-transparent'}` }><Activity size={16}/> Dashboard</button>
            <button onClick={() => setSection('playground')} className={`px-3 py-2 rounded-lg ${section==='playground' ? 'bg-white/10' : 'bg-transparent'}` }><PawPrint size={16}/> Playground</button>
          </nav>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <section className="lg:col-span-1 bg-[#07182a] p-4 rounded-2xl">
            {section==='home' && (
              <div>
                <h2 className="text-lg font-semibold">Create your pet</h2>
                <label className="block mt-3">Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} className="w-full mt-1 p-2 rounded-md bg-[#041324] border border-slate-800" />
                <label className="block mt-3">Type</label>
                <select value={type} onChange={e=>setType(e.target.value as PetType)} className="w-full mt-1 p-2 rounded-md bg-[#041324] border border-slate-800">
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                  <option value="rabbit">Rabbit</option>
                  <option value="other">Other</option>
                </select>
                <button onClick={createPet} className="mt-4 w-full py-2 rounded-xl" style={{ background: COLORS.coral, color: '#081523' }}>Create Pet</button>

                <div className="mt-6">
                  <h3 className="font-medium">Quick tips</h3>
                  <ul className="text-sm mt-2 text-slate-300">
                    <li>Do chores to earn money</li>
                    <li>Keep an emergency fund for vet visits ($25)</li>
                  </ul>
                </div>
              </div>
            )}

            {section!=='home' && (
              <div>
                <div className="flex items-center gap-3">
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: petColorForType(type) }}></div>
                  <div>
                    <div className="font-semibold">{name}</div>
                    <div className="text-sm text-slate-400">{type}</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Stat label="Hunger" val={hunger} />
                  <Stat label="Happiness" val={happiness} />
                  <Stat label="Health" val={health} />
                  <Stat label="Cleanliness" val={cleanliness} />
                  <Stat label="Energy" val={energy} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={feed} className="py-2 rounded-lg" style={{ background: COLORS.lightPeach, color: '#081523' }}>Feed ($5)</button>
                  <button onClick={play} className="py-2 rounded-lg" style={{ background: COLORS.coral }}>Play</button>
                  <button onClick={rest} className="py-2 rounded-lg" style={{ background: COLORS.mint, color: '#081523' }}>Rest</button>
                  <button onClick={clean} className="py-2 rounded-lg" style={{ background: COLORS.softGreen, color: '#081523' }}>Clean ($3)</button>
                </div>

                <div className="mt-3">
                  <button onClick={vet} className="w-full py-2 rounded-lg" style={{ background: COLORS.accent }}>Vet ($25)</button>
                </div>

              </div>
            )}

          </section>

          <section className="lg:col-span-2">
            {section==='dashboard' && (
              <div className="bg-[#071225] p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Dashboard</h2>
                    <p className="text-sm text-slate-300">Money: <strong>${money}</strong> • Total expenses: <strong>${totalExpenses}</strong></p>
                  </div>
                  <div className="text-sm text-slate-400">{message}</div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#041324] rounded-xl">
                    <h3 className="font-medium">Expenses</h3>
                    <div className="mt-2 max-h-48 overflow-auto text-slate-200">
                      {expenses.length===0 && <div className="text-slate-400">No expenses yet</div>}
                      {expenses.map((e,i)=> (
                        <div key={i} className="flex justify-between mt-2 text-sm">
                          <div>{e.label}</div>
                          <div>${e.amount}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-[#041324] rounded-xl">
                    <h3 className="font-medium">Actions</h3>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button onClick={buyToy} className="py-2 rounded-lg" style={{ background: COLORS.coral }}>Buy Toy ($8)</button>
                      <button onClick={doChore} className="py-2 rounded-lg" style={{ background: COLORS.lightPeach, color: '#081523' }}>Do Chore</button>
                      <button onClick={() => setMessage('Savings goal set (demo)')} className="py-2 rounded-lg col-span-2" style={{ background: COLORS.mint, color: '#081523' }}>Set Savings Goal</button>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {section==='playground' && (
              <div className="bg-[#071225] p-4 rounded-2xl">
                <h2 className="text-xl font-semibold">Playground</h2>
                <p className="text-sm text-slate-300">Orbit controls enabled. The pet and environment are developer-managed placeholders.</p>
                <div className="mt-4" style={{ height: 520 }}>
                  <PetScene key={sceneKey} petType={type} />
                </div>

                <div className="mt-4 flex gap-2">
                  <button onClick={() => {/* developer-only model swap — edit loadPetModel in code */}} className="py-2 px-3 rounded-lg" style={{ background: COLORS.lightPeach, color: '#081523' }}>Replace (dev)</button>
                  <button onClick={() => setMessage('Tip: models are swapped in code, not by users.')} className="py-2 px-3 rounded-lg" style={{ background: COLORS.mint, color: '#081523' }}>How to</button>
                </div>

              </div>
            )}
          </section>
        </main>

      </div>
    </div>
  );
}

// ------------------
// PetScene component
// ------------------
function PetScene({ petType }: { petType: PetType }){
  const mountRef = useRef<HTMLDivElement | null>(null);
  const petRef = useRef<THREE.Mesh | null>(null);

  useEffect(()=>{
    if(!mountRef.current) return;
    const el = mountRef.current;
    const width = el.clientWidth;
    const height = el.clientHeight;

    const scene = new THREE.Scene();
    // Skybox: subtle pastel colors — we'll create a soft gradient PawPrint texture
    const loader = new THREE.CubeTextureLoader();
    // For simplicity, use solid color data URLs as skybox faces (small pastel squares). In production replace with proper images.
    const faces = [COLORS.mint, COLORS.softGreen, COLORS.lightPeach, COLORS.coral, COLORS.mint, COLORS.softGreen];
    // Create tiny 16x16 data URLs for each color
    const dataURLs = faces.map(hex => makeDataURLFromHex(hex));
    const PawPrintTex = loader.load(dataURLs as any);
    scene.background = PawPrintTex;

    const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);
    camera.position.set(0, 1.6, 4.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5,10,7);
    scene.add(dir);

    // PawPrint room (wireframe)
    const room = new THREE.Mesh(new THREE.BoxGeometry(3,3,3), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, opacity: 0.06, transparent:true }));
    scene.add(room);

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10,10), new THREE.MeshStandardMaterial({ color: 0x0b1620 }));
    floor.rotation.x = -Math.PI/2; floor.position.y = -1; scene.add(floor);

    // Pet placeholder PawPrint (colored by type)
    const PawPrint = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.9,0.9), new THREE.MeshStandardMaterial({ color: petColorForType(petType) }));
    PawPrint.position.y = -0.5; scene.add(PawPrint); petRef.current = PawPrint;

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.12;
    controls.minDistance = 2; controls.maxDistance = 8;

    // Resize
    function onResize(){ const w = el.clientWidth; camera.aspect = w / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(w, el.clientHeight); }
    window.addEventListener('resize', onResize);

    // Animation
    const clock = new THREE.Clock(); let req = 0;
    function animate(){
      const delta = clock.getDelta();
      // gentle bob
      if(petRef.current){ petRef.current.rotation.y += 0.4 * delta; petRef.current.position.y = -0.5 + Math.sin(clock.elapsedTime*1.2) * 0.03; }
      controls.update(); renderer.render(scene, camera);
      req = requestAnimationFrame(animate);
    }
    animate();

    // Developer-only: model loader helper. Edit this function to load glTF models into the scene.
    function loadPetModel(url: string){
      // Example (developer):
      // import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
      // const loader = new GLTFLoader();
      // loader.load(url, gltf => {
      //   // remove placeholder
      //   scene.remove(PawPrint);
      //   const model = gltf.scene; model.scale.set(1,1,1); scene.add(model);
      //   // handle animations with THREE.AnimationMixer if needed
      // });
    }

    // Cleanup
    return ()=>{
      cancelAnimationFrame(req);
      controls.dispose();
      window.removeEventListener('resize', onResize);
      el.removeChild(renderer.domElement);
      scene.clear();
    };

  }, [petType]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }} />;
}

// ------------------
// Helpers + UI bits
// ------------------
function makeDataURLFromHex(hex: string){
  // create a 16x16 PNG data URL of a solid color — used for skybox faces in this demo
  const size = 16; const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if(!canvas) return '';
  canvas.width = size; canvas.height = size; const ctx = canvas.getContext('2d')!; ctx.fillStyle = hex; ctx.fillRect(0,0,size,size); return canvas.toDataURL();
}

function petColorForType(t: PetType){ switch(t){ case 'dog': return COLORS.lightPeach; case 'cat': return COLORS.coral; case 'rabbit': return COLORS.mint; default: return COLORS.softGreen; } }

function Stat({ label, val }:{label:string; val:number}){
  const pct = Math.round(val);
  const color = pct>70 ? '#4ade80' : pct>40 ? '#fbbf24' : '#f87171';
  return (
    <div className="flex items-center gap-3">
      <div style={{ width: 90 }}>{label}</div>
      <div className="flex-1 bg-[#081a27] rounded-lg h-3 overflow-hidden">
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <div style={{ width: 36, textAlign: 'right' }}>{pct}</div>
    </div>
  );
}

