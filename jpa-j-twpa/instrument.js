const debug_mode = false;//set to false to send data over socket
let socket = null;

if (!debug_mode) {
  socket = new WebSocket('ws://localhost:8080');
}

knobs = [];
knobPayload = {};

f0 = 12.5e9;//Hz
fmin = 10e9;
fmax = 15e9;

p0 = 0;
pmax = 13;
pmin = -20;
jpa_pump_frequency = f0;
jpa_pump_power = 0;//dBm
flux_bias = 0;//phi/phi0

f0_twpa = 8.75e9;

twpa_pump_frequency = f0_twpa;
twpa_pump_power = 0;//dBm


fetch('load-file.php?filename=knobs.json')
  .then(response => response.text())
  .then(data => {
    knobs = JSON.parse(data.trim());
    for(let index = 0;index < knobs.length;index++){
        knobPayload[knobs[index].variable] = knobs[index].value;
    }
     
});

knobIndex = -1;

function setup() {
     
    let container = document.getElementById('p5-canvas-container');
    let w = container.clientWidth;
    let h = container.clientHeight;
    let canvas = createCanvas(w, h);
    canvas.parent('p5-canvas-container');
    unit =  0.5*Math.min(innerWidth, innerHeight);
    x0 = 0.5*width;
    y0 = 0.5*height;
    
}

function draw() {
    clear();
    stroke(0);
    noFill();
    knobIndex = -1;
    textFont('Courier New');
    textSize(16);
    
    for(let index = 0;index < knobs.length;index++){
        strokeWeight(6);

        d = Math.sqrt((mouseX - (x0 + unit*knobs[index].x))**2+ (mouseY - (y0 - unit*knobs[index].y))**2);
        if(d < unit*knobs[index].r){
            fill("#00000080");
            knobIndex = index;
        } else{
            noFill();
        }
        circle(x0 + unit*knobs[index].x,y0 - unit*knobs[index].y,2*unit*knobs[index].r);
        
        line(x0 + unit*knobs[index].x,y0 - unit*knobs[index].y,x0 + unit*knobs[index].x + knobs[index].r*unit*Math.sin(knobs[index].value*2*Math.PI/knobs[index].N),y0 - unit*knobs[index].y - knobs[index].r*unit*Math.cos(knobs[index].value*2*Math.PI/knobs[index].N));
        fill(0);
        strokeWeight(1);
        textString = knobs[index].value.toString() + "X" + knobs[index].variable;

        text(textString,x0 + unit*knobs[index].x - 16*0.295*textString.length,y0 - unit*knobs[index].y - knobs[index].r*unit - 10);
        if(knobIndex >= 0){
            cursor(HAND);
        } else{
            cursor(ARROW);
        }
    }    
    text("f_jpa = " + (jpa_pump_frequency/1e9).toFixed(3) + " GHz", 0.5*width +  10,height- 60);
    text("p_jpa = " + (jpa_pump_power).toFixed(3) + " dBm",0.5*width +  10,height- 40);
    text("flux_jpa = " + (flux_bias).toFixed(3) + " phi0",0.5*width +  10,height- 20);
    
    textFont('Arial');
    textSize(20);
    text("JPA",20,20);
    text("TWPA",width - 0.35*height - 5,20);
    textSize(16);
//    text("flux",10,height - 40);
    line(width/2,height-10,width/2,10);
    noFill();
  //  rect(5,5,height + 5,height-10);
    //rect(width-5,5,- height - 5,0.7*height-10);

}

function mouseWheel(event) {
    if(knobIndex >= 0){
        if(event.delta > 0){ 
            knobs[knobIndex].value++;
        }
        else{
            knobs[knobIndex].value--;
        }
        jpa_pump_frequency = f0 + 100e6*knobs[0].value + 10e6*knobs[1].value + 1e6*knobs[2].value;
        jpa_pump_power = p0 + knobs[3].value + 0.1*knobs[4].value + 0.01*knobs[5].value;
        flux_bias = 0.1*knobs[6].value + 0.01*knobs[7].value + 0.001*knobs[8].value;
        if(jpa_pump_frequency > fmax){
            jpa_pump_frequency = fmax;
        }        
        if(jpa_pump_frequency < fmin){
            jpa_pump_frequency = fmin;
        }        
        if(jpa_pump_power > pmax){
            jpa_pump_power = pmax;
        }        
        if(jpa_pump_power < pmin){
            jpa_pump_power = pmin;
        }        
        knobPayload.flux_bias = flux_bias;
        knobPayload.jpa_pump_frequency = jpa_pump_frequency;
        knobPayload.jpa_pump_power = jpa_pump_power;
        knobPayload[knobs[knobIndex].variable] = knobs[knobIndex].value;
        console.log(JSON.stringify(knobPayload));
        sendData(knobPayload);
    }
}

function sendData(instrumentData) {
  if (!debug_mode && socket) {
    socket.send(JSON.stringify(instrumentData));
  } else {
    console.log("Debug Mode (No Socket Connection):", instrumentData);
  }
}

