import { CURRICULUM } from "./curriculum";
import { advancedLessons } from "./data-advanced";
import { intermediateLessons } from "./data-intermediate";
import type { Lesson, LessonComponent } from "./types";

const RED = "#c62828", BLACK = "#22252a", YELLOW = "#d9a400", GREEN = "#2e8b57";

const battery: LessonComponent = {
  ref: "B1", kind: "battery", name: "Battery holder, 2×AA, with leads", value: "3.0 V", pins: { pos: "top+:0", neg: "top-:0" },
};
const wire = (ref: string, a: string, b: string, color: string, value: string, extra: Partial<LessonComponent> = {}): LessonComponent => ({
  ref, kind: "wire", name: `Jumper wire, ${color === RED ? "red" : color === BLACK ? "black" : color === YELLOW ? "yellow" : "green"}`,
  value, pins: { a, b }, color, ...extra,
});
const led = (anode: string, cathode: string): LessonComponent => ({
  ref: "D1", kind: "led", name: "LED, 5 mm, red", value: "Vf ≈ 2.0 V, 20 mA max", pins: { anode, cathode },
});
const res = (ref: string, a: string, b: string, ohms: number, value: string): LessonComponent => ({
  ref, kind: "resistor", name: "Resistor, carbon film, 1/4 W", value, pins: { a, b }, ohms,
});
const button: LessonComponent = {
  ref: "SW1", kind: "pushbutton", name: "Tactile push button, 6×6 mm", value: "Normally open, momentary",
  pins: { a1: "e10", a2: "f10", b1: "e12", b2: "f12" },
};

const beginnerLessons: Lesson[] = [
  {
    id: "first-led",
    code: "P-01", level: "beginner", board: "breadboard",
    title: "Light up your first LED",
    tagline: "A battery, a resistor and an LED in one closed loop.",
    minutes: 5,
    playable: true,
    model: "series",
    freeBuild: true,
    application: { id: "headlight", title: "Car headlights", text: "Car headlights use LEDs too. A driver circuit sets the LED current: more current gives more light, but too much shortens the LED's life.", interaction: "Change the series resistor to adjust the LED current and watch the brightness change." },
    nextLessonId: "blinking-led",
    components: [
      battery,
      led("e10", "e13"),
      res("R1", "d13", "d20", 220, "220 Ω ±5%"),
      wire("W1", "top+:8", "a10", RED, "0.2 in"),
      wire("W2", "a20", "top-:16", BLACK, "0.3 in"),
    ],
    flow: ["B+", "top+:0", "top+:8", "a10", "e10", "e10^", "e13^", "e13", "d13", "d13^", "d20^", "d20", "a20", "top-:16", "top-:0", "B-"],
    schematic: {
      w: 340, h: 210, readout: [50, 198],
      symbols: [
        { ref: "B1", kind: "battery", x: 50, y: 106, rot: 90, label: [6, 104], text: ["B1", "3.0V"] },
        { ref: "D1", kind: "led", x: 160, y: 40, label: [140, 74], text: ["D1", "red LED"] },
        { ref: "R1", kind: "resistor", x: 290, y: 106, rot: 90, label: [306, 100], text: ["R1", "220Ω"] },
      ],
      wires: [
        { pts: [[50, 86], [50, 40], [140, 40]], ref: "W1" },
        { pts: [[180, 40], [290, 40], [290, 86]] },
        { pts: [[290, 126], [290, 172], [50, 172], [50, 126]], ref: "W2" },
      ],
    },
    summary: [["Supply (B1)", "3.0 V"], ["LED forward voltage (D1)", "2.0 V"], ["Series resistor (R1)", "220 Ω"], ["LED current", "4.5 mA"], ["LED rating", "20 mA max"]],
    steps: [
      {
        id: "parts", title: "Check your parts",
        text: "These five parts make one complete LED circuit, held together by the breadboard with no soldering.",
        detail: "Half-size breadboard: columns 1–30, rows a–j, two power rails on each long edge.",
        term: { word: "Breadboard", meaning: "a board with metal clips under the holes. Holes a–e in one column are connected; f–j are a separate group." },
        placed: [], focus: [],
      },
      {
        id: "led", title: "Insert the LED",
        text: "Push the LED into the board with the long leg on the left.",
        detail: "Long leg (anode, +) into e10, short leg (cathode, −) into e13. The flat edge on the LED marks the cathode.",
        term: { word: "LED", meaning: "light-emitting diode: a light that only conducts in one direction, from anode to cathode." },
        placed: ["D1"], focus: ["D1"],
      },
      {
        id: "resistor", title: "Add the resistor",
        text: "The resistor limits the current so the LED is not damaged.",
        detail: "R1 220 Ω leads into d13 and d20. Column 13 joins the LED cathode to R1. Bands: red-red-brown-gold.",
        term: { word: "Resistor", meaning: "a part that limits how much current can flow, measured in ohms (Ω)." },
        placed: ["D1", "R1"], focus: ["R1"],
      },
      {
        id: "wires", title: "Add the jumper wires",
        text: "Two short wires connect the circuit to the power rails along the top edge.",
        detail: "Red: top + rail → a10. Black: a20 → top − rail.",
        term: { word: "Power rail", meaning: "a long strip along the edge, connected end to end, that shares + or − with the whole board." },
        placed: ["D1", "R1", "W1", "W2"], focus: ["W1", "W2"],
      },
      {
        id: "battery", title: "Connect the battery",
        text: "Connect the battery leads to the rails to close the loop.",
        detail: "B1 red lead → top + rail, black lead → top − rail. 2 × 1.5 V AA in series = 3.0 V.",
        term: { word: "Circuit", meaning: "a closed loop that current can flow around, from + back to −." },
        placed: ["D1", "R1", "W1", "W2", "B1"], focus: ["B1"],
      },
      {
        id: "lit", title: "The LED lights up",
        text: "Current flows from +, through the LED and the resistor, and back to −.",
        detail: "I = (3.0 V − 2.0 V) / 220 Ω ≈ 4.5 mA, well under the 20 mA LED rating.",
        term: { word: "Current", meaning: "the amount of charge flowing per second, measured here in milliamps (mA)." },
        placed: ["D1", "R1", "W1", "W2", "B1"], focus: [], live: true,
      },
      { id: "headlights", title: "Real-world application: car headlights", text: "The same circuit lights a car's headlights: a battery, a part that limits current, and LEDs.", detail: "Car: 12 V battery, LED driver sets ≈ 350–1000 mA per LED module. Lab: 3.0 V, R1 limits the current to a few mA.", term: { word: "LED driver", meaning: "an electronic circuit that keeps LED current constant, doing the job of R1 more efficiently." }, placed: ["D1", "R1", "W1", "W2", "B1"], focus: [], live: true, scene: "application" },
    ],
  },
  {
    id: "blinking-led",
    code: "P-02", level: "beginner", board: "breadboard",
    title: "Blinking LED",
    tagline: "A 555 timer switches an LED on and off about once per second.",
    minutes: 15,
    playable: true,
    model: "astable555",
    application: { id: "beacon", title: "Emergency warning lights", text: "Road-work beacons and hazard lights use a timer just like U1 to flash a lamp at a steady rate so drivers notice it.", interaction: "Change R2 to set how fast the beacon flashes." },
    nextLessonId: "push-button",
    components: [
      battery,
      { ref: "U1", kind: "ic_dip8", name: "CMOS 555 timer, DIP-8", value: "TLC555, 2–15 V", marking: "TLC555",
        pins: { "1": "f15", "2": "f16", "3": "f17", "4": "f18", "5": "e18", "6": "e17", "7": "e16", "8": "e15" } },
      res("R1", "c12", "c16", 10_000, "10 kΩ ±5%"),
      res("R2", "d16", "d21", 68_000, "68 kΩ ±5%"),
      { ref: "C1", kind: "capacitor_electrolytic", name: "Electrolytic capacitor, radial", value: "10 µF, 16 V", pins: { pos: "i16", neg: "i15" }, farads: 10e-6 },
      { ref: "C2", kind: "capacitor_ceramic", name: "Ceramic disc capacitor", value: "10 nF (103)", pins: { a: "a18", b: "a19" }, farads: 10e-9 },
      res("R3", "g17", "g22", 220, "220 Ω ±5%"),
      led("h22", "h23"),
      wire("W1", "top+:24", "bot+:24", RED, "rail bridge", { via: [[17.0, -7.5], [17.0, 8.5]] }),
      wire("W2", "top-:23", "bot-:23", BLACK, "rail bridge", { via: [[17.8, -8.5], [17.8, 7.5]], height: 0.9 }),
      wire("W3", "a15", "top+:13", RED, "0.2 in"),
      wire("W4", "j15", "bot-:13", BLACK, "0.2 in"),
      wire("W5", "j18", "bot+:16", RED, "0.3 in"),
      wire("W6", "a12", "top+:10", RED, "0.2 in"),
      wire("W7", "b21", "b17", YELLOW, "0.4 in"),
      wire("W8", "g16", "d17", GREEN, "0.5 in", { height: 2.0 }),
      wire("W9", "b19", "top-:15", BLACK, "0.4 in", { height: 3.3 }),
      wire("W10", "j23", "bot-:19", BLACK, "0.2 in"),
    ],
    schematic: {
      w: 350, h: 260, readout: [235, 252],
      symbols: [
        { ref: "B1", kind: "battery", x: 30, y: 135, rot: 90, label: [40, 160], text: ["B1", "3.0V"] },
        { ref: "U1", kind: "ic555", x: 200, y: 130, label: [181, 141], text: ["U1", "TLC555"] },
        { ref: "R1", kind: "resistor", x: 110, y: 65, rot: 90, label: [72, 62], text: ["R1", "10k"] },
        { ref: "R2", kind: "resistor", x: 110, y: 130, rot: 90, label: [72, 127], text: ["R2", "68k"] },
        { ref: "C1", kind: "capacitor_electrolytic", x: 110, y: 200, rot: 90, label: [66, 197], text: ["C1", "10µF"] },
        { ref: "C2", kind: "capacitor_ceramic", x: 215, y: 217, rot: 90, label: [226, 214], text: ["C2", "10nF"] },
        { ref: "R3", kind: "resistor", x: 280, y: 130, label: [268, 118], text: ["R3 220Ω"] },
        { ref: "D1", kind: "led", x: 320, y: 165, rot: 90, label: [286, 180], text: ["D1"] },
      ],
      wires: [
        { pts: [[30, 115], [30, 30], [330, 30]], ref: "W1" },
        { pts: [[30, 155], [30, 240], [330, 240]], ref: "W2" },
        { pts: [[185, 65], [185, 30]], ref: "W3" },
        { pts: [[215, 65], [215, 30]], ref: "W5" },
        { pts: [[110, 45], [110, 30]], ref: "W6" },
        { pts: [[110, 85], [110, 110]] },
        { pts: [[110, 105], [145, 105]] },
        { pts: [[110, 150], [110, 180]] },
        { pts: [[110, 165], [135, 165], [135, 130], [145, 130]], ref: "W7" },
        { pts: [[135, 155], [145, 155]], ref: "W8" },
        { pts: [[110, 220], [110, 240]] },
        { pts: [[185, 195], [185, 240]], ref: "W4" },
        { pts: [[215, 237], [215, 240]], ref: "W9" },
        { pts: [[255, 130], [260, 130]] },
        { pts: [[300, 130], [320, 130], [320, 145]] },
        { pts: [[320, 185], [320, 240]], ref: "W10" },
      ],
    },
    summary: [["Supply (B1)", "3.0 V"], ["Timer (U1)", "TLC555 CMOS"], ["R1 / R2 / C1", "10 kΩ / 68 kΩ / 10 µF"], ["Frequency", "≈ 0.99 Hz"], ["Duty cycle", "≈ 53 %"], ["LED current", "≈ 3 mA"]],
    steps: [
      {
        id: "parts", title: "Check your parts",
        text: "This circuit uses a timer chip to switch the LED on and off by itself, about once per second.",
        detail: "Supply is 3.0 V, so U1 is a CMOS TLC555, which works from 2 V. A classic NE555 needs at least 4.5 V.",
        term: { word: "Astable", meaning: "a circuit that keeps switching between on and off by itself, with no input." },
        placed: [], focus: [],
      },
      {
        id: "rails", title: "Link the power rails",
        text: "Join the top and bottom rails so both edges of the board carry + and −.",
        detail: "W1: top+:24 → bot+:24, W2: top−:23 → bot−:23, both routed around the right end of the board.",
        term: { word: "Power rail", meaning: "a long strip along the edge, connected end to end, that shares + or − with the whole board." },
        placed: ["W1", "W2"], focus: ["W1", "W2"],
      },
      {
        id: "chip", title: "Insert the timer chip",
        text: "Place the chip across the centre channel with its notch facing left.",
        detail: "U1 pins 1–4 in f15–f18, pins 8–5 in e15–e18. The dot marks pin 1; the notch faces column 14.",
        term: { word: "DIP-8", meaning: "a chip package with two rows of four pins, 0.3 in apart, which fits exactly across the channel." },
        placed: ["W1", "W2", "U1"], focus: ["U1"],
      },
      {
        id: "passives", title: "Add the timing parts and the LED",
        text: "Two resistors and the large capacitor set the blink speed; R3 and the LED form the output.",
        detail: "R1 10 kΩ c12–c16, R2 68 kΩ d16–d21, C1 10 µF + i16 / − i15, C2 10 nF a18–a19, R3 220 Ω g17–g22, D1 anode h22 / cathode h23.",
        term: { word: "Capacitor", meaning: "a part that stores charge and fills and empties like a small tank. On C1 the stripe marks the − leg." },
        placed: ["W1", "W2", "U1", "R1", "R2", "C1", "C2", "R3", "D1"], focus: ["R1", "R2", "C1", "C2", "R3", "D1"],
      },
      {
        id: "jumpers", title: "Add the jumpers",
        text: "These wires connect the chip to power and join its timing pins.",
        detail: "a15→top+:13 (pin 8), j15→bot−:13 (pin 1), j18→bot+:16 (pin 4), a12→top+:10, b21→b17, g16→d17 (pin 2 to pin 6), b19→top−:15, j23→bot−:19.",
        term: { word: "Reset pin", meaning: "pin 4 stops the timer when it is low, so it is tied to + here." },
        placed: ["W1", "W2", "U1", "R1", "R2", "C1", "C2", "R3", "D1", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10"],
        focus: ["W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10"],
      },
      {
        id: "battery", title: "Connect the battery",
        text: "Connect the battery leads to the top rails; the bridges carry power to the bottom rails.",
        detail: "B1 red lead → top+:0, black lead → top−:0. 2 × 1.5 V AA in series = 3.0 V.",
        placed: ["W1", "W2", "U1", "R1", "R2", "C1", "C2", "R3", "D1", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "B1"], focus: ["B1"],
      },
      {
        id: "test", title: "The LED blinks",
        text: "C1 charges and discharges between 1 V and 2 V; each time it crosses a limit, the output and the LED switch.",
        detail: "t_high = 0.693·(R1+R2)·C1 ≈ 0.54 s, t_low = 0.693·R2·C1 ≈ 0.47 s, f ≈ 0.99 Hz, duty ≈ 53 %, I_LED ≈ (2.7 − 2.0) V / 220 Ω ≈ 3 mA.",
        term: { word: "Frequency", meaning: "how many times per second something repeats, in hertz (Hz)." },
        placed: ["W1", "W2", "U1", "R1", "R2", "C1", "C2", "R3", "D1", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "B1"], focus: [], live: true,
      },
      { id: "beacon", title: "Real-world application: warning lights", text: "Emergency and road-work beacons flash with the same kind of timer circuit.", detail: "Beacons flash at about 1–2 Hz (60–120 flashes per minute). Here f = 1.44 / ((R1 + 2·R2)·C1).", term: { word: "Hazard beacon", meaning: "a flashing lamp that warns people; its timer sets the flash rate." }, placed: ["W1", "W2", "U1", "R1", "R2", "C1", "C2", "R3", "D1", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "B1"], focus: [], live: true, scene: "application" },
    ],
  },
  {
    id: "push-button",
    code: "P-03", level: "beginner", board: "breadboard",
    title: "Push-button light",
    tagline: "The LED lights only while you hold a momentary switch.",
    minutes: 7,
    playable: true,
    model: "series",
    application: { id: "interior", title: "Interior light", text: "Your car has crashed at night. The headlights are damaged and the interior is dark. Mission: switch on the interior light so you can see inside.", interaction: "Press and hold the light button to turn on the interior LED. Release it and the light goes off." },
    nextLessonId: "buzzer-alarm",
    components: [
      battery,
      button,
      led("d12", "d15"),
      res("R1", "c15", "c20", 220, "220 Ω ±5%"),
      wire("W1", "top+:8", "a10", RED, "0.2 in"),
      wire("W2", "a20", "top-:16", BLACK, "0.3 in"),
    ],
    flow: ["B+", "top+:0", "top+:8", "a10", "e10", "e10^", "e12^", "e12", "d12", "d12^", "d15^", "d15", "c15", "c15^", "c20^", "c20", "a20", "top-:16", "top-:0", "B-"],
    schematic: {
      w: 340, h: 210, readout: [50, 198],
      symbols: [
        { ref: "B1", kind: "battery", x: 50, y: 106, rot: 90, label: [6, 104], text: ["B1", "3.0V"] },
        { ref: "SW1", kind: "pushbutton", x: 100, y: 40, label: [86, 74], text: ["SW1", "NO"] },
        { ref: "D1", kind: "led", x: 180, y: 40, label: [166, 74], text: ["D1", "red LED"] },
        { ref: "R1", kind: "resistor", x: 290, y: 106, rot: 90, label: [306, 100], text: ["R1", "220Ω"] },
      ],
      wires: [
        { pts: [[50, 86], [50, 40], [80, 40]], ref: "W1" },
        { pts: [[120, 40], [160, 40]] },
        { pts: [[200, 40], [290, 40], [290, 86]] },
        { pts: [[290, 126], [290, 172], [50, 172], [50, 126]], ref: "W2" },
      ],
    },
    summary: [["Supply (B1)", "3.0 V"], ["Switch (SW1)", "Normally open, momentary"], ["Series resistor (R1)", "220 Ω"], ["LED current, pressed", "4.5 mA"], ["LED current, released", "0 mA"]],
    steps: [
      {
        id: "parts", title: "Check your parts",
        text: "This is the LED circuit from P-01 with a push button added in the loop.",
        detail: "SW1 is a 6×6 mm tactile switch with four legs; the legs on each side are joined inside.",
        term: { word: "Switch", meaning: "a part that opens or closes a circuit, like a gate for current." },
        placed: [], focus: [],
      },
      {
        id: "button", title: "Insert the push button",
        text: "Press the button across the centre channel so it bridges both halves.",
        detail: "SW1 legs in e10, f10, e12, f12. e10–f10 are always joined inside, e12–f12 too; pressing joins column 10 to column 12.",
        term: { word: "Normally open, momentary", meaning: "the contacts are apart until you press, and close only while you hold the button." },
        placed: ["SW1"], focus: ["SW1"],
      },
      {
        id: "led", title: "Insert the LED",
        text: "Place the LED to the right of the button, long leg first.",
        detail: "D1 anode (+, long leg) in d12, cathode (−, flat edge) in d15.",
        term: { word: "LED", meaning: "light-emitting diode: a light that only conducts from anode to cathode." },
        placed: ["SW1", "D1"], focus: ["D1"],
      },
      {
        id: "resistor", title: "Add the resistor",
        text: "The resistor limits the current through the LED.",
        detail: "R1 220 Ω from c15 to c20. Bands: red-red-brown-gold.",
        term: { word: "Resistor", meaning: "a part that limits how much current can flow, measured in ohms (Ω)." },
        placed: ["SW1", "D1", "R1"], focus: ["R1"],
      },
      {
        id: "jumpers", title: "Add the jumper wires",
        text: "Connect the button to + and the resistor to −.",
        detail: "W1 red: top+:8 → a10. W2 black: a20 → top−:16.",
        placed: ["SW1", "D1", "R1", "W1", "W2"], focus: ["W1", "W2"],
      },
      {
        id: "battery", title: "Connect the battery",
        text: "Connect the battery leads to the top rails.",
        detail: "B1 red lead → top+:0, black lead → top−:0. The LED stays off: SW1 is open.",
        placed: ["SW1", "D1", "R1", "W1", "W2", "B1"], focus: ["B1"],
      },
      {
        id: "test", title: "Press and hold the button",
        text: "Hold the button cap down; the LED lights only while it is pressed.",
        detail: "Pressed: I = (3.0 − 2.0) V / 220 Ω ≈ 4.5 mA. Released: open circuit, 0 mA. Click and hold the cap, or hold Space.",
        term: { word: "Open circuit", meaning: "a loop with a gap in it, so no current flows." },
        placed: ["SW1", "D1", "R1", "W1", "W2", "B1"], focus: ["SW1"], live: true,
      },
      { id: "interior", title: "Real-world application: interior light", text: "Holding the button completes the circuit, so current flows through the LED and lights the cabin.", detail: "Pressed: loop closed, I = (3.0 − 2.0) V / 220 Ω ≈ 4.5 mA. Released: loop open, 0 mA. A real car uses 12 V and a door or roof switch.", term: { word: "Momentary switch", meaning: "a switch that is on only while you hold it, then springs back." }, placed: ["SW1", "D1", "R1", "W1", "W2", "B1"], focus: ["SW1"], live: true, scene: "application" },
    ],
  },
  {
    id: "buzzer-alarm",
    code: "P-04", level: "beginner", board: "breadboard",
    title: "Buzzer alarm",
    tagline: "A push button switches an active piezo buzzer.",
    application: { id: "alarm", title: "Protect your ride", text: "Your car is parked on a dark city street at night. A suspicious character walks up and tries to open the door.", interaction: "Activate the alarm to scare the intruder away, then reset it." },
    minutes: 6,
    playable: true,
    model: "series",
    nextLessonId: "night-light",
    components: [
      battery,
      button,
      { ref: "BZ1", kind: "buzzer", name: "Active piezo buzzer, 12 mm", value: "3–5 V, ≈ 2.3 kHz", pins: { pos: "d12", neg: "d15" } },
      wire("W1", "top+:8", "a10", RED, "0.2 in"),
      wire("W2", "a15", "top-:11", BLACK, "0.2 in"),
    ],
    flow: ["B+", "top+:0", "top+:8", "a10", "e10", "e10^", "e12^", "e12", "d12", "d12^", "d15^", "d15", "a15", "top-:11", "top-:0", "B-"],
    schematic: {
      w: 340, h: 210, readout: [50, 198],
      symbols: [
        { ref: "B1", kind: "battery", x: 50, y: 106, rot: 90, label: [6, 104], text: ["B1", "3.0V"] },
        { ref: "SW1", kind: "pushbutton", x: 110, y: 40, label: [96, 74], text: ["SW1", "NO"] },
        { ref: "BZ1", kind: "buzzer", x: 290, y: 106, rot: 90, label: [304, 100], text: ["BZ1"] },
      ],
      wires: [
        { pts: [[50, 86], [50, 40], [90, 40]], ref: "W1" },
        { pts: [[130, 40], [290, 40], [290, 86]] },
        { pts: [[290, 126], [290, 172], [50, 172], [50, 126]], ref: "W2" },
      ],
    },
    summary: [["Supply (B1)", "3.0 V"], ["Buzzer (BZ1)", "Active piezo, ≈ 2.3 kHz"], ["Current, pressed", "≈ 15 mA"], ["Current, released", "0 mA"]],
    steps: [
      {
        id: "parts", title: "Check your parts",
        text: "A push button switches a buzzer that beeps on its own when it gets power.",
        detail: "BZ1 is a 12 mm active piezo buzzer rated 3–5 V; its legs are 7.6 mm apart (3 holes).",
        term: { word: "Active vs passive buzzer", meaning: "an active buzzer has its own oscillator, so plain DC makes it beep. A passive one needs an alternating signal, like a small speaker." },
        placed: [], focus: [],
      },
      {
        id: "button", title: "Insert the push button",
        text: "Press the button across the centre channel.",
        detail: "SW1 legs in e10, f10, e12, f12. Pressing joins column 10 to column 12.",
        term: { word: "Normally open, momentary", meaning: "the contacts are apart until you press, and close only while you hold the button." },
        placed: ["SW1"], focus: ["SW1"],
      },
      {
        id: "buzzer", title: "Insert the buzzer",
        text: "Place the buzzer with its + leg next to the button.",
        detail: "BZ1 + leg (longer, marked + on top) in d12, − leg in d15.",
        term: { word: "Polarised", meaning: "the part has a + and a − leg and only works one way round." },
        placed: ["SW1", "BZ1"], focus: ["BZ1"],
      },
      {
        id: "jumpers", title: "Add the jumper wires",
        text: "Connect the button to + and the buzzer to −.",
        detail: "W1 red: top+:8 → a10. W2 black: a15 → top−:11.",
        placed: ["SW1", "BZ1", "W1", "W2"], focus: ["W1", "W2"],
      },
      {
        id: "battery", title: "Connect the battery",
        text: "Connect the battery leads to the top rails.",
        detail: "B1 red lead → top+:0, black lead → top−:0. BZ1 stays silent: SW1 is open.",
        placed: ["SW1", "BZ1", "W1", "W2", "B1"], focus: ["B1"],
      },
      {
        id: "test", title: "Press and hold the button",
        text: "Hold the button to sound the alarm; release it to stop.",
        detail: "Pressed: BZ1 on, ≈ 15 mA at 3.0 V, tone ≈ 2.3 kHz. Released: 0 mA. Click and hold the cap, or hold Space.",
        term: { word: "Oscillator", meaning: "a circuit that switches back and forth very fast; here about 2300 times per second, which you hear as a tone." },
        placed: ["SW1", "BZ1", "W1", "W2", "B1"], focus: ["SW1"], live: true,
      },
      { id: "alarm", title: "Mission: protect your ride", text: "Closing the switch completes the buzzer circuit, so the alarm sounds and the intruder runs.", detail: "Lab: 3.0 V, SW1 closes the loop, BZ1 ≈ 15 mA, tone ≈ 2.3 kHz. A real car alarm uses 12 V, door sensors and a latch that keeps the siren on until reset.", term: { word: "Active buzzer", meaning: "a buzzer with its own oscillator inside: give it DC and it beeps." }, placed: ["SW1", "BZ1", "W1", "W2", "B1"], focus: [], live: true, scene: "application" },
    ],
  },
];

/** Level and order come from the course map in `curriculum.ts`. */
export const lessons: Lesson[] = [...beginnerLessons, ...intermediateLessons, ...advancedLessons]
  .map((l) => { const c = CURRICULUM.find((x) => x.id === l.id); return c ? { ...l, level: c.level } : l; })
  .sort((a, b) => (CURRICULUM.find((x) => x.id === a.id)?.order ?? 999) - (CURRICULUM.find((x) => x.id === b.id)?.order ?? 999));

export const LEVELS = [
  { id: "beginner", title: "Beginner" },
  { id: "intermediate", title: "Intermediate" },
  { id: "advanced", title: "Advanced" },
] as const;

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
