import asyncio
import json
import time
import websockets
import copy
from urllib.request import urlopen

import serial
import serial.tools.list_ports
from windfreak import SynthHD

from RsInstrument import RsInstrument, BinFloatFormat
import skrf as rf
import matplotlib.pyplot as plt
import numpy as np
import pyvisa
from pathlib import Path
from datetime import datetime


rm = pyvisa.ResourceManager()
instruments = rm.list_resources()

rm = pyvisa.ResourceManager()
instruments = rm.list_resources()
yoko = None
for instrument in instruments:
    if 'YOKOGAWA' in instrument:
        # Initialize instrument
        yoko = rm.open_resource(instrument) 
        break

ports = serial.tools.list_ports.comports()
for port in ports:
    print(f"Port Name:   {port.device}")
    print(f"Description: {port.description}")
    print(f"Hardware ID: {port.hwid}")  # Shows USB Vendor ID, Product ID, and Location string
    print("-" * 30)
    if 'A3E5' in port.hwid:
        print(f"Windfreak is on COM port {port.device}")
        synth = SynthHD(port.device)     

synth.init()
channel_a = synth[0]
channel_b = synth[1]        

async def receive_data(websocket, state, previous_state):
    async for message in websocket:
        try:
            incoming_json = json.loads(message)
            
            old_snapshot = copy.deepcopy(previous_state)
            for key, new_value in incoming_json.items():
                old_value = old_snapshot.get(key)
                if old_value != new_value:
                    print(f"Key '{key}' changed from {old_value} to {new_value}")
                    # set all instrument states here:
                    if key == 'jpa_pump_frequency':
                        channel_a.frequency = incoming_json['jpa_pump_frequency']
                    if key == 'jpa_pump_power':
                        channel_a.power = incoming_json['jpa_pump_power']
                    if key == 'jpa_flux_bias':
                        yoko.write(":SOUR:LEV " + str(incoming_json['jpa_flux_bias']))
                    if key == 'twpa_pump_frequency':
                        channel_b.frequency = incoming_json['twpa_pump_frequency']
                    if key == 'twpa_pump_power':
                        channel_b.power = incoming_json['twpa_pump_power']

            state.clear()
            state.update(incoming_json)
            if state != previous_state:
                previous_state.clear()
                previous_state.update(copy.deepcopy(state))
        except Exception as e:
            print(f"Error parsing data: {e}")


async def main_loop(state, previous_state):
    async def connection_handler(ws):
        await receive_data(ws, state, previous_state)
    async with websockets.serve(connection_handler, "localhost", 8081):
        while True:
            await asyncio.sleep(0.1)

if __name__ == "__main__":
    with open("amplifier_state.json", "r") as f:
        state = json.load(f)
    previous_state = copy.deepcopy(state)
    time.sleep(1) 
    # WHERE ALL THE INSTRUMENTS WILL BE SET ON BOOT (RUN ONCE):

#    if state['jpa_flux_bias_on'] == True:
#        yoko.write(":OUTP ON")
#    else:
#        yoko.write(":OUTP OFF")
    yoko.write(":SOUR:FUNC VOLT")
    yoko.write(":SOUR:LEV " + str(state['jpa_flux_bias']))
    yoko.write(":OUTP ON")


#    channel_a.enable = state['jpa_pump_on']
    channel_a.enable = True
    channel_a.frequency = state['jpa_pump_frequency']   # JPA pump frequency in Hz
    channel_a.power = state['jpa_pump_power']        # JPA pump power in dBm
    
    channel_b.enable = True #state['twpa_pump_on']
    channel_b.frequency = state['twpa_pump_frequency']   # TWPA pump frequency in Hz
    channel_b.power = state['twpa_pump_power']        #  TWPA pump power in dBm

    try:
        asyncio.run(main_loop(state, previous_state))
    except (KeyboardInterrupt, asyncio.CancelledError):
        print("\nServer shutdown complete.")

