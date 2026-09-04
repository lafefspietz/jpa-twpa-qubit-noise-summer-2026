import asyncio
import json
import time
import websockets
import copy
from urllib.request import urlopen

import serial
import serial.tools.list_ports
from windfreak import SynthHD
import numpy as np

from pathlib import Path
from datetime import datetime



ports = serial.tools.list_ports.comports()
for port in ports:
    #print(f"Port Name:   {port.device}")
    #print(f"Description: {port.description}")
    #print(f"Hardware ID: {port.hwid}")  # Shows USB Vendor ID, Product ID, and Location string
    #print("-" * 30)
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
    state = {}
    state['twpa_pump_frequency'] = 8.75e9
    state['twpa_pump_power'] = -30
    previous_state = copy.deepcopy(state)
    time.sleep(1) 
    # WHERE ALL THE INSTRUMENTS WILL BE SET ON BOOT (RUN ONCE):

    channel_a.enable = False # JPA pump off
    channel_b.enable = True #TWPA pump on
    channel_b.frequency = state['twpa_pump_frequency']   # TWPA pump frequency in Hz
    channel_b.power = state['twpa_pump_power']        #  TWPA pump power in dBm

    try:
        asyncio.run(main_loop(state, previous_state))
    except (KeyboardInterrupt, asyncio.CancelledError):
        channel_b.enable = False
        print("\nServer shutdown complete.")

