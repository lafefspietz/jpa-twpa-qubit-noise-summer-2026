const debug_mode = true;//set to false to send data over socket
let socket = null;

if (!debug_mode) {
  socket = new WebSocket('ws://localhost:8080');
}

knobs = [];
knobPayload = {};

jpa_pump_frequency_minimum = 12.0e9;
jpa_pump_frequency_0 = 13.123e9;
jpa_pump_frequency_maximum = 14.0e9;

jpa_pump_power_minimum = -30;//dBm
jpa_pump_power_0 = 0;//dBm
jpa_pump_power_maximum = 6;//dBm

jpa_flux_bias_minimum = -2;
jpa_flux_bias_0 = 0;
jpa_flux_bias_maximum = 2;


twpa_pump_frequency_minimum = 8.0e9;
twpa_pump_frequency_0 = 8.75e9;
twpa_pump_frequency_maximum = 9.5e9;

twpa_pump_power_minimum = -40;//dBm
twpa_pump_power_0 = -20;//dBm
twpa_pump_power_maximum = 0;//dBm


jpa_pump_frequency = jpa_pump_frequency_0;
jpa_pump_power = jpa_pump_power_0;//dBm
jpa_flux_bias = jpa_flux_bias_0;//volts

twpa_pump_frequency = twpa_pump_frequency_0;
twpa_pump_power = twpa_pump_power_0;//dBm

amplifier_state = {};
amplifier_state.jpa_pump_frequency = jpa_pump_frequency;
amplifier_state.jpa_pump_power = jpa_pump_power;
amplifier_state.jpa_flux_bias = jpa_flux_bias;
amplifier_state.twpa_pump_frequency = twpa_pump_frequency;
amplifier_state.twpa_pump_power = twpa_pump_power;

fetch('load-file.php?filename=knobs.json')
  .then(response => response.text())
  .then(data => {
    knobs = JSON.parse(data.trim());
    for(let index = 0;index < knobs.length;index++){
        knobPayload[knobs[index].variable] = knobs[index].value;
    }
});


fetch('load-file.php?filename=amplifier_state.json')
  .then(response => response.text())
  .then(data => {
    saved_state = JSON.parse(data.trim());
    jpa_pump_frequency_0 = saved_state.jpa_pump_frequency;
    jpa_pump_power_0 = saved_state.jpa_pump_power;
    jpa_flux_bias_0 = saved_state.jpa_flux_bias;
    twpa_pump_frequency_0 = saved_state.twpa_pump_frequency;
    twpa_pump_power_0 = saved_state.twpa_pump_power;


    jpa_pump_frequency = jpa_pump_frequency_0;
    jpa_pump_power = jpa_pump_power_0;//dBm
    jpa_flux_bias = jpa_flux_bias_0;//volts
    twpa_pump_frequency = twpa_pump_frequency_0;
    twpa_pump_power = twpa_pump_power_0;//dBm

    
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
    
    text("f_twpa = " + (twpa_pump_frequency/1e9).toFixed(3) + " GHz", 0.5*width +  10,height- 120);
    text("p_twpa = " + (twpa_pump_power).toFixed(3) + " dBm", 0.5*width +  10,height- 100);

    
    text("p_jpa = " + (jpa_pump_power).toFixed(3) + " dBm",0.5*width +  10,height- 40);
    text("flux_jpa = " + (jpa_flux_bias).toFixed(3) + " V",0.5*width +  10,height- 20);
    
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
            knobs[knobIndex].value--;
        }
        else{
            knobs[knobIndex].value++;
        }

        jpa_pump_frequency = jpa_pump_frequency_0 + 100e6*knobs[0].value + 10e6*knobs[1].value + 1e6*knobs[2].value;
        jpa_pump_power = jpa_pump_power_0 + knobs[3].value + 0.1*knobs[4].value + 0.01*knobs[5].value;
        jpa_flux_bias = 0.1*knobs[6].value + 0.01*knobs[7].value + 0.001*knobs[8].value;
        if(jpa_pump_frequency > jpa_pump_frequency_maximum){
            jpa_pump_frequency = jpa_pump_frequency_maximum;
        }        
        if(jpa_pump_frequency < jpa_pump_frequency_minimum){
            jpa_pump_frequency = jpa_pump_frequency_minimum;
        }        
        if(jpa_pump_power > jpa_pump_power_maximum){
            jpa_pump_power = jpa_pump_power_maximum;
        }        
        if(jpa_pump_power < jpa_pump_power_minimum){
            jpa_pump_power = jpa_pump_power_minimum;
        }        
        if(jpa_flux_bias > jpa_flux_bias_maximum){
            jpa_flux_bias = jpa_flux_bias_maximum;
        }        
        if(jpa_flux_bias < jpa_flux_bias_minimum){
            jpa_flux_bias = jpa_flux_bias_minimum;
        }        
        
        twpa_pump_frequency = twpa_pump_frequency_0 + 100e6*knobs[9].value + 10e6*knobs[10].value + 1e6*knobs[11].value;
        twpa_pump_power = twpa_pump_power_0 + knobs[12].value + 0.1*knobs[13].value + 0.01*knobs[14].value;

        if(twpa_pump_frequency > twpa_pump_frequency_maximum){
            twpa_pump_frequency = twpa_pump_frequency_maximum;
        }        
        if(twpa_pump_frequency < twpa_pump_frequency_minimum){
            twpa_pump_frequency = twpa_pump_frequency_minimum;
        }        
        if(twpa_pump_power > twpa_pump_power_maximum){
            twpa_pump_power = twpa_pump_power_maximum;
        }        
        if(twpa_pump_power < twpa_pump_power_minimum){
            twpa_pump_power = twpa_pump_power_minimum;
        }        
        

        amplifier_state.jpa_pump_frequency = jpa_pump_frequency;
        amplifier_state.jpa_pump_power = jpa_pump_power;
        amplifier_state.jpa_flux_bias = jpa_flux_bias;
        amplifier_state.twpa_pump_frequency = twpa_pump_frequency;
        amplifier_state.twpa_pump_power = twpa_pump_power;
        saveState();
        console.log(JSON.stringify(amplifier_state));
        sendData(amplifier_state);
    }
}


function saveState(){
    data = encodeURIComponent(JSON.stringify(amplifier_state,null,"    "));
    fetch('save-file.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: 'data=' + data + '&filename=amplifier_state.json'
    });    
}



function sendData(instrumentData) {
  if (!debug_mode && socket) {
    socket.send(JSON.stringify(instrumentData));
  } else {
    console.log("Debug Mode (No Socket Connection):", instrumentData);
  }
}