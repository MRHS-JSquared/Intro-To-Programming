'use client';

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// --------------------------
// Types
// --------------------------
type Expense = {
  label: string;
  amount: number;
  date: string;
};

type PetType = "dog" | "cat" | "rabbit" | "other";

export default function VirtualPetPage() {
  // Pet profile
  const [name, setName] = useState("Fluffy");
  const [type, setType] = useState<PetType>("dog");
  const [created, setCreated] = useState(false);

  // Stats
  const [hunger, setHunger] = useState(50);
  const [happiness, setHappiness] = useState(70);
  const [health, setHealth] = useState(90);
  const [cleanliness, setCleanliness] = useState(80);
  const [energy, setEnergy] = useState(75);

  // Money & expenses
  const [money, setMoney] = useState(50);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // UI
  const [message, setMessage] = useState("Welcome! Create your pet to begin.");

  // 3D refs
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const petMeshRef = useRef<THREE.Mesh | null>(null);
  const animRef = useRef({ mixer: null as THREE.AnimationMixer | null, clock: null as THREE.Clock | null });

  // Save/load
  useEffect(() => {
    const saved = localStorage.getItem("virtual-pet-v1");
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
      setMessage("Loaded your saved pet.");
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
    localStorage.setItem("virtual-pet-v1", JSON.stringify(save));
  }, [name, type, created, hunger, happiness, health, cleanliness, energy, money, expenses]);

  // Time decay
  useEffect(() => {
    const interval = setInterval(() => {
      setHunger((h) => clamp(h + 3, 0, 100));
      setHappiness((h) => clamp(h - 2, 0, 100));
      setCleanliness((c) => clamp(c - 1.5, 0, 100));
      setEnergy((e) => clamp(e - 2.5, 0, 100));

      setHealth((prev) => {
        let h = prev;
        if (hunger > 90 || cleanliness < 10) h = clamp(h - 4, 0, 100);
        else if (happiness > 80 && cleanliness > 50) h = clamp(h + 1, 0, 100);
        return h;
      });

      evaluateMood();
    }, 10000);
    return () => clearInterval(interval);
  }, [hunger, happiness, cleanliness, energy]);

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
    const cost = 5;
    if (money < cost) return setMessage("You need more money for food.");
    setMoney((m) => m - cost);
    addExpense("Food", cost);
    setHunger((h) => clamp(h - 25, 0, 100));
    setHappiness((h) => clamp(h + 8, 0, 100));
    setMessage(`${name} ate happily.`);
  }

  function play() {
    setHappiness((h) => clamp(h + 12, 0, 100));
    setEnergy((e) => clamp(e - 15, 0, 100));
    setMessage(`${name} had fun playing!`);
  }

  function rest() {
    setEnergy((e) => clamp(e + 30, 0, 100));
    setHappiness((h) => clamp(h + 4, 0, 100));
    setMessage(`${name} took a nap.`);
  }

  function cleanPet() {
    const cost = 3;
    if (money < cost) return setMessage("You need more money for cleaning supplies.");
    setMoney((m) => m - cost);
    addExpense("Cleaning supplies", cost);
    setCleanliness((c) => clamp(c + 30, 0, 100));
    setMessage(`${name} is now clean!`);
  }

  function vet() {
    const cost = 25;
    if (money < cost) return setMessage("You need more money for the vet.");
    setMoney((m) => m - cost);
    addExpense("Vet visit", cost);
    setHealth((h) => clamp(h + 40, 0, 100));
    setMessage(`${name} feels better after the checkup.`);
  }

  function buyToy() {
    const cost = 8;
    if (money < cost) return setMessage("You can't afford this toy.");
    setMoney((m) => m - cost);
    addExpense("Toy", cost);
    setHappiness((h) => clamp(h + 18, 0, 100));
    setMessage(`${name} loves the new toy!`);
  }

  function doChore() {
    const earn = Math.floor(Math.random() * 11) + 5;
    setMoney((m) => m + earn);
    setMessage(`You earned $${earn} from chores.`);
  }

  function addExpense(label: string, amount: number) {
    const entry: Expense = {
      label,
      amount,
      date: new Date().toISOString().slice(0, 19).replace("T", " "),
    };
    setExpenses((es) => [entry, ...es]);
  }

  // Helpers
  function clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v));
  }

  function petColorForType(t: PetType): number {
    switch (t) {
      case "dog":
        return 0xffb86b;
      case "cat":
        return 0xc790ff;
      case "rabbit":
        return 0x9be7ff;
      default:
        return 0x9aff9a;
    }
  }

  // 3D Scene
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
    scene.add(hem);

    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    // Room wireframe
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(3, 3, 3),
      new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.08 })
    );
    scene.add(room);

    // Pet cube
    const pet = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: petColorForType(type) })
    );
    pet.position.y = -0.5;
    petMeshRef.current = pet;
    scene.add(pet);

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({ color: 0x111217 })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1;
    scene.add(plane);

    function onResize() {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    }
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    animRef.current.clock = clock;
    let req = 0;

    function loop() {
      const delta = clock.getDelta();
      if (petMeshRef.current) {
        const speed = happiness > 60 && energy > 40 ? 1.5 : 0.3;
        petMeshRef.current.rotation.y += 0.5 * delta * speed;
      }
      renderer.render(scene, camera);
      req = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(req);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [type, happiness, energy]);

  // UI rendering (same as before)
  return (
    <div style={{ padding: 20, background: "#071023", minHeight: "100vh", color: "#e6eef8" }}>
      <h1>Virtual Pet</h1>

      {!created ? (
        <div>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value as PetType)}>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="rabbit">Rabbit</option>
            <option value="other">Other</option>
          </select>
          <button onClick={createPet}>Create Pet</button>
        </div>
      ) : (
        <div>
          <p>{message}</p>
          <div ref={mountRef} style={{ height: 400 }} />

          <button onClick={feed}>Feed ($5)</button>
          <button onClick={play}>Play</button>
          <button onClick={rest}>Rest</button>
          <button onClick={cleanPet}>Clean ($3)</button>
          <button onClick={vet}>Vet ($25)</button>
          <button onClick={buyToy}>Buy Toy ($8)</button>
          <button onClick={doChore}>Do Chore (earn)</button>

          <h3>Expenses</h3>
          <ul>
            {expenses.map((e, i) => (
              <li key={i}>
                {e.label} - ${e.amount} — {e.date}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
