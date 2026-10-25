// Three fixed demo lectures, each with its own 5-question quiz (3 core + 2 niche).
// "a" = index of the correct option; "n" = 1 for niche questions.
export const LECTURES = [
{ id: "python-ml", title: "Python and Machine Learning Basics", quiz: [
 {q:"What does calling a Python generator function (one that uses yield) return?",o:["A lazy iterator that produces values on demand","A list holding all the yielded values","A tuple of the yielded values","None, until you call next() the first time"],a:0},
 {q:"Why should a StandardScaler be fit on the training set only?",o:["To avoid leaking test-set information into training","Because it cannot transform the test set","To make training run faster","To increase the variance of the features"],a:0},
 {q:"A model scores 99% on training data but 72% on validation data. What is the most likely problem?",o:["Overfitting","Underfitting","Too little training time","A missing bias term"],a:0},
 {q:"Niche: why do CPU-bound Python threads not speed up in CPython, and what is the usual fix?",o:["The GIL lets one thread run bytecode at a time, so use multiprocessing","Threads share no memory, so use a lock","The garbage collector blocks threads, so disable it","Python caps threads at the core count, so raise the limit"],a:0,n:1},
 {q:"Niche: what does L1 (lasso) regularization tend to do to a linear model's weights?",o:["Drives many weights to exactly zero, giving a sparse model","Shrinks all weights equally without reaching zero","Increases every weight to improve fit","Removes the bias term"],a:0,n:1}]},
{ id: "embedded", title: "Embedded Systems: Microcontroller Basics", quiz: [
 {q:"What does a pull-up resistor on a digital input pin do?",o:["Holds the pin at logic HIGH when nothing else drives it","Limits the current through an LED","Speeds up the ADC conversion","Converts the pin to an analog output"],a:0},
 {q:"What does an interrupt service routine (ISR) let a microcontroller do?",o:["Respond to an event immediately by briefly pausing the main program","Run two programs on two cores","Erase the flash memory safely","Raise the clock speed"],a:0},
 {q:"A 5 V PWM signal runs at a 25% duty cycle. What is its average output?",o:["About 1.25 V","About 2.5 V","About 3.75 V","5 V"],a:0},
 {q:"Niche: why is a variable shared between an ISR and main code declared volatile?",o:["So the compiler re-reads it from memory because it can change at any time","So it is stored in flash","So it becomes a constant","So interrupts are disabled while it is used"],a:0,n:1},
 {q:"Niche: a 10-bit ADC uses a 5 V reference. What is its smallest voltage step?",o:["About 4.9 mV","About 9.8 mV","About 49 mV","About 0.5 mV"],a:0,n:1}]},
{ id: "robotics", title: "Robotics: Sensors and Control", quiz: [
 {q:"In a PID controller, what does the proportional (P) term respond to?",o:["The current error","The sum of past errors","The rate of change of the error","The target value only"],a:0},
 {q:"What does a rotary encoder measure?",o:["Shaft position and rotation speed","Ambient temperature","Motor winding current","Light intensity"],a:0},
 {q:"What is the main drawback of integrating a gyroscope's angular rate to get an angle?",o:["Small errors accumulate, so the angle drifts over time","It cannot measure rotation","It only works outdoors","It needs a GPS signal"],a:0},
 {q:"Niche: what does the derivative term in PID add, and what is its risk?",o:["It damps overshoot but amplifies sensor noise","It removes steady-state error but slows the response","It raises the gain but makes the system lag","It filters noise but increases overshoot"],a:0,n:1},
 {q:"Niche: what is integral windup?",o:["The integral term growing while the actuator is saturated, causing large overshoot later","The integral term resetting to zero every cycle","Motor windings overheating","Encoder counts overflowing"],a:0,n:1}]}
];
