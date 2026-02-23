import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  Zap, 
  Activity, 
  Thermometer, 
  Settings, 
  Terminal, 
  Wifi, 
  Usb, 
  Power, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  BrainCircuit, 
  ShieldCheck, 
  History,
  ChevronRight,
  X,
  Play,
  Square,
  Search,
  MessageSquare,
  Code2,
  FileCode,
  UploadCloud,
  Check,
  Menu,
  Info,
  Sun,
  Moon,
  Palette,
  Lightbulb,
  HelpCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism-tomorrow.css';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type ArduinoBoard = 'Uno' | 'Mega 2560' | 'Nano' | 'ESP32' | 'ESP8266' | 'Leonardo' | 'Micro';
type ConnectionStatus = 'Disconnected' | 'Connecting' | 'Connected' | 'Error';

interface TelemetryData {
  time: number;
  voltage: number;
  current: number;
  temp: number;
}

// --- Constants ---
const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 250000];
const PORTS = ['COM1', 'COM3', 'COM4', '/dev/ttyUSB0', '/dev/ttyACM0'];

export default function App() {
  // --- State ---
  const [board, setBoard] = useState<ArduinoBoard>('Uno');
  const [baudRate, setBaudRate] = useState(115200);
  const [port, setPort] = useState('COM3');
  const [status, setStatus] = useState<ConnectionStatus>('Disconnected');
  const [showConnectPopup, setShowConnectPopup] = useState(false);
  const [isBoardDetected, setIsBoardDetected] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);
  const [cpuTemp, setCpuTemp] = useState(32.4);
  const [clockSpeed, setClockSpeed] = useState(16);
  const [voltage, setVoltage] = useState(5.0);
  const [current, setCurrent] = useState(45.2);
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info' | 'warn' | 'error'}[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [alerts, setAlerts] = useState<{id: string, msg: string, type: 'warn' | 'error'}[]>([]);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'editor'>('telemetry');
  const [code, setCode] = useState(`void setup() {
  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);
}

// the loop function runs over and over again forever
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(1000);                       // wait for a second
  digitalWrite(LED_BUILTIN, LOW);    // turn the LED off by making the voltage LOW
  delay(1000);                       // wait for a second
  Serial.println("Pulse...");
}`);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'white' | 'blue'>('dark');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);

  // --- Hardware Detection Simulation ---
  useEffect(() => {
    // Simulate a board being plugged in after 5 seconds for demo purposes
    // In a real app, this would use navigator.serial.addEventListener('connect', ...)
    const detectionTimeout = setTimeout(() => {
      if (status === 'Disconnected' && !isBoardDetected) {
        setIsBoardDetected(true);
        addLog("Hardware Event: New USB Device Detected", 'info');
      }
    }, 5000);

    return () => clearTimeout(detectionTimeout);
  }, [status, isBoardDetected]);

  // --- AI Logic ---
  const analyzeHealth = async () => {
    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      addLog("AI Diagnostic: API Key missing. Set GEMINI_API_KEY in environment.", 'warn');
      return;
    }
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this Arduino ${board} telemetry: 
        Voltage: ${voltage}V, 
        Current: ${current}mA, 
        Temp: ${cpuTemp}°C. 
        Is it healthy? Give a very brief technical summary and one recommendation.`,
      });
      const response = await model;
      setAiAnalysis(response.text || "Analysis unavailable.");
    } catch (err) {
      setAiAnalysis("AI Diagnostic failed. Check API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Simulation Logic ---
  useEffect(() => {
    if (status !== 'Connected') return;

    const interval = setInterval(() => {
      // Simulate values with occasional anomalies
      const isAnomaly = Math.random() > 0.95;
      
      const newVoltage = isAnomaly && Math.random() > 0.5 
        ? 4.5 + Math.random() * 0.2  // Voltage drop
        : 4.95 + Math.random() * 0.1;
        
      const newCurrent = 40 + Math.random() * 10;
      
      const newTemp = isAnomaly && Math.random() > 0.5
        ? 45 + Math.random() * 10    // High temp
        : 30 + Math.random() * 5;

      setVoltage(newVoltage);
      setCurrent(newCurrent);
      setCpuTemp(newTemp);

      // Check for alerts
      if (newVoltage < 4.7) {
        triggerAlert('CRITICAL_VOLTAGE', `Voltage Drop Detected: ${newVoltage.toFixed(2)}V`, 'error');
      }
      if (newTemp > 40) {
        triggerAlert('HIGH_TEMP', `High CPU Temperature: ${newTemp.toFixed(1)}°C`, 'warn');
      }

      setTelemetry(prev => {
        const newData = [...prev, {
          time: prev.length,
          voltage: newVoltage,
          current: newCurrent,
          temp: newTemp
        }].slice(-30);
        return newData;
      });

      // Random logs
      if (Math.random() > 0.8) {
        const msgs = [
          "Serial buffer cleared",
          "Analog read pin A0: 512",
          "Digital write pin 13: HIGH",
          "I2C scan: 0x3C found",
          "Watchdog timer reset"
        ];
        addLog(msgs[Math.floor(Math.random() * msgs.length)], 'info');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, board]);

  const addLog = (msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }].slice(-50));
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 10);
  };

  const handleConnect = () => {
    setIsBoardDetected(false);
    setStatus('Connecting');
    setConnectionAttempt(1);
    setConnectionError(null);
    addLog(`Initializing connection to ${board} on ${port}...`, 'info');
    
    // Simulate connection attempts
    const runAttempt = (attempt: number) => {
      setConnectionAttempt(attempt);
      addLog(`Connection attempt ${attempt}/3...`, 'info');
      
      setTimeout(() => {
        // Simulate a 30% chance of failure for the first two attempts
        const failed = attempt < 3 && Math.random() > 0.7;
        
        if (failed) {
          addLog(`Attempt ${attempt} failed: Handshake timeout.`, 'error');
          if (attempt < 3) {
            addLog(`Retrying in 1.5s...`, 'warn');
            setTimeout(() => runAttempt(attempt + 1), 1500);
          } else {
            setStatus('Error');
            setConnectionError("Failed to establish link after 3 attempts.");
            triggerAlert('CONN_FAILED', 'Connection Failed: Handshake Timeout', 'error');
          }
        } else {
          // Success
          setStatus('Connected');
          setShowConnectPopup(true);
          addLog(`Connected successfully at ${baudRate} baud.`, 'info');
          addLog(`Firmware version 2.4.1 detected.`, 'info');
          
          if (board === 'Uno' || board === 'Nano') setClockSpeed(16);
          else if (board === 'Mega 2560') setClockSpeed(16);
          else if (board === 'ESP32') setClockSpeed(240);
          else if (board === 'ESP8266') setClockSpeed(80);
          
          analyzeHealth();
        }
      }, 1500);
    };

    runAttempt(1);
  };

  const handleDisconnect = () => {
    setStatus('Disconnected');
    setIsBoardDetected(false);
    setConnectionAttempt(0);
    setConnectionError(null);
    addLog("Connection terminated by user.", 'warn');
    setTelemetry([]);
    setAlerts([]);
  };

  const triggerAlert = (id: string, msg: string, type: 'warn' | 'error') => {
    setAlerts(prev => {
      if (prev.find(a => a.id === id)) return prev;
      addLog(msg, type);
      return [...prev, { id, msg, type }];
    });

    // Auto-remove alert after 5 seconds if it's a warning
    if (type === 'warn') {
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }, 5000);
    }
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleCompile = () => {
    setIsCompiling(true);
    setCompileProgress(0);
    addLog("Starting compilation...", 'info');
    
    const interval = setInterval(() => {
      setCompileProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCompiling(false);
          addLog("Compilation successful. Binary size: 42.1 KB", 'info');
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  const handleUpload = () => {
    if (status !== 'Connected') {
      triggerAlert('NOT_CONNECTED', 'Connect a board before uploading.', 'warn');
      return;
    }
    setIsUploading(true);
    setCompileProgress(0);
    addLog("Uploading to board...", 'info');
    
    const interval = setInterval(() => {
      setCompileProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          addLog("Upload complete. Resetting board...", 'info');
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // --- Components ---
  const MenuDrawer = () => (
    <AnimatePresence>
      {isMenuOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
          />
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="fixed top-0 left-0 h-full w-80 hardware-card rounded-none border-y-0 border-l-0 z-[160] p-6 flex flex-col gap-8 shadow-[20px_0_50px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tighter text-white">SYSTEM MENU</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Palette className="w-3 h-3" /> Appearance
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'dark', label: 'Dark Monitor', icon: Moon, color: 'bg-slate-900' },
                    { id: 'white', label: 'Light Console', icon: Sun, color: 'bg-slate-100' },
                    { id: 'blue', label: 'Deep Blue', icon: Palette, color: 'bg-blue-900' }
                  ].map((t) => (
                    <button 
                      key={t.id}
                      onClick={() => setTheme(t.id as any)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded border transition-all",
                        theme === t.id ? "border-arduino-teal bg-arduino-teal/10" : "border-white/5 hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-4 h-4 rounded-full", t.color)} />
                        <span className="text-xs font-bold">{t.label}</span>
                      </div>
                      {theme === t.id && <Check className="w-3 h-3 text-arduino-teal" />}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Usb className="w-3 h-3" /> Hardware Simulation
                </h3>
                <button 
                  onClick={() => {
                    setIsBoardDetected(true);
                    setIsMenuOpen(false);
                    addLog("Manual Simulation: Board Connected", 'info');
                  }}
                  disabled={status !== 'Disconnected'}
                  className="w-full py-3 bg-white/5 border border-white/10 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-30"
                >
                  Simulate USB Connection
                </button>
              </section>

              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <HelpCircle className="w-3 h-3" /> About Pulse Console
                </h3>
                <div className="space-y-3 text-[11px] text-slate-400 leading-relaxed">
                  <p>
                    <strong className="text-white">How to use:</strong> Connect your Arduino via USB, select the correct board and port, then initialize the link to start real-time monitoring.
                  </p>
                  <p>
                    <strong className="text-white">AI Diagnostics:</strong> The built-in AI analyzes telemetry data to detect potential hardware failures before they happen.
                  </p>
                  <div className="p-3 bg-white/5 rounded border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-arduino-teal font-bold">
                      <Lightbulb className="w-3 h-3" />
                      <span>Pro Tips</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 opacity-80">
                      <li>Use the Sketch Editor to verify code offline.</li>
                      <li>High CPU temperature usually indicates a short circuit.</li>
                      <li>Check baud rate if serial data is garbled.</li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <span>Version</span>
                <span className="text-white">4.0.2-stable</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <span>Developer</span>
                <span className="text-arduino-teal">Dasmat Hansda</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const Metric = ({ icon: Icon, label, value, unit, color }: any) => (
    <div className="hardware-card p-4 flex flex-col gap-2 relative overflow-hidden group">
      <div className="flex items-center justify-between z-10">
        <div className={cn("p-2 rounded-lg bg-opacity-10", color)}>
          <Icon className={cn("w-5 h-5", color.replace('bg-', 'text-'))} />
        </div>
        <span className="text-[10px] font-mono opacity-30 uppercase tracking-widest">Real-time</span>
      </div>
      <div className="z-10">
        <div className="text-2xl font-mono font-bold glow-text-cyan flex items-baseline gap-1">
          {typeof value === 'number' ? value.toFixed(1) : value}
          <span className="text-xs font-medium opacity-50">{unit}</span>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">{label}</div>
      </div>
      <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-16 h-16" />
      </div>
    </div>
  );

  return (
    <div className={cn(
      "min-h-screen p-4 md:p-8 font-mono relative",
      theme === 'white' && "theme-white",
      theme === 'blue' && "theme-blue"
    )}>
      <div className="scanline" />
      <div className="crt-overlay fixed inset-0 pointer-events-none z-50" />

      {/* Alert System */}
      <div className="fixed top-6 right-6 z-[60] space-y-3 w-80 pointer-events-none">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={cn(
                "pointer-events-auto hardware-card p-4 border-l-4 flex items-start gap-3 shadow-2xl",
                alert.type === 'error' ? "border-l-red-500 bg-red-500/10" : "border-l-amber-500 bg-amber-500/10"
              )}
            >
              <AlertCircle className={cn("w-5 h-5 shrink-0 mt-0.5", alert.type === 'error' ? "text-red-500" : "text-amber-500")} />
              <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">
                  {alert.type === 'error' ? 'Critical Alert' : 'System Warning'}
                </div>
                <div className="text-xs font-bold text-white leading-tight">{alert.msg}</div>
              </div>
              <button 
                onClick={() => removeAlert(alert.id)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <MenuDrawer />

      {/* Hardware Detection Popup */}
      <AnimatePresence>
        {isBoardDetected && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-none"
          >
            <div className="hardware-card p-4 border-arduino-teal/50 bg-arduino-teal/10 shadow-[0_0_30px_rgba(0,135,143,0.3)] flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-arduino-teal rounded flex items-center justify-center animate-pulse">
                  <Usb className="text-white w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-arduino-teal">Hardware Detected</div>
                  <div className="text-xs font-bold text-white">Arduino {board} on {port}</div>
                </div>
              </div>
              <button 
                onClick={handleConnect}
                className="px-4 py-2 bg-arduino-teal text-white rounded text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all"
              >
                Initialize Link
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
            >
              <Menu className="w-6 h-6 text-slate-500 group-hover:text-arduino-teal transition-colors" />
            </button>
            <div className="w-12 h-12 bg-arduino-teal rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(0,135,143,0.4)]">
              <Cpu className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
                ARDUINO PULSE CONSOLE <span className="text-[10px] font-normal opacity-40">v4.0.2</span>
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
                  status === 'Connected' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                  status === 'Connecting' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : 
                  status === 'Error' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                  "bg-slate-500/10 text-slate-500 border border-white/5"
                )}>
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full", 
                    status === 'Connected' ? "bg-emerald-400 animate-pulse" : 
                    status === 'Connecting' ? "bg-amber-400 animate-bounce" :
                    status === 'Error' ? "bg-red-400" : "bg-slate-500"
                  )} />
                  {status === 'Connecting' ? `Connecting (Attempt ${connectionAttempt}/3)` : status}
                </div>
                {connectionError && (
                  <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest animate-pulse">
                    Error: {connectionError}
                  </span>
                )}
                <span className="text-[9px] opacity-40 uppercase tracking-widest">System: {board} @ {port}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {status === 'Connected' ? (
              <button 
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:bg-red-500/20 transition-all text-xs font-bold uppercase tracking-widest"
              >
                <Power className="w-4 h-4" /> Disconnect
              </button>
            ) : (
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 animate-pulse">
                Awaiting Hardware...
              </div>
            )}
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Config & Metrics */}
          <div className="lg:col-span-4 space-y-6">
            {/* Config Panel */}
            <section className="hardware-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Configuration
                </h2>
                <ShieldCheck className="w-4 h-4 text-arduino-teal opacity-50" />
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Board Type</label>
                  <select 
                    value={board}
                    onChange={(e) => setBoard(e.target.value as ArduinoBoard)}
                    className="w-full bg-monitor-black border border-white/10 rounded px-3 py-2 text-xs focus:border-arduino-teal outline-none transition-colors"
                  >
                    {['Uno', 'Mega 2560', 'Nano', 'ESP32', 'ESP8266', 'Leonardo', 'Micro'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Port</label>
                    <select 
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="w-full bg-monitor-black border border-white/10 rounded px-3 py-2 text-xs focus:border-arduino-teal outline-none transition-colors"
                    >
                      {PORTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Baud Rate</label>
                    <select 
                      value={baudRate}
                      onChange={(e) => setBaudRate(parseInt(e.target.value))}
                      className="w-full bg-monitor-black border border-white/10 rounded px-3 py-2 text-xs focus:border-arduino-teal outline-none transition-colors"
                    >
                      {BAUD_RATES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 py-2 bg-white/5 rounded text-[10px] font-bold uppercase hover:bg-white/10 transition-colors">
                  <Terminal className="w-3 h-3" /> Serial Mon
                </button>
                <button className="flex items-center justify-center gap-2 py-2 bg-white/5 rounded text-[10px] font-bold uppercase hover:bg-white/10 transition-colors">
                  <Wifi className="w-3 h-3" /> OTA Update
                </button>
              </div>
            </section>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Metric icon={Zap} label="Voltage" value={voltage} unit="V" color="bg-amber-500" />
              <Metric icon={Activity} label="Current" value={current} unit="mA" color="bg-arduino-teal" />
              <Metric icon={Thermometer} label="CPU Temp" value={cpuTemp} unit="°C" color="bg-red-500" />
              <Metric icon={Cpu} label="Clock Speed" value={clockSpeed} unit="MHz" color="bg-blue-500" />
            </div>

            {/* AI Diagnostics */}
            <section className="hardware-card p-6 border-arduino-teal/20 bg-arduino-teal/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-arduino-teal flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" /> AI Diagnostics
                </h2>
                {isAnalyzing && <RefreshCw className="w-3 h-3 animate-spin text-arduino-teal" />}
              </div>
              
              <div className="min-h-[80px] text-[11px] leading-relaxed text-slate-400 italic">
                {status === 'Connected' ? (
                  aiAnalysis || "Awaiting telemetry for analysis..."
                ) : (
                  "Connect board to initialize AI health monitoring."
                )}
              </div>

              {status === 'Connected' && (
                <button 
                  onClick={analyzeHealth}
                  disabled={isAnalyzing}
                  className="mt-4 w-full py-2 bg-arduino-teal/20 text-arduino-teal border border-arduino-teal/30 rounded text-[10px] font-bold uppercase hover:bg-arduino-teal/30 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-3 h-3" /> Refresh Analysis
                </button>
              )}
            </section>
          </div>

          {/* Right Column - Charts & Terminal */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tab Switcher */}
            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg w-fit">
              <button 
                onClick={() => setActiveTab('telemetry')}
                className={cn(
                  "px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === 'telemetry' ? "bg-arduino-teal text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Activity className="w-3 h-3" /> Telemetry
              </button>
              <button 
                onClick={() => setActiveTab('editor')}
                className={cn(
                  "px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === 'editor' ? "bg-arduino-teal text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <FileCode className="w-3 h-3" /> Sketch Editor
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'telemetry' ? (
                <motion.section 
                  key="telemetry"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="hardware-card p-6 h-[350px] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-sm font-bold text-white">Telemetry Stream</h2>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Voltage & Current Analysis</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-arduino-teal" />
                        <span className="text-[9px] font-bold opacity-50 uppercase">Current</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-glow-cyan" />
                        <span className="text-[9px] font-bold opacity-50 uppercase">Voltage</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={telemetry}>
                        <defs>
                          <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#00f2ff" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00878f" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#00878f" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                        <XAxis dataKey="time" hide />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="voltage" 
                          stroke="#00f2ff" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorV)" 
                          isAnimationActive={false}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="current" 
                          stroke="#00878f" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorC)" 
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.section>
              ) : (
                <motion.section 
                  key="editor"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="hardware-card flex flex-col h-[350px] overflow-hidden"
                >
                  <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-3 h-3 text-arduino-teal" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">sketch_feb22a.ino</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleCompile}
                        disabled={isCompiling || isUploading}
                        className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-[9px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        {isCompiling ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
                        Verify
                      </button>
                      <button 
                        onClick={handleUpload}
                        disabled={isCompiling || isUploading}
                        className="flex items-center gap-1.5 px-3 py-1 bg-arduino-teal/20 text-arduino-teal hover:bg-arduino-teal/30 rounded text-[9px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        {isUploading ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <UploadCloud className="w-2.5 h-2.5" />}
                        Upload
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto bg-monitor-black/50 relative group">
                    <Editor
                      value={code}
                      onValueChange={setCode}
                      highlight={code => Prism.highlight(code, Prism.languages.cpp, 'cpp')}
                      padding={20}
                      className="font-mono text-xs min-h-full"
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: 12,
                      }}
                    />
                    
                    {(isCompiling || isUploading) && (
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${compileProgress}%` }}
                          className="h-full bg-arduino-teal shadow-[0_0_10px_rgba(0,135,143,0.5)]"
                        />
                      </div>
                    )}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Terminal Console */}
            <section className="hardware-card flex flex-col h-[300px] overflow-hidden">
              <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">System Console</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setLogs([])} className="p-1 hover:bg-white/10 rounded transition-colors">
                    <X className="w-3 h-3 text-slate-500" />
                  </button>
                </div>
              </div>
              <div 
                ref={terminalRef}
                className="flex-1 p-4 overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-thin scrollbar-thumb-white/10"
              >
                {logs.length === 0 ? (
                  <div className="text-slate-600 italic">Console idle. Awaiting board connection...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      <span className="text-slate-600 shrink-0">[{log.time}]</span>
                      <span className={cn(
                        "break-all",
                        log.type === 'error' ? "text-red-400" : 
                        log.type === 'warn' ? "text-amber-400" : "text-emerald-400"
                      )}>
                        {log.type === 'error' ? 'ERR!' : log.type === 'warn' ? 'WRN:' : 'INF>'} {log.msg}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="bg-monitor-black p-2 flex items-center gap-2 border-t border-white/5">
                <ChevronRight className="w-3 h-3 text-arduino-teal" />
                <input 
                  type="text" 
                  placeholder="Enter serial command..."
                  className="bg-transparent border-none outline-none text-[11px] text-white w-full placeholder:text-slate-700"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      addLog(`CMD: ${e.currentTarget.value}`, 'info');
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><History className="w-3 h-3" /> Uptime: 00:12:45</span>
            <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> CRC Errors: 0</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-arduino-teal transition-colors">Schematics</a>
            <a href="#" className="hover:text-arduino-teal transition-colors">API Docs</a>
            <a href="#" className="hover:text-arduino-teal transition-colors">GitHub</a>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Link Stable
          </div>
        </footer>
      </div>

      {/* Connection Popup */}
      <AnimatePresence>
        {showConnectPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-monitor-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="hardware-card max-w-sm w-full p-8 border-arduino-teal/50 shadow-[0_0_50px_rgba(0,135,143,0.2)] text-center relative overflow-hidden"
            >
              <div className="scanline" />
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-arduino-teal/20 rounded-full flex items-center justify-center animate-pulse">
                  <CheckCircle2 className="w-10 h-10 text-arduino-teal" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tighter uppercase">Link Established</h3>
              <p className="text-[11px] text-slate-400 mb-8 uppercase tracking-widest leading-relaxed">
                Arduino {board} detected on {port}.<br />
                Handshake complete. Telemetry stream active.
              </p>
              <button 
                onClick={() => setShowConnectPopup(false)}
                className="w-full py-3 bg-arduino-teal text-white rounded font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,135,143,0.3)]"
              >
                Access Console
              </button>
              
              <div className="absolute top-2 right-2">
                <button onClick={() => setShowConnectPopup(false)} className="p-1 hover:bg-white/5 rounded">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
