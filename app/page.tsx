'use client';
/*
Virtual Pet - Single-file Next.js page (index.jsx)

How to use:
1) In StackBlitz (or local), create a Next.js app (you can use the Next.js + React template).
2) Install dependencies:
   npm install three
   npm install three/examples/jsm/loaders/GLTFLoader --save-dev (not required, GLTFLoader comes with three in examples path)

3) Create a file at pages/index.jsx and paste the code below.
4) Start dev server: npm run dev

This single file implements:
- Home screen with pet selection (dog, cat, rabbit, other) and naming
- Pet stats (hunger, happiness, health, cleanliness, energy), decay over time
- Actions: Feed, Play, Rest, Clean, Vet, Do Chore (earn money), Buy Toy
- Cost-of-care tracker and expense log
- Simple chore/earning system
- 3D playground using Three.js (a cube 'room' and a colored cube as the pet). Replace model easily by updating the loadModel function.

Notes on replacing the cube with a real model and animations:
- Uncomment and use GLTFLoader from 'three/examples/jsm/loaders/GLTFLoader'
- loadModel shows an example commented out. Add animations mixer and play clips as needed.

*/

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// If you want to load GLTF models later, import GLTFLoader like this:
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export default function VirtualPetPage() {
  // Pet profile
  const [name, setName] = useState('Fluffy');
  const [type, setType] = useState('dog');
  const [created, setCreated] = useState(false);

  // Stats: range 0-100
  const [hunger, setHunger] = useState(50);
  const [happiness, setHappiness] = useState(70);
  const [health, setHealth] = useState(90);
  const [cleanliness, setCleanliness] = useState(80);
  const [energy, setEnergy] = useState(75);

  // Money & expenses
  const [money, setMoney] = useState(50);
  const [expenses, setExpenses] = useState<{ label: string; amount: number; date: string; }[]>([])
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Other UI
  const [message, setMessage] = useState('Welcome! Create your pet to begin.');

  // 3D refs
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const petMeshRef = useRef(null);
  const animRef = useRef({ mixer: null, clock: null });

  // Save/load to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('virtual-pet-v1');
    if (saved) {
      const data = JSON.parse(saved);
      setName(data.name);
      setType(data.type);
      setCreated(data.created);
      setHunger(data.hunger);
      setHappiness(data.happiness);
      setHealth(data.health);
      setCleanliness(data.cleanliness);
      setEnergy(data.energy);
      setMoney(data.money);
      setExpenses(data.expenses || []);
      setMessage('Loaded your saved pet.');
    }
  }, []);

  useEffect(() => {
    const save = {
      name,
      type,
      created,
      hunger,
      happiness,
      health,
      cleanliness,
      energy,
      money,
      expenses,
    };
    localStorage.setItem('virtual-pet-v1', JSON.stringify(save));
  }, [name, type, created, hunger, happiness, health, cleanliness, energy, money, expenses]);

  // Time decay: every 10 seconds, stats change slightly
  useEffect(() => {
    const interval = setInterval(() => {
      setHunger(h => clamp(h + 3, 0, 100)); // gets hungrier
      setHappiness(h => clamp(h - 2, 0, 100));
      setCleanliness(c => clamp(c - 1.5, 0, 100));
      setEnergy(e => clamp(e - 2.5, 0, 100));
      // health depends on extremes
      setHealth(prev => {
        let h = prev;
        if (hunger > 90 || cleanliness < 10) h = clamp(h - 4, 0, 100);
        else if (happiness > 80 && cleanliness > 50) h = clamp(h + 1, 0, 100);
        return h;
      });
      evaluateMood();
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Actions
  function createPet() {
    setCreated(true);
    setMessage(`Say hello to ${name} the ${type}!`);
  }

  function feed() {
    if (!created) return setMessage('Create a pet first.');
    const cost = 5;
    if (money < cost) return setMessage("You don't have enough funds to buy food — do chores to earn money.");
    setMoney(m => m - cost);
    addExpense('Food', cost);
    setHunger(h => clamp(h - 25, 0, 100));
    setHappiness(h => clamp(h + 8, 0, 100));
    setMessage(`${name} ate and looks more satisfied.`);
  }

  function play() {
    if (!created) return setMessage('Create a pet first.');
    setHappiness(h => clamp(h + 12, 0, 100));
    setEnergy(e => clamp(e - 15, 0, 100));
    setMessage(`${name} had fun playing!`);
  }

  function rest() {
    if (!created) return setMessage('Create a pet first.');
    setEnergy(e => clamp(e + 30, 0, 100));
    setHappiness(h => clamp(h + 4, 0, 100));
    setMessage(`${name} rested and regained energy.`);
  }

  function clean() {
    if (!created) return setMessage('Create a pet first.');
    const cost = 3;
    if (money < cost) return setMessage("You don't have enough funds to buy cleaning supplies.");
    setMoney(m => m - cost);
    addExpense('Cleaning supplies', cost);
    setCleanliness(c => clamp(c + 30, 0, 100));
    setMessage(`${name} smells fresh!`);
  }

  function vet() {
    if (!created) return setMessage('Create a pet first.');
    const cost = 25;
    if (money < cost) return setMessage("You don't have enough for a vet visit.");
    setMoney(m => m - cost);
    addExpense('Vet visit', cost);
    setHealth(h => clamp(h + 40, 0, 100));
    setMessage(`${name} had a vet checkup and is feeling better.`);
  }

  function buyToy() {
    if (!created) return setMessage('Create a pet first.');
    const cost = 8;
    if (money < cost) return setMessage("You can't afford that toy right now.");
    setMoney(m => m - cost);
    addExpense('Toy', cost);
    setHappiness(h => clamp(h + 18, 0, 100));
    setMessage(`${name} loves the new toy!`);
  }

  function doChore() {
    if (!created) return setMessage('Create a pet first.');
    // simple chore system: random small earnings 5-15
    const earn = Math.floor(Math.random() * 11) + 5;
    setMoney(m => m + earn);
    setMessage(`You completed a chore and earned $${earn}.`);
  }

  function addExpense(label, amount) {
    const entry = { label, amount, date: new Date().toISOString().slice(0, 19).replace('T', ' ') };
    setExpenses(es => [entry, ...es]);
  }

  // Clamp helper
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  // 3D Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f1a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 2, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const hem = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hem.position.set(0, 20, 0);
    scene.add(hem);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    // Room: wireframe cube (playground)
    const roomSize = 3;
    const roomGeo = new THREE.BoxGeometry(roomSize, roomSize, roomSize);
    const roomMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, opacity: 0.08, transparent: true });
    const room = new THREE.Mesh(roomGeo, roomMat);
    scene.add(room);

    // Pet: simple cube placeholder, colored by pet type
    const color = petColorForType(type);
    const petGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const petMat = new THREE.MeshStandardMaterial({ color });
    const pet = new THREE.Mesh(petGeo, petMat);
    pet.position.set(0, -0.5, 0);
    scene.add(pet);
    petMeshRef.current = pet;

    // Ground
    const planeGeo = new THREE.PlaneGeometry(10, 10);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x111217 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1;
    scene.add(plane);

    // Resize handler
    function onWindowResize() {
      const w = mountRef.current.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    }
    window.addEventListener('resize', onWindowResize);

    // Animation loop
    let req = null;
    const clock = new THREE.Clock();
    animRef.current.clock = clock;

    function animate() {
      const delta = clock.getDelta();
      // Simple pet animation: rotate gently when happy/energetic
      if (petMeshRef.current) {
        const speed = happiness > 60 && energy > 40 ? 1.5 : 0.3;
        petMeshRef.current.rotation.y += 0.5 * delta * speed;
        petMeshRef.current.position.y = -0.5 + Math.sin(clock.elapsedTime * (speed * 0.6)) * (happiness > 60 ? 0.05 : 0.01);
      }
      renderer.render(scene, camera);
      req = requestAnimationFrame(animate);
    }
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(req);
      window.removeEventListener('resize', onWindowResize);
      mountRef.current.removeChild(renderer.domElement);
      scene.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, happiness, energy]);

  // Utility: color by type
  function petColorForType(t) {
    switch (t) {
      case 'dog': return 0xffb86b; // warm
      case 'cat': return 0xc790ff; // purple
      case 'rabbit': return 0x9be7ff; // light blue
      default: return 0x9aff9a; // greenish for other
    }
  }

  // Example function to swap the cube for a GLTF model and support animations
  // You would need to add GLTFLoader import at top and place model in /public or load from URL
  async function loadModel(url) {
    // Example (commented):
    // const loader = new GLTFLoader();
    // loader.load(url, gltf => {
    //   const model = gltf.scene;
    //   model.scale.set(1,1,1);
    //   sceneRef.current.add(model);
    //   // If animations exist:
    //   if (gltf.animations && gltf.animations.length) {
    //     const mixer = new THREE.AnimationMixer(model);
    //     animRef.current.mixer = mixer;
    //     const action = mixer.clipAction(gltf.animations[0]);
    //     action.play();
    //   }
    // });
    setMessage('Model loading is stubbed in this demo. Replace loadModel with GLTFLoader code.');
  }

  // Render helpers
  function statColor(v) {
    if (v > 70) return '#4ade80';
    if (v > 40) return '#fbbf24';
    return '#f87171';
  }

  // Quick reset for demo/testing
  function resetDemo() {
    setHunger(50); setHappiness(70); setHealth(90); setCleanliness(80); setEnergy(75);
    setMoney(50); setExpenses([]);
    setMessage('Demo reset.');
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, Arial', color: '#e6eef8', padding: 18, background: '#071023', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Virtual Pet — Care & Finance</h1>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#9fb7d8' }}>Money: <strong>${money}</strong></div>
            <div style={{ fontSize: 12, color: '#9fb7d8' }}>Total expenses: <strong>${totalExpenses}</strong></div>
          </div>
        </header>

        <main style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, marginTop: 18 }}>
          <section style={{ background: '#07182a', padding: 12, borderRadius: 12 }}>
            <h2 style={{ marginTop: 0 }}>Home</h2>

            {!created && (
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Pet name</label>
                <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #203447' }} />

                <label style={{ display: 'block', marginTop: 10 }}>Type</label>
                <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6 }}>
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                  <option value="rabbit">Rabbit</option>
                  <option value="other">Other</option>
                </select>

                <button onClick={createPet} style={btnStyle}>Create Pet</button>
              </div>
            )}

            {created && (
              <div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 62, height: 62, borderRadius: 10, background: `#${petColorForType(type).toString(16)}` }}></div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{name}</div>
                    <div style={{ color: '#9fb7d8', fontSize: 12 }}>{type}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <Stat label="Hunger" val={hunger} color={statColor(hunger)} />
                    <Stat label="Happiness" val={happiness} color={statColor(happiness)} />
                    <Stat label="Health" val={health} color={statColor(health)} />
                    <Stat label="Cleanliness" val={cleanliness} color={statColor(cleanliness)} />
                    <Stat label="Energy" val={energy} color={statColor(energy)} />
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={feed} style={btnStyle}>Feed ($5)</button>
                  <button onClick={play} style={btnStyle}>Play</button>
                  <button onClick={rest} style={btnStyle}>Rest</button>
                  <button onClick={clean} style={btnStyle}>Clean ($3)</button>
                  <button onClick={vet} style={btnStyle}>Vet ($25)</button>
                  <button onClick={buyToy} style={btnStyle}>Buy Toy ($8)</button>
                </div>

                <div style={{ marginTop: 12 }}>
                  <h3 style={{ margin: '6px 0' }}>Chores</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={doChore} style={btnStyle}>Do Chore (earn)</button>
                    <button onClick={() => { setMessage('Short-term savings goal added.'); }} style={btnStyle}>Set Savings Goal</button>
                  </div>
                </div>

              </div>
            )}

            <div style={{ marginTop: 14, background: '#041324', padding: 8, borderRadius: 8 }}>
              <div style={{ color: '#9fb7d8', fontSize: 13 }}>{message}</div>
            </div>

            <div style={{ marginTop: 14 }}>
              <button onClick={resetDemo} style={{ ...btnStyle, background: '#2b6bff' }}>Reset Demo</button>
            </div>

            <div style={{ marginTop: 10 }}>
              <h4 style={{ margin: '6px 0' }}>Expenses</h4>
              <div style={{ maxHeight: 140, overflow: 'auto' }}>
                <table style={{ width: '100%', color: '#cfe7ff' }}>
                  <thead style={{ textAlign: 'left', color: '#78a7d6' }}>
                    <tr><th>Item</th><th>Amount</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 && <tr><td colSpan={3} style={{ color: '#8098b0' }}>No expenses yet</td></tr>}
                    {expenses.map((e, i) => (
                      <tr key={i}><td>{e.label}</td><td>${e.amount}</td><td style={{ fontSize: 12 }}>{e.date}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </section>

          <section style={{ background: '#071225', padding: 12, borderRadius: 12 }}>
            <h2 style={{ marginTop: 0 }}>Playground</h2>
            <div ref={mountRef} style={{ width: '100%', height: 400, borderRadius: 8, overflow: 'hidden', background: '#071225' }}></div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button style={btnStyle} onClick={() => loadModel('/models/your-pet.glb')}>Replace model (stub)</button>
              <button style={btnStyle} onClick={() => { setMessage('Tip: replace loadModel with GLTFLoader to load animated models'); }}>How to add model</button>
            </div>

            <div style={{ marginTop: 14 }}>
              <h3 style={{ marginBottom: 6 }}>Pet Reactions</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ padding: 8, background: '#0b2030', borderRadius: 8 }}>Mood: <strong>{health < 40 ? 'Sick' : hunger > 75 ? 'Hungry' : happiness < 30 ? 'Sad' : 'Happy'}</strong></div>
                <div style={{ padding: 8, background: '#0b2030', borderRadius: 8 }}>Behavior: <strong>{energy < 20 ? 'Sleeping' : 'Active'}</strong></div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <h3 style={{ marginBottom: 6 }}>Budget & Teaching</h3>
              <p style={{ color: '#9fb7d8' }}>This app tracks costs for food, supplies, vet visits and toys. Use chores to earn money. Try to keep a small emergency fund for vet visits (e.g., $25).</p>
            </div>

          </section>
        </main>

      </div>
    </div>
  );
}

// Small subcomponent for stat row
function Stat({ label, val, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 90 }}>{label}</div>
      <div style={{ flex: 1, background: '#0b2230', borderRadius: 8, height: 12, overflow: 'hidden' }}>
        <div style={{ width: `${val}%`, height: '100%', background: color }}></div>
      </div>
      <div style={{ width: 40, textAlign: 'right' }}>{Math.round(val)}</div>
    </div>
  );
}

const btnStyle = {
  background: '#1466ff',
  border: 'none',
  padding: '8px 12px',
  borderRadius: 8,
  color: 'white',
  cursor: 'pointer'
};
