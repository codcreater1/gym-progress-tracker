import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register ChartJS
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  Title, Tooltip, Legend, Filler, BarElement
);

// --- DATA CONFIGURATION ---
const FOOD_DB = {
  "chicken_breast": { cal: 165, protein: 31, icon: "🍗" },
  "white_rice": { cal: 130, protein: 2.7, icon: "🍚" },
  "egg": { cal: 155, protein: 13, icon: "🥚" },
  "oats": { cal: 389, protein: 16.9, icon: "🥣" },
  "beef": { cal: 250, protein: 26, icon: "🥩" },
  "tuna": { cal: 132, protein: 28, icon: "🐟" }
};

const EXERCISE_LIST = {
  Chest: { icon: "💪", exercises: ["Bench Press", "Incline DB Press"], color: "#ff4d4d" },
  Shoulders: { icon: "🔱", exercises: ["Overhead Press", "Lateral Raise"], color: "#fbbf24" },
  Back: { icon: "🦅", exercises: ["Lat Pulldown", "Seated Row"], color: "#3b82f6" },
  Legs: { icon: "🦵", exercises: ["Squat", "Leg Press"], color: "#a855f7" },
  Arms: { icon: "🐍", exercises: ["Barbell Curl", "Pushdown"], color: "#ec4899" },
  Abs: { icon: "🧱", exercises: ["Leg Raise", "Plank"], color: "#2dd4bf" }
};

// Epley formula: e1RM = weight * (1 + reps / 30)
const calcE1RM = (weight, reps) => Math.round(weight * (1 + reps / 30) * 10) / 10;

// Trend chart metrics
const TREND_METRICS = {
  e1rm: { label: 'Est. 1RM (kg)', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', getValue: e => e.e1rm },
  volume: { label: 'Volume (kg × reps)', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)', getValue: e => Math.round(e.weight * e.reps * 10) / 10 },
  weight: { label: 'Weight Lifted (kg)', color: '#f472b6', bg: 'rgba(244, 114, 182, 0.1)', getValue: e => e.weight },
};

// Migrate legacy lift entries (plain numbers) to { weight, reps, e1rm } objects
const migrateLifts = (raw) => {
  const out = {};
  Object.entries(raw || {}).forEach(([ex, entries]) => {
    out[ex] = entries.map(e =>
      typeof e === 'number' ? { weight: e, reps: 1, e1rm: e } : e
    );
  });
  return out;
};

const App = () => {
  const [activeTab, setActiveTab] = useState('workout');
  const [status, setStatus] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('e1rm');
  
  // --- PERSISTENT STATES ---
  const [weights, setWeights] = useState(() => JSON.parse(localStorage.getItem('proWeight')) || [80]);
  const [lifts, setLifts] = useState(() => migrateLifts(JSON.parse(localStorage.getItem('proLifts')) || {}));
  const [meals, setMeals] = useState(() => JSON.parse(localStorage.getItem('proMeals')) || []);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('proHistory')) || {});

  useEffect(() => {
    localStorage.setItem('proWeight', JSON.stringify(weights));
    localStorage.setItem('proLifts', JSON.stringify(lifts));
    localStorage.setItem('proMeals', JSON.stringify(meals));
    localStorage.setItem('proHistory', JSON.stringify(history));
  }, [weights, lifts, meals, history]);

  // --- ACTIONS ---
  const showToast = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(''), 2500);
  };

  const addWeight = (val) => {
    if (!val) return;
    setWeights([...weights, parseFloat(val)]);
    showToast("⚖️ Weight logged!");
  };

  const addLift = (ex, weightVal, repsVal, muscle) => {
    if (!weightVal) return;
    const numWeight = parseFloat(weightVal);
    const numReps = parseFloat(repsVal) || 1;
    const entry = { weight: numWeight, reps: numReps, e1rm: calcE1RM(numWeight, numReps) };
    const prev = lifts[ex] || [];
    setLifts({ ...lifts, [ex]: [...prev, entry] });
    if (!selectedExercise) setSelectedExercise(ex);
    
    // Auto-mark calendar
    const today = new Date().toISOString().split('T')[0];
    setHistory({ ...history, [today]: muscle });
    showToast(`🔥 ${ex} updated!`);
  };

  // --- CALENDAR RENDERER ---
  const renderCalendar = () => {
    const today = new Date();
    return Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (13 - i));
      const dateStr = d.toISOString().split('T')[0];
      const workout = history[dateStr];
      const color = workout ? EXERCISE_LIST[workout].color : '#222';
      
      return (
        <div key={dateStr} style={{
          minWidth: '40px', height: '55px', backgroundColor: workout ? `${color}20` : '#111',
          borderRadius: '10px', border: `1px solid ${workout ? color : '#333'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px'
        }}>
          <span style={{ fontSize: '0.65rem', color: '#666' }}>{d.getDate()}</span>
          {workout && <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#fff' }}>{workout[0]}</span>}
        </div>
      );
    });
  };

  return (
    <div style={containerStyle}>
      {status && <div style={toastStyle}>{status}</div>}

      {/* HEADER NAV */}
      <header style={headerStyle}>
        <h2 style={{ color: '#4ade80', margin: 0, fontSize: '1.5rem' }}>PRO<span style={{ color: '#fff' }}>TRACKER</span></h2>
        <div style={navGroup}>
          {['weight', 'workout', 'nutrition', 'analysis'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={t === activeTab ? activeBtn : navBtn}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* --- WORKOUT TAB --- */}
      {activeTab === 'workout' && (
        <>
          <div style={calendarBox}>
            <p style={labelStyle}>ACTIVITY HEATMAP (LAST 14 DAYS)</p>
            <div style={calendarGrid}>{renderCalendar()}</div>
          </div>
          <div style={mainGrid}>
            {Object.entries(EXERCISE_LIST).map(([muscle, data]) => (
              <div key={muscle} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <span style={{ color: data.color, fontSize: '1.2rem' }}>{data.icon}</span>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{muscle}</h3>
                </div>
                {data.exercises.map(ex => (
                  <div key={ex} style={exerciseRow}>
                    <span style={{ fontSize: '0.85rem', color: '#aaa' }}>{ex}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input id={`in-${ex}`} type="number" placeholder="kg" style={miniInput} />
                      <input id={`reps-${ex}`} type="number" placeholder="reps" style={miniInput} />
                      <button onClick={() => addLift(ex, document.getElementById(`in-${ex}`).value, document.getElementById(`reps-${ex}`).value, muscle)} style={addBtnStyle(data.color)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* --- WEIGHT TAB --- */}
      {activeTab === 'weight' && (
        <div style={fullCard}>
          <h3 style={{marginTop: 0}}>Body Weight Tracker</h3>
          <div style={{ height: '300px' }}>
            <Line data={{ labels: weights.map((_, i) => i), datasets: [{ label: 'kg', data: weights, borderColor: '#4ade80', tension: 0.4, fill: true, backgroundColor: 'rgba(74, 222, 128, 0.1)' }] }} options={{ maintainAspectRatio: false }} />
          </div>
          <div style={inputGroup}>
            <input id="wIn" type="number" placeholder="Enter weight (kg)..." style={fullInput} />
            <button onClick={() => addWeight(document.getElementById('wIn').value)} style={btnPrimary}>LOG WEIGHT</button>
          </div>
        </div>
      )}

      {/* --- NUTRITION TAB --- */}
      {activeTab === 'nutrition' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={fullCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Daily Nutrition</h3>
              <span style={calorieBadge}>{meals.reduce((a, b) => a + Number(b.cal), 0)} kcal</span>
            </div>
            <div style={inputGroup}>
              <select id="fSel" style={fullInput}>
                {Object.keys(FOOD_DB).map(f => <option key={f} value={f}>{f.replace('_', ' ').toUpperCase()}</option>)}
              </select>
              <input id="gIn" type="number" placeholder="Grams" style={fullInput} />
              <button onClick={() => {
                const f = document.getElementById('fSel').value;
                const g = document.getElementById('gIn').value;
                if(!g) return;
                const food = FOOD_DB[f];
                setMeals([...meals, { id: Date.now(), name: f, cal: Math.round(food.cal * (g / 100)), icon: food.icon }]);
                showToast("🍎 Meal Added!");
              }} style={btnPrimary}>ADD</button>
            </div>
          </div>
          <div style={mainGrid}>
            {meals.slice(-6).reverse().map(m => (
              <div key={m.id} style={mealCard}>
                <span style={{fontSize: '1.5rem'}}>{m.icon}</span>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: 'bold', fontSize: '0.9rem'}}>{m.name.replace('_', ' ').toUpperCase()}</div>
                  <div style={{fontSize: '0.8rem', color: '#4ade80'}}>{m.cal} kcal</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ANALYSIS TAB --- */}
      {activeTab === 'analysis' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={fullCard}>
            <h3 style={{marginTop: 0}}>Strength Performance (Max Lifts)</h3>
            <div style={{ height: '350px' }}>
              <Bar data={{ labels: Object.keys(lifts), datasets: [{ label: 'Max Weight (kg)', data: Object.values(lifts).map(l => Math.max(...l.map(e => e.weight), 0)), backgroundColor: '#4ade80', borderRadius: 8 }] }} options={{ maintainAspectRatio: false }} />
            </div>
          </div>

          <div style={fullCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0 }}>Performance Trend</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <select value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)} style={{ ...fullInput, flex: 'none', width: 'auto' }}>
                  {Object.entries(TREND_METRICS).map(([key, m]) => <option key={key} value={key}>{m.label}</option>)}
                </select>
                {Object.keys(lifts).length > 0 && (
                  <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} style={{ ...fullInput, flex: 'none', width: 'auto' }}>
                    {Object.keys(lifts).map(ex => <option key={ex} value={ex}>{ex}</option>)}
                  </select>
                )}
              </div>
            </div>
            {selectedExercise && lifts[selectedExercise]?.length > 0 ? (
              <div style={{ height: '300px' }}>
                <Line
                  data={{
                    labels: lifts[selectedExercise].map((_, i) => `#${i + 1}`),
                    datasets: [{
                      label: `${selectedExercise} — ${TREND_METRICS[selectedMetric].label}`,
                      data: lifts[selectedExercise].map(TREND_METRICS[selectedMetric].getValue),
                      borderColor: TREND_METRICS[selectedMetric].color,
                      tension: 0.4,
                      fill: true,
                      backgroundColor: TREND_METRICS[selectedMetric].bg
                    }]
                  }}
                  options={{ maintainAspectRatio: false }}
                />
              </div>
            ) : (
              <p style={{ color: '#555', fontSize: '0.85rem' }}>Log a lift with weight + reps on the Workout tab to see its 1RM trend here.</p>
            )}
          </div>

          <button onClick={() => { if(window.confirm("Reset all data?")) { localStorage.clear(); window.location.reload(); } }} style={dangerBtn}>PURGE DATABASE</button>
        </div>
      )}
    </div>
  );
};

// --- STYLES ---
const containerStyle = { minHeight: '100vh', backgroundColor: '#050505', color: '#fff', padding: '20px 5%', fontFamily: 'Inter, system-ui, sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' };
const navGroup = { display: 'flex', gap: '5px', background: '#111', padding: '5px', borderRadius: '14px' };
const navBtn = { background: 'none', border: 'none', color: '#555', fontWeight: 'bold', padding: '10px 18px', cursor: 'pointer', fontSize: '0.75rem', borderRadius: '10px', transition: '0.3s' };
const activeBtn = { ...navBtn, color: '#fff', background: '#252525' };

const calendarBox = { background: '#111', padding: '20px', borderRadius: '24px', marginBottom: '25px', border: '1px solid #222' };
const labelStyle = { margin: '0 0 15px 0', fontSize: '0.7rem', color: '#555', textAlign: 'center', fontWeight: 'bold', letterSpacing: '1px' };
const calendarGrid = { display: 'flex', gap: '10px', justifyContent: 'center', overflowX: 'auto', paddingBottom: '5px' };

const mainGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' };
const cardStyle = { background: '#111', padding: '25px', borderRadius: '24px', border: '1px solid #222' };
const exerciseRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#181818', padding: '12px 18px', borderRadius: '16px', marginBottom: '10px', border: '1px solid #252525' };
const miniInput = { width: '42px', padding: '8px 4px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem' };
const addBtnStyle = (color) => ({ background: color, border: 'none', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', color: '#000' });

const fullCard = { background: '#111', padding: '30px', borderRadius: '24px', border: '1px solid #222' };
const inputGroup = { display: 'flex', gap: '12px', marginTop: '25px', flexWrap: 'wrap' };
const fullInput = { flex: 1, padding: '12px 15px', background: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '12px', outline: 'none' };
const btnPrimary = { background: '#4ade80', color: '#000', border: 'none', padding: '12px 25px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' };
const calorieBadge = { background: '#4ade80', color: '#000', padding: '6px 15px', borderRadius: '10px', fontWeight: '900', fontSize: '0.9rem' };
const mealCard = { display: 'flex', alignItems: 'center', gap: '15px', background: '#111', padding: '20px', borderRadius: '20px', border: '1px solid #222' };

const dangerBtn = { marginTop: '30px', width: '100%', padding: '12px', background: 'none', border: '1px solid #ff4d4d', color: '#ff4d4d', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' };
const toastStyle = { position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: '#4ade80', color: '#000', padding: '12px 30px', borderRadius: '50px', fontWeight: 'bold', zIndex: 1000, boxShadow: '0 10px 40px rgba(74, 222, 128, 0.3)' };

export default App;